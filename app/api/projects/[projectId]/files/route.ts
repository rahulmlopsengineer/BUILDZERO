export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { Project } from "@/models/Project";

// GET /api/projects/[projectId]/files
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const project = await Project.findOne({ _id: projectId, userId: user._id });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({
    id:          project._id,
    name:        project.name,
    description: project.description,
    framework:   project.framework,
    status:      project.status,
    files:       project.files,
  });
}

// PUT /api/projects/[projectId]/files — update a single file's content
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { fileId, content } = await req.json();
  if (!fileId || content === undefined) {
    return NextResponse.json({ error: "fileId and content required" }, { status: 400 });
  }

  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId: user._id, "files._id": fileId },
    {
      $set: {
        "files.$.content":   content,
        "files.$.updatedAt": new Date(),
      },
    },
    { new: true }
  );

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updatedFile = project.files.find((f) => f._id.toString() === fileId);
  return NextResponse.json({ file: updatedFile });
}
