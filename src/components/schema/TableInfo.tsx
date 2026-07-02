import { ColumnInfo } from "@/lib/tauri";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TableInfoProps {
  schema: string;
  table: string;
  columns: ColumnInfo[];
}

export function TableInfoPanel({ schema, table, columns }: TableInfoProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold">
          {schema}.{table}
        </h3>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {columns.length} columnas
        </p>
      </div>

      <ScrollArea className="flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--color-card)]">
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted-foreground)]">
              <th className="px-4 py-2 font-medium">Columna</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr
                key={col.name}
                className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-accent)]/30"
              >
                <td className="px-4 py-2 font-mono text-xs">{col.name}</td>
                <td className="px-4 py-2 text-xs">{col.dataType}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {col.isPrimaryKey && <Badge variant="warning">PK</Badge>}
                    {col.foreignKey && (
                      <Badge variant="outline">
                        FK → {col.foreignKey.schema}.{col.foreignKey.table}
                      </Badge>
                    )}
                    {!col.nullable && <Badge variant="secondary">NOT NULL</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
