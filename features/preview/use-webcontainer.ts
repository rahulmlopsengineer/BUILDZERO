"use client";

/**
 * use-webcontainer.ts
 *
 * Clean WebContainer implementation following the official docs pattern:
 * https://webcontainers.io/tutorial/2-setting-up-webcontainers
 *
 * Key rules from docs:
 * 1. WebContainer.boot() called ONCE — singleton enforced with promise guard
 * 2. wc.mount(FileSystemTree) — mounts files to container root
 * 3. wc.fs.readFile('path', 'utf-8') — relative paths, no leading /
 * 4. wc.spawn('npm', ['install']) — run commands
 * 5. wc.on('server-ready', (port, url) => ...) — get preview URL
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { FileSystemTree, WebContainerProcess } from "@webcontainer/api";

// ── Types ──────────────────────────────────────────────────────
export type PreviewStatus =
  | "idle" | "booting" | "installing" | "starting" | "ready" | "error";

export interface UseWebContainerReturn {
  status:     PreviewStatus;
  previewUrl: string | null;
  logs:       string[];
  boot:       (files: Record<string, string>, framework: string) => Promise<void>;
  writeFile:  (path: string, content: string) => Promise<void>;
  clearLogs:  () => void;
  error:      string | null;
}

// ── Singleton — one WebContainer per browser tab, ever ─────────
let _wc:          import("@webcontainer/api").WebContainer | null = null;
let _bootPromise: Promise<import("@webcontainer/api").WebContainer> | null = null;

async function getWebContainer() {
  if (_wc)          return _wc;
  if (_bootPromise) return _bootPromise;

  _bootPromise = import("@webcontainer/api")
    .then(m  => m.WebContainer.boot())
    .then(wc => { _wc = wc; return wc; })
    .catch(e  => { _bootPromise = null; throw e; });

  return _bootPromise;
}

// ── Convert flat file map to FileSystemTree (official format) ──
function buildFileSystemTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [filePath, contents] of Object.entries(files)) {
    const parts = filePath.replace(/^\/+/, "").split("/").filter(Boolean);
    if (parts.length === 0) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) {
        node[parts[i]] = { directory: {} };
      }
      node = node[parts[i]].directory;
    }
    node[parts[parts.length - 1]] = { file: { contents } };
  }

  return tree;
}

// ── Strip ANSI colour codes from terminal output ───────────────
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");
}

// ── Hook ───────────────────────────────────────────────────────
export function useWebContainer(): UseWebContainerReturn {
  const [status,     setStatus]     = useState<PreviewStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs,       setLogs]       = useState<string[]>([]);
  const [error,      setError]      = useState<string | null>(null);

  const devProcess  = useRef<WebContainerProcess | null>(null);
  const readyFired  = useRef(false);
  const bootIdRef   = useRef(0);

  const addLog    = useCallback((line: string) => {
    setLogs(prev => [...prev.slice(-500), line]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  // Kill dev server when component unmounts
  useEffect(() => () => { devProcess.current?.kill(); }, []);

  // ── boot ──────────────────────────────────────────────────────
  const boot = useCallback(async (
    rawFiles: Record<string, string>,
    framework: string
  ) => {
    const activeBootId = ++bootIdRef.current;

    // Kill any running process
    if (devProcess.current) {
      devProcess.current.kill();
      devProcess.current = null;
    }
    readyFired.current = false;

    setStatus("booting");
    setPreviewUrl(null);
    setError(null);
    setLogs([]);

    try {
      addLog("[wc] Booting WebContainer…");
      const wc = await getWebContainer();
      if (bootIdRef.current !== activeBootId) return; // Cancelled by newer boot
      addLog("[wc] Boot complete.");

      // Register fresh server-ready listener
      wc.on("server-ready", (_port: number, url: string) => {
        if (bootIdRef.current !== activeBootId) return;
        if (readyFired.current) return;
        readyFired.current = true;
        addLog("[wc] ✓ Preview ready → " + url);
        setPreviewUrl(url);
        setStatus("ready");
      });

      const fw = framework.toLowerCase().trim();
      addLog("[wc] Framework: " + fw);

      const isCurrent = () => bootIdRef.current === activeBootId;

      if (fw === "react") {
        await runReact(wc, rawFiles, addLog, setStatus, p => {
          if (isCurrent()) devProcess.current = p;
          else p.kill();
        });
      } else if (fw === "nextjs" || fw === "next") {
        await runNextStatic(wc, rawFiles, addLog, setStatus, p => {
          if (isCurrent()) devProcess.current = p;
          else p.kill();
        });
      } else {
        // html-css-js, vanilla-js, or any static framework
        await runStatic(wc, rawFiles, addLog, setStatus, p => {
          if (isCurrent()) devProcess.current = p;
          else p.kill();
        });
      }

    } catch (err) {
      if (bootIdRef.current !== activeBootId) return;
      const msg = err instanceof Error ? err.message : String(err);
      addLog("[wc] ERROR: " + msg);
      setError(msg);
      setStatus("error");
    }
  }, [addLog]);

  // ── writeFile — hot reload after boot ─────────────────────────
  const writeFile = useCallback(async (filePath: string, content: string) => {
    if (!_wc) return;
    try {
      // Official docs use relative paths without leading /
      const clean = filePath.replace(/^\/+/, "");
      await _wc.fs.writeFile(clean, content);
    } catch { /* non-fatal */ }
  }, []);

  return { status, previewUrl, logs, boot, writeFile, clearLogs, error };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

