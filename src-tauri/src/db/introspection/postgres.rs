use std::collections::{HashMap, HashSet};

use sqlx::PgPool;

use crate::db::types::{ColumnInfo, ForeignKeyRef, TableInfo};
use crate::error::AppResult;

pub async fn list_databases(pool: &PgPool) -> AppResult<Vec<String>> {
    let rows: Vec<(String,)> =
        sqlx::query_as("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
            .fetch_all(pool)
            .await?;
    Ok(rows.into_iter().map(|(name,)| name).collect())
}

pub async fn list_schemas(pool: &PgPool, database: &str, active_database: &str) -> AppResult<Vec<String>> {
    if database != active_database {
        return Err(crate::error::AppError::Message(format!(
            "Solo se pueden listar schemas de la base de datos activa ('{active_database}')."
        )));
    }

    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT schema_name FROM information_schema.schemata \
         WHERE schema_name NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1') \
           AND schema_name NOT LIKE 'pg_temp_%' \
           AND schema_name NOT LIKE 'pg_toast_temp_%' \
         ORDER BY schema_name",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|(name,)| name).collect())
}

pub async fn list_tables(pool: &PgPool, schema: &str) -> AppResult<Vec<TableInfo>> {
    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT table_name FROM information_schema.tables \
         WHERE table_schema = $1 AND table_type = 'BASE TABLE' \
         ORDER BY table_name",
    )
    .bind(schema)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(name,)| TableInfo {
            name,
            schema: schema.to_string(),
        })
        .collect())
}

pub async fn list_columns(pool: &PgPool, schema: &str, table: &str) -> AppResult<Vec<ColumnInfo>> {
    let columns: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT column_name, data_type, is_nullable \
         FROM information_schema.columns \
         WHERE table_schema = $1 AND table_name = $2 \
         ORDER BY ordinal_position",
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
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
    .fetch_all(pool)
    .await?;

    let pk_set: HashSet<String> = pk_rows.into_iter().map(|(c,)| c).collect();

    let fk_rows: Vec<(String, String, String, String)> = sqlx::query_as(
        "SELECT kcu.column_name, ccu.table_schema, ccu.table_name, ccu.column_name \
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
    .fetch_all(pool)
    .await?;

    let fk_map: HashMap<String, (String, String, String)> = fk_rows
        .into_iter()
        .map(|(col, ref_schema, ref_table, ref_col)| (col, (ref_schema, ref_table, ref_col)))
        .collect();

    Ok(columns
        .into_iter()
        .map(|(name, data_type, nullable)| {
            let foreign_key = fk_map.get(&name).map(|(s, t, c)| ForeignKeyRef {
                schema: s.clone(),
                table: t.clone(),
                column: Some(c.clone()),
            });

            ColumnInfo {
                name: name.clone(),
                data_type,
                nullable: nullable == "YES",
                is_primary_key: pk_set.contains(&name),
                foreign_key,
            }
        })
        .collect())
}

pub async fn server_version(pool: &PgPool) -> AppResult<String> {
    let version: (String,) = sqlx::query_as("SHOW server_version").fetch_one(pool).await?;
    Ok(format!("PostgreSQL {}", version.0))
}

pub async fn backend_pid(pool: PgPool) -> AppResult<i32> {
    let pid: (i32,) = sqlx::query_as("SELECT pg_backend_pid()").fetch_one(&pool).await?;
    Ok(pid.0)
}

pub async fn cancel_backend(pool: PgPool, backend_pid: i32) {
    let _ = sqlx::query("SELECT pg_cancel_backend($1)")
        .bind(backend_pid)
        .execute(&pool)
        .await;
}
