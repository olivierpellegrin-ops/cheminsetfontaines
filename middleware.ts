import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Protège /admin/* (sauf /admin/login) — brique B0.
 * Les pages vérifient aussi la session en propre (défense en profondeur).
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth && pathname !== "/admin/login" && !pathname.startsWith("/admin/login")) {
    const loginUrl = new URL("/admin/login", req.nextUrl);
    return Response.redirect(loginUrl);
  }
  return;
});

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/auth/:path*"],
};
