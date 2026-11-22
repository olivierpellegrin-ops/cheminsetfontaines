import Link from "next/link";
import { SITE } from "@/lib/site";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
        padding: 32,
      }}
    >
      <p className="kicker">404</p>
      <h1 className="h2">Page introuvable</h1>
      <p className="body-muted">Le chemin que vous cherchez n'existe pas ou a été déplacé.</p>
      <Link className="btn btn-ochre" href="/fr">
        Retour à l'accueil
      </Link>
    </main>
  );
}
