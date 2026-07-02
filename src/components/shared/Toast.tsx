import { ToastMessage, useSettingsStore } from "@/stores/settingsStore";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: "border-[var(--color-accent-green)]/30 bg-[var(--color-bg-secondary)] text-[var(--color-accent-green)]",
  error: "border-[var(--color-accent-red)]/30 bg-[var(--color-bg-secondary)] text-[var(--color-accent-red)]",
  info: "border-[var(--color-primary)]/30 bg-[var(--color-bg-secondary)] text-[var(--color-primary)]",
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useSettingsStore((s) => s.removeToast);
  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        "toast-enter flex items-start gap-3 rounded-md border px-3 py-2.5 shadow-lg",
        styles[toast.type],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-xs">{toast.message}</p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useSettingsStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-12 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
