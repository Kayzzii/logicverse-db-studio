import { create } from "zustand";
import {
  ConnectionInput,
  ConnectionSummary,
  tauriApi,
} from "@/lib/tauri";

interface ConnectionState {
  connections: ConnectionSummary[];
  activeConnectionId: string | null;
  loading: boolean;
  error: string | null;
  loadConnections: () => Promise<void>;
  saveConnection: (input: ConnectionInput) => Promise<ConnectionSummary>;
  deleteConnection: (id: string) => Promise<void>;
  testConnection: (input: ConnectionInput) => Promise<boolean>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  refreshActiveConnection: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  loading: false,
  error: null,

  loadConnections: async () => {
    set({ loading: true, error: null });
    try {
      const connections = await tauriApi.listConnections();
      set({ connections, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  saveConnection: async (input) => {
    const saved = await tauriApi.saveConnection(input);
    await get().loadConnections();
    return saved;
  },

  deleteConnection: async (id) => {
    await tauriApi.deleteConnection(id);
    const { activeConnectionId } = get();
    if (activeConnectionId === id) {
      set({ activeConnectionId: null });
    }
    await get().loadConnections();
  },

  testConnection: async (input) => tauriApi.testConnection(input),

  connect: async (id) => {
    await tauriApi.connectDatabase(id);
    set({ activeConnectionId: id, error: null });
  },

  disconnect: async (id) => {
    await tauriApi.disconnectDatabase(id);
    const { activeConnectionId } = get();
    if (activeConnectionId === id) {
      set({ activeConnectionId: null });
    }
  },

  refreshActiveConnection: async () => {
    const active = await tauriApi.getActiveConnection();
    set({ activeConnectionId: active });
  },
}));
