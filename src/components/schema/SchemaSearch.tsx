import { Search, X } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef } from "react";

export interface SchemaSearchHandle {
  focus: () => void;
}

interface SchemaSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const SchemaSearch = forwardRef<SchemaSearchHandle, SchemaSearchProps>(
  function SchemaSearch({ value, onChange }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
        inputRef.current?.select();
      },
    }));

    return (
      <div className="shrink-0 px-2.5 pb-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-[11px] w-[11px] -translate-y-1/2 text-[var(--text-ghost)]"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            id="schema-search-input"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-deep)] py-[5px] pl-7 pr-7 font-mono-db text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-ghost)] focus:border-[var(--accent)]/40"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-ghost)] hover:text-[var(--text-muted)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  },
);
