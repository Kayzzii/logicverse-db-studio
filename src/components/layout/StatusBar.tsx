import { useEffect, useState } from "react";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { formatDuration, formatRowCount } from "@/lib/formatters";
import { tauriApi } from "@/lib/tauri";
import { useEditorCursor } from "@/components/layout/EditorCursorContext";

export function StatusBar() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const { cursor } = useEditorCursor();

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
        const version = await tauriApi.getServerVersion(activeConnectionId);
        if (!cancelled) setServerVersion(version);
      } catch {
        if (!cancelled) setServerVersion(null);
      }
    };

    void fetchVersion();
    return () => {
      cancelled = true;
    };
  }, [activeConnectionId]);

  const connectionLabel = activeConnection
    ? activeConnection.driver === "sqlite"
      ? activeConnection.database
      : `${activeConnection.host}:${activeConnection.port}/${activeConnection.database}`
    : "Desconectado";

  const statsText =
    currentTab?.result && !currentTab.executing
      ? `${formatRowCount(currentTab.result.rowCount)} rows · ${formatDuration(currentTab.result.executionTimeMs)}`
      : currentTab?.executing
        ? "Ejecutando…"
        : null;

  return (
    <footer className="flex h-[22px] shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-panel)] px-3 font-mono-db text-[11px]">
      <div className="flex items-center">
        <span className="text-[var(--text-dim)]">{connectionLabel}</span>

        {serverVersion && (
          <>
            <span className="mx-2 text-[#313244]">|</span>
            <span className="text-[var(--text-dim)]">{serverVersion}</span>
          </>
        )}

        {statsText && (
          <>
            <span className="mx-2 text-[#313244]">|</span>
            <span className="text-[var(--green)]">{statsText}</span>
          </>
        )}

        <span className="mx-2 text-[#313244]">|</span>
        <span className="text-[var(--text-dim)]">UTF-8</span>
      </div>

      <span className="text-[var(--text-dim)]">
        Ln {cursor.line}, Col {cursor.column}
      </span>
    </footer>
  );
}
