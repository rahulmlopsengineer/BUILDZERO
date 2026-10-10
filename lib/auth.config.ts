import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId:     process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId:     process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            issuer:       "https://github.com/login/oauth",
            authorization: {
              url: "https://github.com/login/oauth/authorize",
              params: {
                scope: "read:user user:email repo",
              },
            },
          }),
        ]
      : []),
    Credentials({
      id: "demo",
      name: "Demo access",
      credentials: {},
      async authorize() {
        return {
          id: "demo-user",
          name: "Demo User",
          email: "demo@polaris.local",
          image: null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error:  "/auth/signin",
  },
  callbacks: {
    authorized({ auth: session }) {
      return !!session?.user;
    },
    jwt({ token, user, account, profile }) {
      if (account) {
        if (account.access_token) {
          token.accessToken = account.access_token;
        }
        if (account.provider === "github" && (profile as any)?.login) {
          token.githubUsername = (profile as any).login;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).githubUsername = token.githubUsername;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "p0lAr1s_1d3_5eCr3t_2026_xYz",
};
