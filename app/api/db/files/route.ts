import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Project } from "@/models/Project";
import { getFileLanguage } from "@/lib/utils";

// GET /api/db/files?projectId=xxx
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    if (projectId === "proj_default") {
      // For now, handle proj_default gracefully if it hasn't been migrated
      // But we should ideally migrate it.
      const project = await Project.findOne({ name: "my-next-app" });
      return NextResponse.json({ files: project?.files || [] });
    }

    const project = await Project.findById(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const files = project.files.map((f: any) => ({
      ...f.toObject(),
      id: f._id.toString(),
    }));

    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/db/files  — create or upsert a file
export async function POST(req: Request) {
  try {
    await connectDB();
    const { projectId, path, content } = await req.json();
    if (!projectId || !path) {
      return NextResponse.json({ error: "projectId and path required" }, { status: 400 });
    }

    const project = projectId === "proj_default" 
      ? await Project.findOne({ name: "my-next-app" })
      : await Project.findById(projectId);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const language = getFileLanguage(path.split("/").pop() ?? path);
    const fileName = path.split("/").pop() ?? path;

    // Check if file already exists
    const existingFileIndex = project.files.findIndex(f => f.filePath === path);
    if (existingFileIndex >= 0) {
      project.files[existingFileIndex].content = content ?? "";
      project.files[existingFileIndex].updatedAt = new Date();
    } else {
      project.files.push({
        fileName,
        filePath: path,
        content: content ?? "",
        fileType: "text",
        language,
        updatedAt: new Date(),
      } as any);
    }

    await project.save();
    const file = project.files.find(f => f.filePath === path);
    return NextResponse.json({ file: { ...(file as any).toObject(), id: (file as any)._id } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/db/files  — save file content (by id or combined projectId+path)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, content, projectId, path } = await req.json();

    let project;
    if (projectId) {
      project = projectId === "proj_default" 
        ? await Project.findOne({ name: "my-next-app" })
        : await Project.findById(projectId);
    }

    if (!project && id) {
      // If only ID is provided, we have to find the project containing this file
      project = await Project.findOne({ "files._id": id });
    }

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const file = id 
      ? project.files.id(id)
      : project.files.find(f => f.filePath === path);

    if (!file) return NextResponse.json({ error: "file not found" }, { status: 404 });

    file.content = content;
    file.updatedAt = new Date();
    await project.save();

    return NextResponse.json({ file: { ...file.toObject(), id: file._id } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/db/files
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id, projectId, path } = await req.json();

    let project;
    if (projectId) {
      project = projectId === "proj_default" 
        ? await Project.findOne({ name: "my-next-app" })
        : await Project.findById(projectId);
    } else {
      project = await Project.findOne({ "files._id": id });
    }

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (id) {
       (project.files as any).pull(id);
    } else if (path) {
      const idx = project.files.findIndex(f => f.filePath === path);
      if (idx >= 0) project.files.splice(idx, 1);
    }

    await project.save();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
