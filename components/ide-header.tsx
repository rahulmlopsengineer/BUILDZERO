"use client";

import { Bot,
  Search, MessageSquare, Play, ChevronDown,
  Monitor, Database, Loader2, ArrowLeft,
  Cloud, Rocket, Github,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewStatus } from "@/features/preview/use-webcontainer";

interface IDEHeaderProps {
  /** Project name shown next to the logo */
  projectName?: string;
  /** e.g. "next" | "react" | "vite" */
  framework?: string;
  onOpenCmd: () => void;
  onToggleChat: () => void;
  onToggleAgent?: () => void;
  onTogglePreview: () => void;
  onToggleDb: () => void;
  onToggleDashboard: () => void;
  onBoot: () => void;
  onDeploy: () => void;
  onOpenCodePush?: () => void;
  /** Optional back-navigation handler (shown on project pages) */
  onBack?: () => void;
  rightPanel: "chat" | "agent" | "preview" | "db" | "dashboard";
  previewStatus: PreviewStatus;
  deployStatus?: "idle" | "deploying" | "ready" | "error";
  activeView?: "editor" | "preview";
  onSetView?: (view: "editor" | "preview") => void;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  next:    "bg-white/10 text-white",
  react:   "bg-accent-blue/15 text-accent-blue",
  vite:    "bg-purple/15 text-purple",
  vue:     "bg-accent-green/15 text-accent-green",
  svelte:  "bg-accent-red/15 text-accent-red",
  astro:   "bg-accent-amber/15 text-accent-amber",
};

