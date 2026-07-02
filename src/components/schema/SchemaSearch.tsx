import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SchemaSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function SchemaSearch({ value, onChange }: SchemaSearchProps) {
  return (
    <div className="border-b border-[var(--color-border)] px-2 py-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Filtrar objetos…"
          className="h-8 border-[var(--color-border)] bg-[var(--color-bg-tertiary)] pl-8 pr-8 font-mono-db text-xs placeholder:text-[var(--color-text-muted)]"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
