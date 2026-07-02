import { create } from "zustand";
import { ColumnInfo, TableInfo, tauriApi } from "@/lib/tauri";

const CACHE_TTL_MS = 30_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface SchemaNodeState {
  databases: string[];
  schemas: Record<string, string[]>;
  tables: Record<string, TableInfo[]>;
  columns: Record<string, ColumnInfo[]>;
  expanded: Record<string, boolean>;
  loading: Record<string, boolean>;
  selectedDatabase: string | null;
  cache: Record<string, CacheEntry<unknown>>;
  loadDatabases: (connectionId: string) => Promise<void>;
  loadSchemas: (connectionId: string, database: string) => Promise<void>;
  loadTables: (connectionId: string, schema: string) => Promise<void>;
  loadColumns: (connectionId: string, schema: string, table: string) => Promise<void>;
  toggleExpanded: (key: string) => void;
  setSelectedDatabase: (database: string | null) => void;
  reset: () => void;
}

const nodeKey = (...parts: string[]) => parts.join("::");

function readCache<T>(cache: Record<string, CacheEntry<unknown>>, key: string): T | null {
  const entry = cache[key];
  if (!entry || Date.now() > entry.expiresAt) {
    return null;
  }
  return entry.data as T;
}

function writeCache<T>(
  cache: Record<string, CacheEntry<unknown>>,
  key: string,
  data: T,
): Record<string, CacheEntry<unknown>> {
  return {
    ...cache,
    [key]: { data, expiresAt: Date.now() + CACHE_TTL_MS },
  };
}

export const useSchemaStore = create<SchemaNodeState>((set, get) => ({
  databases: [],
  schemas: {},
  tables: {},
  columns: {},
  expanded: {},
  loading: {},
  selectedDatabase: null,
  cache: {},

  loadDatabases: async (connectionId) => {
    const cacheKey = nodeKey("databases", connectionId);
    const cached = readCache<string[]>(get().cache, cacheKey);
    if (cached) {
      set({ databases: cached, selectedDatabase: cached[0] ?? null });
      if (cached[0]) {
        await get().loadSchemas(connectionId, cached[0]);
      }
      return;
    }

    const key = nodeKey("databases", connectionId);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const databases = await tauriApi.listDatabases(connectionId);
      set((state) => ({
        databases,
        selectedDatabase: databases[0] ?? null,
        loading: { ...state.loading, [key]: false },
        cache: writeCache(state.cache, cacheKey, databases),
      }));
      if (databases[0]) {
        await get().loadSchemas(connectionId, databases[0]);
      }
    } catch {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  loadSchemas: async (connectionId, database) => {
    const cacheKey = nodeKey("schemas", connectionId, database);
    const cached = readCache<string[]>(get().cache, cacheKey);
    if (cached) {
      set((state) => ({
        schemas: { ...state.schemas, [database]: cached },
      }));
      return;
    }

    const key = nodeKey("schemas", connectionId, database);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const schemas = await tauriApi.listSchemas(connectionId, database);
      set((state) => ({
        schemas: { ...state.schemas, [database]: schemas },
        loading: { ...state.loading, [key]: false },
        cache: writeCache(state.cache, cacheKey, schemas),
      }));
    } catch {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  loadTables: async (connectionId, schema) => {
    const cacheKey = nodeKey("tables", connectionId, schema);
    const cached = readCache<TableInfo[]>(get().cache, cacheKey);
    if (cached) {
      set((state) => ({
        tables: { ...state.tables, [schema]: cached },
      }));
      return;
    }

    const key = nodeKey("tables", connectionId, schema);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const tables = await tauriApi.listTables(connectionId, schema);
      set((state) => ({
        tables: { ...state.tables, [schema]: tables },
        loading: { ...state.loading, [key]: false },
        cache: writeCache(state.cache, cacheKey, tables),
      }));
    } catch {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
    }
  },

  loadColumns: async (connectionId, schema, table) => {
    const cacheKey = nodeKey("columns", connectionId, schema, table);
    const cached = readCache<ColumnInfo[]>(get().cache, cacheKey);
    if (cached) {
      set((state) => ({
        columns: { ...state.columns, [`${schema}.${table}`]: cached },
      }));
      return;
    }

    const key = nodeKey("columns", connectionId, schema, table);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const columns = await tauriApi.listColumns(connectionId, schema, table);
      set((state) => ({
        columns: { ...state.columns, [`${schema}.${table}`]: columns },
        loading: { ...state.loading, [key]: false },
        cache: writeCache(state.cache, cacheKey, columns),
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
      cache: {},
    }),
}));

export { nodeKey };
