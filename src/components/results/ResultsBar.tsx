import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QueryResult, tauriApi } from "@/lib/tauri";
import { TableViewState } from "@/stores/queryStore";
import { downloadTextFile, formatDuration, formatRowCount } from "@/lib/formatters";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

interface ResultsBarProps {
  result: QueryResult;
  filter: string;
  onFilterChange: (value: string) => void;
  tableView?: TableViewState | null;
  onPaginate?: (direction: "prev" | "next") => void;
  paginating?: boolean;
}

export function ResultsBar({
  result,
  filter,
  onFilterChange,
  tableView,
  onPaginate,
  paginating,
}: ResultsBarProps) {
  const addToast = useSettingsStore((s) => s.addToast);
  const [schema] = useState("public");
  const [table] = useState("exported_table");
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

  const canGoPrev = tableView ? tableView.offset > 0 : false;
  const canGoNext = tableView ? result.rowCount >= tableView.pageSize : false;
  const rangeStart = tableView ? tableView.offset + 1 : null;
  const rangeEnd = tableView ? tableView.offset + result.rowCount : null;

  return (
    <div className="flex h-[26px] shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-app)] px-2.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 font-mono-db text-[11px] text-[var(--text-muted)]">
          <span>{formatRowCount(result.rowCount)} rows</span>
          <span className="text-[var(--text-ghost)]">·</span>
          <span>{formatDuration(result.executionTimeMs)}</span>
          {tableView && rangeStart !== null && rangeEnd !== null && (
            <>
              <span className="text-[var(--text-ghost)]">·</span>
              <span>
                {rangeStart}–{rangeEnd}
              </span>
            </>
          )}
          {result.truncated && (
            <>
              <span className="text-[var(--text-ghost)]">·</span>
              <span className="text-[var(--yellow)]">truncated</span>
            </>
          )}
          {filter && (
            <>
              <span className="text-[var(--text-ghost)]">·</span>
              <button
                type="button"
                className="text-[var(--accent)] hover:underline"
                onClick={() => onFilterChange("")}
              >
                clear filter
              </button>
            </>
          )}
        </div>

        {tableView && onPaginate && (
          <div className="flex items-center gap-[3px]">
            <button
              type="button"
              disabled={!canGoPrev || paginating}
              onClick={() => onPaginate("prev")}
              className={cn(
                "flex h-[17px] items-center gap-0.5 rounded-[2px] border border-[var(--border-strong)] bg-transparent px-[7px] font-ui text-[9.5px] text-[var(--text-muted)] transition-colors",
                "hover:border-[rgba(255,255,255,0.14)] hover:text-[var(--text-primary)]",
                (!canGoPrev || paginating) && "cursor-not-allowed opacity-40",
              )}
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>
            <button
              type="button"
              disabled={!canGoNext || paginating}
              onClick={() => onPaginate("next")}
              className={cn(
                "flex h-[17px] items-center gap-0.5 rounded-[2px] border border-[var(--border-strong)] bg-transparent px-[7px] font-ui text-[9.5px] text-[var(--text-muted)] transition-colors",
                "hover:border-[rgba(255,255,255,0.14)] hover:text-[var(--text-primary)]",
                (!canGoNext || paginating) && "cursor-not-allowed opacity-40",
              )}
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-[3px]">
        {(["csv", "json", "sql"] as const).map((fmt) => (
          <button
            key={fmt}
            type="button"
            disabled={!!exporting}
            onClick={() => void handleExport(fmt)}
            className={cn(
              "flex h-[17px] items-center rounded-[2px] border border-[var(--border-strong)] bg-transparent px-[7px] font-ui text-[9.5px] tracking-[0.3px] text-[var(--text-muted)] uppercase transition-colors",
              "hover:border-[rgba(255,255,255,0.14)] hover:text-[var(--text-primary)]",
              exporting === fmt && "opacity-50",
            )}
          >
            {fmt}
          </button>
        ))}
      </div>
    </div>
  );
}
