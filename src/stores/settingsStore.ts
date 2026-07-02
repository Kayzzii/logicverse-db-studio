import { create } from "zustand";
import { AppSettings, tauriApi } from "@/lib/tauri";

export type ToastType = "success" | "error" | "info";
export type Theme = "dark" | "light";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface SettingsState {
  sidebarCollapsed: boolean;
  theme: Theme;
  maxRows: number;
  settingsLoaded: boolean;
  toasts: ToastMessage[];
  toggleSidebar: () => void;
  loadSettings: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sidebarCollapsed: false,
  theme: "dark",
  maxRows: 100_000,
  settingsLoaded: false,
  toasts: [],

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  loadSettings: async () => {
    try {
      const settings = await tauriApi.getSettings();
      const theme: Theme = settings.theme === "light" ? "light" : "dark";
      applyTheme(theme);
      set({
        theme,
        maxRows: settings.maxRows,
        settingsLoaded: true,
      });
    } catch {
      applyTheme("dark");
      set({ settingsLoaded: true });
    }
  },

  setTheme: async (theme) => {
    const { maxRows } = get();
    applyTheme(theme);
    set({ theme });
    try {
      const payload: AppSettings = { theme, maxRows };
      await tauriApi.saveSettings(payload);
    } catch (error) {
      get().addToast(
        "error",
        error instanceof Error ? error.message : "No se pudo guardar el tema",
      );
    }
  },

  addToast: (type, message) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
