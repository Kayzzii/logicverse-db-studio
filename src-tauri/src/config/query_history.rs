use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use crate::error::{AppError, AppResult};

const MAX_HISTORY_ENTRIES: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistoryEntry {
    pub id: String,
    pub sql: String,
    pub connection_id: Option<String>,
    pub executed_at: DateTime<Utc>,
    pub execution_time_ms: u64,
    pub row_count: usize,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QueryHistoryFile {
    entries: Vec<QueryHistoryEntry>,
}

pub struct QueryHistoryStore {
    path: std::path::PathBuf,
    write_lock: Mutex<()>,
}

impl QueryHistoryStore {
    pub fn new(path: std::path::PathBuf) -> Self {
        Self {
            path,
            write_lock: Mutex::new(()),
        }
    }

    fn load_file(&self) -> AppResult<QueryHistoryFile> {
        if !self.path.exists() {
            return Ok(QueryHistoryFile {
                entries: Vec::new(),
            });
        }

        let content = std::fs::read_to_string(&self.path)?;
        Ok(serde_json::from_str(&content)?)
    }

    fn save_file(&self, file: &QueryHistoryFile) -> AppResult<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(file)?;
        std::fs::write(&self.path, content)?;
        Ok(())
    }

    pub fn list(&self, limit: usize) -> AppResult<Vec<QueryHistoryEntry>> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Query history lock poisoned".into()))?;

        let file = self.load_file()?;
        let take = limit.min(file.entries.len());
        Ok(file.entries.into_iter().take(take).collect())
    }

    pub fn append(&self, entry: QueryHistoryEntry) -> AppResult<()> {
        let _guard = self
            .write_lock
            .lock()
            .map_err(|_| AppError::Message("Query history lock poisoned".into()))?;

        let mut file = self.load_file()?;
        file.entries.insert(0, entry);

        if file.entries.len() > MAX_HISTORY_ENTRIES {
            file.entries.truncate(MAX_HISTORY_ENTRIES);
        }

        self.save_file(&file)
    }
}
