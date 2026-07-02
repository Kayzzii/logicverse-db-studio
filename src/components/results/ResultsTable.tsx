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

const ROW_NUM_WIDTH = 38;
const DEFAULT_COL_WIDTH = 140;

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

function BooleanPill({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-[3px] px-2 py-0.5 font-ui text-[10px] font-medium",
        value
          ? "bg-[rgba(166,227,161,0.13)] text-[var(--green)]"
          : "bg-[rgba(243,139,168,0.13)] text-[var(--red)]",
      )}
    >
      {value ? "true" : "false"}
    </span>
  );
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

  const getColWidth = (col: string) => columnWidths[col] ?? DEFAULT_COL_WIDTH;

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
    return result.columns.map((col, colIndex) => {
      const type = columnTypes[colIndex];
      const numeric = isNumericType(type);
      const boolean = isBooleanType(type);

      return {
        accessorKey: col,
        size: getColWidth(col),
        header: () => (
          <div
            className={cn(
              "flex items-center gap-[5px]",
              numeric && "justify-end",
              boolean && "justify-center",
            )}
          >
            <DataTypeIcon type={type} />
            <span className="truncate font-mono-db text-[11px] font-medium text-[var(--text-secondary)]">
              {col}
            </span>
          </div>
        ),
        cell: ({ getValue }) => {
          const value = getValue<string | null>();
          if (value === null) return <NullValue />;

          if (boolean) {
            return (
              <div className="text-center">
                <BooleanPill value={value === "true"} />
              </div>
            );
          }

          return (
            <span
              className={cn(
                "block truncate font-mono-db text-xs",
                numeric
                  ? "text-right text-[var(--yellow)]"
                  : "text-left text-[var(--text-primary)]",
              )}
            >
              {value}
            </span>
          );
        },
      };
    });
  }, [columnTypes, result.columns, columnWidths]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();
  const colSpan = result.columns.length + 1;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30,
    overscan: 16,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

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
    const startWidth = getColWidth(col);
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

  const tableMinWidth =
    ROW_NUM_WIDTH + result.columns.reduce((sum, col) => sum + getColWidth(col), 0);

  return (
    <div ref={parentRef} className="h-full w-full overflow-auto bg-[var(--bg-app)]">
      <table
        className="border-collapse font-mono-db text-xs"
        style={{ tableLayout: "fixed", width: "100%", minWidth: tableMinWidth }}
      >
        <colgroup>
          <col style={{ width: ROW_NUM_WIDTH }} />
          {result.columns.map((col) => (
            <col key={col} style={{ width: getColWidth(col) }} />
          ))}
        </colgroup>

        <thead className="sticky top-0 z-[1] bg-[var(--bg-panel)]">
          <tr>
            <th className="sticky left-0 z-[2] border-r border-[var(--border-subtle)] border-b border-b-[var(--border-strong)] bg-[var(--bg-deep)] px-2 py-[5px] text-right font-ui text-[10px] font-medium text-[var(--text-ghost)]">
              #
            </th>
            {result.columns.map((col, i) => {
              const type = columnTypes[i];
              const numeric = isNumericType(type);
              const boolean = isBooleanType(type);

              return (
                <th
                  key={col}
                  className={cn(
                    "relative border-r border-[var(--border-subtle)] border-b border-b-[var(--border-strong)] px-[10px] py-[5px]",
                    numeric && "text-right",
                    boolean && "text-center",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-[5px] pr-2",
                      numeric && "justify-end",
                      boolean && "justify-center",
                    )}
                  >
                    <DataTypeIcon type={type} />
                    <span className="truncate font-mono-db text-[11px] font-medium text-[var(--text-secondary)]">
                      {col}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Resize ${col}`}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[var(--accent)]/30"
                    onMouseDown={(e) => startResize(col, e)}
                  />
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden>
              <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: "none" }} />
            </tr>
          )}

          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            const originalIndex = Number(data[virtualRow.index]?.__rowIndex ?? virtualRow.index);
            const isEven = virtualRow.index % 2 === 1;
            const isRowSelected = selectedRow === virtualRow.index;

            return (
              <tr
                key={row.id}
                className={cn(
                  "group hover:bg-[rgba(137,180,250,0.05)]",
                  isEven && "bg-[rgba(255,255,255,0.017)]",
                  isRowSelected && "bg-[rgba(137,180,250,0.08)]",
                )}
                style={{ height: virtualRow.size }}
              >
                <td
                  className={cn(
                    "sticky left-0 z-[1] cursor-pointer border-r border-[var(--border-subtle)] border-b border-b-[rgba(255,255,255,0.04)] px-2 py-[5px] text-right text-[10px] text-[var(--text-ghost)]",
                    isEven ? "bg-[rgba(0,0,0,0.12)]" : "bg-[var(--bg-panel)]",
                    isRowSelected && "bg-[var(--bg-active)]",
                    "group-hover:bg-[rgba(137,180,250,0.05)]",
                  )}
                  onClick={() => {
                    setSelectedRow(virtualRow.index);
                    setSelectedCell(null);
                  }}
                >
                  {originalIndex + 1}
                </td>
                {row.getVisibleCells().map((cell, cellIndex) => {
                  const isSelected =
                    selectedCell?.row === originalIndex && selectedCell.col === cell.column.id;
                  const type = columnTypes[cellIndex];
                  const numeric = isNumericType(type);
                  const boolean = isBooleanType(type);

                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "overflow-hidden border-r border-[var(--border-subtle)] border-b border-b-[rgba(255,255,255,0.04)] px-[10px] py-[5px]",
                        numeric && "text-right",
                        boolean && "text-center",
                        isSelected &&
                          "bg-[rgba(137,180,250,0.1)] ring-1 ring-inset ring-[var(--accent)]/30",
                      )}
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

          {paddingBottom > 0 && (
            <tr aria-hidden>
              <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: "none" }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
