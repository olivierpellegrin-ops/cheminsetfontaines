import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";

/**
 * Auth.js (NextAuth v5) du back-office — Credentials en base uniquement,
 * aucun secret ici (voir docs/SECRETS.md).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Compte du bureau",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        // Trace debug B0 (a retirer une fois le login OK) : suivre l'echec
        console.log(`[auth][debug] tentative login email="${email}" passwordLongueur=${password.length}`);
        if (!email || !password) {
          console.log("[auth][debug] -> REFUS : email ou mot de passe vide");
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          console.log(`[auth][debug] -> REFUS : aucun compte en base pour "${email}" (relancer npm run db:seed avec ADMIN_EMAIL/ADMIN_PASSWORD dans .env)`);
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          console.log(`[auth][debug] -> REFUS : mot de passe invalide pour "${email}" (upsert du seed : changer ADMIN_PASSWORD puis npm run db:seed)`);
          return null;
        }
        console.log(`[auth][debug] -> OK : "${email}" (${user.role})`);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
