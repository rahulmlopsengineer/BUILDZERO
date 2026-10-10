"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import {
  Layers,
  Code2,
  Globe,
  FileCode,
  Search,
  RefreshCw,
  LogOut,
  Plus,
  Loader2,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Trash2,
  Clock,
  Settings,
} from "lucide-react";
import { SettingsModal } from "@/components/settings-modal";

interface Project {
  _id: string;
  name: string;
  description: string;
  framework: string;
  status: "generating" | "ready" | "error";
  vercelStatus?: string;
  vercelUrl?: string;
  updatedAt: string;
  createdAt: string;
}

const FRAMEWORK_META: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string; icon: React.ReactNode }> = {
  nextjs:        { label: "Next.js",    dotColor: "bg-white",             bgColor: "bg-white/8",              textColor: "text-white",           icon: <Layers size={12} /> },
  react:         { label: "React",      dotColor: "bg-accent-blue",       bgColor: "bg-accent-blue/10",       textColor: "text-accent-blue",     icon: <Code2 size={12} /> },
  "html-css-js": { label: "HTML/CSS",   dotColor: "bg-accent-amber",      bgColor: "bg-accent-amber/10",      textColor: "text-accent-amber",    icon: <Globe size={12} /> },
  "vanilla-js":  { label: "JavaScript", dotColor: "bg-accent-green",      bgColor: "bg-accent-green/10",      textColor: "text-accent-green",    icon: <FileCode size={12} /> },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects]  = useState<Project[]>([]);
  const [loading, setLoading]    = useState(true);
  const [search, setSearch]      = useState("");
  const [menuId, setMenuId]      = useState<string | null>(null);
  const [deleting, setDeleting]  = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  async function loadProjects(silent = false) {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/projects");
      const d = await r.json().catch(() => ({}));
      setProjects(d.projects ?? []);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { loadProjects(); }, []);

  // Poll generating or deploying projects
  useEffect(() => {
    const hasActiveTasks = projects.some((p) => 
      p.status === "generating" || p.vercelStatus === "deploying"
    );
    if (!hasActiveTasks) return;
    
    const t = setInterval(() => loadProjects(true), 3000);
    return () => clearInterval(t);
  }, [projects]);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((p) => p.filter((x) => x._id !== id));
    setDeleting(null);
    setMenuId(null);
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const user = session?.user;

  return (
    <div className="min-h-screen bg-bg-0 font-sans text-text">
      {/* Subtle grid bg */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(#7c6ef5 1px,transparent 1px),linear-gradient(90deg,#7c6ef5 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Header ─────────────────────────────────── */}
      <header className="relative border-b border-border bg-bg-1/90 backdrop-blur-sm px-6 h-14 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple flex items-center justify-center shadow-[0_0_14px_rgba(124,110,245,0.4)]">
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <polygon points="6,1 11,4.5 9,11 3,11 1,4.5" fill="none" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">BuildZero</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 h-8 px-3 bg-bg-2 border border-border rounded-lg">
            <Search size={13} className="text-text-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="bg-transparent outline-none text-[12.5px] text-text placeholder:text-text-3 w-36 font-sans"
            />
          </div>

          <button
            onClick={() => setShowSettings(true)}
            title="Vercel Settings"
            className="w-8 h-8 flex items-center justify-center border border-border rounded-lg bg-transparent text-text-3 hover:text-text hover:bg-bg-2 cursor-pointer transition-colors"
          >
            <Settings size={13} />
          </button>

          <button
            onClick={() => loadProjects()}
            title="Refresh"
            className="w-8 h-8 flex items-center justify-center border border-border rounded-lg bg-transparent text-text-3 hover:text-text hover:bg-bg-2 cursor-pointer transition-colors"
          >
            <RefreshCw size={13} />
          </button>

          {/* User */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-border">
            {user?.image ? (
              <img src={user.image} alt="" className="w-7 h-7 rounded-full ring-1 ring-border-2" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-purple flex items-center justify-center text-[11px] font-semibold text-white">
                {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <span className="hidden md:block text-[13px] text-text-2 max-w-[140px] truncate">
              {user?.name ?? user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex items-center gap-1.5 h-7 px-3 border border-border-2 rounded-lg bg-transparent text-text-3 hover:text-text text-[12px] cursor-pointer font-sans transition-colors"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Page title + New Project ── */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {user?.name ? `${user.name.split(" ")[0]}'s Projects` : "Your Projects"}
            </h1>
            <p className="text-text-3 text-[14px] mt-1">
              {loading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <button
            onClick={() => router.push("/create-project")}
            className="flex items-center gap-2 h-10 px-5 bg-purple rounded-xl text-white text-[13px] font-medium border-none cursor-pointer hover:opacity-85 transition-opacity shadow-[0_0_20px_rgba(124,110,245,0.3)] font-sans"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden flex items-center gap-2 h-9 px-3 bg-bg-1 border border-border rounded-xl mb-6">
          <Search size={13} className="text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="bg-transparent outline-none text-[13px] text-text placeholder:text-text-3 flex-1 font-sans"
          />
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-24 text-text-3 gap-3">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[14px]">Loading projects…</span>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-bg-2 border border-border flex items-center justify-center mb-6">
              <FolderOpen size={28} className="text-text-3" />
            </div>
            <h3 className="text-[17px] font-semibold text-text-2 mb-2">No projects yet</h3>
            <p className="text-text-3 text-[13.5px] mb-8 max-w-xs leading-relaxed">
              Create your first AI-powered project. Pick a framework, answer 5 questions, and AI builds it.
            </p>
            <button
              onClick={() => router.push("/create-project")}
              className="flex items-center gap-2 h-10 px-6 bg-purple rounded-xl text-white text-[13px] font-medium border-none cursor-pointer hover:opacity-85 transition-opacity font-sans shadow-[0_0_16px_rgba(124,110,245,0.3)]"
            >
              <Plus size={15} />
              Create First Project
            </button>
          </div>
        )}

        {/* ── No search results ── */}
        {!loading && projects.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-text-3">
            <p className="text-[14px]">No projects match "{search}"</p>
          </div>
        )}

        {/* ── Project Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const meta = FRAMEWORK_META[p.framework] ?? FRAMEWORK_META["vanilla-js"];
              const isReady      = p.status === "ready";
              const isGenerating = p.status === "generating";
              const isError      = p.status === "error";

              return (
                <div
                  key={p._id}
                  onClick={() => router.push(`/projects/${p._id}`)}
                  className="group relative bg-bg-1 border border-border rounded-2xl p-5 transition-all duration-150 cursor-pointer hover:border-purple/35 hover:bg-bg-2 hover:shadow-[0_0_20px_rgba(124,110,245,0.06)]"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    {/* Framework badge */}
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
                      meta.bgColor, meta.textColor
                    )}>
                      {meta.icon}
                      {meta.label}
                    </div>

                    {/* Status + menu */}
                    <div className="flex items-center gap-2">
                      {isGenerating && (
                        <span className="flex items-center gap-1 text-[11px] text-accent-amber">
                          <Loader2 size={10} className="animate-spin" />
                          Generating
                        </span>
                      )}
                      {isReady && (
                        <span className="flex items-center gap-1 text-[11px] text-accent-green">
                          <CheckCircle2 size={11} />
                          Ready
                        </span>
                      )}
                      {isError && (
                        <span className="flex items-center gap-1 text-[11px] text-accent-red">
                          <AlertCircle size={11} />
                          Error
                        </span>
                      )}

                      {/* Direct Delete Quick-Action Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }}
                        disabled={deleting === p._id}
                        title="Delete Project"
                        className="w-6 h-6 flex items-center justify-center rounded-md border-none bg-transparent text-text-3 hover:text-accent-red hover:bg-accent-red/10 cursor-pointer transition-all opacity-60 hover:opacity-100"
                      >
                        {deleting === p._id ? (
                          <Loader2 size={12} className="animate-spin text-accent-red" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>

                      {/* 3-dot menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p._id ? null : p._id); }}
                          className="w-6 h-6 flex items-center justify-center rounded-md border-none bg-transparent text-text-3 hover:text-text hover:bg-bg-3 cursor-pointer opacity-70 group-hover:opacity-100 transition-all"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {menuId === p._id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-44 bg-bg-2 border border-border-2 rounded-xl py-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { router.push(`/projects/${p._id}`); setMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-text-2 hover:bg-bg-3 hover:text-text cursor-pointer border-none bg-transparent font-sans text-left"
                            >
                              <ExternalLink size={12} />
                              Open Editor
                            </button>
                            <button
                              onClick={() => handleDelete(p._id)}
                              disabled={deleting === p._id}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-accent-red hover:bg-accent-red/10 cursor-pointer border-none bg-transparent font-sans text-left disabled:opacity-50"
                            >
                              {deleting === p._id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Trash2 size={12} />
                              }
                              Delete Project
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name & description */}
                  <h3 className="text-[15px] font-semibold text-text mb-1.5 truncate pr-2">
                    {p.name}
                  </h3>
                  <p className="text-[12.5px] text-text-3 line-clamp-2 leading-relaxed mb-5 min-h-[2.5rem]">
                    {p.description || "No description"}
                  </p>

                  {/* Deployment & Footer */}
                  <div className="space-y-3">
                    {isReady && (
                      <div className="flex items-center justify-between py-2.5 px-3 bg-bg-2/50 border border-border/40 rounded-xl group-hover:bg-bg-3/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-text-3 font-medium uppercase tracking-wider">Deployment</span>
                          {p.vercelStatus === "ready" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                              <span className="text-[11.5px] text-accent-green font-medium">Live</span>
                            </div>
                          ) : p.vercelStatus === "deploying" ? (
                            <div className="flex items-center gap-1.5">
                              <Loader2 size={10} className="animate-spin text-accent-amber" />
                              <span className="text-[11.5px] text-accent-amber font-medium">Deploying...</span>
                            </div>
                          ) : (
                            <span className="text-[11.5px] text-text-3 italic">Not deployed</span>
                          )}
                        </div>
                        
                        {p.vercelUrl && p.vercelStatus === "ready" && (
                          <a 
                            href={p.vercelUrl.startsWith("http") ? p.vercelUrl : `https://${p.vercelUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 h-7 px-3 bg-purple/10 text-purple hover:bg-purple/20 rounded-lg text-[11px] font-medium transition-all"
                          >
                            <Globe size={11} />
                            View Site
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                      <span className="flex items-center gap-1.5 text-[11px] text-text-3">
                        <Clock size={10} />
                        {timeAgo(p.updatedAt)}
                      </span>

                      {isReady && (
                        <div className="flex items-center gap-1 text-[11px] text-purple font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Open Editor <ExternalLink size={10} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Generating progress bar */}
                  {isGenerating && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl overflow-hidden">
                      <div className="h-full bg-accent-amber/60 animate-[progress_2s_ease-in-out_infinite]" style={{ width: "60%" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Close menu on outside click */}
      {menuId && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuId(null)} />
      )}

      <style>{`
        @keyframes progress {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
