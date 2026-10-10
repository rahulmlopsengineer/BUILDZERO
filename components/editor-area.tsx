"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { X, Wand2, Save } from "lucide-react";
import { cn, getFileDotColor, getFileLanguage } from "@/lib/utils";
import type { OpenTab } from "@/types/ide";

// CodeMirror is SSR-incompatible — load client-side only
const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false });

interface EditorAreaProps {
  tabs: OpenTab[];
  activeTab: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (path: string, value: string) => void;
  onSave: (path: string) => void;
  onOpenCmd: () => void;
}

export function EditorArea({
  tabs,
  activeTab,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onSave,
  onOpenCmd,
}: EditorAreaProps) {
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickEditInstruction, setQuickEditInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const active = tabs.find((t) => t.path === activeTab);

  const handleQuickEdit = useCallback(async () => {
    if (!active || !quickEditInstruction.trim()) return;
    setIsEditing(true);
    try {
      const res = await fetch("/api/quick-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: quickEditInstruction,
          code: active.content,
          language: getFileLanguage(active.name),
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        // Vercel AI SDK data stream format — extract text
        for (const line of chunk.split("\n")) {
          if (line.startsWith('0:"')) {
            result += JSON.parse(line.slice(2));
          }
        }
        onChangeContent(active.path, result);
      }
    } finally {
      setIsEditing(false);
      setQuickEditOpen(false);
      setQuickEditInstruction("");
    }
  }, [active, quickEditInstruction, onChangeContent]);

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-0 text-text-3 text-sm">
        Open a file from the sidebar
      </div>
    );
  }

  const breadcrumbs = active ? active.path.split("/") : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-0">
      {/* Tabs */}
      <div className="flex items-center h-[38px] bg-bg-1 border-b border-border overflow-x-auto flex-shrink-0">
        {tabs.map((tab, i) => (
          <div
            key={`${tab.path}-${i}`}
            onClick={() => onSelectTab(tab.path)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 h-full cursor-pointer border-r border-border font-mono text-[12px] whitespace-nowrap flex-shrink-0 group transition-colors",
              tab.path === activeTab
                ? "bg-bg-0 text-text border-b-2 border-b-purple"
                : "text-text-3 hover:text-text-2 hover:bg-bg-2"
            )}
          >
            <span className={cn("w-[6px] h-[6px] rounded-full flex-shrink-0", getFileDotColor(tab.name))} />
            {tab.name}
            {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-accent-amber flex-shrink-0" />}
            <button
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.path); }}
              className="w-[15px] h-[15px] flex items-center justify-center rounded text-[11px] text-text-3 opacity-0 group-hover:opacity-100 hover:bg-bg-4 hover:text-text border-none bg-transparent cursor-pointer transition-all ml-0.5"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="h-[32px] flex items-center px-3.5 border-b border-border bg-bg-1 gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-text-3">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-3">/</span>}
              <span className={i === breadcrumbs.length - 1 ? "text-text" : "text-text-2"}>
                {crumb}
              </span>
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {active && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 border border-accent-blue/25 text-accent-blue">
              {getFileLanguage(active.name)}
            </span>
          )}
          {active && !active.isDirty && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/25 text-accent-green">
              Saved
            </span>
          )}
          {active?.isDirty && (
            <button
              onClick={() => onSave(active.path)}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-border-2 bg-transparent text-text-3 hover:text-text hover:bg-bg-3 cursor-pointer font-sans transition-colors"
            >
              <Save size={11} /> Save
            </button>
          )}
          <button
            onClick={() => setQuickEditOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 h-6 px-2.5 rounded-md border text-[11px] cursor-pointer font-sans transition-colors",
              quickEditOpen
                ? "border-purple/40 bg-purple/10 text-purple"
                : "border-border-2 bg-transparent text-text-2 hover:bg-bg-3 hover:text-text"
            )}
          >
            <Wand2 size={11} />
            AI Edit
          </button>
        </div>
      </div>

      {/* Quick Edit Bar */}
      {quickEditOpen && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-bg-2 border-b border-purple/30 flex-shrink-0">
          <Wand2 size={13} className="text-purple flex-shrink-0" />
          <input
            autoFocus
            value={quickEditInstruction}
            onChange={(e) => setQuickEditInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickEdit();
              if (e.key === "Escape") setQuickEditOpen(false);
            }}
            placeholder="Describe what to change… (e.g. 'add error handling' or 'convert to async/await')"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-text placeholder:text-text-3 font-sans"
          />
          <button
            onClick={handleQuickEdit}
            disabled={isEditing || !quickEditInstruction.trim()}
            className="text-[11px] px-3 py-1 rounded-md bg-purple text-white border-none cursor-pointer hover:opacity-85 disabled:opacity-40 font-sans transition-opacity"
          >
            {isEditing ? "Editing…" : "Apply ⏎"}
          </button>
          <button
            onClick={() => setQuickEditOpen(false)}
            className="text-[11px] px-2 py-1 rounded-md border border-border-2 bg-transparent text-text-3 hover:text-text cursor-pointer font-sans transition-colors"
          >
            Esc
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {active && (
          <CodeEditor
            key={active.path}
            value={active.content}
            language={getFileLanguage(active.name)}
            onChange={(val) => onChangeContent(active.path, val)}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="h-[24px] flex items-center px-3 border-t border-border bg-bg-1 gap-4 flex-shrink-0 font-mono text-[11px] text-text-3">
        <div className="flex items-center gap-1.5">
          <span className="w-[6px] h-[6px] rounded-full bg-accent-green" />
          Connected
        </div>
        <span>TypeScript 5.4</span>
        <span>Next.js 15</span>
        <div className="ml-auto flex gap-4">
          <span>UTF-8</span>
          <span>ESLint ✓</span>
        </div>
      </div>
    </div>
  );
}