type WC   = import("@webcontainer/api").WebContainer;
type SetP = (p: WebContainerProcess) => void;

/** Spawn a process and pipe all output to addLog */
async function spawn(
  wc: WC,
  cmd: string,
  args: string[],
  addLog: (s: string) => void
): Promise<WebContainerProcess> {
  const p = await wc.spawn(cmd, args);
  p.output.pipeTo(new WritableStream({
    write(chunk) {
      stripAnsi(chunk)
        .split("\n")
        .forEach(line => {
          const t = line.replace(/\r/g, "").trim();
          if (t) addLog(t);
        });
    },
  }));
  return p;
}

/** Spawn, wait for exit, return code */
async function spawnWait(
  wc: WC,
  cmd: string,
  args: string[],
  addLog: (s: string) => void
): Promise<number> {
  const p = await spawn(wc, cmd, args, addLog);
  return p.exit;
}

// ═══════════════════════════════════════════════════════════════
// 1. STATIC  —  html-css-js / vanilla-js
//
// Pattern (from official docs):
//   mount(files) → npm run start → server-ready
//
// We use `npx serve` which reliably triggers server-ready
// and requires zero npm install time.
// ═══════════════════════════════════════════════════════════════
async function runStatic(
  wc: WC,
  rawFiles: Record<string, string>,
  addLog: (s: string) => void,
  setStatus: (s: PreviewStatus) => void,
  setP: SetP
) {
  setStatus("starting");

  // Build file set — drop any old generated server files
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawFiles)) {
    if (["package.json", "server.js", "server.cjs", "_server.mjs"].includes(k)) continue;
    files[k] = v;
  }

  // Guarantee index.html exists
  if (!files["index.html"]) {
    for (const alt of ["public/index.html", "src/index.html"]) {
      if (files[alt]) {
        files["index.html"] = files[alt];
        addLog("[wc] Moved " + alt + " → index.html");
        break;
      }
    }
  }

  if (!files["index.html"]) {
    addLog("[wc] WARNING: No index.html found — using fallback");
    files["index.html"] = FALLBACK_HTML;
  }

  // package.json that uses npx serve (no npm install needed)
  files["package.json"] = JSON.stringify({
    name: "app",
    version: "1.0.0",
    scripts: { start: "npx --yes serve@14 . --listen 3000 --no-clipboard" },
  }, null, 2);

  addLog("[wc] Mounting " + Object.keys(files).length + " files…");

  // Official pattern: mount(FileSystemTree)
  await wc.mount(buildFileSystemTree(files));

  // Confirm index.html is accessible (official docs use relative path)
  try {
    const content = await wc.fs.readFile("index.html", "utf-8") as string;
    addLog("[wc] index.html ✓ (" + content.length + " bytes)");
  } catch {
    addLog("[wc] index.html ✗ — not found after mount");
  }

  addLog("[wc] Starting static server…");

  // Official pattern: wc.spawn('npm', ['run', 'start'])
  const p = await spawn(wc, "npm", ["run", "start"], addLog);
  setP(p);
}

