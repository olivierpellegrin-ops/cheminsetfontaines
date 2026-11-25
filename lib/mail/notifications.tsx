import { render } from "@react-email/render";
import { ContactNotification } from "@/emails/contact-notification";
import { NlConfirmation } from "@/emails/nl-confirmation";
import { NlWelcome } from "@/emails/nl-welcome";
import { SITE } from "@/lib/site";
import { sendMail, type SendMailResult } from "./service";

/**
 * Notifications transactionnelles (briques N0-N1). Chaque nouvelle
 * notification (N2 : e-mails adhérents) vit ici : gabarit React Email dans
 * emails/ + une fonction qui rend et envoie.
 *
 * Brique N1 : liens de confirmation et de bienvenue du double opt-in
 * souscripteurs (spec §5.2). Aucune donnée personnelle dans les URL :
 * uniquement un jeton aléatoire à usage unique.
 */

const CONTACT_URL = SITE.baseUrl + "/fr/contact";

/**
 * Base des liens cliquables des e-mails : URL publique réelle du site,
 * surchargeable en local (APP_BASE_URL) pour que les liens attestés dans
 * Mailpit pointent vers le serveur de dev (http://localhost:3000) et que
 * le parcours double opt-in soit testable de bout en bout.
 */
export function emailBaseUrl(): string {
  const base = process.env.APP_BASE_URL?.trim() || SITE.baseUrl;
  return base.replace(/\/+$/, "");
}

function confirmationUrl(token: string): string {
  return `${emailBaseUrl()}/fr/newsletters/confirmation?token=${token}`;
}

/** E-mail n°1 (spec §5.3) : prévient le bureau d'un message de contact. */
export async function notifyContactMessage(input: {
  name: string;
  email: string;
  message: string;
}): Promise<SendMailResult> {
  const receivedAt = new Date();
  const element = (
    <ContactNotification
      name={input.name}
      email={input.email}
      message={input.message}
      receivedAt={receivedAt}
      contactUrl={CONTACT_URL}
    />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "contact_notification",
      to: SITE.notifyEmail,
      replyTo: input.email,
      subject: `Message du site : ${input.name}`,
      html,
      text,
    });
  } catch (err) {
    // Rendu impossible : ne jamais bloquer le parcours du visiteur.
    console.error("[mail] Rendu de contact_notification impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}

/**
 * E-mail n°5 (spec §5.3) : la demande de confirmation du double opt-in,
 * envoyée à chaque demande d'inscription (formulaire ou renvoi admin).
 */
export async function sendSubscriberConfirmation(input: {
  subscriberId: string;
  to: string;
  firstName?: string | null;
  confirmToken: string;
}): Promise<SendMailResult> {
  const element = (
    <NlConfirmation
      firstName={input.firstName}
      confirmUrl={confirmationUrl(input.confirmToken)}
    />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "nl_confirmation",
      to: input.to,
      subject: "Confirmez votre inscription aux nouvelles du sentier",
      html,
      text,
      subscriberId: input.subscriberId,
    });
  } catch (err) {
    console.error("[mail] Rendu de nl_confirmation impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}

/**
 * E-mail n°6 (spec §5.3) : la bienvenue envoyée juste après le clic de
 * confirmation, avec le lien direct vers la dernière archive.
 */
export async function sendSubscriberWelcome(input: {
  subscriberId: string;
  to: string;
  firstName?: string | null;
}): Promise<SendMailResult> {
  const archiveUrl = `${emailBaseUrl()}/fr/newsletters`;
  const element = (
    <NlWelcome firstName={input.firstName} archiveUrl={archiveUrl} />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "nl_bienvenue",
      to: input.to,
      subject: "Bienvenue dans les nouvelles du sentier",
      html,
      text,
      subscriberId: input.subscriberId,
    });
  } catch (err) {
    console.error("[mail] Rendu de nl_bienvenue impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}
