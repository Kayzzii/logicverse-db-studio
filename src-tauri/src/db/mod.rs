mod backend;
mod driver;
mod er;
mod explain;
mod introspection;
mod pool;
mod query;
mod types;

use std::collections::HashMap;
use std::sync::Arc;

use chrono::Utc;
use tokio::sync::{Mutex, RwLock};
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

pub use backend::{ConnectedBackend, DatabaseBackend};
pub use driver::{default_driver_str, DatabaseDriver};
pub use pool::DatabasePool;
pub use types::{
    ColumnInfo, ErDiagramData, ExplainResult, QueryResult, TableInfo,
};

use crate::config::connections::{ConnectionInput, ConnectionSummary, ConnectionsStore};
use crate::config::query_history::{QueryHistoryEntry, QueryHistoryStore};
use crate::config::saved_queries::{SaveQueryInput, SavedQueriesStore, SavedQuery};
use crate::error::{AppError, AppResult};

pub struct DbManager {
    backends: Arc<RwLock<HashMap<String, Arc<ConnectedBackend>>>>,
    active_connection: Arc<RwLock<Option<String>>>,
    cancel_tokens: Arc<Mutex<HashMap<String, CancellationToken>>>,
    connections_store: Arc<ConnectionsStore>,
    query_history: Arc<QueryHistoryStore>,
    saved_queries: Arc<SavedQueriesStore>,
}

impl DbManager {
    pub fn new(
        connections_store: ConnectionsStore,
        query_history: QueryHistoryStore,
        saved_queries: SavedQueriesStore,
    ) -> Self {
        Self {
            backends: Arc::new(RwLock::new(HashMap::new())),
            active_connection: Arc::new(RwLock::new(None)),
            cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
            connections_store: Arc::new(connections_store),
            query_history: Arc::new(query_history),
            saved_queries: Arc::new(saved_queries),
        }
    }

    async fn backend_for(
        backends: Arc<RwLock<HashMap<String, Arc<ConnectedBackend>>>>,
        connection_id: String,
    ) -> AppResult<Arc<ConnectedBackend>> {
        let guard = backends.read().await;
        guard
            .get(&connection_id)
            .cloned()
            .ok_or_else(|| AppError::NotConnected(format!("Connection {connection_id} is not active")))
    }

    async fn remove_cancel_token(
        cancel_tokens: Arc<Mutex<HashMap<String, CancellationToken>>>,
        query_id: String,
    ) {
        let mut tokens = cancel_tokens.lock().await;
        tokens.remove(&query_id);
    }

    pub async fn list_connections(&self) -> AppResult<Vec<ConnectionSummary>> {
        self.connections_store.list()
    }

    pub async fn save_connection(&self, input: ConnectionInput) -> AppResult<ConnectionSummary> {
        self.connections_store.save(input)
    }

    pub async fn delete_connection(&self, id: &str) -> AppResult<()> {
        self.disconnect(id).await?;
        self.connections_store.delete(id)
    }

    pub async fn test_connection(&self, input: ConnectionInput) -> AppResult<bool> {
        let config = input.to_config()?;
        ConnectedBackend::test(&config).await?;
        Ok(true)
    }

    pub async fn connect(&self, connection_id: &str) -> AppResult<()> {
        let config = self.connections_store.get(connection_id)?;
        let backend = Arc::new(ConnectedBackend::connect(config).await?);

        {
            let mut backends = self.backends.write().await;
            if let Some(old) = backends.remove(connection_id) {
                old.close().await;
            }
            backends.insert(connection_id.to_string(), backend);
        }

        let mut active = self.active_connection.write().await;
        *active = Some(connection_id.to_string());
        Ok(())
    }

    pub async fn disconnect(&self, connection_id: &str) -> AppResult<()> {
        {
            let mut backends = self.backends.write().await;
            if let Some(backend) = backends.remove(connection_id) {
                backend.close().await;
            }
        }

        let mut active = self.active_connection.write().await;
        if active.as_deref() == Some(connection_id) {
            *active = None;
        }

        Ok(())
    }

    pub async fn get_active_connection(&self) -> AppResult<String> {
        let active = self.active_connection.read().await;
        active
            .clone()
            .ok_or_else(|| AppError::NotConnected("No active connection".into()))
    }

    pub async fn get_server_version(&self, connection_id: &str) -> AppResult<String> {
        let backend = Self::backend_for(self.backends.clone(), connection_id.to_string()).await?;
        backend.server_version().await
    }

    pub async fn list_databases(&self, connection_id: &str) -> AppResult<Vec<String>> {
        let backend = Self::backend_for(self.backends.clone(), connection_id.to_string()).await?;
        backend.list_databases().await
    }

    pub async fn list_schemas(&self, connection_id: &str, database: &str) -> AppResult<Vec<String>> {
        let backend = Self::backend_for(self.backends.clone(), connection_id.to_string()).await?;
        backend.list_schemas(database).await
    }

    pub async fn list_tables(
        &self,
        connection_id: &str,
        schema: &str,
    ) -> AppResult<Vec<TableInfo>> {
        let backend = Self::backend_for(self.backends.clone(), connection_id.to_string()).await?;
        backend.list_tables(schema).await
    }

    pub async fn list_columns(
        &self,
        connection_id: &str,
        schema: &str,
        table: &str,
    ) -> AppResult<Vec<ColumnInfo>> {
        let backend = Self::backend_for(self.backends.clone(), connection_id.to_string()).await?;
        backend.list_columns(schema, table).await
    }

