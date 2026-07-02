import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { bracketMatching } from "@codemirror/language";
import { useSchemaCompletionStore } from "@/stores/queryStore";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: (selection?: string) => void;
  readOnly?: boolean;
}

export interface QueryEditorHandle {
  executeSelection: () => void;
}

const catppuccinTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    backgroundColor: "var(--color-bg-tertiary)",
    color: "var(--color-text-primary)",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-bg-secondary)",
    color: "var(--color-text-muted)",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(137, 180, 250, 0.06)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(137, 180, 250, 0.1)",
    color: "var(--color-primary)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(137, 180, 250, 0.2) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(166, 227, 161, 0.15)",
    outline: "1px solid var(--color-accent-green)",
  },
});

export const QueryEditor = forwardRef<QueryEditorHandle, QueryEditorProps>(function QueryEditor(
  { value, onChange, onExecute, readOnly },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onExecuteRef = useRef(onExecute);
  const completionItems = useSchemaCompletionStore((s) => s.items);

  onChangeRef.current = onChange;
  onExecuteRef.current = onExecute;

  useImperativeHandle(ref, () => ({
    executeSelection: () => {
      const view = viewRef.current;
      if (!view) return;
      const selection = view.state.sliceDoc(
        view.state.selection.main.from,
        view.state.selection.main.to,
      );
      onExecuteRef.current(selection.trim() || undefined);
    },
  }));

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

          return { from: word.from, options };
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
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        sql({ dialect: PostgreSQL }),
        catppuccinTheme,
        executeKeymap,
        keymap.of([...defaultKeymap, ...completionKeymap, indentWithTab]),
        sqlCompletion,
        updateListener,
        EditorView.lineWrapping,
        EditorState.readOnly.of(!!readOnly),
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
      className="h-full min-h-0 overflow-hidden bg-[var(--color-bg-tertiary)]"
    />
  );
});
