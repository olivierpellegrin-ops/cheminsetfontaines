import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

// nodemailer >= 8 embarque ses propres types ; l'instance de transport
// s'obtient par inférence (le type « Transporter » historique n'est plus exporté).
type MailTransport = ReturnType<typeof nodemailer.createTransport>;

/**
 * MailService — brique N0 « Remplacement Mailchimp » (spec du 25/11/2026).
 *
 * Émission SMTP depuis la mailbox contact@cheminsetfontaines.fr (Gandi),
 * journal de chaque envoi dans EmailOutbox (statuts queued/sent/failed/skipped).
 * Ne lève JAMAIS d'exception : un échec d'e-mail ne doit pas faire échouer
 * l'enregistrement applicatif (formulaires publics).
 *
 * Environnements :
 * - local : Mailpit du docker-compose (SMTP localhost:1025, UI :8025) ;
 * - production : SMTP de la mailbox Gandi (paramètres dans docs/SECRETS.md) ;
 * - CI / SMTP_HOST absent : l'envoi est ignoré et journalisé « skipped ».
 *
 * Plan B délivrabilité (décision D1) : un relais SMTP se branche ici en ne
 * changeant QUE les variables SMTP_* de l'environnement, aucun appel à modifier.
 */

/** Types d'e-mails émis (catalogue spec §5.3, enrichi par les briques N1+). */
export type MailKind = "contact_notification";

export interface SendMailInput {
  kind: MailKind;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  subscriberId?: string;
  memberId?: string;
  newsletterId?: string;
}

export type SendMailResult =
  | { status: "sent"; id: string }
  | { status: "failed"; id: string; error: string }
  | { status: "skipped"; id: string };

/** Emis par : le site uniquement, via la mailbox de l'association. */
function fromAddress(): string {
  return (process.env.MAIL_FROM ?? "contact@cheminsetfontaines.fr").trim();
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function getTransport(): MailTransport {
  const g = globalThis as unknown as { __cfMailTransport?: MailTransport };
  if (g.__cfMailTransport) return g.__cfMailTransport;

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim() ?? "";

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // sinon STARTTLS (587, Mailpit inclus)
    ...(user ? { auth: { user, pass: process.env.SMTP_PASS ?? "" } } : {}),
  });
  g.__cfMailTransport = transport;
  return transport;
}

function errorText(err: unknown): string {
  const msg =
    err instanceof Error
      ? `${err.name} : ${err.message}`
      : typeof err === "string"
        ? err
        : JSON.stringify(err);
  return msg.slice(0, 500);
}

/**
 * Enregistre l'envoi dans EmailOutbox puis tente l'émission SMTP.
 * Toujours résolu (jamais rejeté) : le résultat porte le statut.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const row = await prisma.emailOutbox.create({
    data: {
      kind: input.kind,
      toEmail: input.to,
      subject: input.subject,
      ...(input.subscriberId ? { subscriberId: input.subscriberId } : {}),
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.newsletterId ? { newsletterId: input.newsletterId } : {}),
    },
  });

  if (!isMailConfigured()) {
    await prisma.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: "skipped",
        error: "SMTP_HOST absent : envoi non configuré (voir docs/SECRETS.md)",
      },
    });
    console.warn(
      `[mail] SMTP non configuré : « ${input.kind} » vers ${input.to} ignoré (outbox ${row.id})`
    );
    return { status: "skipped", id: row.id };
  }

  try {
    await getTransport().sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? undefined,
      replyTo: input.replyTo,
      headers: input.headers,
    });
    await prisma.emailOutbox.update({
      where: { id: row.id },
      data: { status: "sent", sentAt: new Date(), attempts: { increment: 1 } },
    });
    return { status: "sent", id: row.id };
  } catch (err) {
    const error = errorText(err);
    await prisma.emailOutbox.update({
      where: { id: row.id },
      data: { status: "failed", error, attempts: { increment: 1 } },
    });
    console.error(`[mail] Échec « ${input.kind} » vers ${input.to} : ${error}`);
    return { status: "failed", id: row.id, error };
  }
}
