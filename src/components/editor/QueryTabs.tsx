import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryStore } from "@/stores/queryStore";
import { cn } from "@/lib/utils";

export function QueryTabs() {
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const addTab = useQueryStore((s) => s.addTab);
  const closeTab = useQueryStore((s) => s.closeTab);
  const setActiveTab = useQueryStore((s) => s.setActiveTab);

  const currentActive = activeTabId ?? tabs[0]?.id ?? null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-card)] px-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "group flex max-w-[180px] items-center gap-1 rounded-t-md border border-b-0 px-3 py-1.5 text-xs",
            currentActive === tab.id
              ? "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)]"
              : "border-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/40",
          )}
        >
          <button
            type="button"
            className="truncate"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.title}
            {tab.executing && " •"}
          </button>
          {tabs.length > 1 && (
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => closeTab(tab.id)}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => addTab()}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
