import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    css: "css",
    json: "json",
    md: "markdown",
    html: "html",
    py: "python",
    sh: "shell",
  };
  return map[ext ?? ""] ?? "plaintext";
}

export function getFileDotColor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "bg-accent-blue",
    tsx: "bg-accent-blue",
    js: "bg-accent-amber",
    jsx: "bg-accent-amber",
    css: "bg-purple",
    json: "bg-accent-amber",
    md: "bg-accent-green",
    env: "bg-accent-red",
  };
  return map[ext ?? ""] ?? "bg-text-3";
}
