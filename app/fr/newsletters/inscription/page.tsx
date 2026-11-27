import type { Metadata } from "next";
import NewsletterForm from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "S'inscrire — Les nouvelles du sentier",
  description:
    "Inscription à la lettre des Chemins et Fontaines : prochaines sorties, nouveaux itinéraires et nouvelles de l'association.",
  alternates: { canonical: "/fr/newsletters/inscription" },
};

/**
 * Page d'inscription à la newsletter (bricole du 26/11, sobriété Framer
 * option A) : le bandeau de l'accueil ne porte PLUS QUE les deux boutons
 * « S'inscrire » / « Voir les archives » — le formulaire complet (double
 * opt-in interne, honeypot anti-spam) vit ici, à l'image du formulaire
 * hébergé Mailchimp de l'original Framer. Style de la page archives
 * (.nl-arc) : kicker, titre National Park, lead, formulaire centré.
 */
export default function NewsletterSignupPage() {
  return (
    <section className="nl-arc">
      <p className="nl-kicker">Newsletter</p>
      <h1 className="nl-h1">S&apos;inscrire aux nouvelles du sentier</h1>
      <p className="nl-lead">
        Recevez nos prochaines sorties, nos nouveaux itinéraires et les
        nouvelles de l&apos;association.
      </p>
      <NewsletterForm />
    </section>
  );
}
