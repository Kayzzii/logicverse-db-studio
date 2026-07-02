import {
  AlignLeft,
  Play,
  ScanSearch,
  Square,
  TextSelect,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/shared/Kbd";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  executing: boolean;
  onExecute: () => void;
  onExecuteSelection: () => void;
  onCancel: () => void;
}

export function EditorToolbar({
  executing,
  onExecute,
  onExecuteSelection,
  onCancel,
}: EditorToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2">
      <Button
        size="sm"
        disabled={executing}
        onClick={onExecute}
        className={cn(
          "h-7 gap-1.5 bg-[var(--color-accent-green)] px-2.5 text-xs font-medium text-[var(--color-bg-tertiary)] hover:bg-[var(--color-accent-green)]/90",
        )}
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        Ejecutar
      </Button>

      {executing && (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={onCancel}>
          <Square className="h-3.5 w-3.5" />
          Cancelar
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs text-[var(--color-text-secondary)]"
        disabled={executing}
        onClick={onExecuteSelection}
      >
        <TextSelect className="h-3.5 w-3.5" />
        Selección
      </Button>

      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />

      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs text-[var(--color-text-muted)]"
        disabled
        title="Próximamente"
      >
        <AlignLeft className="h-3.5 w-3.5" />
        Formatear
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs text-[var(--color-text-muted)]"
        disabled
        title="Próximamente"
      >
        <ScanSearch className="h-3.5 w-3.5" />
        Explain
      </Button>

      <div className="ml-auto flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
        <Kbd>Ctrl</Kbd>
        <span>+</span>
        <Kbd>Enter</Kbd>
        <span className="ml-1 hidden sm:inline">para ejecutar</span>
      </div>
    </div>
  );
}
