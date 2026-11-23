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

      {/* NOTRE MISSION — « About Us » Framer : 2 colonnes, logo à gauche
          (carte blanche 428x258), texte à droite (kicker 33px ochre). */}
      <section>
        <div className="about-columns">
          <div className="about-logo-card">
            <Image
              src="https://framerusercontent.com/images/08OWyE53wBlq7B9DrXOKRkUsnE.png"
              alt="Logo de l'association Chemins et Fontaines, Bassignac-le-Haut"
              width={1800}
              height={1200}
              className="about-logo"
            />
          </div>
          <div className="about-text">
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 33,
                fontWeight: 600,
                letterSpacing: "1.2px",
                color: "rgb(193, 138, 33)",
                margin: 0,
              }}
            >
              NOTRE MISSION
            </p>
            <h2 className="h2" style={{ margin: 0 }}>
              Préserver les sentiers, partager le vivant.
            </h2>
            <p className="body-muted" style={{ margin: 0 }}>
              Chemins et Fontaines rassemble les marcheurs de Corrèze autour de
              randonnées attentives et de gestes concrets pour préserver les
              paysages, les sources et la biodiversité locale.
            </p>
          </div>
        </div>
      </section>

      {/* PROCHAINES SORTIES — wrapper Framer « Events » (.framer-14zj7ct) :
          max 1080 CENTRÉ, fond blanc, padding 22/72 (64/48 tablette),
          colonne gap 24, h2 = lien ; grille 3 colonnes gap 16 ;
          Hike Card (.framer-kd1vos) blanche, bordure #d9ded5, radius 16,
          padding 16, gap 8, SANS lien ni image. */}
      <section className="home-wrap home-wrap--events">
        <h2 className="h2" style={{ margin: 0 }}>
          <Link href="/fr/events">Prochaines sorties</Link>
        </h2>
        <p className="body-muted" style={{ margin: 0 }}>
          Des rendez-vous ouverts à tous, au rythme des saisons.
        </p>
        <div className="home-grid">
          {events.map((e) => (
            <article key={e.slug} className="hike-card">
              <p className="hike-date">{e.dateLabel}</p>
              <h3 className="hike-title">{e.title}</h3>
              <p className="hike-desc">{e.details}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ITINÉRAIRES À TÉLÉCHARGER — wrapper Framer « Routes »
          (.framer-2jlug8) : padding 30/72, h2 = lien ;
          Route Download Card (.framer-8coc2z) : fond #e8eee4,
          bordure #d2dccb, radius 14, padding 16, gap 8 ; image pleine
          largeur .framer-qdtoyc height 150 radius 10 ; GPX button
          (.framer-1i8uyt4) bg #e8eee4 radius 10 ; township moss. */}
      <section className="home-wrap">
        <h2 className="h2" style={{ margin: 0 }}>
          <Link href="/fr/routes">Itinéraires à télécharger</Link>
        </h2>
        <p className="body-muted" style={{ margin: 0 }}>
          Préparez votre prochaine marche avec nos traces GPX.
        </p>
        <div className="home-grid">
          {routes.map((r) => (
            <article key={r.slug} className="route-card">
              {r.imageUrl && (
                <Link href={"/fr/routes/" + r.slug} aria-label={r.title} className="route-img">
                  <Image
                    src={r.imageUrl}
                    alt={r.title}
                    width={1200}
                    height={800}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Link>
              )}
              <h3 className="route-title">
                <Link href={"/fr/routes/" + r.slug}>{r.title}</Link>
              </h3>
              <p className="route-desc">{r.detailsRaw}</p>
              <GPXButton slug={r.slug} />
              {r.townshipLabel && <p className="route-town">{r.townshipLabel}</p>}
            </article>
          ))}
        </div>
      </section>

      {/* SOUTENIR NOS CHEMINS + DEVENIR ADHÉRENT — wrapper Framer
          « Funds & Membership » (.framer-1wwb8ye) : bandeau MOSS #4d6b4b,
          max 1080 centré, padding 72, gap 48 (28/48 tablette, 20/32 colonne
          mobile). Carte dons (.framer-5cqewx) : photo BsraFx… en fond +
          voile #0c261c8f (.framer-1irbqt6), titre 30px blanc = lien,
          bouton ochre (.framer-1m9feh4). Carte adhésion (.framer-khbiqw) :
          parchemin #f4f1e8, radius 16, padding 26, titre 24px #163c32,
          texte 15px #43534A, bouton ochre (.framer-1y256fi). */}
      <section className="funds-band">
        <div
          className="funds-card"
          style={{
            backgroundImage:
              "url(https://framerusercontent.com/images/BsraFx20t9LcEEnbZKrl8cCqCMU.png?width=1344&height=1008)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="funds-overlay" aria-hidden />
          <h2 className="funds-title">
            <Link href="/fr/dons">Soutenir nos chemins</Link>
          </h2>
          <p className="funds-text">
            Vos dons financent le balisage, l&apos;entretien des sentiers et
            nos actions de sensibilisation à la nature.
          </p>
          <Link href="/fr/dons" className="btn btn-ochre btn-sm">
            Faites un don à l&apos;association
          </Link>
        </div>
        <div className="member-card">
          <h3 className="member-title">Devenir adhérent</h3>
          <p className="member-text">
            Rejoignez une communauté qui marche et agit, toute l&apos;année.
          </p>
          <MembershipModal label="Adhérer à l'association" />
        </div>
      </section>

      {/* LES NOUVELLES DU SENTIER — wrapper Framer « Newsletter »
          (.framer-1srut8z) : bandeau FOREST #163c32, max 1080 centré,
          padding 64/72 (56/24 mobile), align-items center, gap 18 ;
          titre 34px blanc, texte 17px #F4F1E8, boutons ochre pill. */}
      <section className="news-band">
        <h2 className="news-title">Les nouvelles du sentier</h2>
        <p className="news-lead">
          Recevez nos prochaines sorties, nos nouveaux itinéraires et les
          nouvelles de l&apos;association.
        </p>
        <NewsletterForm dark />
      </section>
    </>
  );
}
