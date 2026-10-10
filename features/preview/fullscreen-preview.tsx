"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X, RefreshCw, ExternalLink, Maximize2, Minimize2,
  Monitor, Smartphone, Tablet, Loader2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewStatus } from "./use-webcontainer";

interface FullscreenPreviewProps {
  previewUrl:  string | null;
  status:      PreviewStatus;
  projectName: string;
  onClose:     () => void;
  onBoot:      () => void;
}

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: Record<Viewport, { w: number | string; h: number | string; label: string; icon: React.ReactNode }> = {
  desktop: { w: "100%",  h: "100%", label: "Desktop",    icon: <Monitor   size={14} /> },
  tablet:  { w: 768,     h: 1024,   label: "Tablet",     icon: <Tablet    size={14} /> },
  mobile:  { w: 390,     h: 844,    label: "Mobile",     icon: <Smartphone size={14} /> },
};

export function FullscreenPreview({
  previewUrl, status, projectName, onClose, onBoot,
}: FullscreenPreviewProps) {
  const [viewport,  setViewport]  = useState<Viewport>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [zoomed,    setZoomed]    = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isBusy = ["booting","installing","starting"].includes(status);
  const vp = VIEWPORTS[viewport];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center gap-3 px-4 h-12 flex-shrink-0 border-b"
        style={{
          background: "var(--bg-1, #13141a)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Project name */}
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: "#7c6ef5" }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <polygon points="6,1 11,4.5 9,11 3,11 1,4.5" fill="none" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text, #e8e9f0)" }}>
            {projectName}
          </span>
          <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 20, background: "rgba(78,202,154,0.1)", border: "1px solid rgba(78,202,154,0.2)", color: "#4eca9a" }}>
            Live Preview
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Viewport switcher */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)" }}
        >
          {(Object.entries(VIEWPORTS) as [Viewport, typeof VIEWPORTS[Viewport]][]).map(([key, v]) => (
            <button
              key={key}
              onClick={() => setViewport(key)}
              title={v.label}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 26, borderRadius: 7, border: "none", cursor: "pointer",
                background: viewport === key ? "rgba(124,110,245,0.25)" : "transparent",
                color: viewport === key ? "#7c6ef5" : "var(--text-3, #5a5b6a)",
                transition: "all 0.12s",
              }}
            >
              {v.icon}
            </button>
          ))}
        </div>

        {/* URL bar */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "4px 10px", maxWidth: 320, minWidth: 180,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: status === "ready" ? "#4eca9a" : "#5a5b6a", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-2, #9b9cac)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {previewUrl ?? "waiting for server…"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            disabled={status !== "ready"}
            title="Refresh"
            style={{
              width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", borderRadius: 8, background: "transparent",
              color: "var(--text-3, #5a5b6a)", cursor: "pointer", opacity: status !== "ready" ? 0.3 : 1,
            }}
          >
            <RefreshCw size={14} />
          </button>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              title="Open in new tab"
              style={{
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, textDecoration: "none", color: "var(--text-3, #5a5b6a)",
              }}
            >
              <ExternalLink size={14} />
            </a>
          )}

          {!isBusy && status !== "ready" && (
            <button
              onClick={onBoot}
              style={{
                display: "flex", alignItems: "center", gap: 5, height: 30, padding: "0 12px",
                borderRadius: 8, border: "none", background: "#7c6ef5", color: "#fff",
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="white"><polygon points="1,1 9,5 1,9"/></svg>
              Boot
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 8, background: "transparent",
            color: "var(--text-2, #9b9cac)", cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Preview body ── */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
        style={{ background: viewport === "desktop" ? "#111" : "rgba(20,20,30,0.95)" }}
      >
        {/* Loading */}
        {isBusy && (
          <div className="flex flex-col items-center gap-3" style={{ color: "var(--text-3, #5a5b6a)" }}>
            <Loader2 size={32} style={{ color: "#7c6ef5", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: 14, color: "var(--text-2, #9b9cac)" }}>
              {status === "booting" ? "Booting WebContainer…" : status === "installing" ? "Installing dependencies…" : "Starting dev server…"}
            </p>
            <div style={{ width: 200, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: "#7c6ef5", borderRadius: 2,
                width: status === "booting" ? "20%" : status === "installing" ? "60%" : "85%",
                transition: "width 0.7s ease",
              }} />
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <AlertCircle size={32} style={{ color: "#e85a5a" }} />
            <p style={{ fontSize: 14, color: "var(--text-2, #9b9cac)" }}>Preview failed to start</p>
            <button
              onClick={onBoot}
              style={{
                display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 14px",
                borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)",
                color: "var(--text-2, #9b9cac)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Idle */}
        {status === "idle" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(124,110,245,0.12)", border: "1px solid rgba(124,110,245,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Monitor size={28} style={{ color: "#7c6ef5" }} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text, #e8e9f0)", marginBottom: 4 }}>No preview running</p>
              <p style={{ fontSize: 12.5, color: "var(--text-3, #5a5b6a)" }}>Boot a WebContainer to see your project live</p>
            </div>
            <button
              onClick={onBoot}
              style={{
                display: "flex", alignItems: "center", gap: 7, height: 40, padding: "0 20px",
                borderRadius: 10, border: "none", background: "#7c6ef5", color: "#fff",
                fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                boxShadow: "0 0 20px rgba(124,110,245,0.35)",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 10 10" fill="white"><polygon points="1,1 9,5 1,9"/></svg>
              Boot WebContainer
            </button>
          </div>
        )}

        {/* Live iframe */}
        {status === "ready" && previewUrl && (
          <div
            style={{
              width:         viewport === "desktop" ? "100%" : vp.w,
              height:        viewport === "desktop" ? "100%" : vp.h,
              maxWidth:      "100%",
              maxHeight:     "100%",
              borderRadius:  viewport === "desktop" ? 0 : 12,
              overflow:      "hidden",
              boxShadow:     viewport !== "desktop" ? "0 24px 60px rgba(0,0,0,0.6)" : "none",
              border:        viewport !== "desktop" ? "1px solid rgba(255,255,255,0.08)" : "none",
              position:      "relative",
              transition:    "width 0.3s ease, height 0.3s ease",
            }}
          >
            {/* Device chrome for tablet/mobile */}
            {viewport !== "desktop" && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0,
                height: 28, background: "rgba(30,31,40,0.95)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "11px 11px 0 0", zIndex: 1,
              }}>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
              </div>
            )}
            <iframe
              key={iframeKey}
              src={previewUrl}
              style={{
                width: "100%",
                border: "none",
                background: "#fff",
                marginTop: viewport !== "desktop" ? 28 : 0,
                height: viewport !== "desktop" ? `calc(100% - 28px)` : "100%",
              }}
              title="Fullscreen preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}