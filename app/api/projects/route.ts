export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { Project } from "@/models/Project";

// GET /api/projects
export async function GET() {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  let user = await User.findOne({ email: session.user.email });
  if (!user) {
    user = await User.create({
      email:      session.user.email,
      name:       session.user.name ?? "User",
      image:      session.user.image ?? "",
      provider:   "demo",
      providerId: session.user.email,
    });
  }

  // Auto-heal projects stuck in "generating" for > 90s
  const ninetySecsAgo = new Date(Date.now() - 90 * 1000);
  await Project.updateMany(
    { userId: user._id, status: "generating", updatedAt: { $lt: ninetySecsAgo } },
    { $set: { status: "ready" } }
  );

  const projects = await Project.find({ userId: user._id })
    .select("name description framework status vercelStatus vercelUrl createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ projects });
}

// POST /api/projects
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  let user = await User.findOne({ email: session.user.email });
  if (!user) {
    user = await User.create({
      email:      session.user.email,
      name:       session.user.name ?? "User",
      image:      session.user.image ?? "",
      provider:   "demo",
      providerId: session.user.email,
    });
  }

  const body = await req.json();
  const { name, description, framework } = body;

  if (!name?.trim() || !framework)
    return NextResponse.json({ error: "name and framework required" }, { status: 400 });

  // Sanitise onboardingAnswers — ensure it is always a plain string→string object.
  // The client sends a plain JSON object; Mongoose Map type rejects that, so we
  // explicitly build a clean Record<string,string> here.
  const rawAnswers = body.onboardingAnswers ?? {};
  const onboardingAnswers: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawAnswers)) {
    onboardingAnswers[String(k)] = String(v ?? "");
  }

  const project = await Project.create({
    userId:  user._id,
    name:    name.trim(),
    description: description?.trim() ?? "",
    framework,
    onboardingAnswers,   // plain object, accepted by Schema.Types.Mixed
    files:  [],
    status: "generating",
  });

  return NextResponse.json({ project }, { status: 201 });
}

// DELETE /api/projects/:id  (called from dashboard)
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await Project.findOneAndDelete({ _id: id, userId: user._id });
  return NextResponse.json({ success: true });
}