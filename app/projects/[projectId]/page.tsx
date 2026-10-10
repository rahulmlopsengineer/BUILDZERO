'use client';

// Tell Next.js this is a fully dynamic page — never statically pre-render
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

import { IDEHeader } from '@/components/ide-header';
import { cn } from '@/lib/utils';
import { ActivityBar } from '@/components/activity-bar';
import { Sidebar } from '@/components/sidebar';
import { EditorArea } from '@/components/editor-area';
import { CommandPalette } from '@/components/command-palette';
import { ChatPanel } from '@/features/conversations/chat-panel';
import { AgentPanel } from '@/features/agent/agent-panel';
import { PreviewPanel } from '@/features/preview/preview-panel';
import { DbPanel } from '@/features/database/db-panel';
import { DeployDashboard } from '@/components/deploy-dashboard';
import { CodePushModal } from '@/components/code-push-modal';
import { useWebContainer } from '@/features/preview/use-webcontainer';
import { useProjectFiles } from '@/features/database/use-db';
import type { FileNode } from '@/lib/file-store';
import type { DbFile } from '@/features/database/use-db';
import type { OpenTab } from '@/types/ide';

// ── Types ──────────────────────────────────────────────────
interface ApiFile {
  id: string;
  _id?: string;
  fileName: string;
  filePath: string;
  content: string;
  fileType: string;
}

interface ApiProject {
  id: string;
  name: string;
  description: string;
  framework: string;
  files: ApiFile[];
}

type RightPanel = 'chat' | 'agent' | 'preview' | 'db' | 'dashboard';

