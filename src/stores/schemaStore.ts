import { create } from "zustand";
import { ColumnInfo, TableInfo, tauriApi } from "@/lib/tauri";

interface SchemaNodeState {
  databases: string[];
  schemas: Record<string, string[]>;
  tables: Record<string, TableInfo[]>;
  columns: Record<string, ColumnInfo[]>;
  expanded: Record<string, boolean>;
  loading: Record<string, boolean>;
  selectedDatabase: string | null;
  loadDatabases: (connectionId: string) => Promise<void>;
  loadSchemas: (connectionId: string, database: string) => Promise<void>;
  loadTables: (connectionId: string, schema: string) => Promise<void>;
  loadColumns: (connectionId: string, schema: string, table: string) => Promise<void>;
  toggleExpanded: (key: string) => void;
  setSelectedDatabase: (database: string | null) => void;
  reset: () => void;
}

const nodeKey = (...parts: string[]) => parts.join("::");

export const useSchemaStore = create<SchemaNodeState>((set, get) => ({
  databases: [],
  schemas: {},
  tables: {},
  columns: {},
  expanded: {},
  loading: {},
  selectedDatabase: null,

  loadDatabases: async (connectionId) => {
    const key = nodeKey("databases", connectionId);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const databases = await tauriApi.listDatabases(connectionId);
      set((state) => ({
        databases,
        selectedDatabase: databases[0] ?? null,
        loading: { ...state.loading, [key]: false },
      }));
      if (databases[0]) {
        await get().loadSchemas(connectionId, databases[0]);
      }
    } catch {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  loadSchemas: async (connectionId, database) => {
    const key = nodeKey("schemas", connectionId, database);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const schemas = await tauriApi.listSchemas(connectionId, database);
      set((state) => ({
        schemas: { ...state.schemas, [database]: schemas },
        loading: { ...state.loading, [key]: false },
      }));
    } catch {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  loadTables: async (connectionId, schema) => {
    const key = nodeKey("tables", connectionId, schema);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const tables = await tauriApi.listTables(connectionId, schema);
      set((state) => ({
        tables: { ...state.tables, [schema]: tables },
        loading: { ...state.loading, [key]: false },
      }));
    } catch {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  loadColumns: async (connectionId, schema, table) => {
    const key = nodeKey("columns", connectionId, schema, table);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const columns = await tauriApi.listColumns(connectionId, schema, table);
      set((state) => ({
        columns: { ...state.columns, [`${schema}.${table}`]: columns },
        loading: { ...state.loading, [key]: false },
      }));
    } catch {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  toggleExpanded: (key) => {
    set((state) => ({
      expanded: { ...state.expanded, [key]: !state.expanded[key] },
    }));
  },

  setSelectedDatabase: (database) => set({ selectedDatabase: database }),

  reset: () =>
    set({
      databases: [],
      schemas: {},
      tables: {},
      columns: {},
      expanded: {},
      loading: {},
      selectedDatabase: null,
    }),
}));

export { nodeKey };
