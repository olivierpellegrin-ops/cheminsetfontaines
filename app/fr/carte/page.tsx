import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carte",
  description:
    "La carte des chemins — les itinéraires de l'association par commune de la Xaintrie.",
  alternates: { canonical: "/fr/carte" },
};

/**
 * v0.1 : page « La carte des chemins » avec le sélecteur textuel par commune
 * (comportement identique au site actuel : la carte SVG interactive
 * n'est PAS encore publiée chez Framer, donc non essentielle à la copie —
 * elle sera portée depuis XaintrieTownshipMap.tsx en v0.2, cf. docs/ROADMAP.md).
 */
export default async function MapPage() {
  const communes = await prisma.commune.findMany({
    orderBy: [{ name: "asc" }],
    select: { name: true, slug: true, _count: { select: { routes: true } } },
  });

  const withRoutes = communes.filter((c) => c._count.routes > 0);
  const others = communes.filter((c) => c._count.routes === 0);

  return (
    <section className="section">
      <div className="container">
        <p className="kicker">CARTE</p>
        <h1 className="h2" style={{ fontSize: 44, margin: "12px 0 8px" }}>
          La carte des chemins
        </h1>
        <p className="body-muted" style={{ marginBottom: 40 }}>
          Sélectionnez une commune de la Xaintrie pour voir les itinéraires
          associés.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 14 }}>
          Communes avec itinéraires
        </h2>
        <ul
          style={{
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 12,
            marginBottom: 36,
          }}
        >
          {withRoutes.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/fr/routes#${c.slug}`}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                }}
              >
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span className="badge">{c._count.routes}</span>
              </Link>
            </li>
          ))}
        </ul>

        {others.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 10 }}>
              Autres communes de la Xaintrie
            </h2>
            <p className="body-muted" style={{ fontSize: 15 }}>
              {others.map((c) => c.name).join(" · ")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
