"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, use } from "react";
import { Loader2, Globe, ArrowLeft, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useWebContainer } from "@/features/preview/use-webcontainer";

interface ApiFile {
  fileName: string;
  filePath: string;
  content: string;
}

export default function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [project, setProject] = useState<{ name: string; framework: string; files: ApiFile[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wc = useWebContainer();

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}/files`);
        if (!res.ok) throw new Error(`Project not found (${res.status})`);
        const data = await res.json();
        setProject(data);

        // Mount and boot in WebContainer
        const fileMap: Record<string, string> = {};
        (data.files || []).forEach((f: ApiFile) => {
          fileMap[f.filePath] = f.content;
        });

        await wc.boot(fileMap, data.framework || "nextjs");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [projectId]);

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f8fafc] flex flex-col font-sans">
      {/* Top Banner */}
      <header className="h-12 border-b border-white/10 bg-[#0f172a]/90 backdrop-blur-md px-4 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Editor
          </Link>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-white">{project?.name || "Live Deployment"}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live Deployment
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wc.previewUrl && (
            <a
              href={wc.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white transition-colors"
            >
              Open Direct URL
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </header>

      {/* Main Preview Container */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#090d16]">
        {loading || wc.status === "booting" || wc.status === "starting" ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Starting live deployment preview…</p>
          </div>
        ) : error || wc.status === "error" ? (
          <div className="flex flex-col items-center gap-3 text-center p-6 max-w-md">
            <p className="text-rose-400 text-sm">{error || wc.error || "Failed to load deployment"}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              Reload Preview
            </button>
          </div>
        ) : wc.previewUrl ? (
          <iframe
            src={wc.previewUrl}
            className="w-full h-full border-none bg-[#090d16]"
            title="Live Deployed Website"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
            <Loader2 size={20} className="animate-spin" />
            Preparing preview iframe...
          </div>
        )}
      </main>
    </div>
  );
}
