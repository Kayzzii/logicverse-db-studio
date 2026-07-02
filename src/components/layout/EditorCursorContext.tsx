import { createContext, useContext, useState, type ReactNode } from "react";

interface CursorPosition {
  line: number;
  column: number;
}

interface EditorCursorContextValue {
  cursor: CursorPosition;
  setCursor: (cursor: CursorPosition) => void;
}

const EditorCursorContext = createContext<EditorCursorContextValue>({
  cursor: { line: 1, column: 1 },
  setCursor: () => {},
});

export function EditorCursorProvider({ children }: { children: ReactNode }) {
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, column: 1 });
  return (
    <EditorCursorContext.Provider value={{ cursor, setCursor }}>
      {children}
    </EditorCursorContext.Provider>
  );
}

export function useEditorCursor() {
  return useContext(EditorCursorContext);
}
