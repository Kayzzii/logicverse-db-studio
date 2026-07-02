import { useState } from "react";
import { Download, FileCode2, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResultsFilter } from "@/components/results/ResultsFilter";
import { QueryResult, tauriApi } from "@/lib/tauri";
import { downloadTextFile, formatDuration, formatRowCount } from "@/lib/formatters";
import { useSettingsStore } from "@/stores/settingsStore";

interface ResultsBarProps {
  result: QueryResult;
  filter: string;
  onFilterChange: (value: string) => void;
}

export function ResultsBar({ result, filter, onFilterChange }: ResultsBarProps) {
  const addToast = useSettingsStore((s) => s.addToast);
  const [schema, setSchema] = useState("public");
  const [table, setTable] = useState("exported_table");
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "json" | "sql") => {
    setExporting(format);
    try {
      const payload = await tauriApi.exportResults(
        result,
        format,
        format === "sql" ? schema : undefined,
        format === "sql" ? table : undefined,
      );
      downloadTextFile(payload.content, payload.filename);
      addToast("success", `Exportado como ${payload.filename}`);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-[11px]">
      <span className="shrink-0 font-mono-db text-[var(--color-text-secondary)]">
        {formatRowCount(result.rowCount)} filas
      </span>
      <span className="shrink-0 text-[var(--color-text-muted)]">
        {formatDuration(result.executionTimeMs)}
      </span>
      {result.truncated && (
        <span className="shrink-0 text-[var(--color-accent-yellow)]">truncado</span>
      )}

      <span className="text-[var(--color-border)]">│</span>

      <ResultsFilter
        value={filter}
        onChange={onFilterChange}
        className="h-6 max-w-[180px] text-xs"
      />

      <span className="text-[var(--color-border)]">│</span>

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[10px]"
          disabled={!!exporting}
          onClick={() => void handleExport("csv")}
        >
          <FileSpreadsheet className="h-3 w-3" />
          CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[10px]"
          disabled={!!exporting}
          onClick={() => void handleExport("json")}
        >
          <FileJson className="h-3 w-3" />
          JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[10px]"
          disabled={!!exporting}
          onClick={() => void handleExport("sql")}
        >
          <FileCode2 className="h-3 w-3" />
          SQL
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-[var(--color-text-muted)]">Schema:</span>
        <Input
          value={schema}
          onChange={(e) => setSchema(e.target.value)}
          className="h-6 w-20 border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-1.5 font-mono-db text-[10px]"
        />
        <span className="text-[var(--color-text-muted)]">Tabla:</span>
        <Input
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="h-6 w-24 border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-1.5 font-mono-db text-[10px]"
        />
      </div>

      {exporting && <Download className="h-3 w-3 animate-pulse text-[var(--color-text-muted)]" />}
    </div>
  );
}
