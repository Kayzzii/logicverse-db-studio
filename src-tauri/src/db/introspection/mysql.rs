use std::collections::{HashMap, HashSet};

use sqlx::MySqlPool;

use crate::db::types::{ColumnInfo, ForeignKeyRef, TableInfo};
use crate::error::AppResult;

pub async fn list_databases(pool: &MySqlPool) -> AppResult<Vec<String>> {
    let rows: Vec<(String,)> = sqlx::query_as("SHOW DATABASES").fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .map(|(name,)| name)
        .filter(|name| {
            !matches!(
                name.as_str(),
                "information_schema" | "performance_schema" | "mysql" | "sys"
            )
        })
        .collect())
}

pub async fn list_schemas(pool: &MySqlPool, database: &str, active_database: &str) -> AppResult<Vec<String>> {
    if database != active_database {
        return Err(crate::error::AppError::Message(format!(
            "Solo se pueden listar schemas de la base de datos activa ('{active_database}')."
        )));
    }

    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT schema_name FROM information_schema.schemata \
         WHERE schema_name NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys') \
         ORDER BY schema_name",
    )
    .fetch_all(pool)
    .await?;

    if rows.is_empty() {
        return Ok(vec![database.to_string()]);
    }

    Ok(rows.into_iter().map(|(name,)| name).collect())
}

pub async fn list_tables(pool: &MySqlPool, schema: &str) -> AppResult<Vec<TableInfo>> {
    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT table_name FROM information_schema.tables \
         WHERE table_schema = ? AND table_type = 'BASE TABLE' \
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

pub async fn list_columns(pool: &MySqlPool, schema: &str, table: &str) -> AppResult<Vec<ColumnInfo>> {
    let columns: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT column_name, data_type, is_nullable \
         FROM information_schema.columns \
         WHERE table_schema = ? AND table_name = ? \
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
           AND tc.table_schema = ? AND tc.table_name = ?",
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await?;

    let pk_set: HashSet<String> = pk_rows.into_iter().map(|(c,)| c).collect();

    let fk_rows: Vec<(String, Option<String>, String, String)> = sqlx::query_as(
        "SELECT kcu.column_name, kcu.referenced_table_schema, kcu.referenced_table_name, kcu.referenced_column_name \
         FROM information_schema.key_column_usage kcu \
         WHERE kcu.table_schema = ? AND kcu.table_name = ? \
           AND kcu.referenced_table_name IS NOT NULL",
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await?;

    let fk_map: HashMap<String, (String, String, String)> = fk_rows
        .into_iter()
        .map(|(col, ref_schema, ref_table, ref_col)| {
            (
                col,
                (
                    ref_schema.unwrap_or_else(|| schema.to_string()),
                    ref_table,
                    ref_col,
                ),
            )
        })
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

pub async fn server_version(pool: &MySqlPool) -> AppResult<String> {
    let version: (String,) = sqlx::query_as("SELECT VERSION()").fetch_one(pool).await?;
    Ok(format!("MySQL {}", version.0))
}

pub async fn connection_id(pool: MySqlPool) -> AppResult<u64> {
    let id: (u64,) = sqlx::query_as("SELECT CONNECTION_ID()").fetch_one(&pool).await?;
    Ok(id.0)
}

pub async fn kill_query(pool: MySqlPool, connection_id: u64) {
    let _ = sqlx::raw_sql(&format!("KILL QUERY {connection_id}"))
        .execute(&pool)
        .await;
}
