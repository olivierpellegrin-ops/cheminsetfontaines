import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Écrivez à l'association Chemins et Fontaines — Bassignac-Le-Haut, Corrèze.",
  alternates: { canonical: "/fr/contact" },
};

/**
 * Page Contact à l'identique du site Framer original (copie HTTrack
 * fr/contact.html) :
 * - conteneur .framer-w1pip : fond #163c32 pleine page, max-width 1080,
 *   empilement gap 24px, padding 24px 72px (mobile : 56px 24px) ;
 * - titre « Nous écrire » : National Park 38px/700, hauteur 1.1em,
 *   blanc (pas de kicker dans l'original) ;
 * - sous-titre : Fira Sans 17px, hauteur 1.5em, #F4F1E8 ;
 * - carte formulaire : fond #f4f1e8, radius 16, padding 24, gap 12 ;
 * - bloc localisation .framer-1hr20p : fond #587551, radius 14,
 *   padding 20, gap 14, icône épingle parchemin 28px (SVG d'origine
 *   repris tel quel) + texte blanc semibold 16px.
 */
export default function ContactPage() {
  return (
    <section className="contact-page" aria-label="Contact">
      <div className="contact-container">
        <h1 className="contact-title">Nous écrire</h1>
        <p className="contact-subtitle">
          Bassignac-Le-Haut, Corrèze, France · Retrouvez-nous pour votre
          prochaine randonnée.
        </p>

        <ContactForm />

        <div className="contact-location">
          <svg className="contact-location-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M 16 8 C 16 12.993 10.461 18.193 8.601 19.799 C 8.245 20.067 7.755 20.067 7.399 19.799 C 5.539 18.193 0 12.993 0 8 C 0 3.582 3.582 0 8 0 C 12.418 0 16 3.582 16 8"
              transform="translate(4 2)"
            />
            <path d="M 0 2 L 2 4 L 6 0" transform="translate(9 8)" />
          </svg>
          <p className="contact-location-text">
            Bassignac-Le-Haut · Corrèze · France
          </p>
        </div>
      </div>
    </section>
  );
}
