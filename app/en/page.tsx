import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  // Squelette reproduit à l'identique (Q1) : le visiteur ne doit pas
  // apercevoir de changement de structure.
  title: "English Version",
  robots: { index: true, follow: true },
};

export default function EnglishSkeleton() {
  return (
    <main
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
        padding: 32,
      }}
    >
      <p className="kicker">{SITE.kicker}</p>
      <h1 className="h1">ENGLISH VERSION</h1>
      <p className="body-muted" style={{ fontSize: 20 }}>
        UNDER CONSTRUCTION
      </p>
      <a className="btn btn-ochre" href="/fr">
        Retour au site
      </a>
    </main>
  );
}
