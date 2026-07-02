import { useEffect, useState } from "react";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { formatDuration, formatRowCount } from "@/lib/formatters";
import { tauriApi } from "@/lib/tauri";

export function StatusBar() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const currentTab = tabs.find((t) => t.id === (activeTabId ?? tabs[0]?.id));

  useEffect(() => {
    if (!activeConnectionId) {
      setServerVersion(null);
      return;
    }

    let cancelled = false;

    const fetchVersion = async () => {
      try {
        const queryId = await tauriApi.generateQueryId();
        const result = await tauriApi.executeQuery(
          activeConnectionId,
          queryId,
          "SHOW server_version",
        );
        if (!cancelled && result.rows[0]?.[0]) {
          setServerVersion(`PostgreSQL ${result.rows[0][0]}`);
        }
      } catch {
        if (!cancelled) setServerVersion(null);
      }
    };

    void fetchVersion();
    return () => {
      cancelled = true;
    };
  }, [activeConnectionId]);

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 font-mono-db text-[11px] text-[var(--color-text-muted)]">
      <div className="flex items-center gap-3">
        <span>
          {activeConnection
            ? `${activeConnection.host}:${activeConnection.port}/${activeConnection.database}`
            : "Desconectado"}
        </span>
        {serverVersion && (
          <>
            <span className="text-[var(--color-border)]">│</span>
            <span>{serverVersion}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {currentTab?.executing && <span className="text-[var(--color-primary)]">Ejecutando…</span>}
        {currentTab?.result && (
          <>
            <span>{formatRowCount(currentTab.result.rowCount)} filas</span>
            <span>{formatDuration(currentTab.result.executionTimeMs)}</span>
          </>
        )}
      </div>
    </footer>
  );
}
