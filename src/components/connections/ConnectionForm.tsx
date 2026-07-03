import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { DriverSelector } from "@/components/connections/DriverSelector";
import { DriverOption } from "@/components/connections/drivers";
import {
  defaultForm,
  DRIVER_DEFAULTS,
  getDriverLabel,
} from "@/components/connections/driverDefaults";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSchemaStore } from "@/stores/schemaStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ConnectionInput, ConnectionSummary } from "@/lib/tauri";

interface ConnectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ConnectionSummary | null;
  onSaved: () => void;
}

export function ConnectionForm({
  open,
  onOpenChange,
  connection,
  onSaved,
}: ConnectionFormProps) {
  const saveConnection = useConnectionStore((s) => s.saveConnection);
  const testConnection = useConnectionStore((s) => s.testConnection);
  const connect = useConnectionStore((s) => s.connect);
  const reloadSchema = useSchemaStore((s) => s.reloadSchema);
  const resetSchema = useSchemaStore((s) => s.reset);
  const addToast = useSettingsStore((s) => s.addToast);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ConnectionInput>(defaultForm());
  const [sshExpanded, setSshExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const isSqlite = form.driver === "sqlite";
  const driverLabel = getDriverLabel(form.driver);

  useEffect(() => {
    if (!open) return;

    if (connection) {
      setStep(2);
      setForm({
        id: connection.id,
        name: connection.name,
        driver: connection.driver || "postgres",
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: "",
        sslMode: connection.sslMode,
        sshEnabled: connection.sshEnabled ?? false,
        sshHost: connection.sshHost ?? "",
        sshPort: connection.sshPort ?? 22,
        sshUser: connection.sshUser ?? "",
        sshPassword: "",
        sshKeyPath: connection.sshKeyPath ?? "",
      });
      setSshExpanded(connection.sshEnabled ?? false);
    } else {
      setStep(1);
      setForm(defaultForm());
      setSshExpanded(false);
    }
  }, [connection, open]);

  const update = <K extends keyof ConnectionInput>(
    key: K,
    value: ConnectionInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectDriver = (driver: DriverOption) => {
    const defaults = DRIVER_DEFAULTS[driver.backendDriver] ?? {};
    setForm((prev) => ({
      ...defaultForm(),
      ...defaults,
      driver: driver.backendDriver,
      name: prev.name,
      id: prev.id,
      password: prev.password,
    }));
    setStep(2);
  };

  const validate = (): boolean => {
    if (!form.name.trim()) {
      addToast("error", "El nombre de conexión es obligatorio");
      return false;
    }
    if (!form.database.trim()) {
      addToast(
        "error",
        isSqlite ? "La ruta del archivo es obligatoria" : "La base de datos es obligatoria",
      );
      return false;
    }
    if (!isSqlite && !form.host.trim()) {
      addToast("error", "El host es obligatorio");
      return false;
    }
    if (form.sshEnabled && !isSqlite) {
      if (!form.sshHost?.trim()) {
        addToast("error", "SSH host es obligatorio");
        return false;
      }
      if (!form.sshUser?.trim()) {
        addToast("error", "SSH user es obligatorio");
        return false;
      }
    }
    return true;
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    try {
      await testConnection(form);
      addToast("success", "Conexión exitosa");
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async (closeAfter = false) => {
    if (!validate()) return;
    setConnecting(true);
    try {
      const saved = await saveConnection(form);
      resetSchema();
      await connect(saved.id);
      await reloadSchema(saved.id, saved.database);
      addToast("success", `Conectado a ${saved.name}`);
      if (closeAfter) {
        onSaved();
      }
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveConnection(form);
      addToast("success", connection ? "Conexión actualizada" : "Conexión guardada");
      onSaved();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const browseSqliteFile = async () => {
    const selected = await openFileDialog({
      multiple: false,
      filters: [
        {
          name: "SQLite database",
          extensions: ["db", "sqlite", "sqlite3"],
        },
      ],
    });
    if (typeof selected === "string") {
      update("database", selected);
    }
  };

  const browseSshKey = async () => {
    const selected = await openFileDialog({
      multiple: false,
      filters: [
        {
          name: "SSH private key",
          extensions: ["pem", "key"],
        },
      ],
    });
    if (typeof selected === "string") {
      update("sshKeyPath", selected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          step === 1
            ? "max-h-[90vh] max-w-[650px] border-[var(--border)] bg-[var(--bg-panel)]"
            : "max-w-[500px] border-[var(--border)] bg-[var(--bg-panel)]"
        }
      >
        {step === 1 ? (
          <DriverSelector
            onSelect={selectDriver}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[var(--text-secondary)]"
                onClick={() => setStep(1)}
              >
                ← Driver
              </Button>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {driverLabel}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testing || connecting}
                  onClick={() => void handleTest()}
                >
                  {testing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
                <Button
                  size="sm"
                  disabled={testing || connecting || saving}
                  onClick={() => void handleConnect(false)}
                >
                  {connecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Connection name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Mi servidor local"
                />
              </div>

              {isSqlite ? (
                <div className="grid gap-2">
                  <Label htmlFor="database">Database file</Label>
                  <div className="flex gap-2">
                    <Input
                      id="database"
                      value={form.database}
                      onChange={(e) => update("database", e.target.value)}
                      placeholder="/path/to/file.db"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void browseSqliteFile()}
                    >
                      Browse
                    </Button>
                  </div>
                </div>
              ) : (
                <>
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
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={form.port}
                        onChange={(e) => update("port", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="database">Database</Label>
                    <Input
                      id="database"
                      value={form.database}
                      onChange={(e) => update("database", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => update("username", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">
                      Password {connection ? "(vacío = mantener)" : ""}
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
                    <Select
                      value={form.sslMode}
                      onValueChange={(v) => update("sslMode", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prefer">Prefer</SelectItem>
                        <SelectItem value="require">Require</SelectItem>
                        {form.driver === "postgres" && (
                          <>
                            <SelectItem value="verify-ca">Verify CA</SelectItem>
                            <SelectItem value="verify-full">Verify Full</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border border-[var(--border)]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                      onClick={() => setSshExpanded((v) => !v)}
                    >
                      {sshExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      SSH Tunnel
                    </button>

                    {sshExpanded && (
                      <div className="space-y-3 border-t border-[var(--border)] px-3 py-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.sshEnabled ?? false}
                            onChange={(e) => update("sshEnabled", e.target.checked)}
                          />
                          <span className="text-[var(--text-secondary)]">
                            Habilitar túnel SSH
                          </span>
                        </label>

                        <div className="grid gap-2">
                          <Label htmlFor="sshHost">SSH Host</Label>
                          <Input
                            id="sshHost"
                            value={form.sshHost ?? ""}
                            onChange={(e) => update("sshHost", e.target.value)}
                            disabled={!form.sshEnabled}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="sshPort">SSH Port</Label>
                          <Input
                            id="sshPort"
                            type="number"
                            value={form.sshPort ?? 22}
                            onChange={(e) =>
                              update("sshPort", Number(e.target.value))
                            }
                            disabled={!form.sshEnabled}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="sshUser">SSH User</Label>
                          <Input
                            id="sshUser"
                            value={form.sshUser ?? ""}
                            onChange={(e) => update("sshUser", e.target.value)}
                            disabled={!form.sshEnabled}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="sshPassword">
                            SSH Password {connection ? "(vacío = mantener)" : ""}
                          </Label>
                          <Input
                            id="sshPassword"
                            type="password"
                            value={form.sshPassword ?? ""}
                            onChange={(e) => update("sshPassword", e.target.value)}
                            disabled={!form.sshEnabled}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="sshKeyPath">SSH Key File</Label>
                          <div className="flex gap-2">
                            <Input
                              id="sshKeyPath"
                              value={form.sshKeyPath ?? ""}
                              onChange={(e) => update("sshKeyPath", e.target.value)}
                              placeholder="~/.ssh/id_rsa"
                              className="min-w-0 flex-1"
                              disabled={!form.sshEnabled}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!form.sshEnabled}
                              onClick={() => void browseSshKey()}
                            >
                              Browse
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={saving || connecting}
                  onClick={() => void handleSave()}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  disabled={saving || connecting}
                  onClick={() => void handleConnect(true)}
                >
                  {connecting ? "Conectando..." : "Save & Connect"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
