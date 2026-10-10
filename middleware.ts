/**
 * middleware.ts
 *
 * Runs in the Edge Runtime — MUST only use edge-safe code.
 * We import `authConfig` (no Mongoose) and create a lightweight
 * NextAuth instance just for session checking.
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Create an edge-safe auth helper using the config without DB imports
const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn  = !!req.auth;
  const path        = req.nextUrl.pathname;

  const isAuthPage  = path.startsWith("/auth");
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/projects")  ||
    path.startsWith("/create-project");

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/create-project/:path*",
    "/auth/:path*",
  ],
};