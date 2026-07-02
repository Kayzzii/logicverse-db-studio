import { cn } from "@/lib/utils";

type DataTypeCategory = "number" | "text" | "boolean" | "date" | "json" | "uuid" | "binary" | "unknown";

function categorizePgType(type: string): DataTypeCategory {
  const t = type.toLowerCase();

  if (
    t.includes("int") ||
    t.includes("numeric") ||
    t.includes("decimal") ||
    t.includes("float") ||
    t.includes("double") ||
    t.includes("real") ||
    t.includes("serial") ||
    t.includes("money")
  ) {
    return "number";
  }
  if (t.includes("bool")) return "boolean";
  if (t.includes("json")) return "json";
  if (t.includes("uuid")) return "uuid";
  if (t.includes("bytea")) return "binary";
  if (
    t.includes("timestamp") ||
    t.includes("date") ||
    t.includes("time") ||
    t === "interval"
  ) {
    return "date";
  }
  if (
    t.includes("char") ||
    t.includes("text") ||
    t.includes("name") ||
    t.includes("xml")
  ) {
    return "text";
  }
  return "unknown";
}

const LABELS: Record<DataTypeCategory, string> = {
  number: "123",
  text: "A–Z",
  boolean: "☑",
  date: "📅",
  json: "{}",
  uuid: "🔗",
  binary: "B",
  unknown: "?",
};

const BADGE_STYLES: Record<DataTypeCategory, string> = {
  number: "bg-[rgba(137,180,250,0.12)] text-[var(--accent)]",
  text: "bg-[rgba(203,166,247,0.12)] text-[var(--purple)]",
  boolean: "bg-[rgba(166,227,161,0.12)] text-[var(--green)]",
  date: "bg-[rgba(249,226,175,0.12)] text-[var(--yellow)]",
  json: "bg-[rgba(203,166,247,0.12)] text-[var(--purple)]",
  uuid: "bg-[rgba(137,180,250,0.12)] text-[var(--accent)]",
  binary: "bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]",
  unknown: "bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]",
};

interface DataTypeIconProps {
  type: string;
  className?: string;
  showLabel?: boolean;
}

export function DataTypeIcon({ type, className, showLabel = true }: DataTypeIconProps) {
  const category = categorizePgType(type);
  const label = LABELS[category];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[2px] px-1 py-px font-ui text-[8.5px] font-semibold",
        BADGE_STYLES[category],
        className,
      )}
      title={type}
    >
      {showLabel ? label : null}
    </span>
  );
}

export function isNumericType(type: string): boolean {
  return categorizePgType(type) === "number";
}

export function isBooleanType(type: string): boolean {
  return categorizePgType(type) === "boolean";
}

export { categorizePgType };