export function IDEHeader({
  projectName,
  framework,
  onOpenCmd,
  onToggleChat, onToggleAgent,
  onTogglePreview,
  onToggleDb,
  onToggleDashboard,
  onBoot,
  onDeploy,
  onOpenCodePush,
  onBack,
  rightPanel,
  previewStatus,
  deployStatus = "idle",
  activeView,
  onSetView,
}: IDEHeaderProps) {
  const isBooting = ["booting", "installing", "starting"].includes(previewStatus);
  const fwColor   = FRAMEWORK_COLORS[framework ?? ""] ?? "bg-text-3/10 text-text-3";

  return (
    <header className="h-11 flex items-center px-3.5 bg-bg-1 border-b border-border flex-shrink-0 z-10 gap-2">

      {/* ── Left ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">

        {/* Back button (project pages only) */}
        {onBack && (
          <button
            onClick={onBack}
            title="Back to Dashboard"
            className="flex items-center gap-1 h-7 px-2 border border-border rounded-lg bg-transparent text-text-3 hover:text-text hover:bg-bg-3 cursor-pointer transition-colors font-sans text-[12px]"
          >
            <ArrowLeft size={13} />
            Back
          </button>
        )}

        {/* Logo */}
        <a href="/" className="flex items-center gap-1.5 no-underline">
          <div className="w-6 h-6 rounded-[6px] bg-purple flex items-center justify-center shadow-[0_0_12px_rgba(124,110,245,0.35)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polygon points="6,1 11,4.5 9,11 3,11 1,4.5" fill="none" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          <span className="text-[14px] font-bold text-text tracking-wider uppercase">BUILDZERO</span>
        </a>

        {(projectName || framework) && (
          <>
            <div className="w-px h-4 bg-border-2" />
            {/* Project pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-3 border border-border rounded-full text-[12px] text-text-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <span className="max-w-[120px] truncate">{projectName ?? "project"}</span>
              {framework && (
                <span className={cn("text-[10px] px-1.5 py-px rounded-full font-medium", fwColor)}>
                  {framework}
                </span>
              )}
              <ChevronDown size={11} className="text-text-3" />
            </div>
          </>
        )}

        {/* Default project pill (IDEShell / no project context) */}
        {!projectName && !onBack && (
          <>
            <div className="w-px h-4 bg-border-2" />
            <button className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-3 border border-border rounded-full text-[12px] text-text-2 hover:border-border-2 hover:text-text transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              my-next-app
              <ChevronDown size={11} />
            </button>
          </>
        )}
      </div>

      {/* ── Center ─────────────────────────────────────── */}
      <nav className="flex-1 flex items-center justify-center gap-0.5">
        {["Editor", "Preview"].map((item) => {
          const lower = item.toLowerCase() as "editor" | "preview";
          const isActive = activeView ? activeView === lower : item === "Editor";
          return (
            <button
              key={item}
              onClick={() => onSetView?.(lower)}
              className={cn(
                "px-3 py-1 rounded-md text-[12px] transition-colors font-sans border-none bg-transparent cursor-pointer",
                isActive
                  ? "text-text bg-bg-3"
                  : "text-text-3 hover:text-text-2 hover:bg-bg-3"
              )}
            >
              {item}
            </button>
          );
        })}
      </nav>

      {/* ── Right ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Search / ⌘K */}
        <button
          onClick={onOpenCmd}
          className="flex items-center gap-1.5 h-7 px-2.5 border border-border-2 rounded-lg bg-transparent text-text-2 text-[12px] hover:bg-bg-3 hover:text-text transition-colors cursor-pointer font-sans"
        >
          <Search size={12} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="bg-bg-4 border border-border-2 rounded px-1 py-px text-[10px] font-mono text-text-3 hidden md:inline">⌘K</kbd>
        </button>

        <div className="w-px h-4 bg-border-2" />

        {/* Chat toggle */}
        <button
          onClick={onToggleChat}
          title="AI Chat"
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 border rounded-lg text-[12px] transition-colors cursor-pointer font-sans",
            rightPanel === "chat"
              ? "border-purple/40 bg-purple/10 text-purple"
              : "border-border-2 bg-transparent text-text-2 hover:bg-bg-3 hover:text-text"
          )}
        >
          <MessageSquare size={12} />
          Chat
        </button>

        {/* Agent toggle */}
        {onToggleAgent && (
          <button
            onClick={onToggleAgent}
            title="AI Agent"
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 border rounded-lg text-[12px] transition-colors cursor-pointer font-sans",
              rightPanel === "agent"
                ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                : "border-border-2 bg-transparent text-text-2 hover:bg-bg-3 hover:text-text"
            )}
          >
            <Bot size={12} />
            Agent
          </button>
        )}

        {/* Preview toggle */}
        <button
          onClick={onTogglePreview}
          title="Live Preview (⌘P)"
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 border rounded-lg text-[12px] transition-colors cursor-pointer font-sans",
            rightPanel === "preview"
              ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
              : "border-border-2 bg-transparent text-text-2 hover:bg-bg-3 hover:text-text"
          )}
        >
          <Monitor size={12} />
          Preview
        </button>

        {/* DB toggle */}
        <button
          onClick={onToggleDb}
          title="Database panel"
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 border rounded-lg text-[12px] transition-colors cursor-pointer font-sans",
            rightPanel === "db"
              ? "border-accent-teal/40 bg-accent-teal/10 text-accent-teal"
              : "border-border-2 bg-transparent text-text-2 hover:bg-bg-3 hover:text-text"
          )}
        >
          <Database size={12} />
          DB
        </button>

        {/* Dashboard toggle */}
        <button
          onClick={onToggleDashboard}
          title="Deployment Dashboard"
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 border rounded-lg text-[12px] transition-colors cursor-pointer font-sans",
            rightPanel === "dashboard"
              ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
              : "border-border-2 bg-transparent text-text-2 hover:bg-bg-3 hover:text-text"
          )}
        >
          <Cloud size={12} />
          Stats
        </button>

        <div className="w-px h-4 bg-border-2" />

        {/* Push Code / GitHub */}
        {onOpenCodePush && (
          <button
            onClick={onOpenCodePush}
            title="Push Code to GitHub / Export"
            className="flex items-center gap-1.5 h-7 px-2.5 border border-border-2 rounded-lg text-[12px] bg-bg-2 text-text hover:bg-bg-3 hover:border-purple/40 transition-all cursor-pointer font-sans"
          >
            <Github size={12} />
            Push Code
          </button>
        )}

        {/* Deploy Button */}
        <button
          onClick={onDeploy}
          disabled={deployStatus === "deploying"}
          className={cn(
            "flex items-center gap-1.5 h-7 px-3 border rounded-lg text-[12px] transition-all cursor-pointer font-sans shadow-sm",
            deployStatus === "deploying"
              ? "bg-bg-3 border-border-2 text-text-3 cursor-not-allowed"
              : "bg-bg-0 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/5 hover:border-accent-blue/50"
          )}
        >
          {deployStatus === "deploying" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Rocket size={11} />
          )}
          {deployStatus === "deploying" ? "Deploying..." : "Deploy"}
        </button>

        {/* Run / Boot */}
        <button
          onClick={onBoot}
          disabled={isBooting}
          className="flex items-center gap-1.5 h-7 px-3 bg-purple border-none rounded-lg text-white text-[12px] cursor-pointer font-sans hover:opacity-85 disabled:opacity-50 transition-opacity shadow-[0_0_14px_rgba(124,110,245,0.35)]"
        >
          {isBooting
            ? <Loader2 size={11} className="animate-spin" />
            : <Play size={10} fill="white" />
          }
          {previewStatus === "ready"   ? "Restart"   :
           isBooting                   ? "Starting…" : "Run"}
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-dim to-purple flex items-center justify-center text-[11px] font-semibold text-white cursor-pointer select-none">
          AC
        </div>
      </div>
    </header>
  );
}
