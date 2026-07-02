import { useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, X } from "lucide-react";
import { DataTypeIcon, isBooleanType, isNumericType } from "@/components/shared/DataTypeIcon";
import { NullValue } from "@/components/shared/NullValue";
import { QueryResult } from "@/lib/tauri";
import { copyToClipboard } from "@/lib/formatters";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

interface ResultsTableProps {
  result: QueryResult;
  filter?: string;
}

type CellSelection = { row: number; col: string } | null;

function inferColumnType(result: QueryResult, colIndex: number): string {
  for (const row of result.rows) {
    const val = row[colIndex];
    if (val === null) continue;
    if (val === "true" || val === "false") return "bool";
    if (!Number.isNaN(Number(val)) && val.trim() !== "") return "numeric";
    if (val.startsWith("{") || val.startsWith("[")) return "jsonb";
    return "text";
  }
  return "text";
}

export function ResultsTable({ result, filter = "" }: ResultsTableProps) {
  const addToast = useSettingsStore((s) => s.addToast);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCell, setSelectedCell] = useState<CellSelection>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const parentRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const columnTypes = useMemo(
    () => result.columns.map((_, i) => inferColumnType(result, i)),
    [result],
  );

  const data = useMemo(() => {
    const rows = result.rows.map((row, index) => {
      const record: Record<string, string | null> = { __rowIndex: String(index) };
      result.columns.forEach((col, i) => {
        record[col] = row[i] ?? null;
      });
      return record;
    });

    if (!filter.trim()) return rows;
    const term = filter.toLowerCase();
    return rows.filter((row) =>
      result.columns.some((col) => (row[col] ?? "").toLowerCase().includes(term)),
    );
  }, [filter, result]);

  const columns = useMemo<ColumnDef<Record<string, string | null>>[]>(() => {
    return result.columns.map((col, colIndex) => ({
      accessorKey: col,
      header: () => (
        <div className="flex items-center gap-1.5">
          <DataTypeIcon type={columnTypes[colIndex]} />
          <span className="font-mono-db text-[11px] font-medium">{col}</span>
        </div>
      ),
      cell: ({ getValue }) => {
        const value = getValue<string | null>();
        if (value === null) return <NullValue />;

        const type = columnTypes[colIndex];
        if (isBooleanType(type)) {
          const bool = value === "true";
          return bool ? (
            <Check className="h-3.5 w-3.5 text-[var(--color-accent-green)]" />
          ) : (
            <X className="h-3.5 w-3.5 text-[var(--color-accent-red)]" />
          );
        }

        return (
          <span
            className={cn(
              "block truncate font-mono-db text-xs",
              isNumericType(type) ? "text-right" : "text-left",
            )}
          >
            {value}
          </span>
        );
      },
    }));
  }, [columnTypes, result.columns]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 16,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedCell) {
          const row = data.find((r) => r.__rowIndex === String(selectedCell.row));
          if (row) {
            void copyToClipboard(row[selectedCell.col] ?? "");
            addToast("success", "Celda copiada");
          }
        } else if (selectedRow !== null) {
          const row = data[selectedRow];
          if (row) {
            const text = result.columns.map((col) => row[col] ?? "").join("\t");
            void copyToClipboard(text);
            addToast("success", "Fila copiada");
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addToast, data, result.columns, selectedCell, selectedRow]);

  const startResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startWidth = columnWidths[col] ?? 140;
    resizingRef.current = { col, startX: e.clientX, startWidth };

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      setColumnWidths((prev) => ({
        ...prev,
        [resizingRef.current!.col]: Math.max(60, resizingRef.current!.startWidth + delta),
      }));
    };

    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div ref={parentRef} className="h-full overflow-auto bg-[var(--color-bg-primary)]">
      <table className="w-max min-w-full border-collapse font-mono-db text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)]">
          <tr>
            <th className="sticky left-0 z-20 w-12 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1.5 text-center text-[10px] font-medium text-[var(--color-text-muted)]">
              #
            </th>
            {result.columns.map((col, i) => (
              <th
                key={col}
                className="relative border border-[var(--color-border)] px-2 py-1.5 text-left"
                style={{ width: columnWidths[col] ?? 140, minWidth: 60 }}
              >
                <div className="flex items-center gap-1.5 pr-2">
                  <DataTypeIcon type={columnTypes[i]} />
                  <span className="truncate text-[11px] font-medium text-[var(--color-text-primary)]">
                    {col}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Resize ${col}`}
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[var(--color-primary)]"
                  onMouseDown={(e) => startResize(col, e)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const originalIndex = Number(data[virtualRow.index]?.__rowIndex ?? virtualRow.index);
            const isRowSelected = selectedRow === virtualRow.index;

            return (
              <tr
                key={row.id}
                className={cn(
                  "absolute left-0 w-full",
                  virtualRow.index % 2 === 1 && "bg-[var(--color-bg-secondary)]/40",
                  isRowSelected && "bg-[var(--color-bg-selected)]/50",
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <td
                  className={cn(
                    "sticky left-0 z-10 w-12 cursor-pointer border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-center text-[10px] text-[var(--color-text-muted)]",
                    isRowSelected && "bg-[var(--color-bg-selected)]",
                  )}
                  onClick={() => {
                    setSelectedRow(virtualRow.index);
                    setSelectedCell(null);
                  }}
                >
                  {originalIndex + 1}
                </td>
                {row.getVisibleCells().map((cell) => {
                  const isSelected =
                    selectedCell?.row === originalIndex && selectedCell.col === cell.column.id;

                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "border border-[var(--color-border)]/60 px-2 py-1",
                        isSelected && "bg-[var(--color-primary)]/15 ring-1 ring-inset ring-[var(--color-primary)]/40",
                      )}
                      style={{ width: columnWidths[cell.column.id] ?? 140, maxWidth: columnWidths[cell.column.id] ?? 140 }}
                      onClick={() => {
                        setSelectedCell({ row: originalIndex, col: cell.column.id });
                        setSelectedRow(null);
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