// ═══════════════════════════════════════════════════════════════
// 2. REACT  —  Instant High-Fidelity Preview
// ═══════════════════════════════════════════════════════════════
async function runReact(
  wc: WC,
  rawFiles: Record<string, string>,
  addLog: (s: string) => void,
  setStatus: (s: PreviewStatus) => void,
  setP: SetP
) {
  setStatus("starting");
  addLog("[wc] Building instant React preview…");

  // Normalize file paths
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawFiles)) {
    files[k] = v;
    if (k.startsWith("src/")) {
      files[k.replace("src/", "")] = v;
    }
  }

  const appContent =
    files["src/App.tsx"] || files["src/App.jsx"] ||
    files["App.tsx"] || files["App.jsx"] ||
    files["src/main.tsx"] || files["app/page.tsx"] || "";

  const cssContent = files["src/index.css"] || files["src/App.css"] || files["index.css"] || files["app/globals.css"] || "";

  // Build the instant static HTML with full Tailwind and component inlining
  const html = buildNextStaticHtml(appContent, "", cssContent, files);

  // Mount just the HTML file + serve package
  const mountFiles = {
    "index.html": html,
    "package.json": JSON.stringify({
      name: "app",
      version: "1.0.0",
      scripts: { start: "npx --yes serve@14 . --listen 3000 --no-clipboard" },
    }, null, 2),
  };

  addLog("[wc] Mounting " + Object.keys(mountFiles).length + " files…");
  await wc.mount(buildFileSystemTree(mountFiles));
  addLog("[wc] Starting preview server…");

  const p = await spawn(wc, "npm", ["run", "start"], addLog);
  setP(p);
}

// ═══════════════════════════════════════════════════════════════
// 3. NEXT.JS  —  Static preview (instant, no npm install)
//
// Next.js needs ~300MB npm install inside WebContainer which
// causes it to freeze. Instead we build a full-fidelity static
// HTML preview with CDN Tailwind and Google Fonts.
//
// For full Next.js: run `npm run dev` locally.
// ═══════════════════════════════════════════════════════════════
async function runNextStatic(
  wc: WC,
  rawFiles: Record<string, string>,
  addLog: (s: string) => void,
  setStatus: (s: PreviewStatus) => void,
  setP: SetP
) {
  setStatus("starting");

  // Normalize paths
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawFiles)) {
    if (["package.json", "next.config.ts", "next.config.js",
         "server.js", "_server.mjs"].includes(k)) continue;
    // src/app/* → app/*
    if (k.startsWith("src/app/")) { files[k.replace("src/app/", "app/")] = v; continue; }
    if (k.startsWith("src/pages/")) { files[k.replace("src/pages/", "pages/")] = v; continue; }
    files[k] = v;
  }

  addLog("[wc] Building static Next.js preview…");

  // Find the main page content
  const pageContent =
    files["app/page.tsx"]    || files["app/page.jsx"]   ||
    files["pages/index.tsx"] || files["pages/index.jsx"] || "";

  const layoutContent = files["app/layout.tsx"] || files["app/layout.jsx"] || "";
  const cssContent    = files["app/globals.css"] || files["styles/globals.css"] || "";

  // Build the static HTML
  const html = buildNextStaticHtml(pageContent, layoutContent, cssContent, files);

  // Mount just the HTML file + serve package
  const mountFiles = {
    "index.html": html,
    "package.json": JSON.stringify({
      name: "app",
      version: "1.0.0",
      scripts: { start: "npx --yes serve@14 . --listen 3000 --no-clipboard" },
    }, null, 2),
  };

  addLog("[wc] Mounting preview…");
  await wc.mount(buildFileSystemTree(mountFiles));

  // Verify
  try {
    const content = await wc.fs.readFile("index.html", "utf-8") as string;
    addLog("[wc] index.html ✓ (" + content.length + " bytes)");
  } catch {
    addLog("[wc] index.html ✗");
  }

  addLog("[wc] Starting preview server…");
  addLog("[wc] Tip: For full Next.js, run npm run dev locally");

  const p = await spawn(wc, "npm", ["run", "start"], addLog);
  setP(p);
}

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

