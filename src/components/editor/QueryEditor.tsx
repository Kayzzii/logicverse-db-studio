import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";
import { useSchemaCompletionStore } from "@/stores/queryStore";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: (selection?: string) => void;
  readOnly?: boolean;
}

export function QueryEditor({ value, onChange, onExecute, readOnly }: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onExecuteRef = useRef(onExecute);
  const completionItems = useSchemaCompletionStore((s) => s.items);

  onChangeRef.current = onChange;
  onExecuteRef.current = onExecute;

  useEffect(() => {
    if (!containerRef.current) return;

    const executeKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: (view) => {
          const selection = view.state.sliceDoc(
            view.state.selection.main.from,
            view.state.selection.main.to,
          );
          onExecuteRef.current(selection.trim() || undefined);
          return true;
        },
      },
    ]);

    const sqlCompletion = autocompletion({
      override: [
        (context) => {
          const word = context.matchBefore(/\w*/);
          if (!word || (word.from === word.to && !context.explicit)) return null;

          const options = completionItems.map((item) => ({
            label: item.label,
            type: item.type,
          }));

          return {
            from: word.from,
            options,
          };
        },
      ],
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const startState = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        sql({ dialect: PostgreSQL }),
        oneDark,
        executeKeymap,
        keymap.of([...defaultKeymap, ...completionKeymap, indentWithTab]),
        sqlCompletion,
        updateListener,
        EditorView.lineWrapping,
        EditorState.readOnly.of(!!readOnly),
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[200px] overflow-hidden rounded-md border border-[var(--color-border)]"
    />
  );
}
