import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryResult, tauriApi } from "@/lib/tauri";
import { downloadTextFile } from "@/lib/formatters";
import { useSettingsStore } from "@/stores/settingsStore";

interface ResultsExportProps {
  result: QueryResult;
}

export function ResultsExport({ result }: ResultsExportProps) {
  const addToast = useSettingsStore((s) => s.addToast);
  const [schema, setSchema] = useState("public");
  const [table, setTable] = useState("exported_table");
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "json" | "sql") => {
    setExporting(format);
    try {
      const payload = await tauriApi.exportResults(
        result,
        format,
        format === "sql" ? schema : undefined,
        format === "sql" ? table : undefined,
      );
      downloadTextFile(payload.content, payload.filename);
      addToast("success", `Exportado como ${payload.filename}`);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] px-3 py-2">
      <Button
        variant="outline"
        size="sm"
        disabled={!!exporting}
        onClick={() => void handleExport("csv")}
      >
        <FileSpreadsheet className="h-4 w-4" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!!exporting}
        onClick={() => void handleExport("json")}
      >
        <FileJson className="h-4 w-4" />
        JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!!exporting}
        onClick={() => void handleExport("sql")}
      >
        <FileCode2 className="h-4 w-4" />
        INSERT SQL
      </Button>

      <div className="flex items-end gap-2">
        <div>
          <Label className="text-xs">Schema</Label>
          <Input value={schema} onChange={(e) => setSchema(e.target.value)} className="h-8 w-28" />
        </div>
        <div>
          <Label className="text-xs">Tabla</Label>
          <Input value={table} onChange={(e) => setTable(e.target.value)} className="h-8 w-36" />
        </div>
      </div>

      {exporting && (
        <span className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
          <Download className="h-3 w-3 animate-pulse" />
          Exportando {exporting.toUpperCase()}...
        </span>
      )}
    </div>
  );
}
