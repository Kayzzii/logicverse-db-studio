import { useConnectionStore } from "@/stores/connectionStore";

export function useConnection() {
  return useConnectionStore();
}
