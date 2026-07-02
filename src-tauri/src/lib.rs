mod config;
mod db;
mod error;
mod security;

use std::sync::Arc;

use tauri::Manager;
use uuid::Uuid;

use config::connections::{ConnectionInput, ConnectionSummary};
use config::query_history::QueryHistoryEntry;
use db::{ColumnInfo, DbManager, QueryResult, TableInfo};
use error::AppResult;

#[derive(Clone)]
struct AppState {
    db: Arc<DbManager>,
}

#[tauri::command]
async fn list_connections(state: tauri::State<'_, AppState>) -> AppResult<Vec<ConnectionSummary>> {
    state.db.list_connections().await
}

#[tauri::command]
async fn save_connection(
    state: tauri::State<'_, AppState>,
    input: ConnectionInput,
) -> AppResult<ConnectionSummary> {
    state.db.save_connection(input).await
}

#[tauri::command]
async fn delete_connection(
    state: tauri::State<'_, AppState>,
    connection_id: String,
) -> AppResult<()> {
    state.db.delete_connection(&connection_id).await
}

#[tauri::command]
async fn test_connection(
    state: tauri::State<'_, AppState>,
    input: ConnectionInput,
) -> AppResult<bool> {
    state.db.test_connection(input).await
}

#[tauri::command]
async fn connect_database(
    state: tauri::State<'_, AppState>,
    connection_id: String,
) -> AppResult<()> {
    state.db.connect(&connection_id).await
}

#[tauri::command]
async fn disconnect_database(
    state: tauri::State<'_, AppState>,
    connection_id: String,
) -> AppResult<()> {
    state.db.disconnect(&connection_id).await
}

#[tauri::command]
async fn get_active_connection(state: tauri::State<'_, AppState>) -> AppResult<Option<String>> {
    match state.db.get_active_connection().await {
        Ok(id) => Ok(Some(id)),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
async fn list_databases(
    state: tauri::State<'_, AppState>,
    connection_id: String,
) -> AppResult<Vec<String>> {
    state.db.list_databases(&connection_id).await
}

#[tauri::command]
async fn list_schemas(
    state: tauri::State<'_, AppState>,
    connection_id: String,
    database: String,
) -> AppResult<Vec<String>> {
    state.db.list_schemas(&connection_id, &database).await
}

#[tauri::command]
async fn list_tables(
    state: tauri::State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> AppResult<Vec<TableInfo>> {
    state.db.list_tables(&connection_id, &schema).await
}

#[tauri::command]
async fn list_columns(
    state: tauri::State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
) -> AppResult<Vec<ColumnInfo>> {
    state.db.list_columns(&connection_id, &schema, &table).await
}

#[tauri::command]
async fn execute_query(
    state: tauri::State<'_, AppState>,
    connection_id: String,
    query_id: String,
    sql: String,
) -> AppResult<QueryResult> {
    state.db.execute_query(&connection_id, &query_id, &sql).await
}

#[tauri::command]
async fn cancel_query(
    state: tauri::State<'_, AppState>,
    query_id: String,
) -> AppResult<()> {
    state.db.cancel_query(&query_id).await
}

#[tauri::command]
async fn list_query_history(
    state: tauri::State<'_, AppState>,
    limit: Option<usize>,
) -> AppResult<Vec<QueryHistoryEntry>> {
    state.db.list_query_history(limit.unwrap_or(100)).await
}

#[tauri::command]
fn generate_query_id() -> String {
    Uuid::new_v4().to_string()
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportPayload {
    format: String,
    content: String,
    filename: String,
}

#[tauri::command]
fn export_results(
    result: QueryResult,
    format: String,
    schema: Option<String>,
    table: Option<String>,
) -> AppResult<ExportPayload> {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");

    match format.as_str() {
        "csv" => {
            let content = DbManager::export_csv(&result);
            Ok(ExportPayload {
                format: "csv".into(),
                content,
                filename: format!("export_{timestamp}.csv"),
            })
        }
        "json" => {
            let content = DbManager::export_json(&result)?;
            Ok(ExportPayload {
                format: "json".into(),
                content,
                filename: format!("export_{timestamp}.json"),
            })
        }
        "sql" => {
            let schema = schema.unwrap_or_else(|| "public".into());
            let table = table.unwrap_or_else(|| "exported_table".into());
            let content = DbManager::export_insert(&result, &schema, &table)?;
            Ok(ExportPayload {
                format: "sql".into(),
                content,
                filename: format!("export_{timestamp}.sql"),
            })
        }
        other => Err(error::AppError::Message(format!("Unsupported export format: {other}"))),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .expect("failed to resolve app config dir");

            let connections_path = config_dir.join("connections.json");
            let query_history_path = config_dir.join("query_history.json");
            let store = config::connections::ConnectionsStore::new(connections_path);
            let history = config::query_history::QueryHistoryStore::new(query_history_path);
            let db = DbManager::new(store, history);

            app.manage(AppState { db: Arc::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_connections,
            save_connection,
            delete_connection,
            test_connection,
            connect_database,
            disconnect_database,
            get_active_connection,
            list_databases,
            list_schemas,
            list_tables,
            list_columns,
            execute_query,
            cancel_query,
            generate_query_id,
            list_query_history,
            export_results,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
