use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::security::crypto::{decrypt, encrypt};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSummary {
    pub id: String,
    pub name: String,
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

        let mut file = self.load_file()?;
        let id = input
            .id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let encrypted_password = if input.password.is_empty() {
            if let Some(existing) = file.connections.iter().find(|c| c.id == id) {
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
            host: input.host.clone(),
            port: input.port,
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

impl ConnectionConfig {
    pub fn build_url(&self) -> String {
        use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};

        let ssl = match self.ssl_mode.as_str() {
            "require" => "?sslmode=require",
            "verify-ca" => "?sslmode=verify-ca",
            "verify-full" => "?sslmode=verify-full",
            _ => "?sslmode=prefer",
        };

        format!(
            "postgresql://{}:{}@{}:{}/{}{}",
            utf8_percent_encode(&self.username, NON_ALPHANUMERIC),
            utf8_percent_encode(&self.password, NON_ALPHANUMERIC),
            self.host,
            self.port,
            self.database,
            ssl
        )
    }
}
