import { ErDiagramData, ErRelation, ErTable } from "@/lib/tauri";
import { cn } from "@/lib/utils";

const COL_WIDTH = 220;
const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 34;
const GAP_X = 80;
const GAP_Y = 40;
const PAD = 24;

function tableHeight(table: ErTable): number {
  return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 8;
}

function layoutTables(tables: ErTable[]): Map<string, { x: number; y: number; w: number; h: number }> {
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  const cols = Math.max(1, Math.ceil(Math.sqrt(tables.length)));

  tables.forEach((table, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const h = tableHeight(table);
    positions.set(`${table.schema}.${table.name}`, {
      x: PAD + col * (COL_WIDTH + GAP_X),
      y: PAD + row * (h + GAP_Y),
      w: COL_WIDTH,
      h,
    });
  });

  return positions;
}

function TableBox({
  table,
  x,
  y,
  width,
  height,
}: {
  table: ErTable;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={width}
        height={height}
        rx={4}
        fill="var(--bg-panel)"
        stroke="var(--border-strong)"
        strokeWidth={1}
      />
      <rect width={width} height={HEADER_HEIGHT} rx={4} fill="var(--bg-deep)" />
      <text
        x={10}
        y={21}
        className="fill-[var(--text-primary)]"
        style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}
      >
        {table.name}
      </text>
      {table.columns.map((col, i) => {
        const rowY = HEADER_HEIGHT + 8 + i * ROW_HEIGHT;
        return (
          <g key={col.name}>
            <text
              x={10}
              y={rowY}
              className={cn(
                col.isPrimaryKey ? "fill-[var(--yellow)]" : "fill-[var(--text-secondary)]",
              )}
              style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
            >
              {col.isPrimaryKey ? "🔑 " : col.foreignKey ? "🔗 " : "   "}
              {col.name}
            </text>
            <text
              x={width - 10}
              y={rowY}
              textAnchor="end"
              className="fill-[var(--text-ghost)]"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9 }}
            >
              {col.dataType}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function RelationLine({
  relation,
  positions,
}: {
  relation: ErRelation;
  positions: Map<string, { x: number; y: number; w: number; h: number }>;
}) {
  const from = positions.get(`${relation.fromSchema}.${relation.fromTable}`);
  const to = positions.get(`${relation.toSchema}.${relation.toTable}`);
  if (!from || !to) return null;

  const x1 = from.x + from.w;
  const y1 = from.y + HEADER_HEIGHT + 16;
  const x2 = to.x;
  const y2 = to.y + HEADER_HEIGHT + 16;
  const midX = (x1 + x2) / 2;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.2}
        opacity={0.7}
      />
      <circle cx={x2} cy={y2} r={3} fill="var(--accent)" />
    </g>
  );
}

interface ERDiagramProps {
  data: ErDiagramData;
}

export function ERDiagram({ data }: ERDiagramProps) {
  const positions = layoutTables(data.tables);
  const maxX = Math.max(...Array.from(positions.values()).map((p) => p.x + p.w), 400);
  const maxY = Math.max(...Array.from(positions.values()).map((p) => p.y + p.h), 300);

  return (
    <div className="h-full overflow-auto bg-[var(--bg-app)]">
      <svg width={maxX + PAD} height={maxY + PAD} className="min-w-full">
        {data.relations.map((relation, i) => (
          <RelationLine key={i} relation={relation} positions={positions} />
        ))}
        {data.tables.map((table) => {
          const pos = positions.get(`${table.schema}.${table.name}`);
          if (!pos) return null;
          return (
            <TableBox
              key={`${table.schema}.${table.name}`}
              table={table}
              x={pos.x}
              y={pos.y}
              width={pos.w}
              height={pos.h}
            />
          );
        })}
      </svg>
    </div>
  );
}
