import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Page à jeton : jamais indexée, jamais suivant les liens.
export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

/**
 * Désinscription en 1 clic, sans identification ni mot de passe
 * (spec §5.2, brique N1). Le lien vient de l'e-mail (unsubToken unique) ;
 * le clic passe le souscripteur en unsubscribed et invalide les jetons.
 * Une même adresse peut re-souscrire plus tard (elle repassera par le
 * double opt-in de confirmation).
 */

type Outcome = { heading: string; body: string; ok: boolean };

async function unsubscribe(token: string): Promise<Outcome> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { unsubToken: token },
  });
  if (!subscriber) {
    return {
      ok: false,
      heading: "Lien introuvable",
      body: "Ce lien de désinscription est invalide ou a déjà été utilisé. Si vous recevez encore nos e-mails, écrivez-nous à contact@cheminsetfontaines.fr et nous vous retirerons de la liste.",
    };
  }
  if (subscriber.status === "unsubscribed") {
    return {
      ok: true,
      heading: "Vous êtes déjà désinscrit",
      body: "Cette adresse ne recevra plus la lettre d'informations. Bonne route de notre côté !",
    };
  }
  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { status: "unsubscribed", confirmToken: null, unsubToken: null },
  });
  return {
    ok: true,
    heading: "C'est noté, à bientôt",
    body: "Vous ne recevrez plus la lettre d'informations du sentier. Nous espérons vous recroiser sur les chemins ou lors de nos sorties : vous serez toujours bienvenu.",
  };
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const outcome: Outcome = token
    ? await unsubscribe(token)
    : {
        ok: false,
        heading: "Lien introuvable",
        body: "Aucun lien de désinscription n'a été fourni. Utilisez le lien présent dans l'e-mail reçu, ou écrivez-nous à contact@cheminsetfontaines.fr.",
      };

  return (
    <section
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "96px 24px 120px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--moss, #587551)",
        }}
      >
        Nouvelles du sentier
      </p>
      <h1 style={{ margin: "0 0 16px" }}>{outcome.heading}</h1>
      <p
        style={{
          margin: "0 auto 32px",
          maxWidth: 560,
          fontSize: 16,
          lineHeight: 1.55,
          color: "var(--forest-soft, #43534a)",
        }}
      >
        {outcome.body}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/fr" className="btn btn-ochre">
          Retour à l&apos;accueil
        </Link>
        {outcome.ok && (
          <Link href="/fr/events" className="btn btn-ochre">
            Voir nos sorties
          </Link>
        )}
      </div>
    </section>
  );
}
