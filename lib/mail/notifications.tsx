import { render } from "@react-email/render";
import { ContactNotification } from "@/emails/contact-notification";
import { NlConfirmation } from "@/emails/nl-confirmation";
import { NlWelcome } from "@/emails/nl-welcome";
import { AdhesionBienvenue } from "@/emails/adhesion-bienvenue";
import { AdhesionConfirmation } from "@/emails/adhesion-confirmation";
import { AdhesionNotifBureau } from "@/emails/adhesion-notif-bureau";
import { AdhesionRenouvellement } from "@/emails/adhesion-renouvellement";
import { SITE } from "@/lib/site";
import { sendMail, type SendMailResult } from "./service";

/**
 * Notifications transactionnelles (briques N0-N2). Chaque notification vit
 * ici : gabarit React Email dans emails/ + une fonction qui rend et envoie.
 *
 * Brique N2 (spec §5.1/§5.3) : parcours e-mails des adhérents — confirmation
 * de demande à jeton (30 jours), fiche complète au bureau, bienvenue quand
 * la cotisation est validée, rappel de renouvellement saisonnier (garde
 * 30 jours par membre). Aucune donnée personnelle dans les URL : uniquement
 * des jetons aléatoires à usage unique.
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

function membershipConfirmationUrl(token: string): string {
  return `${emailBaseUrl()}/fr/adhesion/confirmation?token=${token}`;
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

/**
 * E-mail « adhesion_confirmation » (spec §5.3) : récapitulatif de la demande
 * + lien de confirmation à usage unique valable 30 jours (spec §5.1).
 */
export async function sendMembershipConfirmation(input: {
  to: string;
  firstName: string | null;
  lastName: string | null;
  civilite: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  confirmToken: string;
}): Promise<SendMailResult> {
  const name = [input.civilite, input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ");
  const fullAddress = [input.address, input.postalCode, input.city, input.country]
    .filter(Boolean)
    .join(", ");
  const recap = [
    ...(name ? [{ label: "Nom", value: name }] : []),
    ...(fullAddress ? [{ label: "Adresse", value: fullAddress }] : []),
  ];
  const element = (
    <AdhesionConfirmation
      firstName={input.firstName}
      lastName={input.lastName}
      confirmUrl={membershipConfirmationUrl(input.confirmToken)}
      recap={recap}
    />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "adhesion_confirmation",
      to: input.to,
      subject: "Confirmez votre demande d'adhésion",
      html,
      text,
    });
  } catch (err) {
    console.error("[mail] Rendu de adhesion_confirmation impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}

/**
 * E-mail « adhesion_notif_bureau » (spec §5.3) : fiche complète de la
 * demande au bureau (NOTIFY_EMAIL), Reply-To le demandeur.
 */
export async function sendMembershipBureauNotification(input: {
  email: string;
  civilite: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  phone: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  newsletter: boolean;
  photoConsent: boolean;
  requestedAt: Date;
}): Promise<SendMailResult> {
  const name = [input.civilite, input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ");
  const fullAddress = [input.address, input.postalCode, input.city, input.country]
    .filter(Boolean)
    .join(", ");
  const requestedLabel = input.requestedAt.toLocaleDateString("fr-FR");
  const rows = [
    { label: "Nom", value: name || "—" },
    { label: "E-mail", value: input.email },
    { label: "Téléphone", value: input.phone || "—" },
    { label: "Adresse", value: fullAddress || "—" },
    { label: "Nouvelles du sentier", value: input.newsletter ? "oui" : "non" },
    { label: "Droit à l'image", value: input.photoConsent ? "oui" : "non" },
    { label: "Demande enregistrée le", value: requestedLabel },
  ];
  const element = (
    <AdhesionNotifBureau
      rows={rows}
      adminUrl={`${emailBaseUrl()}/admin/members`}
    />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "adhesion_notif_bureau",
      to: SITE.notifyEmail,
      replyTo: input.email,
      subject: `Demande d'adhésion : ${name || input.email}`,
      html,
      text,
    });
  } catch (err) {
    console.error("[mail] Rendu de adhesion_notif_bureau impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}

/**
 * E-mail « adhesion_bienvenue » (spec §5.3) : envoyé quand le bureau valide
 * la cotisation (création du membre, saison en cours).
 */
export async function sendMemberWelcome(input: {
  memberId: string;
  to: string;
  firstName?: string | null;
  season: number;
}): Promise<SendMailResult> {
  const element = (
    <AdhesionBienvenue
      firstName={input.firstName}
      season={input.season}
      siteUrl={emailBaseUrl()}
    />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "adhesion_bienvenue",
      to: input.to,
      subject: `Bienvenue aux Chemins et Fontaines (saison ${input.season})`,
      html,
      text,
      memberId: input.memberId,
    });
  } catch (err) {
    console.error("[mail] Rendu de adhesion_bienvenue impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}

/**
 * E-mail « adhesion_renouvellement » (spec §5.3) : rappel de renouvellement
 * de la cohorte « à renouveler », déclenché par le bureau. Garde 30 jours
 * assurée par l'appelant (Member.lastReminderAt).
 */
export async function sendRenewalReminder(input: {
  memberId: string;
  to: string;
  firstName?: string | null;
  season: number;
}): Promise<SendMailResult> {
  const element = (
    <AdhesionRenouvellement
      firstName={input.firstName}
      season={input.season}
      siteUrl={emailBaseUrl()}
    />
  );
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return sendMail({
      kind: "adhesion_renouvellement",
      to: input.to,
      subject: `Votre adhésion pour la saison ${input.season}`,
      html,
      text,
      memberId: input.memberId,
    });
  } catch (err) {
    console.error("[mail] Rendu de adhesion_renouvellement impossible :", err);
    return { status: "failed", id: "", error: String(err).slice(0, 500) };
  }
}
