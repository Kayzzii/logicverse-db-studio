import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QueryHistoryEntry, tauriApi } from "@/lib/tauri";
import { formatDuration, truncateText } from "@/lib/formatters";
import { useQueryStore } from "@/stores/queryStore";
import { cn } from "@/lib/utils";

export function QueryHistory() {
  const [entries, setEntries] = useState<QueryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const loadSqlIntoActiveTab = useQueryStore((s) => s.loadSqlIntoActiveTab);
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
        <div className="space-y-0.5 p-2">
          {loading && (
            <p className="px-2 py-4 text-center font-mono-db text-xs text-[var(--text-muted)]">
              Cargando historial...
            </p>
          )}

          {!loading && entries.length === 0 && (
            <p className="px-2 py-4 text-center font-mono-db text-xs text-[var(--text-muted)]">
              Todavía no hay queries ejecutadas
            </p>
          )}

          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="w-full rounded-[3px] border border-transparent p-2 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--bg-hover)]"
              onClick={() => loadSqlIntoActiveTab(entry.sql)}
              title={entry.sql}
            >
              <div className="flex items-start gap-2">
                {entry.success ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--green)]" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--red)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono-db text-xs text-[var(--text-primary)]">
                    {truncateText(entry.sql, 120)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono-db text-[10px] text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[var(--text-ghost)]" />
                      {new Date(entry.executedAt).toLocaleString("es-AR")}
                    </span>
                    <span className="text-[var(--text-ghost)]">·</span>
                    <span>{formatDuration(entry.executionTimeMs)}</span>
                    {entry.success ? (
                      <>
                        <span className="text-[var(--text-ghost)]">·</span>
                        <span className="text-[var(--green)]">{entry.rowCount} rows</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[var(--text-ghost)]">·</span>
                        <span className={cn("text-[var(--red)]")}>error</span>
                      </>
                    )}
                  </div>
                  {entry.error && (
                    <p className="mt-1 truncate font-mono-db text-[10px] text-[var(--red)]">
                      {entry.error}
                    </p>
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
