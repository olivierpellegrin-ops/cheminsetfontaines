import type { Metadata } from "next";
import Link from "next/link";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendSubscriberWelcome } from "@/lib/mail/notifications";

export const dynamic = "force-dynamic";

// Page à jeton : jamais indexée, jamais suivant les liens.
export const metadata: Metadata = {
  title: "Confirmation de votre inscription",
  robots: { index: false, follow: false },
};

/**
 * Validation du lien de confirmation du double opt-in (spec §5.2, brique N1).
 * Le jeton est à usage unique et valable 30 jours après l'envoi de l'e-mail
 * (lastEmailAt). Le clic marque confirmedAt, passe le souscripteur en
 * subscribed et déclenche l'e-mail de bienvenue (non bloquant).
 * Aucune donnée personnelle dans l'URL : uniquement le jeton aléatoire.
 */

const CONFIRM_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

type Outcome = { heading: string; body: string; ok: boolean };

async function confirm(token: string): Promise<Outcome> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { confirmToken: token },
  });
  if (!subscriber) {
    return {
      ok: false,
      heading: "Lien introuvable",
      body: "Ce lien de confirmation est invalide ou a déjà été utilisé. Si vous venez de vous inscrire, vérifiez l'e-mail reçu : il contient le bon lien. Vous pouvez aussi relancer une inscription depuis la page d'accueil.",
    };
  }
  if (subscriber.status === "subscribed") {
    return {
      ok: true,
      heading: "Inscription déjà confirmée",
      body: "Votre inscription aux nouvelles du sentier est déjà active. Rien à faire : vous recevrez la lettre d'informations le 1er de chaque mois.",
    };
  }
  if (
    subscriber.lastEmailAt &&
    Date.now() - subscriber.lastEmailAt.getTime() > CONFIRM_VALIDITY_MS
  ) {
    return {
      ok: false,
      heading: "Lien expiré",
      body: "Ce lien de confirmation n'est plus valable (validité de 30 jours). Relancez simplement votre inscription depuis la page d'accueil : un nouvel e-mail de confirmation vous sera envoyé.",
    };
  }

  const unsubToken = subscriber.unsubToken ?? randomBytes(32).toString("hex");
  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "subscribed",
      confirmedAt: new Date(),
      confirmToken: null,
      unsubToken,
    },
  });

  // E-mail n°6 (spec §5.3) : bienvenue. Non bloquant : l'inscription est
  // confirmée même si l'envoi échoue (il reste l'archive + le bureau).
  try {
    await sendSubscriberWelcome({
      subscriberId: subscriber.id,
      to: subscriber.email,
      firstName: subscriber.firstName,
    });
  } catch (err) {
    console.error("[mail] envoi de la bienvenue impossible :", err);
  }

  return {
    ok: true,
    heading: "C'est confirmé, merci !",
    body: "Votre inscription aux nouvelles du sentier est bien enregistrée. Vous recevrez notre lettre d'informations une fois par mois, le 1er de chaque mois. En attendant, les anciennes éditions vous attendent dans les archives.",
  };
}

export default async function ConfirmationPage({
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
        body: "Aucun lien de confirmation n'a été fourni. Reprenez l'e-mail reçu et cliquez sur le bouton « Confirmer mon inscription ».",
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
          <Link href="/fr/newsletters" className="btn btn-ochre">
            Voir les archives
          </Link>
        )}
      </div>
    </section>
  );
}
