"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play, RefreshCw, ExternalLink, Terminal,
  CheckCircle2, Loader2, AlertCircle, Wifi, WifiOff,
  ChevronDown, Maximize2, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewStatus } from "./use-webcontainer";
import { FullscreenPreview } from "./fullscreen-preview";

interface PreviewPanelProps {
  status:      PreviewStatus;
  previewUrl:  string | null;
  logs:        string[];
  error:       string | null;
  projectName?: string;
  onBoot:      () => void;
  onRefresh:   () => void;
  onClearLogs: () => void;
}

const STATUS_CFG: Record<PreviewStatus, { label: string; color: string; spinner: boolean }> = {
  idle:       { label: "Not started",  color: "text-text-3",       spinner: false },
  booting:    { label: "Booting…",     color: "text-accent-amber", spinner: true  },
  installing: { label: "Installing…",  color: "text-accent-amber", spinner: true  },
  starting:   { label: "Starting…",    color: "text-accent-amber", spinner: true  },
  ready:      { label: "Live",         color: "text-accent-green", spinner: false },
  error:      { label: "Error",        color: "text-accent-red",   spinner: false },
};

const PROGRESS: Record<PreviewStatus, number> = {
  idle: 0, booting: 20, installing: 55, starting: 80, ready: 100, error: 0,
};

export function PreviewPanel({
  status, previewUrl, logs, error, projectName = "Preview",
  onBoot, onRefresh, onClearLogs,
}: PreviewPanelProps) {
  const [showLogs,   setShowLogs]   = useState(true);
  const [iframeKey,  setIframeKey]  = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const cfg   = STATUS_CFG[status];
  const isBusy = ["booting","installing","starting"].includes(status);



  useEffect(() => {
    if (isBusy) setShowLogs(true);
  }, [isBusy]);

  // Auto-open fullscreen when server becomes ready
  useEffect(() => {
    if (status === "ready" && previewUrl) {
      setShowLogs(false);
    }
  }, [status, previewUrl]);

  return (
    <>
      <div className="flex flex-col h-full bg-bg-0 font-sans select-none">

        {/* ── Toolbar ── */}
        <div className="h-[38px] flex items-center gap-1.5 px-2.5 border-b border-border bg-bg-1 flex-shrink-0">
          {/* Status */}
          <div className={cn("flex items-center gap-1.5 text-[11px] flex-shrink-0", cfg.color)}>
            {cfg.spinner
              ? <Loader2 size={11} className="animate-spin" />
              : status === "ready" ? <CheckCircle2 size={11} />
              : status === "error" ? <AlertCircle   size={11} />
              :                      <WifiOff        size={11} />
            }
            <span>{cfg.label}</span>
          </div>

          <div className="w-px h-3.5 bg-border mx-0.5" />

          {/* URL */}
          <div className="flex-1 flex items-center gap-1.5 bg-bg-2 border border-border rounded px-2 py-0.5 text-[10.5px] font-mono text-text-3 min-w-0">
            <Wifi size={10} className={cn("flex-shrink-0", status === "ready" ? "text-accent-green" : "text-text-3")} />
            <span className="truncate">{previewUrl ?? "waiting…"}</span>
          </div>

          {/* Fullscreen button — most prominent */}
          <button
            onClick={() => setFullscreen(true)}
            disabled={status !== "ready"}
            title="Fullscreen preview"
            className={cn(
              "flex items-center gap-1 h-6 px-2 rounded border-none text-[10.5px] font-sans cursor-pointer transition-all flex-shrink-0",
              status === "ready"
                ? "bg-accent-green/15 text-accent-green hover:bg-accent-green/25"
                : "bg-transparent text-text-3 opacity-40 cursor-not-allowed"
            )}
          >
            <Maximize2 size={11} />
            <span>Full</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => { setIframeKey((k) => k + 1); onRefresh(); }}
            disabled={status !== "ready"}
            title="Refresh"
            className="w-6 h-6 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-text hover:bg-bg-3 disabled:opacity-30 cursor-pointer transition-colors"
          >
            <RefreshCw size={12} />
          </button>

          {/* Open new tab */}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-text hover:bg-bg-3 transition-colors no-underline"
            >
              <ExternalLink size={12} />
            </a>
          )}

          {/* Boot / Restart */}
          <button
            onClick={onBoot}
            disabled={isBusy}
            className="flex items-center gap-1 h-6 px-2.5 bg-purple border-none rounded text-white text-[11px] cursor-pointer hover:opacity-85 disabled:opacity-40 transition-opacity font-sans shadow-[0_0_8px_rgba(124,110,245,0.3)] flex-shrink-0"
          >
            {isBusy
              ? <Loader2 size={9} className="animate-spin" />
              : <Play size={9} fill="white" />
            }
            {status === "idle" ? "Run" : isBusy ? "…" : "Restart"}
          </button>

          {/* Terminal toggle */}
          <button
            onClick={() => setShowLogs((v) => !v)}
            title="Toggle terminal"
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded border-none cursor-pointer transition-colors",
              showLogs ? "bg-purple/15 text-purple" : "bg-transparent text-text-3 hover:text-text hover:bg-bg-3"
            )}
          >
            <Terminal size={12} />
          </button>
        </div>

        {/* Progress bar */}
        {isBusy && (
          <div className="h-0.5 bg-bg-3 flex-shrink-0">
            <div
              className="h-full bg-purple transition-all duration-700"
              style={{ width: `${PROGRESS[status]}%` }}
            />
          </div>
        )}

        {/* ── Preview area ── */}
        <div className={cn("relative overflow-hidden", showLogs ? "h-[180px] flex-shrink-0" : "flex-1")}>

          {status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-purple/15 border border-purple/25 flex items-center justify-center">
                <Play size={18} className="text-purple ml-0.5" />
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-text-2">Live Preview</p>
                <p className="text-[11px] text-text-3 mt-0.5 leading-relaxed">
                  Runs your project in a real Node.js environment in the browser
                </p>
              </div>
              <button
                onClick={onBoot}
                className="flex items-center gap-1.5 h-8 px-4 bg-purple rounded-lg text-white border-none cursor-pointer text-[12px] font-sans hover:opacity-85 transition-opacity"
              >
                <Play size={10} fill="white" />
                Boot WebContainer
              </button>
              <p className="text-[10px] text-text-3">Chrome / Edge only · Firefox not supported</p>
            </div>
          )}

          {isBusy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 size={22} className="text-purple animate-spin" />
              <p className="text-[12px] text-text-2">{cfg.label}</p>
              <p className="text-[10.5px] text-text-3">
                {status === "booting"    ? "Starting Node.js runtime in browser…" :
                 status === "installing" ? "Running npm install…" :
                                           "Starting dev server…"}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
              <AlertCircle size={22} className="text-accent-red" />
              <p className="text-[12.5px] font-medium text-text-2">Preview failed</p>
              {error && <p className="text-[10.5px] text-accent-red text-center leading-relaxed break-words">{error}</p>}
              <button
                onClick={onBoot}
                className="flex items-center gap-1.5 h-7 px-3 bg-bg-3 border border-border-2 rounded text-text-2 text-[11.5px] cursor-pointer font-sans hover:bg-bg-4"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {status === "ready" && previewUrl && (
            <>
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full border-0 bg-white"
                title="Live preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                allow="clipboard-read; clipboard-write; cross-origin-isolated"
              />
              {/* Fullscreen overlay hint */}
              <button
                onClick={() => setFullscreen(true)}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-black/50 border border-white/10 text-white text-[10.5px] cursor-pointer hover:bg-black/70 transition-colors font-sans backdrop-blur-sm"
                title="Open fullscreen"
              >
                <Maximize2 size={10} />
                Fullscreen
              </button>
            </>
          )}
        </div>

        {/* ── Terminal ── */}
        {showLogs && (
          <TerminalPanel
            logs={logs}
            onClear={onClearLogs}
            onClose={() => setShowLogs(false)}
          />
        )}
      </div>

      {/* ── Fullscreen overlay ── */}
      {fullscreen && (
        <FullscreenPreview
          previewUrl={previewUrl}
          status={status}
          projectName={projectName}
          onClose={() => setFullscreen(false)}
          onBoot={onBoot}
        />
      )}
    </>
  );
}

