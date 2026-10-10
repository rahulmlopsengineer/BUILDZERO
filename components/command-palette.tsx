"use client";

import { useState, useEffect, useRef } from "react";
import { Search, FileCode, Settings, GitBranch, Terminal } from "lucide-react";
import { cn, getFileDotColor } from "@/lib/utils";
import type { FileNode } from "@/lib/file-store";

interface CommandPaletteProps {
  onClose: () => void;
  onOpenFile: (node: FileNode) => void;
  tree: FileNode[];
}

interface CmdItem {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  type: "file" | "command";
  node?: FileNode;
}

function flattenTree(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === "file") files.push(node);
    else if (node.children) files.push(...flattenTree(node.children));
  }
  return files;
}

export function CommandPalette({ onClose, onOpenFile, tree }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allFiles = flattenTree(tree);

  const fileItems: CmdItem[] = allFiles.map((f) => ({
    id: f.path,
    label: f.name,
    hint: f.path,
    type: "file",
    node: f,
    icon: (
      <span className={cn("w-[7px] h-[7px] rounded-full flex-shrink-0", getFileDotColor(f.name))} />
    ),
  }));

  const commandItems: CmdItem[] = [
    { id: "run-dev", label: "Run dev server", hint: "npm run dev", type: "command", icon: <Terminal size={13} /> },
    { id: "format", label: "Format document", hint: "Prettier", type: "command", icon: <FileCode size={13} /> },
    { id: "git-status", label: "Git: Show status", hint: "Source control", type: "command", icon: <GitBranch size={13} /> },
    { id: "settings", label: "Open settings", hint: "⌘,", type: "command", icon: <Settings size={13} /> },
  ];

  const all = [...fileItems, ...commandItems];

  const filtered = query
    ? all.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.hint.toLowerCase().includes(query.toLowerCase())
      )
    : all;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((v) => Math.min(v + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((v) => Math.max(v - 1, 0));
      }
      if (e.key === "Enter") {
        const item = filtered[selected];
        if (item) handleSelect(item);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected]);

  function handleSelect(item: CmdItem) {
    if (item.type === "file" && item.node) {
      onOpenFile(item.node);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[120px] z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[560px] bg-bg-2 border border-border-2 rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        style={{ animation: "slideDown 0.15s ease" }}
      >
        <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }`}</style>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={14} className="text-text-3 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, run commands…"
            className="flex-1 bg-transparent outline-none text-[14px] text-text placeholder:text-text-3 font-sans"
          />
          <kbd className="bg-bg-4 border border-border-2 rounded px-1.5 py-0.5 text-[10px] font-mono text-text-3">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-[13px] text-text-3">No results for "{query}"</div>
          )}

          {!query && (
            <div className="px-3 py-1.5 text-[10px] text-text-3 uppercase tracking-widest">Files</div>
          )}
          {filtered
            .filter((c) => !query || c.type === "file")
            .slice(0, query ? undefined : 6)
            .map((item, i) => (
              <CmdRow
                key={item.id}
                item={item}
                isSelected={selected === i}
                onClick={() => handleSelect(item)}
              />
            ))}

          {!query && (
            <>
              <div className="px-3 py-1.5 text-[10px] text-text-3 uppercase tracking-widest mt-1">Commands</div>
              {commandItems.map((item, i) => (
                <CmdRow
                  key={item.id}
                  item={item}
                  isSelected={selected === fileItems.slice(0, 6).length + i}
                  onClick={() => handleSelect(item)}
                />
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-text-3">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">⏎</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

function CmdRow({ item, isSelected, onClick }: { item: CmdItem; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer border-none font-sans transition-colors text-left",
        isSelected ? "bg-bg-3 text-text" : "text-text-2 bg-transparent hover:bg-bg-3 hover:text-text"
      )}
    >
      <span className="flex items-center justify-center w-[22px] h-[22px] rounded-md bg-bg-4 text-text-2 flex-shrink-0">
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      <span className="text-[11px] text-text-3 truncate max-w-[180px]">{item.hint}</span>
    </button>
  );
}
