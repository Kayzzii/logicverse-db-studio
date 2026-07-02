import { useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUpDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsFilter } from "@/components/results/ResultsFilter";
import { QueryResult } from "@/lib/tauri";
import { copyToClipboard, formatRowCount } from "@/lib/formatters";
import { useSettingsStore } from "@/stores/settingsStore";

interface ResultsTableProps {
  result: QueryResult;
}

export function ResultsTable({ result }: ResultsTableProps) {
  const addToast = useSettingsStore((s) => s.addToast);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (!filter.trim()) {
      return result.rows.map((row, index) => {
        const record: Record<string, string | null> = { __rowIndex: String(index) };
        result.columns.forEach((col, i) => {
          record[col] = row[i] ?? null;
        });
        return record;
      });
    }

    const term = filter.toLowerCase();
    return result.rows
      .map((row, index) => {
        const record: Record<string, string | null> = { __rowIndex: String(index) };
        result.columns.forEach((col, i) => {
          record[col] = row[i] ?? null;
        });
        return record;
      })
      .filter((row) =>
        result.columns.some((col) =>
          (row[col] ?? "").toLowerCase().includes(term),
        ),
      );
  }, [filter, result]);

  const columns = useMemo<ColumnDef<Record<string, string | null>>[]>(() => {
    return result.columns.map((col) => ({
      accessorKey: col,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {col}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const value = getValue<string | null>();
        return (
          <span className="block max-w-[320px] truncate font-mono text-xs">
            {value ?? "NULL"}
          </span>
        );
      },
    }));
  }, [result.columns]);

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
    estimateSize: () => 36,
    overscan: 12,
  });

  const copyCell = async (rowIndex: number, column: string) => {
    const row = data[rowIndex];
    if (!row) return;
    await copyToClipboard(row[column] ?? "");
    addToast("success", "Celda copiada");
  };

  const copyRow = async (rowIndex: number) => {
    const row = data[rowIndex];
    if (!row) return;
    const text = result.columns.map((col) => row[col] ?? "").join("\t");
    await copyToClipboard(text);
    addToast("success", "Fila copiada");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-3 py-2">
        <ResultsFilter value={filter} onChange={setFilter} />
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {formatRowCount(rows.length)} filas
          {result.truncated && " (truncado a 100k)"}
        </span>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--color-card)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--color-border)]">
                <th className="w-16 px-2 py-2 text-left text-xs text-[var(--color-muted-foreground)]">
                  #
                </th>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-2 py-2 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
                <th className="w-16 px-2 py-2" />
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const originalIndex = Number(data[virtualRow.index]?.__rowIndex ?? virtualRow.index);

              return (
                <tr
                  key={row.id}
                  className="absolute left-0 w-full border-b border-[var(--color-border)]/40 hover:bg-[var(--color-accent)]/20"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <td className="w-16 px-2 py-2 text-xs text-[var(--color-muted-foreground)]">
                    {originalIndex + 1}
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 py-2"
                      onDoubleClick={() =>
                        void copyCell(virtualRow.index, cell.column.id)
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="w-16 px-2 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => void copyRow(virtualRow.index)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
