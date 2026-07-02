use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub sql: String,
    pub connection_id: Option<String>,
    pub saved_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveQueryInput {
    pub name: String,
    pub sql: String,
    pub connection_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SavedQueriesFile {
    queries: Vec<SavedQuery>,
}

pub struct SavedQueriesStore {
    path: std::path::PathBuf,
    write_lock: Mutex<()>,
}

impl SavedQueriesStore {
    pub fn new(path: std::path::PathBuf) -> Self {
        Self {
            path,
            write_lock: Mutex::new(()),
        }
    }

    fn load_file(&self) -> AppResult<SavedQueriesFile> {
        if !self.path.exists() {
            return Ok(SavedQueriesFile {
                queries: Vec::new(),
            });
        }

        let content = std::fs::read_to_string(&self.path)?;
        Ok(serde_json::from_str(&content)?)
    }

    fn save_file(&self, file: &SavedQueriesFile) -> AppResult<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(file)?;
        std::fs::write(&self.path, content)?;
        Ok(())
    }

    pub fn list(&self) -> AppResult<Vec<SavedQuery>> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Saved queries lock poisoned".into()))?;

        let file = self.load_file()?;
        Ok(file.queries)
    }

    pub fn save(&self, input: SaveQueryInput) -> AppResult<SavedQuery> {
        let name = input.name.trim();
        if name.is_empty() {
            return Err(AppError::Message("Query name cannot be empty".into()));
        }

        let sql = input.sql.trim();
        if sql.is_empty() {
            return Err(AppError::Message("Query SQL cannot be empty".into()));
        }

        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Saved queries lock poisoned".into()))?;

        let mut file = self.load_file()?;

        if let Some(existing) = file.queries.iter_mut().find(|q| q.name == name) {
            existing.sql = sql.to_string();
            existing.connection_id = input.connection_id;
            existing.saved_at = Utc::now();
            let updated = existing.clone();
            self.save_file(&file)?;
            return Ok(updated);
        }

        let entry = SavedQuery {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            sql: sql.to_string(),
            connection_id: input.connection_id,
            saved_at: Utc::now(),
        };

        file.queries.insert(0, entry.clone());
        self.save_file(&file)?;
        Ok(entry)
    }

    pub fn delete(&self, id: &str) -> AppResult<()> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Saved queries lock poisoned".into()))?;

        let mut file = self.load_file()?;
        let before = file.queries.len();
        file.queries.retain(|q| q.id != id);

        if file.queries.len() == before {
            return Err(AppError::Message(format!("Saved query not found: {id}")));
        }

        self.save_file(&file)
    }
}
