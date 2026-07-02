use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Instant;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use sqlx::{Column, PgPool, Row, TypeInfo};
use tokio::sync::{Mutex, RwLock};
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

use crate::config::connections::{ConnectionConfig, ConnectionInput, ConnectionSummary, ConnectionsStore};
use crate::config::query_history::{QueryHistoryEntry, QueryHistoryStore};
use crate::error::{AppError, AppResult};

const MAX_ROWS: usize = 100_000;

#[derive(Clone)]
pub struct DbManager {
    pools: Arc<RwLock<HashMap<String, PgPool>>>,
    active_connection: Arc<RwLock<Option<String>>>,
    cancel_tokens: Arc<Mutex<HashMap<String, CancellationToken>>>,
    connections_store: Arc<ConnectionsStore>,
    query_history: Arc<QueryHistoryStore>,
}

impl DbManager {
    pub fn new(connections_store: ConnectionsStore, query_history: QueryHistoryStore) -> Self {
        Self {
            pools: Arc::new(RwLock::new(HashMap::new())),
            active_connection: Arc::new(RwLock::new(None)),
            cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
            connections_store: Arc::new(connections_store),
            query_history: Arc::new(query_history),
        }
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
        let config = ConnectionConfig {
            id: input.id.clone().unwrap_or_default(),
            name: input.name,
            host: input.host,
            port: input.port,
            database: input.database,
            username: input.username,
            password: input.password,
            ssl_mode: input.ssl_mode,
        };

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(std::time::Duration::from_secs(10))
            .connect(&config.build_url())
            .await?;

        sqlx::query("SELECT 1").fetch_one(&pool).await?;
        pool.close().await;
        Ok(true)
    }

    pub async fn connect(&self, connection_id: &str) -> AppResult<()> {
        let config = self.connections_store.get(connection_id)?;

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(15))
            .connect(&config.build_url())
            .await?;

        {
            let mut pools = self.pools.write().await;
            if let Some(old) = pools.remove(connection_id) {
                old.close().await;
            }
            pools.insert(connection_id.to_string(), pool);
        }

