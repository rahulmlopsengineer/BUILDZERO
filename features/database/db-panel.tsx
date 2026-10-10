"use client";

import { useState } from "react";
import {
  Database,
  FolderOpen,
  FilePlus,
  Trash2,
  Clock,
  Camera,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Plus,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects, useProjectFiles, useSnapshots } from "./use-db";
import type { DbFile, Snapshot } from "./use-db";

interface DbPanelProps {
  onOpenDbFile?: (file: DbFile) => void;
}

export function DbPanel({ onOpenDbFile }: DbPanelProps) {
  const [activeTab, setActiveTab] = useState<"projects" | "files" | "snapshots">("projects");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DbFile | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [snapMessage, setSnapMessage] = useState("");

  const {
    projects, loading: projLoading, refresh: refreshProjects,
    createProject, updateProject, deleteProject,
  } = useProjects();

  const {
    files, loading: filesLoading, refresh: refreshFiles,
    saveFile, createFile, deleteFile,
  } = useProjectFiles(selectedProject);

  const {
    snapshots, loading: snapsLoading, refresh: refreshSnaps,
    createSnapshot,
  } = useSnapshots(selectedFile?.id ?? null);

  // ── Project actions
  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    await createProject(newProjectName, newProjectDesc);
    setNewProjectName(""); setNewProjectDesc(""); setShowNewProject(false);
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("Delete project and all its files?")) return;
    await deleteProject(id);
    if (selectedProject === id) setSelectedProject(null);
  }

  async function handleSaveProjectEdit(id: string) {
    await updateProject(id, editName, editDesc);
    setEditingProject(null);
  }

  // ── File actions
  async function handleCreateFile() {
    if (!newFilePath.trim() || !selectedProject) return;
    await createFile(newFilePath.trim());
    setNewFilePath(""); setShowNewFile(false);
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm("Delete this file?")) return;
    await deleteFile(fileId);
    if (selectedFile?.id === fileId) setSelectedFile(null);
  }

  async function handleSnapshot() {
    if (!selectedFile) return;
    await createSnapshot(snapMessage || "Manual snapshot");
    setSnapMessage("");
  }

  const tabs = [
    { id: "projects", label: "Projects", icon: FolderOpen },
    { id: "files", label: "Files", icon: Database },
    { id: "snapshots", label: "History", icon: Clock },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-bg-1 text-text font-sans text-[12.5px]">
      {/* Header */}
      <div className="h-[38px] flex items-center justify-between px-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-accent-teal" />
          <span className="font-medium text-sm">Database</span>
        </div>
        <button
          onClick={() => { refreshProjects(); refreshFiles(); refreshSnaps(); }}
          className="w-6 h-6 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-text hover:bg-bg-3 cursor-pointer transition-colors"
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[11.5px] border-none cursor-pointer font-sans transition-colors flex-1 justify-center",
              activeTab === id
                ? "text-accent-teal border-b-2 border-accent-teal bg-bg-0"
                : "text-text-3 bg-transparent hover:text-text-2"
            )}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── PROJECTS TAB ── */}
        {activeTab === "projects" && (
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-[10px] uppercase tracking-widest text-text-3">Projects</span>
              <button
                onClick={() => setShowNewProject((v) => !v)}
                className="w-5 h-5 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-accent-teal cursor-pointer"
              >
                <Plus size={12} />
              </button>
            </div>

            {showNewProject && (
              <div className="bg-bg-2 border border-border rounded-lg p-2.5 space-y-1.5">
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  placeholder="Project name"
                  className="w-full bg-bg-3 border border-border rounded px-2 py-1 text-[12px] text-text outline-none focus:border-accent-teal/50 placeholder:text-text-3"
                />
                <input
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-bg-3 border border-border rounded px-2 py-1 text-[12px] text-text outline-none focus:border-accent-teal/50 placeholder:text-text-3"
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setShowNewProject(false)} className="text-[11px] px-2.5 py-1 rounded border border-border bg-transparent text-text-3 hover:text-text cursor-pointer font-sans">Cancel</button>
                  <button onClick={handleCreateProject} className="text-[11px] px-2.5 py-1 rounded bg-accent-teal/90 text-bg-0 border-none cursor-pointer font-sans hover:opacity-85">Create</button>
                </div>
              </div>
            )}

            {projLoading && <div className="text-text-3 text-center py-4">Loading…</div>}

            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => { setSelectedProject(p.id); setActiveTab("files"); }}
                className={cn(
                  "rounded-lg border cursor-pointer transition-all",
                  selectedProject === p.id
                    ? "border-accent-teal/40 bg-accent-teal/5"
                    : "border-border hover:border-border-2 hover:bg-bg-2"
                )}
              >
                {editingProject === p.id ? (
                  <div className="p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-bg-3 border border-border rounded px-2 py-1 text-[12px] text-text outline-none"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-bg-3 border border-border rounded px-2 py-1 text-[12px] text-text outline-none"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setEditingProject(null)} className="w-6 h-6 flex items-center justify-center rounded border border-border bg-transparent text-text-3 hover:text-text cursor-pointer"><X size={11} /></button>
                      <button onClick={() => handleSaveProjectEdit(p.id)} className="w-6 h-6 flex items-center justify-center rounded bg-accent-teal/90 border-none text-bg-0 cursor-pointer"><Check size={11} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start p-2.5 gap-2">
                    <FolderOpen size={14} className={cn("mt-0.5 flex-shrink-0", selectedProject === p.id ? "text-accent-teal" : "text-text-3")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[12.5px] truncate">{p.name}</div>
                      {p.description && <div className="text-text-3 text-[11px] truncate">{p.description}</div>}
                      <div className="text-text-3 text-[10px] mt-0.5">{new Date(p.updated_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingProject(p.id); setEditName(p.name); setEditDesc(p.description); }}
                        className="w-5 h-5 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-text-2 cursor-pointer"
                      ><Edit2 size={11} /></button>
                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        className="w-5 h-5 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-accent-red cursor-pointer"
                      ><Trash2 size={11} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!projLoading && projects.length === 0 && (
              <div className="text-center py-6 text-text-3 text-[12px]">No projects yet</div>
            )}
          </div>
        )}

        {/* ── FILES TAB ── */}
        {activeTab === "files" && (
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-[10px] uppercase tracking-widest text-text-3">
                {selectedProject ? `Files` : "Select a project first"}
              </span>
              {selectedProject && (
                <button
                  onClick={() => setShowNewFile((v) => !v)}
                  className="w-5 h-5 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-accent-teal cursor-pointer"
                >
                  <Plus size={12} />
                </button>
              )}
            </div>

            {showNewFile && selectedProject && (
              <div className="bg-bg-2 border border-border rounded-lg p-2.5 space-y-1.5">
                <input
                  autoFocus
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
                  placeholder="e.g. app/page.tsx"
                  className="w-full bg-bg-3 border border-border rounded px-2 py-1 text-[12px] font-mono text-text outline-none focus:border-accent-teal/50 placeholder:text-text-3"
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setShowNewFile(false)} className="text-[11px] px-2.5 py-1 rounded border border-border bg-transparent text-text-3 hover:text-text cursor-pointer font-sans">Cancel</button>
                  <button onClick={handleCreateFile} className="text-[11px] px-2.5 py-1 rounded bg-accent-teal/90 text-bg-0 border-none cursor-pointer font-sans hover:opacity-85">Create</button>
                </div>
              </div>
            )}

            {!selectedProject && (
              <div className="text-center py-6 text-text-3 text-[12px]">
                <button onClick={() => setActiveTab("projects")} className="text-accent-teal underline cursor-pointer border-none bg-transparent font-sans">Go to Projects</button>
              </div>
            )}

            {filesLoading && <div className="text-text-3 text-center py-4">Loading…</div>}

            {files.map((f) => (
              <div
                key={f.id}
                onClick={() => { setSelectedFile(f); onOpenDbFile?.(f); }}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all",
                  selectedFile?.id === f.id
                    ? "border-purple/40 bg-purple/5"
                    : "border-border hover:border-border-2 hover:bg-bg-2"
                )}
              >
                <span className={cn(
                  "w-[6px] h-[6px] rounded-full flex-shrink-0",
                  f.language === "typescript" ? "bg-accent-blue" :
                  f.language === "css" ? "bg-purple" :
                  f.language === "json" ? "bg-accent-amber" :
                  "bg-text-3"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[12px] truncate text-text">{f.name}</div>
                  <div className="font-mono text-[10px] text-text-3 truncate">{f.path}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-accent-red cursor-pointer flex-shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}

            {!filesLoading && selectedProject && files.length === 0 && (
              <div className="text-center py-6 text-text-3 text-[12px]">No files in this project</div>
            )}
          </div>
        )}

        {/* ── SNAPSHOTS TAB ── */}
        {activeTab === "snapshots" && (
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-[10px] uppercase tracking-widest text-text-3">Snapshots</span>
            </div>

            {selectedFile ? (
              <>
                <div className="bg-bg-2 border border-border rounded-lg p-2.5">
                  <div className="text-[11px] text-text-3 mb-1.5">Save snapshot of <span className="text-purple font-mono">{selectedFile.name}</span></div>
                  <input
                    value={snapMessage}
                    onChange={(e) => setSnapMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSnapshot()}
                    placeholder="Snapshot message…"
                    className="w-full bg-bg-3 border border-border rounded px-2 py-1 text-[12px] text-text outline-none focus:border-purple/50 placeholder:text-text-3 mb-2"
                  />
                  <button
                    onClick={handleSnapshot}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-purple/90 text-white border-none cursor-pointer font-sans text-[12px] hover:opacity-85 transition-opacity"
                  >
                    <Camera size={12} />
                    Save Snapshot
                  </button>
                </div>

                {snapsLoading && <div className="text-text-3 text-center py-4">Loading…</div>}

                <div className="space-y-1 mt-2">
                  {snapshots.map((s) => (
                    <SnapshotRow key={s.id} snapshot={s} />
                  ))}
                  {!snapsLoading && snapshots.length === 0 && (
                    <div className="text-center py-4 text-text-3 text-[12px]">No snapshots yet</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-text-3 text-[12px]">
                Select a file in the{" "}
                <button onClick={() => setActiveTab("files")} className="text-accent-teal underline cursor-pointer border-none bg-transparent font-sans">Files</button>
                {" "}tab first
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SnapshotRow({ snapshot }: { snapshot: Snapshot }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 bg-transparent border-none cursor-pointer text-left hover:bg-bg-2 transition-colors"
      >
        {expanded ? <ChevronDown size={11} className="text-text-3" /> : <ChevronRight size={11} className="text-text-3" />}
        <Clock size={11} className="text-text-3 flex-shrink-0" />
        <span className="flex-1 text-[12px] text-text truncate">{snapshot.message}</span>
        <span className="text-[10px] text-text-3 flex-shrink-0">
          {new Date(snapshot.created_at).toLocaleString()}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border bg-bg-0 px-3 py-2 font-mono text-[11px] text-text-2 max-h-40 overflow-auto whitespace-pre">
          {snapshot.content}
        </div>
      )}
    </div>
  );
}