/** Remove imports for component files that don't exist in the file set */
function safeAppTsx(content: string, files: Record<string, string>): string {
  const lines = content.split("\n");
  const safe  = lines.filter(line => {
    const match = line.match(/import\s+\w+\s+from\s+["']\.\/components\/(\w+)["']/);
    if (!match) return true;
    const exists = `src/components/${match[1]}.tsx` in files
      || `src/components/${match[1]}.jsx` in files;
    if (!exists) return false; // drop missing component import
    return true;
  });
  const result = safe.join("\n").trim();
  return result.includes("export default") ? result : DEFAULT_APP_TSX;
}

/** Unpack className={cn(...)} or className={`...`} or className="..." into clean class="..." */
function unpackClassNames(html: string): string {
  let result = html;

  // 1. Unpack className={cn(...)} or class={cn(...)}
  result = result.replace(/(?:className|class)=\{\s*cn\s*\(([\s\S]*?)\)\s*\}/g, (_m, args) => {
    const classes: string[] = [];
    const strRegex = /["'`]((?:\\.|[^"'`\\])*)["'`]/g;
    for (const strMatch of args.matchAll(strRegex)) {
      const val = strMatch[1].trim();
      if (val) classes.push(val);
    }
    return `class="${classes.join(' ')}"`;
  });

  // 2. Unpack template strings className={`...`} or class={`...`}
  result = result.replace(/(?:className|class)=\{\s*`([\s\S]*?)`\s*\}/g, (_m, content) => {
    const clean = content.replace(/\$\{[\s\S]*?\}/g, "").trim();
    return `class="${clean}"`;
  });

  // 3. Unpack string expressions className={"..."} or className={'...'}
  result = result.replace(/(?:className|class)=\{\s*["']([^"']*)["']\s*\}/g, 'class="$1"');

  // 4. Convert standard className="..." to class="..."
  result = result.replace(/className="([^"]*)"/g, 'class="$1"');
  result = result.replace(/className='([^']*)'/g, 'class="$1"');
  result = result.replace(/\bclassName=/g, "class=");

  return result;
}

/** Convert Next.js TSX → plain HTML with recursive component expansion */
function buildNextStaticHtml(
  page: string,
  layout: string,
  css: string,
  allFiles: Record<string, string>
): string {
  // Extract title from layout
  const titleMatch = layout.match(/title:\s*["'`]([^"'`]+)["'`]/);
  const title = titleMatch?.[1] || "Preview";

  // 1. Initial conversion of page.tsx to HTML structure
  const rawBody = jsxToHtml(page);

  // 2. Recursively expand components like <Hero />, <Features />, <Navbar />, etc.
  const expandedBody = expandComponents(rawBody, allFiles);

  // 3. Unpack all class names into clean HTML class attributes
  const finalCleanBody = unpackClassNames(expandedBody);

  // Custom CSS without Tailwind directives
  const customCss = css
    .replace(/@tailwind\s+\w+;/g, "")
    .replace(/@import[^;]+;/g, "")
    .trim();

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            slate: {
              950: '#090d16',
              900: '#0f172a',
              800: '#1e293b',
            },
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            display: ['Syne', 'sans-serif'],
          },
        },
      },
    };
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html { font-family: 'Inter', system-ui, sans-serif; scroll-behavior: smooth; background: #090d16; color: #f8fafc; }
    body { margin: 0; background: #090d16; color: #f8fafc; min-height: 100vh; overflow-x: hidden; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; height: auto; }
    
    /* SVG icon constraints */
    svg { display: inline-block; vertical-align: middle; flex-shrink: 0; }
    svg[class*="w-3"] { width: 0.75rem; height: 0.75rem; }
    svg[class*="w-4"] { width: 1rem; height: 1rem; }
    svg[class*="w-5"] { width: 1.25rem; height: 1.25rem; }
    svg[class*="w-6"] { width: 1.5rem; height: 1.5rem; }
    svg[class*="w-7"] { width: 1.75rem; height: 1.75rem; }
    svg[class*="w-8"] { width: 2rem; height: 2rem; }
    svg[class*="w-10"] { width: 2.5rem; height: 2.5rem; }
    svg[class*="w-12"] { width: 3rem; height: 3rem; }
    svg[class*="w-16"] { width: 4rem; height: 4rem; }
    svg:not([class*="w-"]):not([width]) { max-width: 1.75rem; max-height: 1.75rem; }

    /* Core layout & typography fallbacks */
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .grid { display: grid; }
    .hidden { display: none; }
    .block { display: block; }
    .inline-block { display: inline-block; }
    .flex-col { flex-direction: column; }
    .flex-row { flex-direction: row; }
    .flex-wrap { flex-wrap: wrap; }
    .flex-1 { flex: 1 1 0%; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .items-end { align-items: flex-end; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .justify-start { justify-content: flex-start; }
    .justify-end { justify-content: flex-end; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-extrabold { font-weight: 800; }
    .tracking-tight { letter-spacing: -0.025em; }
    .leading-tight { line-height: 1.25; }
    .leading-relaxed { line-height: 1.625; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .text-5xl { font-size: 3rem; line-height: 1.15; }
    .text-6xl { font-size: 3.75rem; line-height: 1.1; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; }
    .gap-12 { gap: 3rem; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    @media (min-width: 640px) {
      .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .sm\\:flex-row { flex-direction: row; }
    }
    @media (min-width: 768px) {
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .md\\:flex-row { flex-direction: row; }
      .md\\:text-5xl { font-size: 3rem; line-height: 1.15; }
      .md\\:text-6xl { font-size: 3.75rem; line-height: 1.1; }
    }
    @media (min-width: 1024px) {
      .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .lg\\:flex-row { flex-direction: row; }
    }
    .max-w-7xl { max-width: 80rem; }
    .max-w-6xl { max-width: 72rem; }
    .max-w-5xl { max-width: 64rem; }
    .max-w-4xl { max-width: 56rem; }
    .max-w-3xl { max-width: 48rem; }
    .max-w-2xl { max-width: 42rem; }
    .max-w-xl { max-width: 36rem; }
    .max-w-lg { max-width: 32rem; }
    .max-w-md { max-width: 28rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .p-4 { padding: 1rem; }
    .p-6 { padding: 1.5rem; }
    .p-8 { padding: 2rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .px-8 { padding-left: 2rem; padding-right: 2rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
    .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
    .py-16 { padding-top: 4rem; padding-bottom: 4rem; }
    .py-20 { padding-top: 5rem; padding-bottom: 5rem; }
    .py-24 { padding-top: 6rem; padding-bottom: 6rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-12 { margin-bottom: 3rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-full { border-radius: 9999px; }
    .border { border-width: 1px; }
    .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
    .border-slate-800 { border-color: #1e293b; }
    .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05); }
    .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1); }
    .bg-slate-900 { background-color: #0f172a; }
    .bg-slate-950 { background-color: #090d16; }
    .text-white { color: #ffffff; }
    .text-slate-100 { color: #f1f5f9; }
    .text-slate-200 { color: #e2e8f0; }
    .text-slate-300 { color: #cbd5e1; }
    .text-slate-400 { color: #94a3b8; }
    .text-indigo-400 { color: #818cf8; }
    .text-indigo-500 { color: #6366f1; }
    .bg-indigo-600 { background-color: #4f46e5; }
    .bg-indigo-500 { background-color: #6366f1; }
    .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
    .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4); }
    .backdrop-blur-xl { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
    .cursor-pointer { cursor: pointer; }
    .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
    .w-full { width: 100%; }
    .min-h-screen { min-height: 100vh; }
    .gradient-text {
      background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    ${customCss}
  </style>
</head>
<body class="bg-[#090d16] text-[#f8fafc]">
${finalCleanBody}
  <div style="position:fixed;bottom:12px;right:12px;padding:4px 10px;border-radius:20px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#a5b4fc;font-size:10px;font-family:Inter,sans-serif;backdrop-filter:blur(8px);z-index:9999">
    ⚡ Live Preview
  </div>
</body>
</html>`;
}

/** Recursively inline custom JSX component tags from component files */
function expandComponents(html: string, allFiles: Record<string, string>, depth = 0): string {
  if (depth > 6) return html;
  return html.replace(/<([A-Z]\w+)\s*[^/>]*\s*(?:\/>|><\/\1>)/g, (fullMatch, compName) => {
    // UI Primitive fallbacks if component file isn't found
    if (compName === "Button") {
      return `<button class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-semibold rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center justify-center gap-2">${fullMatch.replace(/<Button[^>]*>/, '').replace(/<\/Button>/, '') || 'Get Started'}</button>`;
    }
    if (compName === "Card") {
      return `<div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all duration-300 shadow-xl">${fullMatch.replace(/<Card[^>]*>/, '').replace(/<\/Card>/, '')}</div>`;
    }
    if (compName === "Badge") {
      return `<span class="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/30">${fullMatch.replace(/<Badge[^>]*>/, '').replace(/<\/Badge>/, '')}</span>`;
    }
    if (compName === "Input") {
      return `<input class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500" placeholder="Enter text..." />`;
    }

    const possiblePaths = [
      `components/${compName}.tsx`, `components/${compName}.jsx`,
      `components/ui/${compName}.tsx`, `components/ui/${compName}.jsx`,
      `src/components/${compName}.tsx`, `src/components/${compName}.jsx`,
      `src/components/ui/${compName}.tsx`, `src/components/ui/${compName}.jsx`,
      `app/${compName}.tsx`, `app/${compName}.jsx`,
    ];

    for (const p of possiblePaths) {
      if (allFiles[p]) {
        const childHtml = jsxToHtml(allFiles[p]);
        return expandComponents(childHtml, allFiles, depth + 1);
      }
    }

    return "";
  });
}

/** Helper to extract all defined JavaScript object arrays from a component file */
function extractObjectArrays(code: string): Record<string, Array<Record<string, string>>> {
  const result: Record<string, Array<Record<string, string>>> = {};
  
  // Find const/let/var <name> = [ ... ]
  const arrayRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*(?::\s*[^=]+)?=\s*\[([\s\S]*?)\];/g;
  for (const match of code.matchAll(arrayRegex)) {
    const arrayName = match[1];
    const arrayBody = match[2];
    
    // Split into individual object literal strings { ... }
    const items: Array<Record<string, string>> = [];
    const objMatches = arrayBody.match(/\{[\s\S]*?\}/g) || [];
    for (const objStr of objMatches) {
      const item: Record<string, string> = {};
      
      // Match key: "value" or key: 'value' or key: `value`
      const propRegex = /([a-zA-Z0-9_]+)\s*:\s*(?:["'`])([\s\S]*?)(?:["'`])/g;
      for (const pMatch of objStr.matchAll(propRegex)) {
        item[pMatch[1]] = pMatch[2];
      }

      // Also match key: IconName (e.g. icon: Sparkles, icon: Zap)
      const iconMatch = objStr.match(/icon\s*:\s*([a-zA-Z0-9_]+)/);
      if (iconMatch) {
        item["icon"] = iconMatch[1];
      }

      if (Object.keys(item).length > 0) {
        items.push(item);
      }
    }
    if (items.length > 0) {
      result[arrayName] = items;
    }
  }

  return result;
}

/** Render a generic SVG icon based on name */
function getIconSvg(name?: string, className = "w-6 h-6 text-indigo-400"): string {
  const n = (name || "").toLowerCase();
  if (n.includes("star")) {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  if (n.includes("check")) {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  }
  if (n.includes("zap") || n.includes("bolt")) {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
  }
  if (n.includes("shield") || n.includes("lock")) {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  }
  if (n.includes("user") || n.includes("team")) {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
}

/** Extract JSX block inside return (...) and transform UI primitive components */
function jsxToHtml(code: string): string {
  if (!code || !code.trim()) return "";

  // 1. Extract defined data arrays from this file
  const arrays = extractObjectArrays(code);

  // 2. Find the return (...) block
  let jsxBlock = "";
  const returnIdx = code.indexOf("return (");
  if (returnIdx !== -1) {
    let start = returnIdx + 7;
    let openCount = 0;
    let end = -1;

    for (let i = start; i < code.length; i++) {
      if (code[i] === '(') openCount++;
      else if (code[i] === ')') {
        openCount--;
        if (openCount === 0) { end = i; break; }
      }
    }

    if (end !== -1) {
      jsxBlock = code.substring(start + 1, end).trim();
    } else {
      jsxBlock = code.substring(start + 1).trim();
    }
  } else {
    jsxBlock = code;
  }

  // 3. Expand .map(...) blocks into repeated HTML items using extracted array data
  const mapBlockRegex = /\{\s*([a-zA-Z0-9_]+)\.map\s*\(\s*(?:\(?\s*([a-zA-Z0-9_]+)[^)]*\)?)\s*=>\s*(?:\{[\s\S]*?return\s*\(?([\s\S]*?)\)?;?\s*\}|\(?([\s\S]*?)\)?)\s*\)\s*\}?/g;

  let html = jsxBlock.replace(mapBlockRegex, (_fullMatch, arrayName, varName, templateBlock, templateDirect) => {
    let template = (templateBlock || templateDirect || "").trim();
    template = template.replace(/^\(|\)$/g, "").trim();

    const dataItems = arrays[arrayName] || [];

    if (dataItems.length > 0) {
      return dataItems.map(item => {
        let rendered = template;
        for (const [key, val] of Object.entries(item)) {
          const propRegex = new RegExp(`\\{\\s*${varName}\\??\\.${key}\\s*\\}`, "g");
          rendered = rendered.replace(propRegex, val);
        }
        rendered = rendered.replace(/<(?:Icon|\w+\.icon)\b[^>]*\/>/g, getIconSvg(item["icon"]));
        const leftoverVarRegex = new RegExp(`\\{\\s*${varName}\\??\\.[a-zA-Z0-9_]+\\s*\\}`, "g");
        rendered = rendered.replace(leftoverVarRegex, "");
        return rendered;
      }).join("\n");
    }

    // Fallback: render 3 clean items if array was from props/external
    const fallbackCount = 3;
    const fallbackRendered: string[] = [];
    for (let i = 0; i < fallbackCount; i++) {
      let rendered = template;
      rendered = rendered.replace(new RegExp(`\\{\\s*${varName}\\??\\.title\\s*\\}`, "g"), `Feature ${i + 1}`);
      rendered = rendered.replace(new RegExp(`\\{\\s*${varName}\\??\\.description\\s*\\}`, "g"), `Engineered for high performance and sleek modern aesthetics.`);
      rendered = rendered.replace(new RegExp(`\\{\\s*${varName}\\??\\.name\\s*\\}`, "g"), `Customer ${i + 1}`);
      rendered = rendered.replace(new RegExp(`\\{\\s*${varName}\\??\\.quote\\s*\\}`, "g"), `Exceptional quality, transformed our daily experience!`);
      rendered = rendered.replace(new RegExp(`\\{\\s*${varName}\\??\\.role\\s*\\}`, "g"), `Verified Buyer`);
      rendered = rendered.replace(new RegExp(`\\{\\s*${varName}\\??\\.price\\s*\\}`, "g"), `$${(i + 1) * 29}`);
      rendered = rendered.replace(/<(?:Icon|\w+\.icon)\b[^>]*\/>/g, getIconSvg());
      rendered = rendered.replace(new RegExp(`\\{\\s*${varName}\\??\\.[a-zA-Z0-9_]+\\s*\\}`, "g"), "");
      fallbackRendered.push(rendered);
    }
    return fallbackRendered.join("\n");
  });

  // 4. Transform UI Primitive components into styled HTML
  html = html
    .replace(/<CardTitle[^>]*>([\s\S]*?)<\/CardTitle>/g, '<h3 class="text-xl font-bold text-white mb-2">$1</h3>')
    .replace(/<CardDescription[^>]*>([\s\S]*?)<\/CardDescription>/g, '<p class="text-slate-400 text-sm leading-relaxed">$1</p>')
    .replace(/<CardHeader[^>]*>/g, '<div class="mb-4">')
    .replace(/<\/CardHeader>/g, '</div>')
    .replace(/<CardContent[^>]*>/g, '<div class="mb-4">')
    .replace(/<\/CardContent>/g, '</div>')
    .replace(/<CardFooter[^>]*>/g, '<div class="pt-4 border-t border-white/5 flex items-center justify-between">')
    .replace(/<\/CardFooter>/g, '</div>')
    .replace(/<Card[^>]*>/g, '<div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all duration-300 shadow-xl">')
    .replace(/<\/Card>/g, '</div>')
    .replace(/<Button[^>]*asChild[^>]*>/g, '')
    .replace(/<Button[^>]*>/g, '<button class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-400 hover:to-violet-400 transition-all cursor-pointer inline-flex items-center justify-center gap-2">')
    .replace(/<\/Button>/g, '</button>')
    .replace(/<Badge[^>]*>/g, '<span class="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/30">')
    .replace(/<\/Badge>/g, '</span>')
    .replace(/<Input([^>]*?)\/>/g, '<input class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500" $1 />')
    .replace(/className=/g, "class=")
    .replace(/htmlFor=/g, "for=")
    .replace(/onClick=\{[^}]*\}/g, "")
    .replace(/onChange=\{[^}]*\}/g, "")
    .replace(/onSubmit=\{[^}]*\}/g, "")
    .replace(/<Image([^>]*?)src=["']([^"']+)["']([^>]*?)(?:\/>|>)/g, '<img src="$2"$1$3/>')
    .replace(/<Image([^>]*?)src=\{["']([^"']+)["']\}([^>]*?)(?:\/>|>)/g, '<img src="$2"$1$3/>')
    .replace(/<Link([^>]*?)href=["']([^"']+)["']([^>]*?)>/g, '<a href="$2"$1$3>')
    .replace(/<\/Link>/g, "</a>");

  // 5. Replace Lucide icon tags with SVG icons
  html = html.replace(/<(?:Sparkles|Zap|Check|Shield|Star|ArrowRight|Globe|Layers|Code2|Rocket|Heart|Flame|Activity|Cloud|Lock|Users)\b([^>]*)\/>/g, (_m, attrs) => {
    const classMatch = attrs.match(/class=["']([^"']*)["']/);
    const cls = classMatch ? classMatch[1] : "w-5 h-5 text-indigo-400";
    return getIconSvg("sparkles", cls);
  });

  // 6. Clean all remaining JS expressions and logic statements
  html = html
    .replace(/(?:const|let|var)\s+[a-zA-Z0-9_]+\s*=\s*[^;\n]+;?/g, "")
    .replace(/return\s*\(/g, "")
    .replace(/^\s*\);\s*$/gm, "")
    .replace(/^\s*\}\s*\)\s*\}?\s*$/gm, "")
    .replace(/^\s*\}\s*;\s*$/gm, "")
    .replace(/^\s*\}\s*\)?\s*$/gm, "")
    .replace(/\{\s*[\w\.\?()]+\s*&&\s*\(/g, "")
    .replace(/\{\s*[\w\.\?()]+\s*\?\s*\(/g, "")
    .replace(/\)\s*:\s*\(/g, "")
    .replace(/\{\s*[\w\.\?()]+\s*&&\s*<([a-zA-Z0-9]+)/g, "<$1")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\{`([^`]*)`\}/g, "$1")
    .replace(/\{"([^"]*)"\}/g, "$1")
    .replace(/\{'([^']*)'\}/g, "$1")
    .replace(/\{new Date\(\)\.getFullYear\(\)\}/g, "2026")
    // Remove any leftover {var.prop} or {var}
    .replace(/\{[a-zA-Z0-9_]+(?:\??\.[a-zA-Z0-9_]+)*\}/g, "")
    // Remove empty JSX fragments
    .replace(/<>\s*/g, "")
    .replace(/<\/>\s*/g, "");

  return html;
}

// ── Constants ──────────────────────────────────────────────────
const DEFAULT_APP_TSX = `export default function App() {
  return (
    <div style={{
      fontFamily: "system-ui, sans-serif",
      padding: "3rem",
      background: "#0f0f13",
      color: "#e2e8f0",
      minHeight: "100vh",
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        background: "linear-gradient(135deg, #a5b4fc, #67e8f9)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: "1rem",
      }}>
        React App 🚀
      </h1>
      <p style={{ color: "#94a3b8" }}>
        Edit <code>src/App.tsx</code> to get started.
      </p>
    </div>
  );
}`;

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Preview</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f0f13; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    div { text-align: center; }
    p   { color: #94a3b8; }
  </style>
</head>
<body>
  <div>
    <h1>Preview Running</h1>
    <p>No index.html found in your project files.</p>
    <p>Add an index.html to see your content here.</p>
  </div>
</body>
</html>`;