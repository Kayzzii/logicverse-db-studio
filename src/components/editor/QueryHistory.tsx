import { useEffect, useState } from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QueryHistoryEntry, tauriApi } from "@/lib/tauri";
import { formatDuration, truncateText } from "@/lib/formatters";
import { useQueryStore } from "@/stores/queryStore";

export function QueryHistory() {
  const [entries, setEntries] = useState<QueryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const addTab = useQueryStore((s) => s.addTab);
  const historyRefreshKey = useQueryStore((s) => s.historyRefreshKey);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await tauriApi.listQueryHistory(100);
      setEntries(history);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [historyRefreshKey]);

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {loading && (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              Cargando historial...
            </p>
          )}

          {!loading && entries.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              Todavía no hay queries ejecutadas
            </p>
          )}

          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="w-full rounded-md border border-transparent p-2 text-left transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-accent)]/40"
              onClick={() => addTab(entry.sql, "Historial")}
            >
              <div className="flex items-start gap-2">
                {entry.success ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{truncateText(entry.sql, 120)}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-muted-foreground)]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(entry.executedAt).toLocaleString("es-AR")}</span>
                    <span>{formatDuration(entry.executionTimeMs)}</span>
                    {entry.success && <span>{entry.rowCount} filas</span>}
                  </div>
                  {entry.error && (
                    <p className="mt-1 truncate text-[10px] text-red-400">{entry.error}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
