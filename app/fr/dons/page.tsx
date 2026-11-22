import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dons",
  description:
    "Votre don fait vivre les chemins : balisage, entretien des sentiers et actions locales pour préserver la biodiversité.",
  alternates: { canonical: "/fr/dons" },
};

export default function DonationsPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="kicker">SOUTENIR L&apos;ASSOCIATION</p>
        <h1 className="h2" style={{ fontSize: 44, margin: "12px 0 12px" }}>
          Votre don fait vivre les chemins.
        </h1>
        <p className="body-muted" style={{ maxWidth: 640 }}>
          Chaque contribution finance le balisage, l&apos;entretien de nos
          sentiers et nos actions locales pour préserver la biodiversité.
        </p>

        <div
          className="section-tint"
          style={{ borderRadius: "var(--radius)", padding: 28, margin: "36px 0" }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 14 }}>
            Votre soutien en action
          </h2>
          <ul style={{ listStyle: "none", display: "grid", gap: 10 }}>
            <li>• Balisage et entretien des itinéraires</li>
            <li>• Protection des sources et des paysages</li>
            <li>• Sorties nature ouvertes à tous</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 10 }}>
            Faire un don par carte bancaire
          </h2>
          <p className="body-muted" style={{ marginBottom: 18 }}>
            Paiement sécurisé par Stripe
          </p>
          <a
            className="btn btn-ochre"
            href={SITE.stripeDonationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Faire un don
          </a>
        </div>
      </div>
    </section>
  );
}
