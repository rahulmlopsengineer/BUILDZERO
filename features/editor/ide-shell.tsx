"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ActivityBar } from "@/components/activity-bar";
import { Sidebar } from "@/components/sidebar";
import { EditorArea } from "@/components/editor-area";
import { ChatPanel } from "@/features/conversations/chat-panel";
import { IDEHeader } from "@/components/ide-header";
import { CommandPalette } from "@/components/command-palette";
import { DbPanel } from "@/features/database/db-panel";
import { PreviewPanel } from "@/features/preview/preview-panel";
import { DeployDashboard } from "@/components/deploy-dashboard";
import { useProjectFiles, useProjects } from "@/features/database/use-db";
import { DEFAULT_FILES, FILE_TREE, type FileNode } from "@/lib/file-store";
import type { DbFile } from "@/features/database/use-db";

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  dbFileId?: string; // set when file is loaded from DB
}

type RightPanel = "chat" | "preview" | "db" | "dashboard";

export function IDEShell() {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    {
      path: "app/page.tsx",
      name: "page.tsx",
      content: DEFAULT_FILES["app/page.tsx"],
      isDirty: false,
    },
  ]);
  const [activeTab, setActiveTab] = useState("app/page.tsx");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "ready" | "error">("idle");

  // Project management
  const { projects, loading: projLoading } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string>("");

  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const { files: dbFiles, saveFile: saveToDb, createFile: createDbFile } = useProjectFiles(activeProjectId);

  // WebContainer mock (ide-shell is legacy unused component)
  const wc = {
    status: "idle" as import("@/features/preview/use-webcontainer").PreviewStatus,
    previewUrl: null as string | null,
    logs: [] as string[],
    error: null as string | null,
    boot: async (_files: Record<string, string>, _fw: string) => {},
    writeFile: async (_path: string, _content: string) => {},
    clearLogs: () => {},
  };
  const autoSyncRef = useRef(false);

  const activeFile = openTabs.find((t) => t.path === activeTab);

  // ── Open file ──────────────────────────────────────────
  const openFile = useCallback(
    (node: FileNode) => {
      if (node.type === "dir") return;
      const existing = openTabs.find((t) => t.path === node.path);
      if (!existing) {
        setOpenTabs((prev) => [
          ...prev,
          {
            path: node.path,
            name: node.name,
            content: DEFAULT_FILES[node.path] ?? `// ${node.name}\n`,
            isDirty: false,
          },
        ]);
      }
      setActiveTab(node.path);
    },
    [openTabs]
  );

  // Open a file that came from the DB panel
  const openDbFile = useCallback(
    (dbFile: DbFile) => {
      const existing = openTabs.find((t) => t.path === dbFile.path);
      if (!existing) {
        setOpenTabs((prev) => [
          ...prev,
          {
            path: dbFile.path,
            name: dbFile.name,
            content: dbFile.content,
            isDirty: false,
            dbFileId: dbFile.id,
          },
        ]);
      } else {
        // Update content from DB
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.path === dbFile.path
              ? { ...t, content: dbFile.content, dbFileId: dbFile.id, isDirty: false }
              : t
          )
        );
      }
      setActiveTab(dbFile.path);
      setRightPanel("chat");
    },
    [openTabs]
  );

  // ── Close tab ──────────────────────────────────────────
  const closeTab = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.path !== path);
        if (activeTab === path && next.length > 0) {
          setActiveTab(next[next.length - 1].path);
        }
        return next;
      });
    },
    [activeTab]
  );

  // ── Update content ────────────────────────────────────
  const updateContent = useCallback((path: string, value: string) => {
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.path === path ? { ...t, content: value, isDirty: true } : t
      )
    );
    // Hot-reload WebContainer on edit
    if (wc.status === "ready") {
      wc.writeFile(path, value);
    }
  }, [wc]);

  // ── Save file ─────────────────────────────────────────
  const saveFile = useCallback(
    async (path: string) => {
      const tab = openTabs.find((t) => t.path === path);
      if (!tab) return;

      // Save to DB
      if (tab.dbFileId) {
        await saveToDb(tab.dbFileId, tab.content);
      } else {
        // Create in DB if it doesn't exist
        const newDbFile = await createDbFile(path, tab.content);
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.path === path ? { ...t, dbFileId: newDbFile.id } : t
          )
        );
      }

      setOpenTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, isDirty: false } : t))
      );
    },
    [openTabs, saveToDb, createDbFile]
  );

  // ── Boot WebContainer ─────────────────────────────────
  const handleBoot = useCallback(() => {
    const files: Record<string, string> = {};
    // Collect all open tabs
    openTabs.forEach((t) => { files[t.path] = t.content; });
    // Fill in defaults for any missing files
    Object.entries(DEFAULT_FILES).forEach(([p, c]) => {
      if (!files[p]) files[p] = c;
    });
    wc.boot(files, activeProject?.framework || "nextjs");
    setRightPanel("preview");
  }, [openTabs, wc]);

  // Auto-sync DB files to WebContainer when ready
  useEffect(() => {
    if (wc.status === "ready" && !autoSyncRef.current) {
      autoSyncRef.current = true;
      dbFiles.forEach((f) => {
        wc.writeFile(f.path, f.content);
      });
    }
    if (wc.status !== "ready") autoSyncRef.current = false;
  }, [wc.status, dbFiles, wc]);

  // ── Deployment ────────────────────────────────────────
  const handleDeploy = useCallback(async () => {
    setDeployStatus("deploying");
    try {
      // Save all dirty tabs first
      for (const tab of openTabs) {
        if (tab.isDirty) await saveFile(tab.path);
      }

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setDeployStatus("ready");
      setRightPanel("dashboard");
    } catch (err) {
      console.error("Deploy failed:", err);
      setDeployStatus("error");
    }
  }, [activeProjectId, openTabs, saveFile]);

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (activeTab) saveFile(activeTab); }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") { e.preventDefault(); setSidebarOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") { e.preventDefault(); setRightPanel("preview"); }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, saveFile]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-0 text-text font-sans">
      <IDEHeader
        onOpenCmd={() => setCmdOpen(true)}
        onToggleChat={() => setRightPanel((v) => v === "chat" ? "preview" : "chat")}
        onTogglePreview={() => setRightPanel((v) => v === "preview" ? "chat" : "preview")}
        onToggleDb={() => setRightPanel((v) => v === "db" ? "chat" : "db")}
        onToggleDashboard={() => setRightPanel((v) => v === "dashboard" ? "chat" : "dashboard")}
        onBoot={handleBoot}
        onDeploy={handleDeploy}
        rightPanel={rightPanel}
        previewStatus={wc.status}
        deployStatus={deployStatus}
      />

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          sidebarOpen={sidebarOpen}
        />

        {sidebarOpen && (
          <Sidebar
            tree={FILE_TREE}
            activeFile={activeTab}
            onOpenFile={openFile}
          />
        )}

        <EditorArea
          tabs={openTabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onCloseTab={closeTab}
          onChangeContent={updateContent}
          onSave={saveFile}
          onOpenCmd={() => setCmdOpen(true)}
        />

        {/* Right panel */}
        <div className="flex flex-col w-[290px] flex-shrink-0 border-l border-border overflow-hidden">
          {rightPanel === "chat" && (
            <ChatPanel fileContext={activeFile?.content} fileName={activeFile?.name} />
          )}
          {rightPanel === "preview" && (
            <PreviewPanel
              status={wc.status}
              previewUrl={wc.previewUrl}
              logs={wc.logs}
              error={wc.error}
              onBoot={handleBoot}
              onRefresh={handleBoot}
              onClearLogs={wc.clearLogs}
            />
          )}
          {rightPanel === "db" && (
            <DbPanel onOpenDbFile={openDbFile} />
          )}
          {rightPanel === "dashboard" && (
            <DeployDashboard projectId={activeProjectId} />
          )}
        </div>
      </div>

      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onOpenFile={openFile}
          tree={FILE_TREE}
        />
      )}
    </div>
  );
}
