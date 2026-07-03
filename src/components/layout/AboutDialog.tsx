import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogicVerseLogo } from "@/components/shared/LogicVerseLogo";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-[var(--border)] bg-[var(--bg-panel)]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <LogicVerseLogo size={48} />
            <div>
              <DialogTitle className="text-[var(--text-primary)]">
                LogicVerse DB Studio
              </DialogTitle>
              <DialogDescription>v0.1.0</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          <p>
            Gestor de bases de datos liviano, rápido y seguro — una alternativa moderna
            a DBeaver.
          </p>
          <p>
            Autor: <span className="text-[var(--text-primary)]">Kayzzii</span> / LogicVerse
          </p>
          <p className="text-xs text-[var(--text-muted)]">Licencia MIT</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
