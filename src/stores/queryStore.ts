import { create } from "zustand";
import {
  ColumnInfo,
  ErDiagramData,
  ExplainResult,
  QueryResult,
  tauriApi,
} from "@/lib/tauri";

export interface TableViewState {
  schema: string;
  table: string;
  offset: number;
  pageSize: number;
}

export type TabView = "sql" | "er";

export interface QueryTab {
  id: string;
  title: string;
  sql: string;
  queryId: string | null;
  result: QueryResult | null;
  error: string | null;
  executing: boolean;
  tableView: TableViewState | null;
  view: TabView;
  erData: ErDiagramData | null;
  explainResult: ExplainResult | null;
  explainError: string | null;
}

interface QueryState {
  tabs: QueryTab[];
  activeTabId: string | null;
  historyRefreshKey: number;
  addTab: (sql?: string, title?: string) => void;
  openErTab: (schema: string, data: ErDiagramData) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;
  updateTabSql: (id: string, sql: string) => void;
  loadSqlIntoActiveTab: (sql: string, title?: string) => void;
  executeTab: (id: string, sql: string, connectionId: string) => Promise<void>;
  explainTab: (id: string, sql: string, connectionId: string) => Promise<void>;
  cancelTab: (id: string) => Promise<void>;
  setTabResult: (id: string, result: QueryResult | null, error?: string | null) => void;
  openTableView: (
    schema: string,
    table: string,
    connectionId: string,
    driver: string,
  ) => Promise<void>;
  paginateTableView: (
    tabId: string,
    direction: "prev" | "next",
    connectionId: string,
    driver: string,
  ) => Promise<void>;
}

let tabCounter = 1;

function createTab(sql = "SELECT 1;", title?: string, view: TabView = "sql"): QueryTab {
  const defaultTitle = title ?? `Query ${tabCounter++}`;
  return {
    id: crypto.randomUUID(),
    title: defaultTitle,
    sql,
    queryId: null,
    result: null,
    error: null,
    executing: false,
    tableView: null,
    view,
    erData: null,
    explainResult: null,
    explainError: null,
  };
}

export function buildTableSql(
  driver: string,
  schema: string,
  table: string,
  offset: number,
  pageSize: number,
): string {
  const d = driver.toLowerCase();
  if (d === "mysql") {
    return `SELECT * FROM \`${schema}\`.\`${table}\` LIMIT ${pageSize} OFFSET ${offset};`;
  }
  if (d === "sqlite") {
    return `SELECT * FROM "${table}" LIMIT ${pageSize} OFFSET ${offset};`;
  }
  return `SELECT * FROM "${schema}"."${table}" LIMIT ${pageSize} OFFSET ${offset};`;
}

export function buildCountSql(driver: string, schema: string, table: string): string {
  const d = driver.toLowerCase();
  if (d === "mysql") {
    return `SELECT COUNT(*) FROM \`${schema}\`.\`${table}\``;
  }
  if (d === "sqlite") {
    return `SELECT COUNT(*) FROM "${table}"`;
  }
  return `SELECT COUNT(*) FROM "${schema}"."${table}"`;
}

export const useQueryStore = create<QueryState>((set, get) => {
  const initialTab = createTab();

  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,
    historyRefreshKey: 0,

    addTab: (sql, title) => {
      const tab = createTab(sql, title);
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    },

    openErTab: (schema, data) => {
      const tab = createTab("", `ER: ${schema}`, "er");
      tab.erData = data;
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    },

    closeTab: (id) => {
      set((state) => {
        const tabs = state.tabs.filter((t) => t.id !== id);
        const activeTabId =
          state.activeTabId === id
            ? tabs[tabs.length - 1]?.id ?? null
            : state.activeTabId;
        if (tabs.length === 0) {
          const fresh = createTab();
          return { tabs: [fresh], activeTabId: fresh.id };
        }
        return { tabs, activeTabId };
      });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    renameTab: (id, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      set((state) => ({
        tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, title: trimmed } : tab)),
      }));
    },

    updateTabSql: (id, sql) => {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id ? { ...tab, sql, tableView: null, explainResult: null, explainError: null } : tab,
        ),
      }));
    },

    loadSqlIntoActiveTab: (sql, title) => {
      const activeId = get().activeTabId ?? get().tabs[0]?.id;
      if (!activeId) return;
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === activeId
            ? {
                ...tab,
                sql,
                title: title ?? tab.title,
                tableView: null,
                result: null,
                error: null,
                explainResult: null,
                explainError: null,
                view: "sql" as TabView,
              }
            : tab,
        ),
      }));
    },

    executeTab: async (id, sql, connectionId) => {
      const queryId = await tauriApi.generateQueryId();
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                executing: true,
                queryId,
                error: null,
                result: null,
                sql,
                explainResult: null,
                explainError: null,
              }
            : tab,
        ),
      }));

      try {
        const result = await tauriApi.executeQuery(connectionId, queryId, sql);
        get().setTabResult(id, result);
      } catch (error) {
        get().setTabResult(
          id,
          null,
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        set((state) => ({ historyRefreshKey: state.historyRefreshKey + 1 }));
      }
    },

    explainTab: async (id, sql, connectionId) => {
      const queryId = await tauriApi.generateQueryId();
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? { ...tab, executing: true, queryId, explainResult: null, explainError: null }
            : tab,
        ),
      }));

      try {
        const explainResult = await tauriApi.explainQuery(connectionId, queryId, sql);
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === id
              ? { ...tab, executing: false, queryId: null, explainResult, explainError: null }
              : tab,
          ),
        }));
      } catch (error) {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === id
              ? {
                  ...tab,
                  executing: false,
                  queryId: null,
                  explainError: error instanceof Error ? error.message : String(error),
                }
              : tab,
          ),
        }));
      }
    },

    cancelTab: async (id) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab?.queryId) return;
      try {
        await tauriApi.cancelQuery(tab.queryId);
      } catch {
        // Query may have already finished
      }
    },

    setTabResult: (id, result, error = null) => {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? { ...tab, result, error, executing: false, queryId: null }
            : tab,
        ),
      }));
    },

    openTableView: async (schema, table, connectionId, driver) => {
      const pageSize = 100;
      const offset = 0;
      const sql = buildTableSql(driver, schema, table, offset, pageSize);
      const tab = createTab(sql, table);
      tab.tableView = { schema, table, offset, pageSize };

      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));

      await get().executeTab(tab.id, sql, connectionId);
    },

    paginateTableView: async (tabId, direction, connectionId, driver) => {
      const tab = get().tabs.find((t) => t.id === tabId);
      if (!tab?.tableView) return;

      const { schema, table, offset, pageSize } = tab.tableView;
      const newOffset =
        direction === "next"
          ? offset + pageSize
          : Math.max(0, offset - pageSize);

      if (newOffset === offset) return;

      const sql = buildTableSql(driver, schema, table, newOffset, pageSize);
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? {
                ...t,
                sql,
                tableView: { schema, table, offset: newOffset, pageSize },
              }
            : t,
        ),
      }));

      await get().executeTab(tabId, sql, connectionId);
    },
  };
});

export interface SchemaCompletionItem {
  label: string;
  type: "table" | "column";
}

interface SchemaCompletionState {
  items: SchemaCompletionItem[];
  setItems: (items: SchemaCompletionItem[]) => void;
}

export const useSchemaCompletionStore = create<SchemaCompletionState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));

export type { ColumnInfo };
