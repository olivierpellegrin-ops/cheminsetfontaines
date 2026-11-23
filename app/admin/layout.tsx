import { auth } from "@/lib/auth";
import Link from "next/link";
import AdminSignOut from "./signout-button";
import "./admin.css";

/**
 * Coquille du back-office : neutre et sobre (aucune charte publique),
 * chaque page vérifie sa propre session — le middleware protège /admin/*.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="cf-admin">
      <header className="cf-admin__bar">
        <Link href="/admin" className="cf-admin__brand">
          Chemins et Fontaines — back-office
        </Link>
        {session?.user ? (
          <div className="cf-admin__me">
            <span>
              {session.user.name} <em>({session.user.role})</em>
            </span>
            <AdminSignOut />
          </div>
        ) : null}
      </header>
      <main className="cf-admin__main">{children}</main>
    </div>
  );
}
