"use client";

import { useState } from "react";
import { 
  X, Github, Download, GitBranch, GitCommit, 
  CheckCircle2, Loader2, Copy, Check, ShieldCheck, ExternalLink, AlertCircle, Key
} from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

interface CodePushModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  files: Array<{ filePath: string; content: string; fileName?: string }>;
}

export function CodePushModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  files,
}: CodePushModalProps) {
  const [repoName, setRepoName] = useState(
    projectName.toLowerCase().replace(/[^a-z0-9-_]/g, "-") || "my-webide-project"
  );
  const [branch, setBranch] = useState("main");
  const [commitMsg, setCommitMsg] = useState("feat: update codebase via Polaris IDE");
  const [patToken, setPatToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  const [isPushing, setIsPushing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 1. Download as ZIP archive
  async function handleDownloadZip() {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      files.forEach((f) => {
        const cleanPath = f.filePath.replace(/^\/+/, "");
        zip.file(cleanPath, f.content);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${repoName || "project"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate ZIP:", err);
    } finally {
      setIsZipping(false);
    }
  }

  // 2. Real Push to GitHub
  async function handlePushGithub() {
    setIsPushing(true);
    setErrorMessage(null);
    setSuccessUrl(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName,
          branch,
          commitMsg,
          token: patToken ? patToken.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.needsToken) {
          setShowTokenInput(true);
        }
        throw new Error(data.error || "Failed to push to GitHub");
      }

      setSuccessUrl(data.repoUrl);
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setIsPushing(false);
    }
  }

  const cliCommand = `git init && git add . && git commit -m "${commitMsg}" && git branch -M ${branch} && git remote add origin https://github.com/your-username/${repoName}.git && git push -u origin ${branch}`;

  function handleCopyCLI() {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-bg-1 border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-2/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/15 flex items-center justify-center text-accent-blue">
              <Github size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-text">Code Push to GitHub</h2>
              <p className="text-[12px] text-text-3">Push codebase directly to your logged-in GitHub account</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-3 text-text-3 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Permission Status Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-[12px]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} />
              <span className="font-medium">GitHub Account Integration: Active</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-green/20 font-semibold">
              Push Enabled
            </span>
          </div>

          {/* GitHub Push Settings */}
          <div className="space-y-3.5 bg-bg-2 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-text flex items-center gap-1.5">
                <GitBranch size={14} className="text-purple" />
                Repository Configuration
              </span>
              <span className="text-[11px] text-text-3">{files.length} files ready</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-text-3 mb-1 block">Repository Name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full h-9 px-3 bg-bg-1 border border-border rounded-lg text-[12.5px] text-text outline-none focus:border-purple/50 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-3 mb-1 block">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full h-9 px-3 bg-bg-1 border border-border rounded-lg text-[12.5px] text-text outline-none focus:border-purple/50 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-text-3 mb-1 block">Commit Message</label>
              <input
                type="text"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                className="w-full h-9 px-3 bg-bg-1 border border-border rounded-lg text-[12.5px] text-text outline-none focus:border-purple/50"
              />
            </div>

            {/* Optional Personal Access Token for fallback */}
            {showTokenInput && (
              <div className="p-3 bg-purple/10 border border-purple/20 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[11px] font-medium text-text-2 flex items-center gap-1">
                  <Key size={12} className="text-purple" />
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (needs repo scope)"
                  value={patToken}
                  onChange={(e) => setPatToken(e.target.value)}
                  className="w-full h-8 px-3 bg-bg-1 border border-border rounded-lg text-[12px] text-text outline-none focus:border-purple/50 font-mono"
                />
                <p className="text-[10.5px] text-text-3">
                  Required if logged in with Demo mode. Create at <a href="https://github.com/settings/tokens/new" target="_blank" className="text-purple underline">github.com/settings/tokens</a>.
                </p>
              </div>
            )}

            <button
              onClick={handlePushGithub}
              disabled={isPushing}
              className="w-full h-10 bg-purple hover:bg-purple-dim rounded-xl text-white text-[13px] font-semibold border-none cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(124,110,245,0.3)]"
            >
              {isPushing ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
              {isPushing ? "Pushing to your GitHub account…" : "Push to GitHub"}
            </button>

            {/* Success Banner */}
            {successUrl && (
              <div className="p-3 bg-accent-green/10 border border-accent-green/20 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-accent-green text-[12px] font-medium">
                  <CheckCircle2 size={15} />
                  <span>Repository created & pushed!</span>
                </div>
                <a
                  href={successUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 bg-accent-green/20 text-accent-green rounded-lg text-[11px] font-semibold hover:bg-accent-green/30 transition-colors no-underline"
                >
                  View on GitHub
                  <ExternalLink size={11} />
                </a>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red text-[12px] flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick ZIP Export */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-2 border border-border">
            <div>
              <h4 className="text-[13px] font-semibold text-text mb-0.5">Export as ZIP Archive</h4>
              <p className="text-[11px] text-text-3">Download complete source code for local development</p>
            </div>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 h-9 rounded-xl border border-border bg-bg-1 text-text hover:border-purple/40 hover:bg-bg-3 transition-colors text-[12px] font-medium cursor-pointer flex items-center gap-1.5 flex-shrink-0"
            >
              {isZipping ? <Loader2 size={13} className="animate-spin text-purple" /> : <Download size={13} />}
              {isZipping ? "Creating ZIP…" : "Download ZIP"}
            </button>
          </div>

          {/* CLI Clone Command */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-3 uppercase tracking-wider">Terminal CLI Commands</span>
              <button
                onClick={handleCopyCLI}
                className="text-[11px] text-purple hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
              >
                {copied ? <Check size={11} className="text-accent-green" /> : <Copy size={11} />}
                {copied ? "Copied!" : "Copy Commands"}
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-bg-0 border border-border text-[11px] font-mono text-text-2 overflow-x-auto select-all whitespace-pre-wrap">
              {cliCommand}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-bg-2/30 border-t border-border flex items-center justify-end">
          <button
            onClick={onClose}
            className="h-9 px-5 bg-bg-3 hover:bg-bg-4 text-text text-[13px] font-medium rounded-xl border-none cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