    pub async fn get_table_relations(
        &self,
        connection_id: &str,
        schema: &str,
    ) -> AppResult<ErDiagramData> {
        let backend = Self::backend_for(self.backends.clone(), connection_id.to_string()).await?;
        er::get_table_relations(backend.as_ref(), schema).await
    }

    pub async fn execute_query(
        &self,
        connection_id: String,
        query_id: String,
        sql: String,
    ) -> AppResult<QueryResult> {
        let cancel_tokens = self.cancel_tokens.clone();
        let query_history = self.query_history.clone();
        let backends = self.backends.clone();

        let token = CancellationToken::new();
        {
            let mut tokens = cancel_tokens.lock().await;
            tokens.insert(query_id.clone(), token.clone());
        }

        let backend = Self::backend_for(backends, connection_id.clone()).await?;
        let pool = backend.pool().clone();
        let cancel_handle = query::prepare_cancel(&pool).await?;

        let trimmed = sql.trim().to_string();
        let result = query::execute_query(
            pool,
            trimmed.clone(),
            token.clone(),
            cancel_handle,
        )
        .await;

        Self::remove_cancel_token(cancel_tokens, query_id).await;

        let execution_time_ms = result
            .as_ref()
            .map(|r| r.execution_time_ms)
            .unwrap_or(0);

        match &result {
            Ok(query_result) => {
                let _ = query_history.append(QueryHistoryEntry {
                    id: Uuid::new_v4().to_string(),
                    sql: trimmed.to_string(),
                    connection_id: Some(connection_id.to_string()),
                    executed_at: Utc::now(),
                    execution_time_ms,
                    row_count: query_result.row_count,
                    success: true,
                    error: None,
                });
            }
            Err(error) => {
                let _ = query_history.append(QueryHistoryEntry {
                    id: Uuid::new_v4().to_string(),
                    sql: trimmed.to_string(),
                    connection_id: Some(connection_id.to_string()),
                    executed_at: Utc::now(),
                    execution_time_ms,
                    row_count: 0,
                    success: false,
                    error: Some(error.to_string()),
                });
            }
        }

        result
    }

    pub async fn explain_query(
        &self,
        connection_id: String,
        query_id: String,
        sql: String,
    ) -> AppResult<ExplainResult> {
        let cancel_tokens = self.cancel_tokens.clone();
        let backends = self.backends.clone();

        let token = CancellationToken::new();
        {
            let mut tokens = cancel_tokens.lock().await;
            tokens.insert(query_id.clone(), token.clone());
        }

        let backend = Self::backend_for(backends, connection_id).await?;
        let pool = backend.pool().clone();
        let cancel_handle = query::prepare_cancel(&pool).await?;

        let result = explain::explain_query(pool, sql.trim().to_string(), token, cancel_handle).await;
        Self::remove_cancel_token(cancel_tokens, query_id).await;
        result
    }

    pub async fn cancel_query(&self, query_id: &str) -> AppResult<()> {
        let tokens = self.cancel_tokens.lock().await;
        if let Some(token) = tokens.get(query_id) {
            token.cancel();
            Ok(())
        } else {
            Err(AppError::QueryNotFound(query_id.to_string()))
        }
    }

    pub async fn list_query_history(&self, limit: usize) -> AppResult<Vec<QueryHistoryEntry>> {
        self.query_history.list(limit)
    }

    pub fn list_saved_queries(&self) -> AppResult<Vec<SavedQuery>> {
        self.saved_queries.list()
    }

    pub fn save_query(&self, input: SaveQueryInput) -> AppResult<SavedQuery> {
        self.saved_queries.save(input)
    }

    pub fn delete_saved_query(&self, id: &str) -> AppResult<()> {
        self.saved_queries.delete(id)
    }

    pub fn export_csv(result: &QueryResult) -> String {
        let mut output = String::new();
        output.push_str(&query::escape_csv_line(&result.columns));
        output.push('\n');

        for row in &result.rows {
            let line: Vec<String> = row
                .iter()
                .map(|v| v.as_deref().unwrap_or("").to_string())
                .collect();
            output.push_str(&query::escape_csv_line(&line));
            output.push('\n');
        }

        output
    }

    pub fn export_json(result: &QueryResult) -> AppResult<String> {
        let objects: Vec<HashMap<String, Option<String>>> = result
            .rows
            .iter()
            .map(|row| {
                result
                    .columns
                    .iter()
                    .enumerate()
                    .map(|(i, col)| (col.clone(), row.get(i).cloned().flatten()))
                    .collect()
            })
            .collect();

        Ok(serde_json::to_string_pretty(&objects)?)
    }

    pub fn export_insert(
        result: &QueryResult,
        schema: &str,
        table: &str,
    ) -> AppResult<String> {
        if result.columns.is_empty() {
            return Ok(String::new());
        }

        let mut statements = String::new();
        for row in &result.rows {
            let values: Vec<String> = row
                .iter()
                .map(|v| match v {
                    Some(s) => format!("'{}'", s.replace('\'', "''")),
                    None => "NULL".into(),
                })
                .collect();

            statements.push_str(&format!(
                "INSERT INTO \"{}\".\"{}\" ({}) VALUES ({});\n",
                schema,
                table,
                result
                    .columns
                    .iter()
                    .map(|c| format!("\"{c}\""))
                    .collect::<Vec<_>>()
                    .join(", "),
                values.join(", ")
            ));
        }

        Ok(statements)
    }
}
