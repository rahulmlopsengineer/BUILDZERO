export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  content?: string;
}

export const DEFAULT_FILES: Record<string, string> = {
  "app/page.tsx": `// src/app/page.tsx — Polaris IDE home
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Polaris",
  description: "Cloud IDE powered by AI",
};

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/projects");
  }

  return (
    <main className="flex min-h-screen flex-col">
      <HeroSection />
      <FeaturesGrid />
    </main>
  );
}
`,
  "app/layout.tsx": `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Polaris",
  description: "AI-powered Cloud IDE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
`,
  "app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-0: #0e0f11;
  --purple: #7c6ef5;
}

html, body {
  height: 100%;
  overflow: hidden;
}
`,
  "features/editor/editor.tsx": `"use client";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={oneDark}
      extensions={[javascript({ typescript: true, jsx: true })]}
      onChange={onChange}
    />
  );
}
`,
  "features/conversations/chat-panel.tsx": `"use client";
import { useChat } from "ai/react";

export function ChatPanel({ fileContext }: { fileContext?: string }) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/messages",
    body: { fileContext },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-medium">
              {m.role === "user" ? "You" : "Claude"}:
            </span>{" "}
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/5">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask Claude..."
          className="w-full bg-transparent outline-none text-sm"
        />
      </form>
    </div>
  );
}
`,
  "features/projects/project-list.tsx": `"use client";

interface Project {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

const MOCK_PROJECTS: Project[] = [
  { id: "1", name: "my-next-app", description: "Next.js + Tailwind project", updatedAt: "2 hours ago" },
  { id: "2", name: "api-service", description: "Node.js REST API", updatedAt: "Yesterday" },
];

export function ProjectList() {
  return (
    <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MOCK_PROJECTS.map((project) => (
        <div key={project.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/50 transition-colors cursor-pointer">
          <h3 className="font-semibold text-white">{project.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{project.description}</p>
          <p className="text-xs text-gray-600 mt-3">{project.updatedAt}</p>
        </div>
      ))}
    </div>
  );
}
`,
  "components/header.tsx": `import { PolarisLogo } from "./polaris-logo";

export function Header() {
  return (
    <header className="h-11 flex items-center justify-between px-4 bg-bg-1 border-b border-white/5">
      <PolarisLogo />
    </header>
  );
}
`,
  "package.json": `{
  "name": "polaris-ide",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
`,
  ".env.local": `# Anthropic API Key
ANTHROPIC_API_KEY=your_key_here
`,
};

export const FILE_TREE: FileNode[] = [
  {
    name: "app",
    path: "app",
    type: "dir",
    children: [
      { name: "page.tsx", path: "app/page.tsx", type: "file" },
      { name: "layout.tsx", path: "app/layout.tsx", type: "file" },
      { name: "globals.css", path: "app/globals.css", type: "file" },
    ],
  },
  {
    name: "features",
    path: "features",
    type: "dir",
    children: [
      {
        name: "editor",
        path: "features/editor",
        type: "dir",
        children: [
          { name: "editor.tsx", path: "features/editor/editor.tsx", type: "file" },
        ],
      },
      {
        name: "conversations",
        path: "features/conversations",
        type: "dir",
        children: [
          { name: "chat-panel.tsx", path: "features/conversations/chat-panel.tsx", type: "file" },
        ],
      },
      {
        name: "projects",
        path: "features/projects",
        type: "dir",
        children: [
          { name: "project-list.tsx", path: "features/projects/project-list.tsx", type: "file" },
        ],
      },
    ],
  },
  {
    name: "components",
    path: "components",
    type: "dir",
    children: [
      { name: "header.tsx", path: "components/header.tsx", type: "file" },
    ],
  },
  { name: "package.json", path: "package.json", type: "file" },
  { name: ".env.local", path: ".env.local", type: "file" },
];
