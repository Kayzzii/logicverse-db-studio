import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/stores/connectionStore";
import { ConnectionInput } from "@/lib/tauri";

interface ConnectionTestProps {
  form: ConnectionInput;
}

export function ConnectionTest({ form }: ConnectionTestProps) {
  const testConnection = useConnectionStore((s) => s.testConnection);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    setMessage("");

    try {
      const ok = await testConnection(form);
      setResult(ok ? "success" : "error");
      setMessage(ok ? "Conexión exitosa" : "No se pudo conectar");
    } catch (error) {
      setResult("error");
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-md border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={testing}
          onClick={() => void handleTest()}
        >
          {testing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Probando...
            </>
          ) : (
            "Probar conexión"
          )}
        </Button>

        {result === "success" && (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {message}
          </div>
        )}
        {result === "error" && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <XCircle className="h-3 w-3" />
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
