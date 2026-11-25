import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Page à jeton : jamais indexée, jamais suivant les liens.
export const metadata: Metadata = {
  title: "Confirmation de votre demande d'adhésion",
  robots: { index: false, follow: false },
};

/**
 * Validation du lien de confirmation de la demande d'adhésion (spec §5.1,
 * brique N2). Le jeton est à usage unique et valable 30 jours après
 * l'envoi de l'e-mail (lastEmailAt). Le clic marque confirmedAt ; la
 * création du membre et l'e-mail de bienvenue attendent la validation
 * de la cotisation par le bureau (/admin/members).
 * Aucune donnée personnelle dans l'URL : uniquement le jeton aléatoire.
 */

const CONFIRM_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

type Outcome = { heading: string; body: string; ok: boolean };

async function confirm(token: string): Promise<Outcome> {
  const request = await prisma.membershipRequest.findUnique({
    where: { confirmToken: token },
  });
  if (!request) {
    return {
      ok: false,
      heading: "Lien introuvable",
      body: "Ce lien de confirmation est invalide ou a déjà été utilisé. Si vous venez de demander votre adhésion, vérifiez l'e-mail reçu : il contient le bon lien. Vous pouvez aussi relancer une demande depuis la page d'accueil.",
    };
  }
  if (request.confirmedAt) {
    return {
      ok: true,
      heading: "Demande déjà confirmée",
      body: "Votre demande d'adhésion est déjà confirmée : le bureau en a été prévenu et finalisera votre adhésion à réception de la cotisation. Merci pour votre patience !",
    };
  }
  if (
    request.lastEmailAt &&
    Date.now() - request.lastEmailAt.getTime() > CONFIRM_VALIDITY_MS
  ) {
    return {
      ok: false,
      heading: "Lien expiré",
      body: "Ce lien de confirmation n'est plus valable (validité de 30 jours). Relancez simplement votre demande depuis la page d'accueil : un nouvel e-mail de confirmation vous sera envoyé.",
    };
  }

  await prisma.membershipRequest.update({
    where: { id: request.id },
    data: { confirmedAt: new Date(), confirmToken: null },
  });

  return {
    ok: true,
    heading: "C'est confirmé, merci !",
    body: "Votre adresse e-mail est validée et le bureau a été prévenu : votre adhésion sera finalisée à réception de la cotisation (chèque, virement ou espèces). Vous recevrez alors un e-mail de bienvenue.",
  };
}

export default async function AdhesionConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const outcome: Outcome = token
    ? await confirm(token)
    : {
        ok: false,
        heading: "Lien introuvable",
        body: "Aucun lien de confirmation n'a été fourni. Reprenez l'e-mail reçu et cliquez sur le bouton « Confirmer mon adresse e-mail ».",
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
        Adhésion
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