        let mut active = self.active_connection.write().await;
        *active = Some(connection_id.to_string());
        Ok(())
    }

    pub async fn disconnect(&self, connection_id: &str) -> AppResult<()> {
        {
            let mut pools = self.pools.write().await;
            if let Some(pool) = pools.remove(connection_id) {
                pool.close().await;
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

    async fn pool_for(&self, connection_id: &str) -> AppResult<PgPool> {
        let pools = self.pools.read().await;
        pools
            .get(connection_id)
            .cloned()
            .ok_or_else(|| AppError::NotConnected(format!("Connection {connection_id} is not active")))
    }

    pub async fn list_databases(&self, connection_id: &str) -> AppResult<Vec<String>> {
        let pool = self.pool_for(connection_id).await?;
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname",
        )
        .fetch_all(&pool)
        .await?;

        Ok(rows.into_iter().map(|(name,)| name).collect())
    }

    pub async fn list_schemas(&self, connection_id: &str, database: &str) -> AppResult<Vec<String>> {
        let config = self.connections_store.get(connection_id)?;

        if database != config.database {
            return Err(AppError::Message(format!(
                "Solo se pueden listar schemas de la base de datos activa ('{}'). Reconectá a '{database}' para explorarla.",
                config.database
            )));
        }

        let pool = self.pool_for(connection_id).await?;
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT schema_name FROM information_schema.schemata \
             WHERE schema_name NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1') \
               AND schema_name NOT LIKE 'pg_temp_%' \
               AND schema_name NOT LIKE 'pg_toast_temp_%' \
             ORDER BY schema_name",
        )
        .fetch_all(&pool)
        .await?;

        Ok(rows.into_iter().map(|(name,)| name).collect())
    }

    pub async fn list_tables(
        &self,
        connection_id: &str,
        schema: &str,
    ) -> AppResult<Vec<TableInfo>> {
        let pool = self.pool_for(connection_id).await?;
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT table_name FROM information_schema.tables \
             WHERE table_schema = $1 AND table_type = 'BASE TABLE' \
             ORDER BY table_name",
        )
        .bind(schema)
        .fetch_all(&pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|(name,)| TableInfo {
                name,
                schema: schema.to_string(),
            })
            .collect())
    }

    pub async fn list_columns(
        &self,
        connection_id: &str,
        schema: &str,
        table: &str,
    ) -> AppResult<Vec<ColumnInfo>> {
        let pool = self.pool_for(connection_id).await?;

        let columns: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT column_name, data_type, is_nullable \
             FROM information_schema.columns \
             WHERE table_schema = $1 AND table_name = $2 \
             ORDER BY ordinal_position",
        )
        .bind(schema)
        .bind(table)
        .fetch_all(&pool)
        .await?;

        let pk_rows: Vec<(String,)> = sqlx::query_as(
            "SELECT kcu.column_name \
             FROM information_schema.table_constraints tc \
             JOIN information_schema.key_column_usage kcu \
               ON tc.constraint_name = kcu.constraint_name \
              AND tc.table_schema = kcu.table_schema \
             WHERE tc.constraint_type = 'PRIMARY KEY' \
               AND tc.table_schema = $1 AND tc.table_name = $2",
        )
        .bind(schema)
        .bind(table)
        .fetch_all(&pool)
        .await?;

        let pk_set: HashSet<String> = pk_rows.into_iter().map(|(c,)| c).collect();

        let fk_rows: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT kcu.column_name, ccu.table_schema, ccu.table_name \
             FROM information_schema.table_constraints tc \
             JOIN information_schema.key_column_usage kcu \
               ON tc.constraint_name = kcu.constraint_name \
              AND tc.table_schema = kcu.table_schema \
             JOIN information_schema.constraint_column_usage ccu \
               ON ccu.constraint_name = tc.constraint_name \
              AND ccu.table_schema = tc.table_schema \
             WHERE tc.constraint_type = 'FOREIGN KEY' \
               AND tc.table_schema = $1 AND tc.table_name = $2",
        )
        .bind(schema)
        .bind(table)
        .fetch_all(&pool)
        .await?;

        let fk_map: HashMap<String, (String, String)> = fk_rows
            .into_iter()
            .map(|(col, ref_schema, ref_table)| (col, (ref_schema, ref_table)))
            .collect();

        Ok(columns
            .into_iter()
            .map(|(name, data_type, nullable)| {
                let is_primary_key = pk_set.contains(&name);
                let foreign_key = fk_map.get(&name).map(|(s, t)| ForeignKeyRef {
                    schema: s.clone(),
                    table: t.clone(),
                });

                ColumnInfo {
                    name,
                    data_type,
                    nullable: nullable == "YES",
                    is_primary_key,
                    foreign_key,
                }
            })
            .collect())
    }

    pub async fn execute_query(
        &self,
        connection_id: &str,
        query_id: &str,
        sql: &str,
    ) -> AppResult<QueryResult> {
        let token = CancellationToken::new();
        {
            let mut tokens = self.cancel_tokens.lock().await;
            tokens.insert(query_id.to_string(), token.clone());
        }

        let pool = self.pool_for(connection_id).await?;
        let start = Instant::now();

        let trimmed = sql.trim();
        if trimmed.is_empty() {
            self.remove_cancel_token(query_id).await;
            return Err(AppError::Message("Query is empty".into()));
        }

        let lower = trimmed.to_lowercase();
        let is_select = lower.starts_with("select")
            || lower.starts_with("with")
            || lower.starts_with("show")
            || lower.starts_with("explain")
            || lower.starts_with("table");

        let result = if is_select {
            self.execute_select(&pool, query_id, trimmed, start, token)
                .await
        } else {
            self.execute_mutation(&pool, query_id, trimmed, start, token)
                .await
        };

        self.remove_cancel_token(query_id).await;

        let execution_time_ms = start.elapsed().as_millis() as u64;
        match &result {
            Ok(query_result) => {
                let _ = self.query_history.append(QueryHistoryEntry {
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
                let _ = self.query_history.append(QueryHistoryEntry {
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

    async fn execute_select(
        &self,
        pool: &PgPool,
        _query_id: &str,
        sql: &str,
        start: Instant,
        token: CancellationToken,
    ) -> AppResult<QueryResult> {
        let mut conn = pool.acquire().await?;
        let backend_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
            .fetch_one(&mut *conn)
            .await?;

        let sql_owned = sql.to_string();
        let pool_for_cancel = pool.clone();

        let rows = tokio::select! {
            res = sqlx::query(&sql_owned).fetch_all(&mut *conn) => res?,
            _ = token.cancelled() => {
                cancel_postgres_query(&pool_for_cancel, backend_pid).await;
                return Err(AppError::Message("Query cancelled".into()));
            }
        };

        if token.is_cancelled() {
            return Err(AppError::Message("Query cancelled".into()));
        }

        if rows.is_empty() {
            return Ok(QueryResult {
                columns: Vec::new(),
                rows: Vec::new(),
                row_count: 0,
                affected_rows: None,
                execution_time_ms: start.elapsed().as_millis() as u64,
                truncated: false,
            });
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect();

        let mut result_rows: Vec<Vec<Option<String>>> = Vec::new();
        let mut truncated = false;

        for (idx, row) in rows.into_iter().enumerate() {
            if token.is_cancelled() {
                return Err(AppError::Message("Query cancelled".into()));
            }

            if idx >= MAX_ROWS {
                truncated = true;
                break;
            }

            let mut values = Vec::with_capacity(columns.len());
            for col_idx in 0..columns.len() {
                values.push(cell_to_string(&row, col_idx)?);
            }
            result_rows.push(values);
        }

        let row_count = result_rows.len();

        Ok(QueryResult {
            columns,
            rows: result_rows,
            row_count,
            affected_rows: None,
            execution_time_ms: start.elapsed().as_millis() as u64,
            truncated,
        })
    }

    async fn execute_mutation(
        &self,
        pool: &PgPool,
        _query_id: &str,
        sql: &str,
        start: Instant,
        token: CancellationToken,
    ) -> AppResult<QueryResult> {
        let mut conn = pool.acquire().await?;
        let backend_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
            .fetch_one(&mut *conn)
            .await?;

        let sql_owned = sql.to_string();
        let pool_for_cancel = pool.clone();

        let result = tokio::select! {
            res = sqlx::query(&sql_owned).execute(&mut *conn) => res?,
            _ = token.cancelled() => {
                cancel_postgres_query(&pool_for_cancel, backend_pid).await;
                return Err(AppError::Message("Query cancelled".into()));
            }
        };

        Ok(QueryResult {
            columns: vec!["Result".into()],
            rows: vec![vec![Some(format!("{} rows affected", result.rows_affected()))]],
            row_count: 1,
            affected_rows: Some(result.rows_affected()),
            execution_time_ms: start.elapsed().as_millis() as u64,
            truncated: false,
        })
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

    async fn remove_cancel_token(&self, query_id: &str) {
        let mut tokens = self.cancel_tokens.lock().await;
        tokens.remove(query_id);
    }

    pub async fn list_query_history(&self, limit: usize) -> AppResult<Vec<QueryHistoryEntry>> {
        self.query_history.list(limit)
    }

    pub fn export_csv(result: &QueryResult) -> String {
        let mut output = String::new();
        output.push_str(&escape_csv_line(&result.columns));
        output.push('\n');

        for row in &result.rows {
            let line: Vec<String> = row
                .iter()
                .map(|v| v.as_deref().unwrap_or("").to_string())
                .collect();
            output.push_str(&escape_csv_line(&line));
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

async fn cancel_postgres_query(pool: &PgPool, backend_pid: i32) {
    if let Ok(mut conn) = pool.acquire().await {
        let _ = sqlx::query("SELECT pg_cancel_backend($1)")
            .bind(backend_pid)
            .execute(&mut *conn)
            .await;
    }
}

fn cell_to_string(row: &sqlx::postgres::PgRow, index: usize) -> AppResult<Option<String>> {
    use rust_decimal::Decimal;
    use sqlx::ValueRef;

    let value = row.try_get_raw(index)?;
    if value.is_null() {
        return Ok(None);
    }

    let binding = value.type_info();
    let type_name = binding.name();

    let text = match type_name {
        "BOOL" => row.try_get::<bool, _>(index).map(|v| v.to_string()),
        "INT2" | "INT4" => row.try_get::<i32, _>(index).map(|v| v.to_string()),
        "INT8" => row.try_get::<i64, _>(index).map(|v| v.to_string()),
        "FLOAT4" | "FLOAT8" => row.try_get::<f64, _>(index).map(|v| v.to_string()),
        "NUMERIC" => row
            .try_get::<Decimal, _>(index)
            .map(|v| v.normalize().to_string()),
        "JSON" | "JSONB" => row
            .try_get::<serde_json::Value, _>(index)
            .map(|v| v.to_string()),
        "UUID" => row
            .try_get::<uuid::Uuid, _>(index)
            .map(|v| v.to_string()),
        "BYTEA" => row.try_get::<Vec<u8>, _>(index).map(|v| BASE64.encode(v)),
        "TIMESTAMP" | "TIMESTAMPTZ" | "DATE" | "TIME" | "TIMETZ" => {
            row.try_get::<String, _>(index)
        }
        _ => row.try_get::<String, _>(index),
    };

    match text {
        Ok(value) => Ok(Some(value)),
        Err(_) => Ok(Some(format!("<{type_name}>"))),
    }
}

fn escape_csv_line(fields: &[String]) -> String {
    fields
        .iter()
        .map(|field| {
            if field.contains(',') || field.contains('"') || field.contains('\n') {
                format!("\"{}\"", field.replace('"', "\"\""))
            } else {
                field.clone()
            }
        })
        .collect::<Vec<_>>()
        .join(",")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub name: String,
    pub schema: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKeyRef {
    pub schema: String,
    pub table: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub is_primary_key: bool,
    pub foreign_key: Option<ForeignKeyRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    pub row_count: usize,
    pub affected_rows: Option<u64>,
    pub execution_time_ms: u64,
    pub truncated: bool,
}
