import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Écrivez à l'association Chemins et Fontaines — Bassignac-Le-Haut, Corrèze.",
  alternates: { canonical: "/fr/contact" },
};

export default function ContactPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <p className="kicker">CONTACT</p>
        <h1 className="h2" style={{ fontSize: 44, margin: "12px 0 8px" }}>
          Nous écrire
        </h1>
        <p className="body-muted" style={{ marginBottom: 32 }}>
          Bassignac-Le-Haut, Corrèze, France · Retrouvez-nous pour votre
          prochaine randonnée.
        </p>

        <ContactForm />

        <p className="body-muted" style={{ marginTop: 32, fontSize: 15 }}>
          Bassignac-Le-Haut · Corrèze · France
          <br />
          <a href={`mailto:${SITE.contactEmail}`} className="link-more">
            {SITE.contactEmail}
          </a>
        </p>
      </div>
    </section>
  );
}
