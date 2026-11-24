import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: { role?: "admin" | "bureau" } & DefaultSession["user"];
  }
  interface User {
    role: "admin" | "bureau";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "bureau";
  }
}
