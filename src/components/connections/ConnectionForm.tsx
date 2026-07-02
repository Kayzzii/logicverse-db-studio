import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectionTest } from "@/components/connections/ConnectionTest";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ConnectionInput, ConnectionSummary } from "@/lib/tauri";

interface ConnectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ConnectionSummary | null;
  onSaved: () => void;
}

const defaultForm: ConnectionInput = {
  name: "",
  host: "localhost",
  port: 5432,
  database: "postgres",
  username: "postgres",
  password: "",
  sslMode: "prefer",
};

export function ConnectionForm({
  open,
  onOpenChange,
  connection,
  onSaved,
}: ConnectionFormProps) {
  const saveConnection = useConnectionStore((s) => s.saveConnection);
  const addToast = useSettingsStore((s) => s.addToast);
  const [form, setForm] = useState<ConnectionInput>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (connection) {
      setForm({
        id: connection.id,
        name: connection.name,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: "",
        sslMode: connection.sslMode,
      });
    } else {
      setForm(defaultForm);
    }
  }, [connection, open]);

  const update = <K extends keyof ConnectionInput>(key: K, value: ConnectionInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.host.trim()) {
      addToast("error", "Nombre y host son obligatorios");
      return;
    }

    setSaving(true);
    try {
      await saveConnection(form);
      addToast("success", connection ? "Conexión actualizada" : "Conexión creada");
      onSaved();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{connection ? "Editar conexión" : "Nueva conexión"}</DialogTitle>
          <DialogDescription>
            Las credenciales se guardan cifradas localmente con AES-256-GCM.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Producción"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 grid gap-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                value={form.host}
                onChange={(e) => update("host", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port">Puerto</Label>
              <Input
                id="port"
                type="number"
                value={form.port}
                onChange={(e) => update("port", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="database">Base de datos</Label>
            <Input
              id="database"
              value={form.database}
              onChange={(e) => update("database", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">
              Contraseña {connection ? "(dejar vacío para mantener)" : ""}
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>SSL</Label>
            <Select value={form.sslMode} onValueChange={(v) => update("sslMode", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prefer">Prefer</SelectItem>
                <SelectItem value="require">Require</SelectItem>
                <SelectItem value="verify-ca">Verify CA</SelectItem>
                <SelectItem value="verify-full">Verify Full</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ConnectionTest form={form} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
