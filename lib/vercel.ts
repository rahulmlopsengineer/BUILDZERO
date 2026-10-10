/**
 * lib/vercel.ts
 * Vercel API integration for programmatic deployments and metrics.
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = process.env.VERCEL_TEAM_ID;

const BASE_URL = "https://api.vercel.com";

interface VercelFile {
  file: string;
  data: string;
}

interface DeploymentOptions {
  name: string;
  files: Record<string, string>;
  framework?: string;
  config?: { token: string; teamId?: string };
}

/**
 * Creates a new Vercel deployment from a file map.
 */
export async function createDeployment({ name, files, framework, config }: DeploymentOptions) {
  const token  = config?.token  || VERCEL_TOKEN;
  const teamId = config?.teamId || TEAM_ID;

  if (!token) {
    throw new Error("Vercel token is not configured");
  }

  const vercelFiles: VercelFile[] = Object.entries(files).map(([path, data]) => ({
    file: path.replace(/^\//, ""), // Ensure no leading slash
    data,
  }));

  // Map internal framework names to Vercel slugs
  const FRAMEWORK_MAPPING: Record<string, string | null> = {
    "nextjs": "nextjs",
    "react": "vite",
    "html-css-js": null,
    "vanilla-js": null,
  };

  const vercelFramework = framework ? (FRAMEWORK_MAPPING[framework.toLowerCase()] ?? null) : null;

  // Vercel name constraints: max 100 chars, lowercase, alphanumeric, '.', '_', '-'
  const sanitizedName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "-") // Replace invalid chars with -
    .replace(/-+/g, "-")           // Collapse multiple dashes
    .replace(/^-+|-+$/g, "")       // Trim leading/trailing dashes
    .slice(0, 100);

  const body = {
    name: sanitizedName,
    files: vercelFiles,
    projectSettings: { framework: vercelFramework },
    target: "production",
  };

  const url = new URL(`${BASE_URL}/v13/deployments`);
  if (teamId) url.searchParams.append("teamId", teamId);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || data.message || "Failed to create Vercel deployment");
  }

  return data;
}

/**
 * Fetches deployment details by ID.
 */
export async function getDeployment(id: string, config?: { token: string; teamId?: string }) {
  const token  = config?.token  || VERCEL_TOKEN;
  const teamId = config?.teamId || TEAM_ID;

  if (!token) throw new Error("Vercel token not configured");

  const url = new URL(`${BASE_URL}/v13/deployments/${id}`);
  if (teamId) url.searchParams.append("teamId", teamId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch deployment status");
  return await res.json();
}

/**
 * Fetches visitor stats for a project.
 */
export async function getProjectAnalytics(projectId: string, config?: { token: string; teamId?: string }) {
  const token  = config?.token  || VERCEL_TOKEN;
  const teamId = config?.teamId || TEAM_ID;

  if (!token) throw new Error("Vercel token not configured");

  // Vercel Analytics API (v1/analytics/stats)
  const url = new URL(`${BASE_URL}/v1/analytics/stats/pageviews`);
  url.searchParams.append("projectId", projectId);
  if (teamId) url.searchParams.append("teamId", teamId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null; // Analytics might not be enabled
  return await res.json();
}

/**
 * Fetches usage metrics (Invocations, CPU time).
 */
export async function getProjectUsage(projectId: string, config?: { token: string; teamId?: string }) {
  const token  = config?.token  || VERCEL_TOKEN;
  const teamId = config?.teamId || TEAM_ID;

  if (!token) throw new Error("Vercel token not configured");

  // Vercel Usage API (v1/usage)
  const url = new URL(`${BASE_URL}/v1/projects/${projectId}/usage`);
  if (teamId) url.searchParams.append("teamId", teamId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return await res.json();
}
