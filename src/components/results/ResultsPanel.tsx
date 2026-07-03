import { useEffect, useState } from "react";
import { QueryTab } from "@/stores/queryStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultsTable } from "@/components/results/ResultsTable";
import { ResultsBar } from "@/components/results/ResultsBar";
import { QueryHistory } from "@/components/editor/QueryHistory";
import { ExplainPlan } from "@/components/editor/ExplainPlan";
import { formatDuration } from "@/lib/formatters";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

interface ResultsPanelProps {
  tab: QueryTab;
}

export function ResultsPanel({ tab }: ResultsPanelProps) {
  const [filter, setFilter] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("results");
  const queryHistoryOpen = useUiStore((s) => s.queryHistoryOpen);
  const setQueryHistoryOpen = useUiStore((s) => s.setQueryHistoryOpen);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const paginateTableView = useQueryStore((s) => s.paginateTableView);
  const hasResult = !!tab.result;
  const hasMessage = !!tab.error || (tab.result?.affectedRows != null && tab.result.rowCount <= 1);
  const hasExplain = !!tab.explainResult || !!tab.explainError;

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const driver = activeConnection?.driver ?? "postgres";

  useEffect(() => {
    if (tab.explainResult || tab.explainError) {
      setActiveSubTab("messages");
    }
  }, [tab.explainResult, tab.explainError]);

  useEffect(() => {
    if (queryHistoryOpen) {
      setActiveSubTab("history");
      setQueryHistoryOpen(false);
    }
  }, [queryHistoryOpen, setQueryHistoryOpen]);

  const handlePaginate = (direction: "prev" | "next") => {
    if (!activeConnectionId) return;
    void paginateTableView(tab.id, direction, activeConnectionId, driver);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-app)]">
      <Tabs
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        className="flex h-full flex-col"
      >
        <div className="flex h-[30px] shrink-0 items-end border-b border-[var(--border)] bg-[var(--bg-panel)] px-2">
          <TabsList className="h-full gap-0 bg-transparent p-0">
            <TabsTrigger
              value="results"
              className={cn(
                "relative h-[30px] rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 pb-0 pt-0 font-ui text-[11px] font-medium text-[var(--text-muted)] shadow-none",
                "data-[state=active]:border-b-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-none",
                "hover:text-[var(--text-secondary)]",
              )}
            >
              Results
              {hasResult && tab.result && (
                <span className="ml-1.5 rounded-[2px] bg-[rgba(137,180,250,0.15)] px-[5px] py-px font-mono-db text-[9.5px] text-[var(--accent)]">
                  {tab.result.rowCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className={cn(
                "h-[30px] rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 font-ui text-[11px] font-medium text-[var(--text-muted)] shadow-none",
                "data-[state=active]:border-b-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-none",
                "hover:text-[var(--text-secondary)]",
              )}
            >
              Messages
              {(tab.error || hasMessage || hasExplain) && (
                <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[var(--yellow)]" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={cn(
                "h-[30px] rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 font-ui text-[11px] font-medium text-[var(--text-muted)] shadow-none",
                "data-[state=active]:border-b-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-none",
                "hover:text-[var(--text-secondary)]",
              )}
            >
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="results" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          {hasResult ? (
            <>
              <ResultsBar
                result={tab.result!}
                filter={filter}
                onFilterChange={setFilter}
                tableView={tab.tableView}
                onPaginate={tab.tableView ? handlePaginate : undefined}
                paginating={tab.executing}
              />
              <div className="min-h-0 flex-1 overflow-hidden">
                <ResultsTable result={tab.result!} filter={filter} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center font-mono-db text-xs text-[var(--text-muted)]">
              Los resultados aparecerán aquí
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-0 min-h-0 flex-1 overflow-auto">
          {tab.explainResult && (
            <ExplainPlan
              root={tab.explainResult.root}
              driver={tab.explainResult.driver}
              executionTimeMs={tab.explainResult.executionTimeMs}
            />
          )}
          {tab.explainError && (
            <pre className="m-3 whitespace-pre-wrap rounded border border-[rgba(243,139,168,0.3)] bg-[rgba(243,139,168,0.1)] p-3 font-mono-db text-xs text-[var(--red)]">
              EXPLAIN error: {tab.explainError}
            </pre>
          )}
          {tab.error ? (
            <pre className="m-3 whitespace-pre-wrap rounded border border-[rgba(243,139,168,0.3)] bg-[rgba(243,139,168,0.1)] p-3 font-mono-db text-xs text-[var(--red)]">
              {tab.error}
            </pre>
          ) : tab.result?.affectedRows != null ? (
            <div className="p-3 font-mono-db text-xs text-[var(--text-secondary)]">
              <p className="text-[var(--green)]">Query ejecutada correctamente.</p>
              <p className="mt-2">
                {tab.result.affectedRows} fila(s) afectada(s) ·{" "}
                {formatDuration(tab.result.executionTimeMs)}
              </p>
              {tab.result.rows[0]?.[0] && (
                <p className="mt-1 text-[var(--text-muted)]">{tab.result.rows[0][0]}</p>
              )}
            </div>
          ) : !tab.explainResult && !tab.explainError ? (
            <p className="p-3 font-mono-db text-xs text-[var(--text-muted)]">Sin mensajes</p>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="mt-0 min-h-0 flex-1">
          <QueryHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
