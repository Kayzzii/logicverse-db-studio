import { create } from "zustand";

export interface AppActions {
  executeQuery: () => void;
  executeSelection: () => void;
  explainQuery: () => void;
  saveQuery: () => void;
  renameTab: () => void;
  refreshSchema: () => void;
  exportResults: (format: "csv" | "json" | "sql") => void;
  insertInEditor: (text: string) => void;
  focusEditor: () => void;
  selectAllEditor: () => void;
  undoEditor: () => void;
  redoEditor: () => void;
  cutEditor: () => void;
  copyEditor: () => void;
  pasteEditor: () => void;
  deleteEditor: () => void;
  focusSchemaSearch: () => void;
  searchTables: () => void;
  goToSchemaBrowser: () => void;
  goToEditor: () => void;
  goToResults: () => void;
  nextTab: () => void;
  prevTab: () => void;
  openSavedQueries: () => void;
  openQueryHistory: () => void;
  viewErDiagram: () => void;
  connectSelected: () => void;
  disconnectSelected: () => void;
  disconnectAll: () => void;
}

type ActionKey = keyof AppActions;

const noop = () => {};

const defaultActions: AppActions = {
  executeQuery: noop,
  executeSelection: noop,
  explainQuery: noop,
  saveQuery: noop,
  renameTab: noop,
  refreshSchema: noop,
  exportResults: noop,
  insertInEditor: noop,
  focusEditor: noop,
  selectAllEditor: noop,
  undoEditor: noop,
  redoEditor: noop,
  cutEditor: noop,
  copyEditor: noop,
  pasteEditor: noop,
  deleteEditor: noop,
  focusSchemaSearch: noop,
  searchTables: noop,
  goToSchemaBrowser: noop,
  goToEditor: noop,
  goToResults: noop,
  nextTab: noop,
  prevTab: noop,
  openSavedQueries: noop,
  openQueryHistory: noop,
  viewErDiagram: noop,
  connectSelected: noop,
  disconnectSelected: noop,
  disconnectAll: noop,
};

interface AppActionsState {
  actions: AppActions;
  registerActions: (actions: Partial<AppActions>) => void;
  resetActions: () => void;
  invoke: <K extends ActionKey>(key: K, ...args: Parameters<AppActions[K]>) => void;
}

export const useAppActionsStore = create<AppActionsState>((set, get) => ({
  actions: defaultActions,
  registerActions: (partial) =>
    set((state) => ({
      actions: { ...state.actions, ...partial },
    })),
  resetActions: () => set({ actions: defaultActions }),
  invoke: (key, ...args) => {
    const action = get().actions[key] as (...a: unknown[]) => void;
    action(...args);
  },
}));
