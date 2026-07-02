import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ResultsFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ResultsFilter({ value, onChange, className }: ResultsFilterProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Filtrar resultados…"
      className={cn(
        "h-8 border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-xs placeholder:text-[var(--color-text-muted)]",
        className,
      )}
    />
  );
}
