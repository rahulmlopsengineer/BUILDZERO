import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Project } from "@/models/Project";
import { auth } from "@/lib/auth";
import { User } from "@/models/User";

export async function GET() {
  try {
    await connectDB();
    const session = await auth();
    let query = {};
    
    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      if (user) query = { userId: user._id };
    }

    const mongooseProjects = await Project.find(query).sort({ updatedAt: -1 }).lean();
    
    // Map _id to id for frontend compatibility
    const projects = mongooseProjects.map(p => ({
      ...p,
      id: p._id.toString(),
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));

    return NextResponse.json({ projects });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await auth();
    const { name, description, framework = "nextjs" } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let userId;
    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      if (user) userId = user._id;
    }

    // Default system user if no session
    if (!userId) {
       let systemUser = await User.findOne({ email: "system@polaris.ide" });
       if (!systemUser) {
         systemUser = await User.create({
            name: "System",
            email: "system@polaris.ide",
            provider: "google",
            providerId: "system",
         });
       }
       userId = systemUser._id;
    }

    const project = await Project.create({
      userId,
      name: name.trim(),
      description: description ?? "",
      framework,
      status: "ready",
      files: [],
    });

    return NextResponse.json({ 
      project: { ...project.toObject(), id: project._id.toString() } 
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, name, description } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "id and name required" }, { status: 400 });
    }

    const project = await Project.findByIdAndUpdate(
      id,
      { name: name.trim(), description: description ?? "" },
      { new: true }
    );

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ 
      project: { ...project.toObject(), id: project._id.toString() } 
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await Project.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
