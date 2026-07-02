use std::time::Duration;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rust_decimal::Decimal;
use sqlx::mysql::MySqlRow;
use sqlx::postgres::PgRow;
use sqlx::sqlite::SqliteRow;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::postgres::PgPoolOptions;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Column, MySqlPool, PgPool, Row, SqlitePool, TypeInfo};

use crate::db::driver::DatabaseDriver;
use crate::db::types::QueryResult;
use crate::error::AppResult;

const MAX_ROWS: usize = 100_000;

#[derive(Clone)]
pub enum DatabasePool {
    Postgres(PgPool),
    MySql(MySqlPool),
    Sqlite(SqlitePool),
}

impl DatabasePool {
    pub async fn connect(url: &str, driver: DatabaseDriver) -> AppResult<Self> {
        match driver {
            DatabaseDriver::Postgres => {
                let pool = PgPoolOptions::new()
                    .max_connections(5)
                    .acquire_timeout(Duration::from_secs(15))
                    .connect(url)
                    .await?;
                Ok(Self::Postgres(pool))
            }
            DatabaseDriver::Mysql => {
                let pool = MySqlPoolOptions::new()
                    .max_connections(5)
                    .acquire_timeout(Duration::from_secs(15))
                    .connect(url)
                    .await?;
                Ok(Self::MySql(pool))
            }
            DatabaseDriver::Sqlite => {
                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .acquire_timeout(Duration::from_secs(15))
                    .connect(url)
                    .await?;
                Ok(Self::Sqlite(pool))
            }
        }
    }

    pub async fn connect_test(url: &str, driver: DatabaseDriver) -> AppResult<Self> {
        match driver {
            DatabaseDriver::Postgres => {
                let pool = PgPoolOptions::new()
                    .max_connections(1)
                    .acquire_timeout(Duration::from_secs(10))
                    .connect(url)
                    .await?;
                Ok(Self::Postgres(pool))
            }
            DatabaseDriver::Mysql => {
                let pool = MySqlPoolOptions::new()
                    .max_connections(1)
                    .acquire_timeout(Duration::from_secs(10))
                    .connect(url)
                    .await?;
                Ok(Self::MySql(pool))
            }
            DatabaseDriver::Sqlite => {
                let pool = SqlitePoolOptions::new()
                    .max_connections(1)
                    .acquire_timeout(Duration::from_secs(10))
                    .connect(url)
                    .await?;
                Ok(Self::Sqlite(pool))
            }
        }
    }

    pub fn driver(&self) -> DatabaseDriver {
        match self {
            Self::Postgres(_) => DatabaseDriver::Postgres,
            Self::MySql(_) => DatabaseDriver::Mysql,
            Self::Sqlite(_) => DatabaseDriver::Sqlite,
        }
    }

    pub async fn ping(&self) -> AppResult<()> {
        match self {
            Self::Postgres(pool) => {
                sqlx::query("SELECT 1").fetch_one(pool).await?;
            }
            Self::MySql(pool) => {
                sqlx::query("SELECT 1").fetch_one(pool).await?;
            }
            Self::Sqlite(pool) => {
                sqlx::query("SELECT 1").fetch_one(pool).await?;
            }
        }
        Ok(())
    }

    pub async fn close(&self) {
        match self {
            Self::Postgres(pool) => pool.close().await,
            Self::MySql(pool) => pool.close().await,
            Self::Sqlite(pool) => pool.close().await,
        }
    }

    pub async fn fetch_rows(
        &self,
        sql: &str,
    ) -> AppResult<(Vec<String>, Vec<Vec<Option<String>>>, bool)> {
        match self {
            Self::Postgres(pool) => fetch_pg_rows(pool, sql).await,
            Self::MySql(pool) => fetch_mysql_rows(pool, sql).await,
            Self::Sqlite(pool) => fetch_sqlite_rows(pool, sql).await,
        }
    }

    pub async fn execute_mutation(&self, sql: &str) -> AppResult<QueryResult> {
        let affected = match self {
            Self::Postgres(pool) => sqlx::query(sql).execute(pool).await?.rows_affected(),
            Self::MySql(pool) => sqlx::query(sql).execute(pool).await?.rows_affected(),
            Self::Sqlite(pool) => sqlx::query(sql).execute(pool).await?.rows_affected(),
        };

        Ok(QueryResult {
            columns: vec!["Result".into()],
            rows: vec![vec![Some(format!("{affected} rows affected"))]],
            row_count: 1,
            affected_rows: Some(affected),
            execution_time_ms: 0,
            truncated: false,
        })
    }
}

async fn fetch_pg_rows(
    pool: &PgPool,
    sql: &str,
) -> AppResult<(Vec<String>, Vec<Vec<Option<String>>>, bool)> {
    let rows = sqlx::query(sql).fetch_all(pool).await?;
    rows_to_strings(&rows, pg_cell_to_string)
}

async fn fetch_mysql_rows(
    pool: &MySqlPool,
    sql: &str,
) -> AppResult<(Vec<String>, Vec<Vec<Option<String>>>, bool)> {
    let rows = sqlx::query(sql).fetch_all(pool).await?;
    rows_to_strings(&rows, mysql_cell_to_string)
}

