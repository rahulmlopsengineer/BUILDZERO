import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";
import { encryptToken } from "@/lib/security";

// GET /api/user/vercel
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ email: session.user.email }).select("vercelToken vercelTeamId");
  
  return NextResponse.json({
    hasToken: !!user?.vercelToken,
    vercelTeamId: user?.vercelTeamId || null,
  });
}

// POST /api/user/vercel
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vercelToken, vercelTeamId } = await req.json();
  
  if (!vercelToken) {
    return NextResponse.json({ error: "vercelToken required" }, { status: 400 });
  }

  await connectDB();
  const encrypted = encryptToken(vercelToken);
  
  await User.findOneAndUpdate(
    { email: session.user.email },
    { vercelToken: encrypted, vercelTeamId: vercelTeamId || "" }
  );

  return NextResponse.json({ success: true });
}
