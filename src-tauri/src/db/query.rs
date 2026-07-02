use std::time::Instant;

use tokio_util::sync::CancellationToken;

use crate::db::introspection::{mysql, postgres};
use crate::db::pool::DatabasePool;
use crate::db::types::QueryResult;
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub enum CancelHandle {
    Postgres(i32),
    Mysql(u64),
    Sqlite,
}

pub async fn prepare_cancel(pool: &DatabasePool) -> AppResult<CancelHandle> {
    match pool {
        DatabasePool::Postgres(p) => Ok(CancelHandle::Postgres(postgres::backend_pid(p.clone()).await?)),
        DatabasePool::MySql(p) => Ok(CancelHandle::Mysql(mysql::connection_id(p.clone()).await?)),
        DatabasePool::Sqlite(_) => Ok(CancelHandle::Sqlite),
    }
}

pub async fn cancel_query(pool: DatabasePool, handle: CancelHandle) {
    match (pool, handle) {
        (DatabasePool::Postgres(p), CancelHandle::Postgres(pid)) => {
            postgres::cancel_backend(p, pid).await;
        }
        (DatabasePool::MySql(p), CancelHandle::Mysql(id)) => {
            mysql::kill_query(p, id).await;
        }
        _ => {}
    }
}

pub async fn execute_query(
    pool: DatabasePool,
    sql: String,
    token: CancellationToken,
    cancel_handle: CancelHandle,
) -> AppResult<QueryResult> {
    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return Err(AppError::Message("Query is empty".into()));
    }

    let lower = trimmed.to_lowercase();
    let is_select = lower.starts_with("select")
        || lower.starts_with("with")
        || lower.starts_with("show")
        || lower.starts_with("explain")
        || lower.starts_with("pragma")
        || lower.starts_with("table");

    let start = Instant::now();
    let result = if is_select {
        execute_select(pool, trimmed.to_string(), token, cancel_handle).await
    } else {
        execute_mutation(pool, trimmed.to_string(), token, cancel_handle).await
    };

    match result {
        Ok(mut query_result) => {
            query_result.execution_time_ms = start.elapsed().as_millis() as u64;
            Ok(query_result)
        }
        Err(err) => Err(err),
    }
}

async fn execute_select(
    pool: DatabasePool,
    sql: String,
    token: CancellationToken,
    cancel_handle: CancelHandle,
) -> AppResult<QueryResult> {
    let pool_query = pool.clone();
    let pool_cancel = pool.clone();
    let sql_query = sql.clone();
    let token_cancel = token.clone();
    let cancel_handle_cancel = cancel_handle.clone();

    let query_handle = tokio::spawn(async move { pool_query.fetch_rows(&sql_query).await });

    let (columns, rows, truncated) = tokio::select! {
        res = query_handle => match res {
            Ok(Ok(result)) => result,
            Ok(Err(err)) => return Err(err.into()),
            Err(err) => {
                return Err(AppError::Message(format!("Query task failed: {err}")));
            }
        },
        _ = async move {
            token_cancel.cancelled().await;
        } => {
            cancel_query(pool_cancel, cancel_handle_cancel).await;
            return Err(AppError::Message("Query cancelled".into()));
        }
    };

    if token.is_cancelled() {
        return Err(AppError::Message("Query cancelled".into()));
    }

    let row_count = rows.len();

    Ok(QueryResult {
        columns,
        rows,
        row_count,
        affected_rows: None,
        execution_time_ms: 0,
        truncated,
    })
}

async fn execute_mutation(
    pool: DatabasePool,
    sql: String,
    token: CancellationToken,
    cancel_handle: CancelHandle,
) -> AppResult<QueryResult> {
    let pool_query = pool.clone();
    let pool_cancel = pool.clone();
    let sql_query = sql.clone();
    let token_cancel = token.clone();
    let cancel_handle_cancel = cancel_handle.clone();

    let query_handle = tokio::spawn(async move { pool_query.execute_mutation(&sql_query).await });

    let mut result = tokio::select! {
        res = query_handle => match res {
            Ok(Ok(result)) => result,
            Ok(Err(err)) => return Err(err.into()),
            Err(err) => {
                return Err(AppError::Message(format!("Query task failed: {err}")));
            }
        },
        _ = async move {
            token_cancel.cancelled().await;
        } => {
            cancel_query(pool_cancel, cancel_handle_cancel).await;
            return Err(AppError::Message("Query cancelled".into()));
        }
    };

    result.execution_time_ms = 0;
    Ok(result)
}

pub fn escape_csv_line(fields: &[String]) -> String {
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