async fn fetch_sqlite_rows(
    pool: &SqlitePool,
    sql: &str,
) -> AppResult<(Vec<String>, Vec<Vec<Option<String>>>, bool)> {
    let rows = sqlx::query(sql).fetch_all(pool).await?;
    rows_to_strings(&rows, sqlite_cell_to_string)
}

fn rows_to_strings<R: Row>(
    rows: &[R],
    cell_fn: fn(&R, usize) -> AppResult<Option<String>>,
) -> AppResult<(Vec<String>, Vec<Vec<Option<String>>>, bool)> {
    if rows.is_empty() {
        return Ok((Vec::new(), Vec::new(), false));
    }

    let columns: Vec<String> = rows[0]
        .columns()
        .iter()
        .map(|c| c.name().to_string())
        .collect();

    let mut result_rows = Vec::new();
    let mut truncated = false;

    for (idx, row) in rows.iter().enumerate() {
        if idx >= MAX_ROWS {
            truncated = true;
            break;
        }
        let mut values = Vec::with_capacity(columns.len());
        for col_idx in 0..columns.len() {
            values.push(cell_fn(row, col_idx)?);
        }
        result_rows.push(values);
    }

    Ok((columns, result_rows, truncated))
}

fn pg_cell_to_string(row: &PgRow, index: usize) -> AppResult<Option<String>> {
    use sqlx::ValueRef;

    let value = row.try_get_raw(index)?;
    if value.is_null() {
        return Ok(None);
    }

    let type_info = value.type_info();
    let type_name = type_info.name();
    let text = match type_name {
        "BOOL" | "BOOLEAN" => row.try_get::<bool, _>(index).map(|v| v.to_string()),
        "INT2" | "INT4" | "INTEGER" => row.try_get::<i32, _>(index).map(|v| v.to_string()),
        "INT8" | "BIGINT" => row.try_get::<i64, _>(index).map(|v| v.to_string()),
        "FLOAT4" | "FLOAT8" | "REAL" | "DOUBLE PRECISION" => {
            row.try_get::<f64, _>(index).map(|v| v.to_string())
        }
        "NUMERIC" | "DECIMAL" => row
            .try_get::<Decimal, _>(index)
            .map(|v| v.normalize().to_string()),
        "JSON" | "JSONB" => row
            .try_get::<serde_json::Value, _>(index)
            .map(|v| v.to_string()),
        "UUID" => row.try_get::<uuid::Uuid, _>(index).map(|v| v.to_string()),
        "BYTEA" => row
            .try_get::<Vec<u8>, _>(index)
            .map(|v| BASE64.encode(v)),
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

fn mysql_cell_to_string(row: &MySqlRow, index: usize) -> AppResult<Option<String>> {
    use sqlx::ValueRef;

    let value = row.try_get_raw(index)?;
    if value.is_null() {
        return Ok(None);
    }

    let type_info = value.type_info();
    let type_name = type_info.name();
    let text = match type_name {
        "TINYINT" | "SMALLINT" | "MEDIUMINT" | "INT" => {
            row.try_get::<i32, _>(index).map(|v| v.to_string())
        }
        "BIGINT" => row.try_get::<i64, _>(index).map(|v| v.to_string()),
        "FLOAT" | "DOUBLE" => row.try_get::<f64, _>(index).map(|v| v.to_string()),
        "DECIMAL" | "NUMERIC" => row
            .try_get::<Decimal, _>(index)
            .map(|v| v.normalize().to_string()),
        "JSON" => row
            .try_get::<serde_json::Value, _>(index)
            .map(|v| v.to_string()),
        "BLOB" | "BINARY" | "VARBINARY" => row
            .try_get::<Vec<u8>, _>(index)
            .map(|v| BASE64.encode(v)),
        _ => row.try_get::<String, _>(index),
    };

    match text {
        Ok(value) => Ok(Some(value)),
        Err(_) => {
            if let Ok(v) = row.try_get::<i64, _>(index) {
                return Ok(Some(v.to_string()));
            }
            if let Ok(v) = row.try_get::<f64, _>(index) {
                return Ok(Some(v.to_string()));
            }
            if let Ok(v) = row.try_get::<bool, _>(index) {
                return Ok(Some(v.to_string()));
            }
            Ok(Some(format!("<{type_name}>")))
        }
    }
}

fn sqlite_cell_to_string(row: &SqliteRow, index: usize) -> AppResult<Option<String>> {
    use sqlx::ValueRef;

    let value = row.try_get_raw(index)?;
    if value.is_null() {
        return Ok(None);
    }

    if let Ok(v) = row.try_get::<String, _>(index) {
        return Ok(Some(v));
    }
    if let Ok(v) = row.try_get::<i64, _>(index) {
        return Ok(Some(v.to_string()));
    }
    if let Ok(v) = row.try_get::<f64, _>(index) {
        return Ok(Some(v.to_string()));
    }
    if let Ok(v) = row.try_get::<bool, _>(index) {
        return Ok(Some(v.to_string()));
    }
    if let Ok(v) = row.try_get::<Vec<u8>, _>(index) {
        return Ok(Some(BASE64.encode(v)));
    }
    Ok(Some("<binary>".to_string()))
}
