import { ToastMessage, useSettingsStore } from "@/stores/settingsStore";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: "border-emerald-600/40 bg-emerald-950/80 text-emerald-300",
  error: "border-red-600/40 bg-red-950/80 text-red-300",
  info: "border-blue-600/40 bg-blue-950/80 text-blue-300",
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useSettingsStore((s) => s.removeToast);
  const Icon = icons[toast.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${styles[toast.type]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useSettingsStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
