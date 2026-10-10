"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types (mirror lib/db.ts) ─────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  framework: string;
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

// ── Projects ─────────────────────────────────────────────

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db/projects");
      const data = await res.json().catch(() => ({}));
      setProjects(data.projects ?? []);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createProject = useCallback(
    async (name: string, description = "") => {
      const res = await fetch("/api/db/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      await refresh();
      return data.project as Project;
    },
    [refresh]
  );

  const updateProject = useCallback(
    async (id: string, name: string, description: string) => {
      await fetch("/api/db/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, description }),
      });
      await refresh();
    },
    [refresh]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await fetch("/api/db/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await refresh();
    },
    [refresh]
  );

  return { projects, loading, error, refresh, createProject, updateProject, deleteProject };
}

// ── Files ────────────────────────────────────────────────

export function useProjectFiles(projectId: string | null) {
  const [files, setFiles] = useState<DbFile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) { setFiles([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/db/files?projectId=${projectId}`);
      const data = await res.json();
      setFiles(data.files ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveFile = useCallback(
    async (fileId: string, content: string) => {
      await fetch("/api/db/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fileId, content }),
      });
      await refresh();
    },
    [refresh]
  );

  const createFile = useCallback(
    async (path: string, content = "") => {
      const res = await fetch("/api/db/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, path, content }),
      });
      const data = await res.json();
      await refresh();
      return data.file as DbFile;
    },
    [projectId, refresh]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      await fetch("/api/db/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fileId }),
      });
      await refresh();
    },
    [refresh]
  );

  return { files, loading, refresh, saveFile, createFile, deleteFile };
}

// ── Snapshots ────────────────────────────────────────────

export function useSnapshots(fileId: string | null) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!fileId) { setSnapshots([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/db/snapshots?fileId=${fileId}`);
      const data = await res.json();
      setSnapshots(data.snapshots ?? []);
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createSnapshot = useCallback(
    async (message = "Manual snapshot") => {
      if (!fileId) return;
      await fetch("/api/db/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, message }),
      });
      await refresh();
    },
    [fileId, refresh]
  );

  return { snapshots, loading, refresh, createSnapshot };
}
