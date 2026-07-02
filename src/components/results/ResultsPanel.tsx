import { useState } from "react";
import { QueryTab } from "@/stores/queryStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultsTable } from "@/components/results/ResultsTable";
import { ResultsBar } from "@/components/results/ResultsBar";
import { QueryHistory } from "@/components/editor/QueryHistory";
import { formatDuration } from "@/lib/formatters";

interface ResultsPanelProps {
  tab: QueryTab;
}

export function ResultsPanel({ tab }: ResultsPanelProps) {
  const [filter, setFilter] = useState("");
  const hasResult = !!tab.result;
  const hasMessage = !!tab.error || (tab.result?.affectedRows != null && tab.result.rowCount <= 1);

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <Tabs defaultValue="results" className="flex h-full flex-col">
        <div className="flex h-8 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2">
          <TabsList className="h-7 gap-0.5 bg-transparent p-0">
            <TabsTrigger
              value="results"
              className="h-6 rounded px-2.5 text-xs data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-primary)]"
            >
              Results
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="h-6 rounded px-2.5 text-xs data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-primary)]"
            >
              Messages
              {(tab.error || hasMessage) && (
                <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-yellow)]" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="h-6 rounded px-2.5 text-xs data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:text-[var(--color-primary)]"
            >
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="results" className="mt-0 flex min-h-0 flex-1 flex-col">
          {hasResult ? (
            <>
              <ResultsBar result={tab.result!} filter={filter} onFilterChange={setFilter} />
              <div className="min-h-0 flex-1">
                <ResultsTable result={tab.result!} filter={filter} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-text-muted)]">
              Los resultados aparecerán aquí
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-0 min-h-0 flex-1 overflow-auto p-3">
          {tab.error ? (
            <pre className="whitespace-pre-wrap rounded border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 p-3 font-mono-db text-xs text-[var(--color-accent-red)]">
              {tab.error}
            </pre>
          ) : tab.result?.affectedRows != null ? (
            <div className="font-mono-db text-xs text-[var(--color-text-secondary)]">
              <p className="text-[var(--color-accent-green)]">Query ejecutada correctamente.</p>
              <p className="mt-2">
                {tab.result.affectedRows} fila(s) afectada(s) ·{" "}
                {formatDuration(tab.result.executionTimeMs)}
              </p>
              {tab.result.rows[0]?.[0] && (
                <p className="mt-1 text-[var(--color-text-muted)]">{tab.result.rows[0][0]}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Sin mensajes</p>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0 min-h-0 flex-1">
          <QueryHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
