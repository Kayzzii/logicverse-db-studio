import { create } from "zustand";
import { ConnectionSummary } from "@/lib/tauri";

interface UiState {
  connectionsDialogOpen: boolean;
  connectionFormOpen: boolean;
  connectionFormEditing: ConnectionSummary | null;
  settingsOpen: boolean;
  aboutOpen: boolean;
  shortcutsOpen: boolean;
  savedQueriesOpen: boolean;
  queryHistoryOpen: boolean;
  zoomLevel: number;
  setConnectionsDialogOpen: (open: boolean) => void;
  openNewConnection: () => void;
  openEditConnection: (connection: ConnectionSummary) => void;
  closeConnectionForm: () => void;
  setSettingsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSavedQueriesOpen: (open: boolean) => void;
  setQueryHistoryOpen: (open: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

function applyZoom(level: number) {
  document.documentElement.style.setProperty("--ui-zoom", String(level));
  document.documentElement.style.fontSize = `${Math.round(14 * level)}px`;
}

export const useUiStore = create<UiState>((set, get) => ({
  connectionsDialogOpen: false,
  connectionFormOpen: false,
  connectionFormEditing: null,
  settingsOpen: false,
  aboutOpen: false,
  shortcutsOpen: false,
  savedQueriesOpen: false,
  queryHistoryOpen: false,
  zoomLevel: 1,

  setConnectionsDialogOpen: (open) => set({ connectionsDialogOpen: open }),

  openNewConnection: () =>
    set({
      connectionFormOpen: true,
      connectionFormEditing: null,
      connectionsDialogOpen: true,
    }),

  openEditConnection: (connection) =>
    set({
      connectionFormOpen: true,
      connectionFormEditing: connection,
      connectionsDialogOpen: true,
    }),

  closeConnectionForm: () =>
    set({
      connectionFormOpen: false,
      connectionFormEditing: null,
    }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setSavedQueriesOpen: (open) => set({ savedQueriesOpen: open }),
  setQueryHistoryOpen: (open) => set({ queryHistoryOpen: open }),

  zoomIn: () => {
    const next = Math.min(1.5, Math.round((get().zoomLevel + 0.1) * 10) / 10);
    applyZoom(next);
    set({ zoomLevel: next });
  },

  zoomOut: () => {
    const next = Math.max(0.8, Math.round((get().zoomLevel - 0.1) * 10) / 10);
    applyZoom(next);
    set({ zoomLevel: next });
  },

  resetZoom: () => {
    applyZoom(1);
    set({ zoomLevel: 1 });
  },
}));
