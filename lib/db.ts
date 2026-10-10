/**
 * lib/db.ts
 * SQLite database via better-sqlite3.
 * Single file: polaris.db in the project root.
 * Tables:
 *   projects  – IDE projects (name, description)
 *   files     – source files belonging to a project
 *   snapshots – point-in-time content snapshots
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "polaris.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // ── Schema ──────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      framework   TEXT NOT NULL DEFAULT 'nextjs',
      vercel_project_id    TEXT,
      vercel_deployment_id TEXT,
      vercel_url           TEXT,
      vercel_status        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      path       TEXT NOT NULL,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      language   TEXT NOT NULL DEFAULT 'plaintext',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, path)
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id         TEXT PRIMARY KEY,
      file_id    TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      message    TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

      CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_snapshots_file ON snapshots(file_id);
    `);

    // ── Migrations (Manual) ────────────────────────────────
    const tableInfo = _db.prepare("PRAGMA table_info(projects)").all() as any[];
    const columns = tableInfo.map(c => c.name);

    const missingColumns = [
      { name: "framework", type: "TEXT NOT NULL DEFAULT 'nextjs'" },
      { name: "vercel_project_id", type: "TEXT" },
      { name: "vercel_deployment_id", type: "TEXT" },
      { name: "vercel_url", type: "TEXT" },
      { name: "vercel_status", type: "TEXT" },
    ];

    for (const col of missingColumns) {
      if (!columns.includes(col.name)) {
        try {
          _db.exec(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
          console.warn(`Could not add column ${col.name}:`, e);
        }
      }
    }

  // Seed a default project if DB is new
  const count = (_db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
  if (count === 0) {
    seedDefault(_db);
  }

  return _db;
}

// ── Types ────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  framework: string;
  vercel_project_id?: string;
  vercel_deployment_id?: string;
  vercel_url?: string;
  vercel_status?: string;
  created_at: string;
  updated_at: string;
}

export interface DbFile {
  id: string;
  project_id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Snapshot {
  id: string;
  file_id: string;
  content: string;
  message: string;
  created_at: string;
}

// ── Project helpers ──────────────────────────────────────

export function listProjects(): Project[] {
  return getDb().prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as Project[];
}

export function getProject(id: string): Project | undefined {
  return getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
}

export function createProject(id: string, name: string, description = ""): Project {
  getDb()
    .prepare("INSERT INTO projects(id, name, description) VALUES(?, ?, ?)")
    .run(id, name, description);
  return getProject(id)!;
}

export function updateProject(id: string, name: string, description: string): Project {
  getDb()
    .prepare(
      "UPDATE projects SET name=?, description=?, updated_at=datetime('now') WHERE id=?"
    )
    .run(name, description, id);
  return getProject(id)!;
}

export function deleteProject(id: string): void {
  getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
}

export function updateProjectVercel(
  id: string,
  data: {
    projectId?: string;
    deploymentId?: string;
    url?: string;
    status?: string;
  }
): Project {
  const parts: string[] = [];
  const vals: any[] = [];

  if (data.projectId !== undefined) { parts.push("vercel_project_id = ?"); vals.push(data.projectId); }
  if (data.deploymentId !== undefined) { parts.push("vercel_deployment_id = ?"); vals.push(data.deploymentId); }
  if (data.url !== undefined) { parts.push("vercel_url = ?"); vals.push(data.url); }
  if (data.status !== undefined) { parts.push("vercel_status = ?"); vals.push(data.status); }

  if (parts.length === 0) return getProject(id)!;

  vals.push(id);
  getDb()
    .prepare(`UPDATE projects SET ${parts.join(", ")}, updated_at=datetime('now') WHERE id=?`)
    .run(...vals);

  return getProject(id)!;
}

// ── File helpers ─────────────────────────────────────────

export function listFiles(projectId: string): DbFile[] {
  return getDb()
    .prepare("SELECT * FROM files WHERE project_id = ? ORDER BY path ASC")
    .all(projectId) as DbFile[];
}

export function getFile(id: string): DbFile | undefined {
  return getDb().prepare("SELECT * FROM files WHERE id = ?").get(id) as DbFile | undefined;
}

export function getFileByPath(projectId: string, filePath: string): DbFile | undefined {
  return getDb()
    .prepare("SELECT * FROM files WHERE project_id = ? AND path = ?")
    .get(projectId, filePath) as DbFile | undefined;
}

export function upsertFile(
  id: string,
  projectId: string,
  filePath: string,
  content: string,
  language: string
): DbFile {
  const name = filePath.split("/").pop() ?? filePath;
  getDb()
    .prepare(
      `INSERT INTO files(id, project_id, path, name, content, language)
       VALUES(?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, path)
       DO UPDATE SET content=excluded.content, language=excluded.language,
                     updated_at=datetime('now')`
    )
    .run(id, projectId, filePath, name, content, language);
  return getFileByPath(projectId, filePath)!;
}

export function saveFileContent(fileId: string, content: string): DbFile {
  getDb()
    .prepare("UPDATE files SET content=?, updated_at=datetime('now') WHERE id=?")
    .run(content, fileId);
  return getFile(fileId)!;
}

export function deleteFile(fileId: string): void {
  getDb().prepare("DELETE FROM files WHERE id = ?").run(fileId);
}

// ── Snapshot helpers ─────────────────────────────────────

export function listSnapshots(fileId: string): Snapshot[] {
  return getDb()
    .prepare("SELECT * FROM snapshots WHERE file_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(fileId) as Snapshot[];
}

export function createSnapshot(id: string, fileId: string, content: string, message: string): Snapshot {
  getDb()
    .prepare("INSERT INTO snapshots(id, file_id, content, message) VALUES(?, ?, ?, ?)")
    .run(id, fileId, content, message);
  return getDb().prepare("SELECT * FROM snapshots WHERE id = ?").get(id) as Snapshot;
}

// ── Seed ────────────────────────────────────────────────

function seedDefault(db: Database.Database) {
  const projectId = "proj_default";
  db.prepare("INSERT INTO projects(id, name, description) VALUES(?,?,?)").run(
    projectId,
    "my-next-app",
    "Next.js + Tailwind starter"
  );

  const files: [string, string, string, string][] = [
    [
      "file_page",
      "app/page.tsx",
      "typescript",
      `// app/page.tsx\nimport { redirect } from "next/navigation";\n\nexport default function Home() {\n  return (\n    <main className="flex min-h-screen flex-col items-center justify-center">\n      <h1 className="text-4xl font-bold">Hello Polaris!</h1>\n    </main>\n  );\n}\n`,
    ],
    [
      "file_layout",
      "app/layout.tsx",
      "typescript",
      `import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = { title: "Polaris" };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
    ],
    [
      "file_css",
      "app/globals.css",
      "css",
      `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    ],
    [
      "file_pkg",
      "package.json",
      "json",
      `{\n  "name": "my-next-app",\n  "version": "0.1.0",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build"\n  }\n}\n`,
    ],
  ];

  const stmt = db.prepare(
    "INSERT INTO files(id, project_id, path, name, content, language) VALUES(?,?,?,?,?,?)"
  );
  for (const [id, filePath, language, content] of files) {
    const name = filePath.split("/").pop()!;
    stmt.run(id, projectId, filePath, name, content, language);
  }
}
