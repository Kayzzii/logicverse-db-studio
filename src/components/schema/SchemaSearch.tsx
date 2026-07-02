import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SchemaSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function SchemaSearch({ value, onChange }: SchemaSearchProps) {
  return (
    <div className="relative px-3 py-2">
      <Search className="absolute left-5 top-4.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar tablas o columnas..."
        className="pl-8"
      />
    </div>
  );
}