// ── TerminalPanel ─────────────────────────────────────────────
interface TerminalPanelProps {
  logs:    string[];
  onClear: () => void;
  onClose: () => void;
}

function TerminalPanel({ logs, onClear, onClose }: TerminalPanelProps) {
  const logsEndRef        = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Copy all logs to clipboard
  function copyAll() {
    navigator.clipboard.writeText(logs.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Copy a single line
  function copyLine(line: string) {
    navigator.clipboard.writeText(line);
  }

  function lineColor(line: string) {
    if (line.includes("[wc]") || line.includes("[polaris]")) return "text-accent-teal";
    if (/error|Error|ERROR/i.test(line))                     return "text-accent-red";
    if (/warn|WARN/i.test(line))                             return "text-accent-amber";
    if (/ready|listening|started|✓/i.test(line))            return "text-accent-green";
    return "text-text-2";
  }

  return (
    <div className="flex-1 min-h-0 border-t border-border bg-bg-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[10.5px] text-text-3">
          <Terminal size={10} />
          Terminal
          {logs.length > 0 && (
            <span className="bg-bg-3 border border-border rounded px-1 text-[9px]">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Copy all button */}
          <button
            onClick={copyAll}
            title="Copy all logs"
            className={cn(
              "flex items-center gap-1 h-5 px-1.5 rounded text-[9.5px] border-none cursor-pointer font-sans transition-colors",
              copied
                ? "bg-accent-green/15 text-accent-green"
                : "bg-transparent text-text-3 hover:text-text-2 hover:bg-bg-3"
            )}
          >
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? "Copied!" : "Copy all"}
          </button>

          <button
            onClick={onClear}
            className="text-[10px] text-text-3 hover:text-text-2 border-none bg-transparent cursor-pointer font-sans px-1"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="w-4 h-4 flex items-center justify-center border-none bg-transparent text-text-3 hover:text-text cursor-pointer"
          >
            <ChevronDown size={11} />
          </button>
        </div>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-[1.6]">
        {logs.length === 0 ? (
          <span className="text-text-3">No output yet…</span>
        ) : (
          logs.map((line, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredLine(i)}
              onMouseLeave={() => setHoveredLine(null)}
              className={cn(
                "group relative whitespace-pre-wrap break-all pr-6 rounded-sm",
                hoveredLine === i ? "bg-bg-2" : "",
                lineColor(line)
              )}
            >
              {line}
              {/* Per-line copy button — appears on hover */}
              {hoveredLine === i && (
                <button
                  onClick={() => copyLine(line)}
                  title="Copy line"
                  className="absolute right-1 top-0 h-full flex items-center px-0.5 border-none bg-transparent text-text-3 hover:text-text cursor-pointer opacity-70 hover:opacity-100"
                >
                  <Copy size={8} />
                </button>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}