import { invoke } from "@tauri-apps/api/core";

export interface ConnectionSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  sslMode: string;
}

export interface ConnectionInput {
  id?: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: string;
}

export interface TableInfo {
  name: string;
  schema: string;
}

export interface ForeignKeyRef {
  schema: string;
  table: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  foreignKey: ForeignKeyRef | null;
}

export interface QueryResult {
  columns: string[];
  rows: (string | null)[][];
  rowCount: number;
  affectedRows: number | null;
  executionTimeMs: number;
  truncated: boolean;
}

export interface ExportPayload {
  format: string;
  content: string;
  filename: string;
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  connectionId: string | null;
  executedAt: string;
  executionTimeMs: number;
  rowCount: number;
  success: boolean;
  error: string | null;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  connectionId: string | null;
  savedAt: string;
}

export interface SaveQueryInput {
  name: string;
  sql: string;
  connectionId?: string;
}

export interface AppSettings {
  theme: string;
  maxRows: number;
}

export const tauriApi = {
  listConnections: () => invoke<ConnectionSummary[]>("list_connections"),
  saveConnection: (input: ConnectionInput) =>
    invoke<ConnectionSummary>("save_connection", { input }),
  deleteConnection: (connectionId: string) =>
    invoke<void>("delete_connection", { connectionId }),
  testConnection: (input: ConnectionInput) =>
    invoke<boolean>("test_connection", { input }),
  connectDatabase: (connectionId: string) =>
    invoke<void>("connect_database", { connectionId }),
  disconnectDatabase: (connectionId: string) =>
    invoke<void>("disconnect_database", { connectionId }),
  getActiveConnection: () => invoke<string | null>("get_active_connection"),
  listDatabases: (connectionId: string) =>
    invoke<string[]>("list_databases", { connectionId }),
  listSchemas: (connectionId: string, database: string) =>
    invoke<string[]>("list_schemas", { connectionId, database }),
  listTables: (connectionId: string, schema: string) =>
    invoke<TableInfo[]>("list_tables", { connectionId, schema }),
  listColumns: (connectionId: string, schema: string, table: string) =>
    invoke<ColumnInfo[]>("list_columns", { connectionId, schema, table }),
  executeQuery: (connectionId: string, queryId: string, sql: string) =>
    invoke<QueryResult>("execute_query", { connectionId, queryId, sql }),
  cancelQuery: (queryId: string) => invoke<void>("cancel_query", { queryId }),
  generateQueryId: () => invoke<string>("generate_query_id"),
  listQueryHistory: (limit = 100) =>
    invoke<QueryHistoryEntry[]>("list_query_history", { limit }),
  listSavedQueries: () => invoke<SavedQuery[]>("list_saved_queries"),
  saveQuery: (input: SaveQueryInput) => invoke<SavedQuery>("save_query", { input }),
  deleteSavedQuery: (queryId: string) =>
    invoke<void>("delete_saved_query", { queryId }),
  getSettings: () => invoke<AppSettings>("get_settings"),
  saveSettings: (settings: AppSettings) => invoke<void>("save_settings", { settings }),
  exportResults: (
    result: QueryResult,
    format: "csv" | "json" | "sql",
    schema?: string,
    table?: string,
  ) => invoke<ExportPayload>("export_results", { result, format, schema, table }),
};
