import { create } from "zustand";
import { ColumnInfo, QueryResult, tauriApi } from "@/lib/tauri";

export interface QueryTab {
  id: string;
  title: string;
  sql: string;
  queryId: string | null;
  result: QueryResult | null;
  error: string | null;
  executing: boolean;
}

interface QueryState {
  tabs: QueryTab[];
  activeTabId: string | null;
  historyRefreshKey: number;
  addTab: (sql?: string, title?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabSql: (id: string, sql: string) => void;
  executeTab: (id: string, sql: string, connectionId: string) => Promise<void>;
  cancelTab: (id: string) => Promise<void>;
  setTabResult: (id: string, result: QueryResult | null, error?: string | null) => void;
}

function createTab(sql = "SELECT 1;", title?: string): QueryTab {
  return {
    id: crypto.randomUUID(),
    title: title ?? "Query",
    sql,
    queryId: null,
    result: null,
    error: null,
    executing: false,
  };
}

export const useQueryStore = create<QueryState>((set, get) => ({
  tabs: [createTab()],
  activeTabId: null,
  historyRefreshKey: 0,

  addTab: (sql, title) => {
    const tab = createTab(sql, title);
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
      return { tabs: tabs.length > 0 ? tabs : [createTab()], activeTabId };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabSql: (id, sql) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, sql } : tab)),
    }));
  },

  executeTab: async (id, sql, connectionId) => {
    const queryId = await tauriApi.generateQueryId();
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id
          ? { ...tab, executing: true, queryId, error: null, result: null }
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
}));

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
