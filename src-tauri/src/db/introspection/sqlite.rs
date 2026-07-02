use sqlx::{Row, SqlitePool};

use crate::db::types::{ColumnInfo, ForeignKeyRef, TableInfo};
use crate::error::AppResult;

pub async fn list_databases(_pool: &SqlitePool, file_label: &str) -> AppResult<Vec<String>> {
    Ok(vec![file_label.to_string()])
}

pub async fn list_schemas(_pool: &SqlitePool, database: &str, active_database: &str) -> AppResult<Vec<String>> {
    if database != active_database {
        return Err(crate::error::AppError::Message(format!(
            "Solo se pueden listar schemas de la base de datos activa ('{active_database}')."
        )));
    }
    Ok(vec!["main".to_string()])
}

pub async fn list_tables(pool: &SqlitePool, schema: &str) -> AppResult<Vec<TableInfo>> {
    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT name FROM sqlite_master \
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%' \
         ORDER BY name",
    )
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

pub async fn list_columns(pool: &SqlitePool, schema: &str, table: &str) -> AppResult<Vec<ColumnInfo>> {
    let pragma_sql = format!("PRAGMA table_info(\"{table}\")");
    let rows = sqlx::query(&pragma_sql).fetch_all(pool).await?;

    let mut columns = Vec::new();
    for row in rows {
        let name: String = row.try_get("name")?;
        let data_type: String = row.try_get("type")?;
        let not_null: i64 = row.try_get("notnull")?;
        let pk: i64 = row.try_get("pk")?;
        columns.push(ColumnInfo {
            name,
            data_type,
            nullable: not_null == 0,
            is_primary_key: pk > 0,
            foreign_key: None,
        });
    }

    let fk_sql = format!("PRAGMA foreign_key_list(\"{table}\")");
    let fk_rows = sqlx::query(&fk_sql).fetch_all(pool).await?;

    for row in fk_rows {
        let from_col: String = row.try_get("from")?;
        let to_table: String = row.try_get("table")?;
        let to_col: String = row.try_get("to")?;
        if let Some(col) = columns.iter_mut().find(|c| c.name == from_col) {
            col.foreign_key = Some(ForeignKeyRef {
                schema: schema.to_string(),
                table: to_table,
                column: Some(to_col),
            });
        }
    }

    Ok(columns)
}

pub async fn server_version(pool: &SqlitePool) -> AppResult<String> {
    let version: (String,) = sqlx::query_as("SELECT sqlite_version()").fetch_one(pool).await?;
    Ok(format!("SQLite {}", version.0))
}
