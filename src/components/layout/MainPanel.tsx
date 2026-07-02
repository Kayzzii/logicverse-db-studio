import { Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/shared/Kbd";
import { QueryTabs } from "@/components/editor/QueryTabs";
import { QueryEditor } from "@/components/editor/QueryEditor";
import { ResultsTable } from "@/components/results/ResultsTable";
import { ResultsExport } from "@/components/results/ResultsExport";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDuration } from "@/lib/formatters";

export function MainPanel() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const updateTabSql = useQueryStore((s) => s.updateTabSql);
  const executeTab = useQueryStore((s) => s.executeTab);
  const cancelTab = useQueryStore((s) => s.cancelTab);
  const addToast = useSettingsStore((s) => s.addToast);

  const currentTab = tabs.find((t) => t.id === (activeTabId ?? tabs[0]?.id)) ?? tabs[0];

  const runQuery = async (selection?: string) => {
    if (!activeConnectionId) {
      addToast("error", "Conectá una base de datos primero");
      return;
    }
    if (!currentTab) return;

    const sql = selection || currentTab.sql;
    if (!sql.trim()) {
      addToast("error", "La query está vacía");
      return;
    }

    await executeTab(currentTab.id, sql, activeConnectionId);
  };

  if (!currentTab) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
        Creá una nueva pestaña de query
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <QueryTabs />

      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <Button size="sm" disabled={currentTab.executing} onClick={() => void runQuery()}>
          {currentTab.executing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Ejecutar
        </Button>
        {currentTab.executing && (
          <Button variant="outline" size="sm" onClick={() => void cancelTab(currentTab.id)}>
            <Square className="h-4 w-4" />
            Cancelar
          </Button>
        )}
        <span className="text-xs text-[var(--color-muted-foreground)]">
          <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> para ejecutar
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2">
        <div className="min-h-0 p-3">
          <QueryEditor
            value={currentTab.sql}
            onChange={(sql) => updateTabSql(currentTab.id, sql)}
            onExecute={(selection) => void runQuery(selection)}
          />
        </div>

        <div className="flex min-h-0 flex-col border-t border-[var(--color-border)]">
          {currentTab.error && (
            <div className="border-b border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {currentTab.error}
            </div>
          )}

          {currentTab.result && (
            <>
              <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                <span>{currentTab.result.rowCount} filas</span>
                <span>{formatDuration(currentTab.result.executionTimeMs)}</span>
                {currentTab.result.affectedRows != null && (
                  <span>{currentTab.result.affectedRows} afectadas</span>
                )}
              </div>
              <ResultsExport result={currentTab.result} />
              <div className="min-h-0 flex-1">
                <ResultsTable result={currentTab.result} />
              </div>
            </>
          )}

          {!currentTab.result && !currentTab.error && !currentTab.executing && (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
              Los resultados aparecerán aquí
            </div>
          )}

          {currentTab.executing && (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ejecutando query...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
