import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: "Ctrl+N", label: "New Query Tab" },
  { keys: "Ctrl+S", label: "Save Query" },
  { keys: "Ctrl+Enter", label: "Execute Query" },
  { keys: "Ctrl+B", label: "Toggle Sidebar" },
  { keys: "Ctrl+W", label: "Close Tab" },
  { keys: "Ctrl+Tab", label: "Next Tab" },
  { keys: "Ctrl+Shift+Tab", label: "Previous Tab" },
  { keys: "Ctrl+1", label: "Go to Schema Browser" },
  { keys: "Ctrl+2", label: "Go to Editor" },
  { keys: "Ctrl+3", label: "Go to Results" },
  { keys: "Ctrl+F", label: "Quick Search (schema)" },
  { keys: "F5", label: "Refresh Schema" },
  { keys: "Ctrl+Z", label: "Undo" },
  { keys: "Ctrl+Shift+Z", label: "Redo" },
  { keys: "Ctrl+C", label: "Copy" },
  { keys: "Ctrl+X", label: "Cut" },
  { keys: "Ctrl+V", label: "Paste" },
  { keys: "Ctrl+A", label: "Select All" },
  { keys: "Ctrl+,", label: "Settings" },
  { keys: "Ctrl+K", label: "Keyboard Shortcuts" },
  { keys: "Ctrl+Q", label: "Exit" },
  { keys: "Ctrl+=", label: "Zoom In" },
  { keys: "Ctrl+-", label: "Zoom Out" },
  { keys: "Ctrl+0", label: "Reset Zoom" },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-hidden border-[var(--border)] bg-[var(--bg-panel)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            {SHORTCUTS.map((item) => (
              <div
                key={item.keys}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-[var(--bg-hover)]"
              >
                <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                <kbd className="rounded border border-[var(--border)] bg-[var(--bg-deep)] px-2 py-0.5 font-mono-db text-[10px] text-[var(--text-muted)]">
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
