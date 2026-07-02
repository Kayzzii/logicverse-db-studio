import { useQueryStore } from "@/stores/queryStore";

export function useQuery() {
  return useQueryStore();
}