// ── Page ───────────────────────────────────────────────────
export default function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const router = useRouter();
  const { projectId } = use(params);

  const [project, setProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [codePushOpen, setCodePushOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);

  const [dbProjectId] = useState<string>('proj_default');
  const { files: dbFiles, saveFile: saveToDb, createFile: createDbFile } = useProjectFiles(dbProjectId);

  const wc = useWebContainer();
  const autoSyncRef = useRef(false);

  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'ready' | 'error'>('idle');
  const activeFile = openTabs.find((t) => t.path === activeTab);

  // ── Load project ──────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/files`);
        if (res.status === 401) { router.push('/auth/signin'); return; }
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json().catch(() => ({}));

        const rawFiles: ApiFile[] = (data.files ?? []).map((f: ApiFile) => ({
          id: f.id ?? (f as any)._id?.toString() ?? crypto.randomUUID(),
          fileName: f.fileName,
          filePath: f.filePath,
          content: f.content ?? '',
          fileType: f.fileType ?? 'text',
        }));

        const files = Array.from(new Map(rawFiles.map(f => [f.filePath, f])).values());

        const proj: ApiProject = {
          id: projectId,
          name: data.name ?? 'Project',
          description: data.description ?? '',
          framework: data.framework ?? 'react',
          files,
        };

        setProject(proj);
        setFileTree(buildFileTree(files));

        if (files.length > 0) {
          setOpenTabs(files.map((f) => ({
            path: f.filePath,
            name: f.fileName,
            content: f.content,
            isDirty: false,
            apiFileId: f.id,
          })));
          setActiveTab(files[0].filePath);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, router]);

  // ── Auto-sync DB → WebContainer ───────────────────────
  useEffect(() => {
    if (wc.status === 'ready' && !autoSyncRef.current) {
      autoSyncRef.current = true;
      dbFiles.forEach((f) => wc.writeFile(f.path, f.content));
    }
    if (wc.status !== 'ready') autoSyncRef.current = false;
  }, [wc.status, dbFiles, wc]);

  // ── openFile ──────────────────────────────────────────
  const openFile = useCallback((node: FileNode) => {
    if (node.type === 'dir') return;
    const apiFile = project?.files.find((f) => f.filePath === node.path);
    setOpenTabs((prev) => {
      if (prev.find((t) => t.path === node.path)) return prev;
      return [...prev, {
        path: node.path, name: node.name,
        content: apiFile?.content ?? `// ${node.name}\n`,
        isDirty: false, apiFileId: apiFile?.id,
      }];
    });
    setActiveTab(node.path);
  }, [project]);

  // ── openDbFile ────────────────────────────────────────
  const openDbFile = useCallback((dbFile: DbFile) => {
    setOpenTabs((prev) => {
      const existing = prev.find((t) => t.path === dbFile.path);
      if (existing) {
        return prev.map((t) =>
          t.path === dbFile.path
            ? { ...t, content: dbFile.content, dbFileId: dbFile.id, isDirty: false }
            : t
        );
      }
      return [...prev, {
        path: dbFile.path, name: dbFile.name, content: dbFile.content,
        isDirty: false, dbFileId: dbFile.id,
      }];
    });
    setActiveTab(dbFile.path);
    setRightPanel('chat');
  }, []);

  // ── closeTab ──────────────────────────────────────────
  const closeTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      if (activeTab === path && next.length > 0) setActiveTab(next[next.length - 1].path);
      return next;
    });
  }, [activeTab]);

  // ── updateContent ─────────────────────────────────────
  const updateContent = useCallback((path: string, value: string) => {
    setOpenTabs((prev) =>
      prev.map((t) => t.path === path ? { ...t, content: value, isDirty: true } : t)
    );
    if (wc.status === 'ready') wc.writeFile(path, value);
  }, [wc]);

  // ── Agent file change callback ────────────────────────
  const handleAgentFileChange = useCallback((filePath: string, fileName: string, content: string) => {
    // Update or add the tab
    setOpenTabs((prev) => {
      const existing = prev.find((t) => t.path === filePath);
      if (existing) {
        return prev.map((t) =>
          t.path === filePath ? { ...t, content, isDirty: true } : t
        );
      }
      return [...prev, { path: filePath, name: fileName, content, isDirty: true }];
    });
    // Update project files
    setProject((prev) => {
      if (!prev) return prev;
      const fileExists = prev.files.some((f) => f.filePath === filePath);
      if (fileExists) {
        return {
          ...prev, files: prev.files.map((f) =>
            f.filePath === filePath ? { ...f, content } : f
          )
        };
      }
      return {
        ...prev, files: [...prev.files, {
          id: crypto.randomUUID(), fileName, filePath, content, fileType: 'text',
        }]
      };
    });
    // Hot-reload preview
    if (wc.status === 'ready') wc.writeFile(filePath, content);
    // Switch to the changed file
    setActiveTab(filePath);
  }, [wc]);

  // ── Boot WebContainer ─────────────────────────────────
  const handleBoot = useCallback(() => {
    if (!project) return;
    const files: Record<string, string> = {};
    project.files.forEach((f) => { files[f.filePath] = f.content; });
    openTabs.forEach((t) => { files[t.path] = t.content; });
    wc.boot(files, project.framework);
  }, [project, openTabs, wc]);

  // Auto-boot WebContainer once project files load
  useEffect(() => {
    if (project && wc.status === 'idle') {
      handleBoot();
    }
  }, [project, wc.status, handleBoot]);

  // ── saveFile ──────────────────────────────────────────
  const saveFile = useCallback(async (path: string) => {
    const tab = openTabs.find((t) => t.path === path);
    if (!tab) return;

    const saves: Promise<unknown>[] = [];

    if (tab.apiFileId) {
      saves.push(
        fetch(`/api/projects/${projectId}/files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: tab.apiFileId, content: tab.content }),
        })
      );
    }
    if (tab.dbFileId) {
      saves.push(saveToDb(tab.dbFileId, tab.content));
    } else {
      saves.push(
        createDbFile(path, tab.content).then((f) => {
          setOpenTabs((prev) =>
            prev.map((t) => t.path === path ? { ...t, dbFileId: f.id } : t)
          );
        })
      );
    }

    await Promise.all(saves);
    setOpenTabs((prev) =>
      prev.map((t) => t.path === path ? { ...t, isDirty: false } : t)
    );

    if (project?.framework === 'nextjs' && wc.status === 'ready') {
      handleBoot();
    }
  }, [openTabs, projectId, saveToDb, createDbFile, project, wc, handleBoot]);
 
  // ── handleDeploy ──────────────────────────────────────
  const handleDeploy = useCallback(async () => {
    if (!project) return;
    setDeployStatus('deploying');
    try {
      // Save all dirty files first
      const dirtyTabs = openTabs.filter((t) => t.isDirty);
      if (dirtyTabs.length > 0) {
        await Promise.all(dirtyTabs.map((t) => saveFile(t.path)));
      }

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setDeployStatus('ready');
      setRightPanel('dashboard');
    } catch (err) {
      console.error('Deployment failed:', err);
      setDeployStatus('error');
    }
  }, [project, projectId, openTabs, saveFile]);

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (activeTab) saveFile(activeTab); }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setSidebarOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') { e.preventDefault(); setRightPanel('preview'); }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeTab, saveFile]);

  // ── Loading / Error ───────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-0">
        <div className="flex flex-col items-center gap-4 text-text-2">
          <div className="w-12 h-12 rounded-2xl bg-purple/15 border border-purple/30 flex items-center justify-center">
            <Loader2 size={22} className="text-purple animate-spin" />
          </div>
          <p className="text-[14px]">Loading project…</p>
        </div>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-0">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center">
            <AlertCircle size={22} className="text-accent-red" />
          </div>
          <div>
            <p className="text-[15px] font-medium text-text">Failed to load project</p>
            <p className="text-[13px] text-text-3 mt-1">{loadError ?? 'Project not found'}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-bg-3 border border-border-2 rounded-lg text-text-2 text-[13px] cursor-pointer hover:text-text font-sans"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── IDE Layout ────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-0 text-text font-sans" style={{ isolation: 'isolate' }}>
      <IDEHeader
        projectName={project.name}
        framework={project.framework}
        onOpenCmd={() => setCmdOpen(true)}
        onToggleChat={() => setRightPanel((v) => v === 'chat' ? 'agent' : 'chat')}
        onTogglePreview={() => {
           if (rightPanel === 'preview') {
              setRightPanel('chat');
           } else {
              setRightPanel('preview');
              if (activeView === 'preview') setActiveView('editor');
           }
        }}
        onToggleDb={() => setRightPanel((v) => v === 'db' ? 'chat' : 'db')}
        onToggleAgent={() => setRightPanel((v) => v === 'agent' ? 'chat' : 'agent')}
        onToggleDashboard={() => setRightPanel((v) => v === 'dashboard' ? 'chat' : 'dashboard')}
        onBoot={handleBoot}
        onDeploy={handleDeploy}
        onOpenCodePush={() => setCodePushOpen(true)}
        onBack={() => router.push('/dashboard')}
        rightPanel={rightPanel}
        previewStatus={wc.status}
        deployStatus={deployStatus}
        activeView={activeView}
        onSetView={(v) => {
          setActiveView(v);
          if (v === 'preview' && rightPanel !== 'preview') setRightPanel('preview');
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          sidebarOpen={sidebarOpen}
        />

        {sidebarOpen && (
          <Sidebar
            tree={fileTree}
            activeFile={activeTab}
            onOpenFile={openFile}
          />
        )}

        {activeView === 'editor' && (
          <EditorArea
            tabs={openTabs}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onCloseTab={closeTab}
            onChangeContent={updateContent}
            onSave={saveFile}
            onOpenCmd={() => setCmdOpen(true)}
          />
        )}

        {/* Right panel */}
        <div className={cn(
          "flex flex-col flex-shrink-0 border-border overflow-hidden transition-all",
          activeView === 'preview' ? "flex-1 border-l-0" : "w-[340px] border-l"
        )}>
          {rightPanel === 'chat' && (
            <ChatPanel fileContext={activeFile?.content} fileName={activeFile?.name} />
          )}
          {rightPanel === 'agent' && (
            <AgentPanel
              projectId={projectId}
              currentFile={activeFile ? { path: activeFile.path, content: activeFile.content, name: activeFile.name } : undefined}
              onFileChange={handleAgentFileChange}
            />
          )}
          {rightPanel === 'preview' && (
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
          {rightPanel === 'db' && (
            <DbPanel onOpenDbFile={openDbFile} />
          )}
          {rightPanel === 'dashboard' && (
            <DeployDashboard projectId={projectId} />
          )}
        </div>
      </div>

      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onOpenFile={openFile}
          tree={fileTree}
        />
      )}

      <CodePushModal
        isOpen={codePushOpen}
        onClose={() => setCodePushOpen(false)}
        projectId={projectId}
        projectName={project?.name || "project"}
        files={openTabs.map((t) => ({ filePath: t.path, content: t.content, fileName: t.name }))}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────
function buildFileTree(files: ApiFile[]): FileNode[] {
  const root: FileNode[] = [];
  const dirMap = new Map<string, FileNode>();

  const uniqueFiles = Array.from(new Map(files.map(f => [f.filePath, f])).values());
  const sorted = [...uniqueFiles].sort((a, b) => a.filePath.localeCompare(b.filePath));

  for (const file of sorted) {
    const parts = file.filePath.split('/').filter(Boolean);
    let children = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join('/');
      if (!dirMap.has(dirPath)) {
        const dir: FileNode = { name: parts[i], path: dirPath, type: 'dir', children: [] };
        dirMap.set(dirPath, dir);
        children.push(dir);
      }
      children = dirMap.get(dirPath)!.children!;
    }

    children.push({ name: file.fileName, path: file.filePath, type: 'file' });
  }

  return root;
}
