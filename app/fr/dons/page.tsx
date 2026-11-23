import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dons",
  description:
    "Votre don fait vivre les chemins : balisage, entretien des sentiers et actions locales pour préserver la biodiversité.",
  alternates: { canonical: "/fr/dons" },
};

/** Page Dons « Donation Content » (.framer-c5b806) reproduite à l'identique.
 *  Relevés HTTrack 23/11/2026 : colonne max 780 centrée, gap 28,
 *  padding 112px 72px (mobile 72px 24px), kicker 13px/600 ls 1.2px
 *  ochre, titre National Park 46px/700 lh 1.08em, lead 17px ls
 *  -0.02em lh 1.55 #43534A, carte impact #4d6b4b radius 16 padding 28
 *  gap 12 (titre 24px blanc, puces 16px lh 1.55 parchemin), bouton
 *  Stripe #c18a21 radius 100px padding 15/24 (texte #163C32 600),
 *  note « Paiement sécurisé par Stripe » 13px centrée. */
export default function DonationsPage() {
  return (
    <section className="dons-wrap">
      <p className="dons-kicker">SOUTENIR L&apos;ASSOCIATION</p>
      <h1 className="dons-title">Votre don fait vivre les chemins.</h1>
      <p className="dons-lead">
        Chaque contribution finance le balisage, l&apos;entretien de nos sentiers
        et nos actions locales pour préserver la biodiversité.
      </p>

      <div className="dons-impact">
        <h2 className="dons-impact-title">Votre soutien en action</h2>
        <p className="dons-impact-list">
          • Balisage et entretien des itinéraires
          <br />
          • Protection des sources et des paysages
          <br />
          • Sorties nature ouvertes à tous
        </p>
      </div>

      <a
        className="dons-btn"
        href={SITE.stripeDonationUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Faire un don par carte bancaire
      </a>
      <p className="dons-note">Paiement sécurisé par Stripe</p>
    </section>
  );
}
