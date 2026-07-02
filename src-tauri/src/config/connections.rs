use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

use crate::db::{default_driver_str, DatabaseDriver};
use crate::error::{AppError, AppResult};
use crate::security::crypto::{decrypt, encrypt};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSummary {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub ssl_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInput {
    pub id: Option<String>,
    pub name: String,
    #[serde(default = "default_driver_str")]
    pub driver: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_mode: String,
}

#[derive(Debug, Clone)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub driver: DatabaseDriver,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredConnection {
    id: String,
    name: String,
    #[serde(default = "default_driver_str")]
    driver: String,
    host: String,
    port: u16,
    database: String,
    username: String,
    ssl_mode: String,
    encrypted_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ConnectionsFile {
    connections: Vec<StoredConnection>,
}

pub struct ConnectionsStore {
    config_dir: std::path::PathBuf,
    path: std::path::PathBuf,
    write_lock: Mutex<()>,
}

impl ConnectionsStore {
    pub fn new(config_dir: std::path::PathBuf, path: std::path::PathBuf) -> Self {
        Self {
            config_dir,
            path,
            write_lock: Mutex::new(()),
        }
    }

    fn load_file(&self) -> AppResult<ConnectionsFile> {
        if !self.path.exists() {
            return Ok(ConnectionsFile {
                connections: Vec::new(),
            });
        }

        let content = std::fs::read_to_string(&self.path)?;
        Ok(serde_json::from_str(&content)?)
    }

    fn save_file(&self, file: &ConnectionsFile) -> AppResult<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(file)?;
        std::fs::write(&self.path, content)?;
        Ok(())
    }

    pub fn list(&self) -> AppResult<Vec<ConnectionSummary>> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Connections store lock poisoned".into()))?;

        let file = self.load_file()?;
        Ok(file
            .connections
            .into_iter()
            .map(|c| ConnectionSummary {
                id: c.id,
                name: c.name,
                driver: c.driver,
                host: c.host,
                port: c.port,
                database: c.database,
                username: c.username,
                ssl_mode: c.ssl_mode,
            })
            .collect())
    }

    pub fn get(&self, id: &str) -> AppResult<ConnectionConfig> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Connections store lock poisoned".into()))?;

        let file = self.load_file()?;
        let stored = file
            .connections
            .into_iter()
            .find(|c| c.id == id)
            .ok_or_else(|| AppError::ConnectionNotFound(id.to_string()))?;

        let password = decrypt(&self.config_dir, &stored.encrypted_password)?;

        Ok(ConnectionConfig {
            id: stored.id,
            name: stored.name,
            driver: DatabaseDriver::parse(&stored.driver)?,
            host: stored.host,
            port: stored.port,
            database: stored.database,
            username: stored.username,
            password,
            ssl_mode: stored.ssl_mode,
        })
    }

    pub fn save(&self, input: ConnectionInput) -> AppResult<ConnectionSummary> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Connections store lock poisoned".into()))?;

        let driver = DatabaseDriver::parse(&input.driver)?;
        if input.name.trim().is_empty() {
            return Err(AppError::Message("Connection name is required".into()));
        }
        if input.database.trim().is_empty() {
            return Err(AppError::Message("Database / file path is required".into()));
        }
        if driver != DatabaseDriver::Sqlite && input.host.trim().is_empty() {
            return Err(AppError::Message("Host is required".into()));
        }

        let mut file = self.load_file()?;
        let id = input
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let encrypted_password = if input.password.is_empty() {
            if driver == DatabaseDriver::Sqlite {
                encrypt(&self.config_dir, "")?
            } else if let Some(existing) = file.connections.iter().find(|c| c.id == id) {
                existing.encrypted_password.clone()
            } else {
                return Err(AppError::Message(
                    "Password is required for new connections".into(),
                ));
            }
        } else {
            encrypt(&self.config_dir, &input.password)?
        };

        let stored = StoredConnection {
            id: id.clone(),
            name: input.name.clone(),
            driver: driver.as_str().to_string(),
            host: input.host.clone(),
            port: if driver == DatabaseDriver::Sqlite {
                0
            } else {
                input.port
            },
            database: input.database.clone(),
            username: input.username.clone(),
            ssl_mode: input.ssl_mode.clone(),
            encrypted_password,
        };

        if let Some(existing) = file.connections.iter_mut().find(|c| c.id == id) {
            *existing = stored;
        } else {
            file.connections.push(stored);
        }

        self.save_file(&file)?;

        Ok(ConnectionSummary {
            id,
            name: input.name,
            driver: driver.as_str().to_string(),
            host: input.host,
            port: input.port,
            database: input.database,
            username: input.username,
            ssl_mode: input.ssl_mode,
        })
    }

    pub fn delete(&self, id: &str) -> AppResult<()> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Connections store lock poisoned".into()))?;

        let mut file = self.load_file()?;
        let before = file.connections.len();
        file.connections.retain(|c| c.id != id);

        if file.connections.len() == before {
            return Err(AppError::ConnectionNotFound(id.to_string()));
        }

        self.save_file(&file)?;
        Ok(())
    }
}

impl ConnectionInput {
    pub fn to_config(&self) -> AppResult<ConnectionConfig> {
        Ok(ConnectionConfig {
            id: self.id.clone().unwrap_or_default(),
            name: self.name.clone(),
            driver: DatabaseDriver::parse(&self.driver)?,
            host: self.host.clone(),
            port: self.port,
            database: self.database.clone(),
            username: self.username.clone(),
            password: self.password.clone(),
            ssl_mode: self.ssl_mode.clone(),
        })
    }
}

impl ConnectionConfig {
    pub fn build_url(&self) -> AppResult<String> {
        use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};

        match self.driver {
            DatabaseDriver::Postgres => {
                let ssl = match self.ssl_mode.as_str() {
                    "require" => "?sslmode=require",
                    "verify-ca" => "?sslmode=verify-ca",
                    "verify-full" => "?sslmode=verify-full",
                    _ => "?sslmode=prefer",
                };

                Ok(format!(
                    "postgresql://{}:{}@{}:{}/{}{}",
                    utf8_percent_encode(&self.username, NON_ALPHANUMERIC),
                    utf8_percent_encode(&self.password, NON_ALPHANUMERIC),
                    self.host,
                    self.port,
                    self.database,
                    ssl
                ))
            }
            DatabaseDriver::Mysql => {
                let ssl = if self.ssl_mode == "require" {
                    "?ssl-mode=REQUIRED"
                } else {
                    ""
                };

                Ok(format!(
                    "mysql://{}:{}@{}:{}/{}{}",
                    utf8_percent_encode(&self.username, NON_ALPHANUMERIC),
                    utf8_percent_encode(&self.password, NON_ALPHANUMERIC),
                    self.host,
                    self.port,
                    self.database,
                    ssl
                ))
            }
            DatabaseDriver::Sqlite => {
                let path = self.database.trim();
                if path.is_empty() {
                    return Err(AppError::Message("SQLite file path is required".into()));
                }

                if path == ":memory:" {
                    return Ok("sqlite::memory:".into());
                }

                if path.starts_with("sqlite:") {
                    return Ok(path.to_string());
                }

                if path.starts_with('/') {
                    Ok(format!("sqlite://{}", path))
                } else {
                    Ok(format!("sqlite:{}", path))
                }
            }
        }
    }
}
