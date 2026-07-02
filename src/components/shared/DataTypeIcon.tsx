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
  text: "A-Z",
  boolean: "☑",
  date: "📅",
  json: "{}",
  uuid: "🔗",
  binary: "B",
  unknown: "?",
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
        "inline-flex min-w-[1.25rem] items-center justify-center rounded px-0.5 font-mono-db text-[10px] font-medium text-[var(--color-text-muted)]",
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
