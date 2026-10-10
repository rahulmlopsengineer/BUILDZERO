"use client";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { useMemo } from "react";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
}

const customTheme = EditorView.theme({
  "&": {
    backgroundColor: "#0e0f11 !important",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#7c6ef5",
  },
  ".cm-cursor": {
    borderLeftColor: "#7c6ef5 !important",
    borderLeftWidth: "2px !important",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(124,110,245,0.2) !important",
  },
  ".cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(124,110,245,0.2) !important",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(124,110,245,0.06) !important",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(124,110,245,0.06) !important",
  },
  ".cm-gutters": {
    backgroundColor: "#0e0f11 !important",
    borderRight: "1px solid rgba(255,255,255,0.07) !important",
    color: "#5a5b6a",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    paddingRight: "20px !important",
    minWidth: "50px !important",
    fontSize: "12px",
  },
  ".cm-foldGutter": {
    width: "16px",
  },
  ".cm-line": {
    paddingLeft: "16px !important",
  },
});

export default function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  const extensions = useMemo(() => {
    const lang = (() => {
      switch (language) {
        case "typescript":
        case "javascript":
          return javascript({ typescript: language === "typescript", jsx: true });
        case "css":
          return css();
        case "json":
          return json();
        case "markdown":
          return markdown();
        default:
          return javascript({ typescript: true, jsx: true });
      }
    })();
    return [lang, customTheme, EditorView.lineWrapping];
  }, [language]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={oneDark}
      extensions={extensions}
      onChange={onChange}
      style={{ height: "100%", fontSize: "13px" }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        history: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: false,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
        tabSize: 2,
      }}
    />
  );
}
