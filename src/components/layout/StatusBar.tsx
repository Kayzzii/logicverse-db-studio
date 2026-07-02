import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { formatDuration, formatRowCount } from "@/lib/formatters";

export function StatusBar() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const currentTab = tabs.find((t) => t.id === (activeTabId ?? tabs[0]?.id));

  return (
    <footer className="flex h-7 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-card)] px-4 text-[11px] text-[var(--color-muted-foreground)]">
      <span>
        {activeConnection
          ? `${activeConnection.host}:${activeConnection.port}/${activeConnection.database}`
          : "Desconectado"}
      </span>

      <div className="flex items-center gap-4">
        {currentTab?.executing && <span>Ejecutando...</span>}
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
