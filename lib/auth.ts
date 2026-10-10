/**
 * lib/auth.ts
 *
 * TWO EXPORTS:
 *
 * 1. `authConfig`  — pure JWT config, NO Mongoose imports.
 *    Used by middleware.ts (Edge Runtime safe).
 *    (re-exported from ./auth.config)
 *
 * 2. `{ handlers, auth, signIn, signOut }` — full NextAuth with
 *    Mongoose callbacks. Used ONLY by:
 *      - app/api/auth/[...nextauth]/route.ts
 *      - Server components / API routes (Node.js runtime)
 *
 * NEVER import `auth` (the full version) in middleware.ts.
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Re-export for any server-side code that imports from @/lib/auth
export { authConfig };

// ── Full NextAuth (Node.js only — has DB callbacks) ────────
// Dynamic imports for Mongoose keep this out of the Edge bundle.
export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,

  callbacks: {
    // Runs on sign-in: upsert the user in MongoDB
    async signIn({ user, account, profile }) {
      if (!account || !user.email) return false;

      try {
        const { connectDB } = await import("@/lib/mongoose");
        const { User }      = await import("@/models/User");
        await connectDB();
        
        const updateData: Record<string, unknown> = {
          name:       user.name       ?? "Demo User",
          email:      user.email,
          image:      user.image      ?? "",
          provider:   (account.provider as "google" | "github" | "demo") || "demo",
          providerId: account.providerAccountId || "demo-user",
        };

        if (account.provider === "github" && account.access_token) {
          updateData.githubToken = account.access_token;
          if ((profile as any)?.login) {
            updateData.githubUsername = (profile as any).login;
          }
        }

        await User.findOneAndUpdate(
          { email: user.email },
          updateData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return true;
      } catch {
        // Even if MongoDB connection is temporarily down, allow Demo login to proceed
        return true;
      }
    },

    // Attach the MongoDB _id to the JWT session
    async session({ session, token }) {
      if (token.sub) {
        (session.user as typeof session.user & { id: string }).id = token.sub;
      }
      if (session.user?.email && !token.dbId) {
        try {
          const { connectDB } = await import("@/lib/mongoose");
          const { User }      = await import("@/models/User");
          await connectDB();
          const dbUser = await User.findOne({ email: session.user.email }).lean();
          if (dbUser) {
            (session.user as typeof session.user & { id: string }).id =
              (dbUser._id as { toString(): string }).toString();
          }
        } catch { /* non-fatal */ }
      }
      return session;
    },
  },
});
