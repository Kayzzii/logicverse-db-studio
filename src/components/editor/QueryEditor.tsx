import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, indentWithTab, undo, redo, selectAll } from "@codemirror/commands";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { bracketMatching, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { useSchemaCompletionStore } from "@/stores/queryStore";
import { useEditorCursor } from "@/components/layout/EditorCursorContext";

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: (selection?: string) => void;
  readOnly?: boolean;
}

export interface QueryEditorHandle {
  executeSelection: () => void;
  focus: () => void;
  selectAll: () => void;
  insertText: (text: string) => void;
  undo: () => void;
  redo: () => void;
}

const sqlHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--purple)" },
  { tag: [t.operator, t.logicOperator], color: "var(--accent)" },
  { tag: t.string, color: "var(--green)" },
  { tag: [t.variableName, t.propertyName, t.special(t.variableName)], color: "var(--accent)" },
  { tag: t.name, color: "var(--text-primary)" },
  { tag: [t.punctuation, t.separator], color: "var(--text-dim)" },
  { tag: t.comment, color: "var(--text-ghost)", fontStyle: "italic" },
  { tag: t.number, color: "var(--yellow)" },
  { tag: t.bool, color: "var(--green)" },
]);

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "var(--bg-app)",
    color: "var(--text-primary)",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "22px",
  },
  ".cm-content": {
    padding: "12px 18px",
    caretColor: "var(--accent)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-app)",
    color: "var(--text-ghost)",
    borderRight: "1px solid var(--border-subtle)",
    minWidth: "42px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 0",
    minWidth: "42px",
    textAlign: "right",
    fontSize: "12.5px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(137, 180, 250, 0.06)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(137, 180, 250, 0.05)",
    color: "var(--text-muted)",
  },
  ".cm-cursor": {
    borderLeftWidth: "2px",
    borderLeftColor: "var(--accent)",
    marginLeft: "-1px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(137, 180, 250, 0.2) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(166, 227, 161, 0.15)",
    outline: "1px solid var(--green)",
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
  const { setCursor } = useEditorCursor();

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
    focus: () => {
      viewRef.current?.focus();
    },
    selectAll: () => {
      const view = viewRef.current;
      if (view) selectAll(view);
    },
    insertText: (text: string) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    },
    undo: () => {
      const view = viewRef.current;
      if (view) undo(view);
    },
    redo: () => {
      const view = viewRef.current;
      if (view) redo(view);
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
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        setCursor({ line: line.number, column: pos - line.from + 1 });
      }
    });

    const startState = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        syntaxHighlighting(sqlHighlight),
        sql({ dialect: PostgreSQL }),
        editorTheme,
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

    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    setCursor({ line: line.number, column: pos - line.from + 1 });

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [readOnly, setCursor]);

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
    <div ref={containerRef} className="h-full min-h-0 overflow-hidden bg-[var(--bg-app)]" />
  );
});
