import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES,
  CategoryId,
  DRIVERS,
  DriverOption,
} from "@/components/connections/drivers";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

interface DriverSelectorProps {
  onSelect: (driver: DriverOption) => void;
  onCancel: () => void;
}

export function DriverSelector({ onSelect, onCancel }: DriverSelectorProps) {
  const addToast = useSettingsStore((s) => s.addToast);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [filter, setFilter] = useState("");

  const visibleDrivers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return DRIVERS.filter((driver) => {
      const inCategory =
        activeCategory === "all" || driver.categories.includes(activeCategory);
      const matchesFilter =
        !term ||
        driver.name.toLowerCase().includes(term) ||
        driver.description.toLowerCase().includes(term);
      return inCategory && matchesFilter;
    });
  }, [activeCategory, filter]);

  const handleSelect = (driver: DriverOption) => {
    if (!driver.enabled) {
      addToast("info", `${driver.name} — Coming soon`);
      return;
    }
    onSelect(driver);
  };

  return (
    <div className="flex h-[420px] flex-col">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Connect to a database
        </h3>
        <p className="text-xs text-[var(--text-muted)]">Select your database driver</p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--border)]">
        <aside className="w-[160px] shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-deep)] p-1">
          {CATEGORIES.map(({ id, label, Icon }) => {
            const active = activeCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveCategory(id)}
                className={cn(
                  "mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
                  active
                    ? "border-l-2 border-[var(--accent)] bg-[rgba(137,180,250,0.1)] text-[var(--accent)]"
                    : "border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-panel)] p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-ghost)]" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter drivers..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {visibleDrivers.map((driver) => (
                <button
                  key={driver.id}
                  type="button"
                  title={driver.enabled ? driver.description : "Coming soon"}
                  disabled={!driver.enabled}
                  onClick={() => handleSelect(driver)}
                  className={cn(
                    "flex h-[90px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 transition-colors",
                    driver.enabled
                      ? "cursor-pointer hover:border-[var(--accent)] hover:bg-[rgba(137,180,250,0.07)]"
                      : "cursor-not-allowed opacity-35",
                  )}
                >
                  <driver.Icon />
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                    {driver.name}
                  </span>
                </button>
              ))}
            </div>
            {visibleDrivers.length === 0 && (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                No drivers match your filter
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
