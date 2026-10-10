export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { Project } from "@/models/Project";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      repoName: inputRepoName,
      branch = "main",
      commitMsg = "feat: update codebase via Polaris IDE",
      isPrivate = false,
      token: inputToken,
    } = body;

    await connectDB();
    const [project, user] = await Promise.all([
      Project.findById(projectId),
      User.findOne({ email: session.user.email }),
    ]);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Use token from user's GitHub OAuth login, or manually provided token, or process.env.GITHUB_TOKEN
    const githubToken =
      inputToken ||
      user.githubToken ||
      (session.user as any).accessToken ||
      process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json(
        {
          error: "GitHub token not found. Please sign in with GitHub or enter a GitHub Personal Access Token (PAT).",
          needsToken: true,
        },
        { status: 400 }
      );
    }

    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Polaris-IDE",
      "Content-Type": "application/json",
    };

    // 1. Verify GitHub user identity
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Invalid GitHub token or session expired. Please re-authenticate." },
        { status: 401 }
      );
    }
    const ghUser = await userRes.json();
    const owner = ghUser.login;

    const repoName = (
      inputRepoName ||
      project.name ||
      "polaris-project"
    )
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    // 2. Check if repository exists or create it
    let repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
    if (repoRes.status === 404) {
      // Create new repository
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: repoName,
          description: project.description || `Created with Polaris AI IDE (${project.framework})`,
          private: isPrivate,
          auto_init: true,
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.json().catch(() => ({}));
        throw new Error(createErr.message || "Failed to create GitHub repository");
      }
      repoRes = createRes;
      // Brief pause for GitHub to initialize default branch
      await new Promise((r) => setTimeout(r, 1000));
    }

    const repoData = await repoRes.json();
    const targetBranch = branch || repoData.default_branch || "main";

    // 3. Prepare files to push
    const filesToPush = (project.files || []).map((f: { filePath: string; content: string }) => ({
      path: f.filePath.replace(/^\/+/, ""),
      mode: "100644",
      type: "blob",
      content: f.content,
    }));

    if (filesToPush.length === 0) {
      return NextResponse.json({ error: "No files found in this project to push" }, { status: 400 });
    }

    // 4. Get latest commit SHA on branch
    let latestCommitSha: string | null = null;
    let baseTreeSha: string | null = null;

    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${targetBranch}`,
      { headers }
    );

    if (refRes.ok) {
      const refData = await refRes.json();
      latestCommitSha = refData.object.sha;

      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/commits/${latestCommitSha}`,
        { headers }
      );
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree.sha;
      }
    }

    // 5. Create a Git Tree
    const treeBody: Record<string, unknown> = { tree: filesToPush };
    if (baseTreeSha) {
      treeBody.base_tree = baseTreeSha;
    }

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify(treeBody),
    });

    if (!treeRes.ok) {
      const treeErr = await treeRes.json().catch(() => ({}));
      throw new Error(treeErr.message || "Failed to create git tree");
    }
    const treeData = await treeRes.json();

    // 6. Create Commit
    const commitBody: Record<string, unknown> = {
      message: commitMsg || "feat: update codebase via Polaris IDE",
      tree: treeData.sha,
      parents: latestCommitSha ? [latestCommitSha] : [],
    };

    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify(commitBody),
    });

    if (!newCommitRes.ok) {
      const commitErr = await newCommitRes.json().catch(() => ({}));
      throw new Error(commitErr.message || "Failed to create commit");
    }
    const newCommitData = await newCommitRes.json();

    // 7. Update branch reference
    let updateRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${targetBranch}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: true,
        }),
      }
    );

    if (!updateRefRes.ok && updateRefRes.status === 404) {
      // Create branch ref if it doesn't exist
      updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${targetBranch}`,
          sha: newCommitData.sha,
        }),
      });
    }

    if (!updateRefRes.ok) {
      const refErr = await updateRefRes.json().catch(() => ({}));
      throw new Error(refErr.message || "Failed to update branch reference");
    }

    const repoUrl = `https://github.com/${owner}/${repoName}`;

    return NextResponse.json({
      success: true,
      repoUrl,
      owner,
      repoName,
      branch: targetBranch,
      filesCount: filesToPush.length,
    });
  } catch (err) {
    console.error("GitHub Push error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
