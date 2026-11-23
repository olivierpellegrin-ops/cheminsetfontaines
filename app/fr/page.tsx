import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import NewsletterForm from "@/components/NewsletterForm";
import MembershipModal from "@/components/MembershipModal";
import GPXButton from "@/components/GPXButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  description: SITE.description,
};

type Ev = {
  slug: string;
  title: string;
  dateLabel: string;
  details: string;
  imageUrl: string | null;
};
type Rt = {
  slug: string;
  title: string;
  detailsRaw: string;
  townshipLabel: string;
  imageUrl: string | null;
};

export default async function HomePage() {
  // Q6 : home = les 3 derniers événements publiés, rafraîchis automatiquement.
  // Les brouillons n'apparaissent pas (comportement Framer).
  const events: Ev[] = await prisma.event.findMany({
    where: { status: "published" },
    orderBy: [{ sortDate: "desc" }],
    take: 3,
    select: {
      slug: true,
      title: true,
      dateLabel: true,
      details: true,
      imageUrl: true,
    },
  });

  const routes: Rt[] = await prisma.route.findMany({
    where: { status: "published" },
    orderBy: [{ createdAt: "asc" }],
    take: 3,
    select: {
      slug: true,
      title: true,
      detailsRaw: true,
      townshipLabel: true,
      imageUrl: true,
    },
  });

  return (
    <>
      {/* HERO — à l'identique Framer : photo de fond (composant « Introduction »,
          image framerusercontent PgAwvDzKwsXpUrrYpHZyKfslAw 1344x1008, height 600px,
          padding 120/72, kicker beige rgb(230,215,174)), texte blanc. */}
      <section
        className="hero-intro"
        style={{
          backgroundImage:
            "url(https://framerusercontent.com/images/PgAwvDzKwsXpUrrYpHZyKfslAw.png?width=1344&height=1008)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "var(--parchment)",
          minHeight: 600,
        }}
      >
        <p className="kicker" style={{ color: "rgb(230, 215, 174)", fontSize: 21, letterSpacing: "1.4px" }}>
            {SITE.kicker}
          </p>
          <h1 className="h1" style={{ margin: "16px 0 12px" }}>
            {SITE.name}
          </h1>
          <p style={{ fontSize: 20, maxWidth: 640, opacity: 0.92 }}>
            {SITE.baseline}
          </p>
      </section>

      {/* NOTRE MISSION */}
      <section className="section">
        <div className="container">
          <p className="kicker">NOTRE MISSION</p>
          <h2 className="h2" style={{ margin: "12px 0" }}>
            Préserver les sentiers, partager le vivant.
          </h2>
          <p className="body-muted" style={{ maxWidth: 720 }}>
            Chemins et Fontaines rassemble les marcheurs de Corrèze autour de
            randonnées attentives et de gestes concrets pour préserver les
            paysages, les sources et la biodiversité locale.
          </p>
        </div>
      </section>

      {/* PROCHAINES SORTIES */}
      <section className="section section-tint">
        <div className="container">
          <h2 className="h2" style={{ marginBottom: 8 }}>
            Prochaines sorties
          </h2>
          <p className="body-muted" style={{ marginBottom: 28 }}>
            Des rendez-vous ouverts à tous, au rythme des saisons.
          </p>
          <div className="section-grid">
            {events.map((e) => (
              <article key={e.slug} className="card">
                <div className="card-body">
                  <p className="card-meta" style={{ color: "var(--ochre)", fontWeight: 600 }}>
                    {e.dateLabel}
                  </p>
                  <h3 className="card-title" style={{ marginTop: 4 }}>
                    {e.title}
                  </h3>
                  <p className="card-meta">{e.details}</p>
                  <p style={{ marginTop: 12 }}>
                    <Link href="/fr/events" className="link-more">
                      Voir les sorties
                    </Link>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ITINÉRAIRES À TÉLÉCHARGER */}
      <section className="section">
        <div className="container">
          <h2 className="h2" style={{ marginBottom: 8 }}>
            Itinéraires à télécharger
          </h2>
          <p className="body-muted" style={{ marginBottom: 28 }}>
            Préparez votre prochaine marche avec nos traces GPX.
          </p>
          <div className="section-grid">
            {routes.map((r) => (
              <article key={r.slug} className="card">
                {r.imageUrl && (
                  <Link href={`/fr/routes/${r.slug}`} aria-label={r.title}>
                    <Image
                      src={r.imageUrl}
                      alt={r.title}
                      width={1200}
                      height={800}
                      className="card-image"
                    />
                  </Link>
                )}
                <div className="card-body">
                  <span className="badge">{r.townshipLabel}</span>
                  <h3 className="card-title" style={{ marginTop: 8 }}>
                    <Link href={`/fr/routes/${r.slug}`}>{r.title}</Link>
                  </h3>
                  <p className="card-meta">{r.detailsRaw}</p>
                  <p style={{ marginTop: 12 }}>
                    <GPXButton slug={r.slug} />
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SOUTENIR NOS CHEMINS */}
      <section className="section section-tint">
        <div
          className="container"
          style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr" }}
        >
          <div>
            <h2 className="h2" style={{ marginBottom: 8 }}>
              Soutenir nos chemins
            </h2>
            <p className="body-muted" style={{ maxWidth: 640 }}>
              Vos dons financent le balisage, l&apos;entretien des sentiers et
              nos actions de sensibilisation à la nature.
            </p>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link className="btn btn-ochre" href="/fr/dons">
              Faites un don à l&apos;association
            </Link>
          </div>

          {/* DEVENIR ADHÉRENT (modale, aucune page dédiée — Q3) */}
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 8 }}>
              Devenir adhérent
            </h3>
            <p className="body-muted" style={{ maxWidth: 640, marginBottom: 12 }}>
              Rejoignez une communauté qui marche et agit, toute l&apos;année.
            </p>
            <MembershipModal label="Adhérer à l'association" />
          </div>
        </div>
      </section>

      {/* LES NOUVELLES DU SENTIER */}
      <section className="section">
        <div className="container" style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr" }}>
          <div>
            <h2 className="h2" style={{ marginBottom: 8 }}>
              Les nouvelles du sentier
            </h2>
            <p className="body-muted" style={{ marginBottom: 20 }}>
              Recevez nos prochaines sorties, nos nouveaux itinéraires et les
              nouvelles de l&apos;association.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
