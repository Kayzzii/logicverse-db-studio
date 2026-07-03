import { create } from "zustand";
import { ColumnInfo, TableInfo, tauriApi } from "@/lib/tauri";

const CACHE_TTL_MS = 30_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface LoadOptions {
  force?: boolean;
}

interface LoadDatabasesOptions extends LoadOptions {
  expandDatabase?: string;
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
  loadDatabases: (connectionId: string, options?: LoadDatabasesOptions) => Promise<void>;
  loadSchemas: (connectionId: string, database: string, options?: LoadOptions) => Promise<void>;
  loadTables: (connectionId: string, schema: string, options?: LoadOptions) => Promise<void>;
  loadColumns: (
    connectionId: string,
    schema: string,
    table: string,
    options?: LoadOptions,
  ) => Promise<void>;
  reloadSchema: (connectionId: string, connectedDatabase?: string | null) => Promise<void>;
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

function invalidateConnectionCache(
  cache: Record<string, CacheEntry<unknown>>,
  connectionId: string,
): Record<string, CacheEntry<unknown>> {
  const next = { ...cache };
  for (const key of Object.keys(next)) {
    if (key.includes(connectionId)) {
      delete next[key];
    }
  }
  return next;
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

  loadDatabases: async (connectionId, options = {}) => {
    const { force = false, expandDatabase } = options;
    const cacheKey = nodeKey("databases", connectionId);

    if (!force) {
      const cached = readCache<string[]>(get().cache, cacheKey);
      if (cached !== null) {
        set({ databases: cached, selectedDatabase: cached[0] ?? null });
        const database = expandDatabase ?? cached[0];
        if (database && cached.includes(database)) {
          set((state) => ({
            expanded: { ...state.expanded, [nodeKey("db", database)]: true },
            selectedDatabase: database,
          }));
          await get().loadSchemas(connectionId, database);
        }
        return;
      }
    }

    const key = nodeKey("databases", connectionId);
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const databases = await tauriApi.listDatabases(connectionId);
      const database =
        expandDatabase && databases.includes(expandDatabase)
          ? expandDatabase
          : databases[0] ?? null;

      set((state) => ({
        databases,
        selectedDatabase: database,
        loading: { ...state.loading, [key]: false },
        cache: writeCache(state.cache, cacheKey, databases),
        expanded: database
          ? { ...state.expanded, [nodeKey("db", database)]: true }
          : state.expanded,
      }));

      if (database) {
        await get().loadSchemas(connectionId, database, { force });
      }
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
      throw error;
    }
  },

  loadSchemas: async (connectionId, database, options = {}) => {
    const { force = false } = options;
    const cacheKey = nodeKey("schemas", connectionId, database);

    if (!force) {
      const cached = readCache<string[]>(get().cache, cacheKey);
      if (cached !== null) {
        set((state) => ({
          schemas: { ...state.schemas, [database]: cached },
        }));
        return;
      }
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
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
      throw error;
    }
  },

  loadTables: async (connectionId, schema, options = {}) => {
    const { force = false } = options;
    const cacheKey = nodeKey("tables", connectionId, schema);

    if (!force) {
      const cached = readCache<TableInfo[]>(get().cache, cacheKey);
      if (cached !== null) {
        set((state) => ({
          tables: { ...state.tables, [schema]: cached },
        }));
        return;
      }
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
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
      throw error;
    }
  },

  loadColumns: async (connectionId, schema, table, options = {}) => {
    const { force = false } = options;
    const cacheKey = nodeKey("columns", connectionId, schema, table);

    if (!force) {
      const cached = readCache<ColumnInfo[]>(get().cache, cacheKey);
      if (cached !== null) {
        set((state) => ({
          columns: { ...state.columns, [`${schema}.${table}`]: cached },
        }));
        return;
      }
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
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, [key]: false } }));
      throw error;
    }
  },

  reloadSchema: async (connectionId, connectedDatabase) => {
    set((state) => ({
      cache: invalidateConnectionCache(state.cache, connectionId),
      databases: [],
      schemas: {},
      tables: {},
      columns: {},
      expanded: {},
      loading: {},
      selectedDatabase: null,
    }));
    await get().loadDatabases(connectionId, {
      force: true,
      expandDatabase: connectedDatabase ?? undefined,
    });
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
