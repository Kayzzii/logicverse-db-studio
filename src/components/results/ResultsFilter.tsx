import { Input } from "@/components/ui/input";

interface ResultsFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ResultsFilter({ value, onChange }: ResultsFilterProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Filtrar resultados..."
      className="max-w-xs"
    />
  );
}
