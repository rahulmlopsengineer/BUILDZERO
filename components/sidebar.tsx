"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, FilePlus, FolderPlus } from "lucide-react";
import { cn, getFileDotColor } from "@/lib/utils";
import type { FileNode } from "@/lib/file-store";

interface SidebarProps {
  tree: FileNode[];
  activeFile: string;
  onOpenFile: (node: FileNode) => void;
}

export function Sidebar({ tree, activeFile, onOpenFile }: SidebarProps) {
  return (
    <div className="w-[230px] bg-bg-1 border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-[38px] flex items-center justify-between px-3 border-b border-border flex-shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-text-3 font-medium">
          Explorer
        </span>
        <div className="flex gap-1">
          <button
            title="New File"
            className="w-[22px] h-[22px] flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:bg-bg-3 hover:text-text-2 cursor-pointer transition-colors"
          >
            <FilePlus size={13} />
          </button>
          <button
            title="New Folder"
            className="w-[22px] h-[22px] flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:bg-bg-3 hover:text-text-2 cursor-pointer transition-colors"
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {tree.map((node, i) => (
          <TreeNode
            key={`${node.path}-${node.type}-${i}`}
            node={node}
            depth={0}
            activeFile={activeFile}
            onOpenFile={onOpenFile}
          />
        ))}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  activeFile: string;
  onOpenFile: (node: FileNode) => void;
}

function TreeNode({ node, depth, activeFile, onOpenFile }: TreeNodeProps) {
  const [open, setOpen] = useState(true);
  const isActive = node.path === activeFile;

  if (node.type === "dir") {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-1 px-2 py-[3.5px] text-[12px] text-text cursor-pointer hover:bg-bg-3 rounded-md mx-[5px] border-none bg-transparent font-sans transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px`, width: `calc(100% - 10px)` }}
        >
          {open ? <ChevronDown size={12} className="text-text-3 flex-shrink-0" /> : <ChevronRight size={12} className="text-text-3 flex-shrink-0" />}
          <span className="truncate">{node.name}/</span>
        </button>
        {open && node.children?.map((child, i) => (
          <TreeNode
            key={`${child.path}-${child.type}-${i}`}
            node={child}
            depth={depth + 1}
            activeFile={activeFile}
            onOpenFile={onOpenFile}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpenFile(node)}
      className={cn(
        "w-full flex items-center gap-[5px] py-[3.5px] text-[12.5px] font-mono cursor-pointer rounded-md mx-[5px] border-none transition-colors truncate",
        isActive
          ? "bg-purple/15 text-purple"
          : "text-text-2 bg-transparent hover:bg-bg-3 hover:text-text"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px`, width: `calc(100% - 10px)` }}
    >
      <span
        className={cn("w-[7px] h-[7px] rounded-full flex-shrink-0", getFileDotColor(node.name))}
      />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
