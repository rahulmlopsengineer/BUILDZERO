import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Project } from "@/models/Project";

// GET /api/db/snapshots?fileId=xxx
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

    const project = await Project.findOne({ "files._id": fileId });
    if (!project) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const file = (project.files as any).id(fileId);
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const snapshots = file.snapshots.map((s: any) => ({
      ...s.toObject(),
      id: s._id.toString(),
      created_at: s.createdAt,
    }));

    return NextResponse.json({ snapshots });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/db/snapshots  — create a snapshot of a file's current content
export async function POST(req: Request) {
  try {
    await connectDB();
    const { fileId, message } = await req.json();
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

    const project = await Project.findOne({ "files._id": fileId });
    if (!project) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const file = (project.files as any).id(fileId);
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    file.snapshots.push({
      content: file.content,
      message: message ?? "Manual snapshot",
    } as any);

    await project.save();
    const snap = file.snapshots[file.snapshots.length - 1];

    return NextResponse.json({ 
      snapshot: { ...snap.toObject(), id: snap._id.toString(), created_at: snap.createdAt } 
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
