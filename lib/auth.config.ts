import type { NextAuthConfig } from "next-auth";

/**
 * Config edge-safe (sans Prisma bcrypt) partagée entre lib/auth.ts et
 * middleware.ts — brique B0 du back-office (conception du 23/11/2026).
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: "admin" | "bureau" }).role ?? "bureau";
      return token;
    },
    session({ session, token }) {
      if (session.user && token.role) {
        (session.user as { role?: "admin" | "bureau" }).role =
          token.role as "admin" | "bureau";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
