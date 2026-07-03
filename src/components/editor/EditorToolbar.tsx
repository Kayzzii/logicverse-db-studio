import { useState } from "react";
import { Bookmark, Play, Square, TextSelect } from "lucide-react";
import { SavedQueriesDialog } from "@/components/editor/SavedQueriesDialog";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  executing: boolean;
  onExecute: () => void;
  onExecuteSelection: () => void;
  onCancel: () => void;
  onSave: () => void;
  onExplain: () => void;
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "run" | "default" | "ghost" | "action";
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-[22px] items-center gap-1.5 rounded-[3px] px-[9px] font-ui text-[11px] font-medium transition-colors",
        variant === "run" &&
          "border border-[rgba(166,227,161,0.28)] bg-[rgba(166,227,161,0.12)] text-[var(--green)] hover:bg-[rgba(166,227,161,0.18)]",
        variant === "default" &&
          "border border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.14)] hover:text-[var(--text-primary)]",
        variant === "ghost" &&
          "cursor-not-allowed border border-transparent bg-transparent text-[var(--text-ghost)]",
        variant === "action" &&
          "border border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.14)] hover:text-[var(--text-primary)]",
        disabled && variant !== "ghost" && "opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({
  executing,
  onExecute,
  onExecuteSelection,
  onCancel,
  onSave,
  onExplain,
}: EditorToolbarProps) {
  const [savedOpen, setSavedOpen] = useState(false);

  return (
    <>
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[var(--border)] bg-[var(--bg-panel)] px-2">
        <ToolbarButton variant="run" disabled={executing} onClick={onExecute}>
          <Play className="h-[9px] w-[9px] fill-[var(--green)] text-[var(--green)]" />
          Run
        </ToolbarButton>

        {executing && (
          <ToolbarButton variant="default" onClick={onCancel}>
            <Square className="h-3 w-3" />
            Cancel
          </ToolbarButton>
        )}

        <ToolbarButton variant="default" disabled={executing} onClick={onExecuteSelection}>
          <TextSelect className="h-3 w-3" strokeWidth={1.75} />
          Selection
        </ToolbarButton>

        <div className="mx-0.5 h-[14px] w-px bg-[rgba(255,255,255,0.08)]" />

        <ToolbarButton variant="default" disabled={executing} onClick={onSave}>
          Save
        </ToolbarButton>
        <ToolbarButton variant="default" disabled={executing} onClick={() => setSavedOpen(true)}>
          <Bookmark className="h-3 w-3" strokeWidth={1.75} />
          Saved
        </ToolbarButton>

        <div className="mx-0.5 h-[14px] w-px bg-[rgba(255,255,255,0.08)]" />

        <ToolbarButton variant="action" disabled={executing} onClick={onExplain}>
          Explain
        </ToolbarButton>

        <ToolbarButton variant="ghost" disabled>
          Format
        </ToolbarButton>

        <span className="ml-auto font-mono-db text-[11px] tracking-[0.2px] text-[var(--text-ghost)]">
          Ctrl+Enter
        </span>
      </div>

      <SavedQueriesDialog open={savedOpen} onOpenChange={setSavedOpen} />
    </>
  );
}
