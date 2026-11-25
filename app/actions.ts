"use server";

import { prisma } from "@/lib/prisma";
import { notifyContactMessage } from "@/lib/mail/notifications";
import { SITE } from "@/lib/site";

/**
 * v0.1 : les soumissions sont persistées localement (source de vérité).
 * Chantier « Remplacement Mailchimp » (spec du 25/11/2026, décisions D1-D6
 * actées : développement interne, PAS de SaaS emailing) :
 * - N0 (cette brique) : sendMessage notifie le bureau via le MailService
 *   interne (SMTP de la mailbox Gandi, journal EmailOutbox).
 * - N1 : double opt-in souscripteurs (TODO ci-dessous).
 * - N2 : parcours e-mails des adhérents (TODO ci-dessous).
 */

export type FormState = { ok: boolean; message: string };

function isSpam(honeypot: FormDataEntryValue | null): boolean {
  return typeof honeypot === "string" && honeypot.trim() !== "";
}

export async function subscribe(
  _prev: FormState | null,
  formData: FormData
): Promise<FormState> {
  if (isSpam(formData.get("website"))) {
    return { ok: true, message: "Merci ! Votre inscription est enregistrée." };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim() || null;
  const lastName = String(formData.get("lastName") ?? "").trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Merci de saisir une adresse e-mail valide." };
  }

  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing && existing.status === "subscribed") {
    return { ok: true, message: "Vous êtes déjà inscrit aux nouvelles du sentier." };
  }

  await prisma.subscriber.upsert({
    where: { email },
    create: { email, firstName, lastName, status: "pending", source: "formulaire" },
    update: { firstName, lastName, status: "pending" },
  });

  // TODO(N1) : e-mail de double opt-in (lien de confirmation, Subscriber
  // pending -> subscribed, spec §5.2) via lib/mail/notifications.

  return {
    ok: true,
    message: "Merci ! Votre inscription est enregistrée. Vous recevrez notre lettre d'informations tous les 1er de chaque mois.",
  };
}

export async function requestMembership(
  _prev: FormState | null,
  formData: FormData
): Promise<FormState> {
  // Honeypots repris de la modale Framer (« website » et « company »)
  if (isSpam(formData.get("website")) || isSpam(formData.get("company"))) {
    return { ok: true, message: "Merci ! Votre demande est enregistrée." };
  }
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const email = (get("email") ?? "").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Merci de saisir une adresse e-mail valide." };
  }

  await prisma.membershipRequest.create({
    data: {
      civilite: get("civilite"),
      firstName: get("firstName"),
      lastName: get("lastName"),
      address: get("address"),
      email,
      phone: get("phone"),
      postalCode: get("postalCode"),
      city: get("city"),
      country: get("country"),
    },
  });

  // TODO(N2) : e-mail de confirmation de demande à l'adhérent + notification
  // du bureau à NOTIFY_EMAIL (parcours adhérents, spec §5.1).

  return {
    ok: true,
    message: "Merci ! Votre demande d'adhésion a bien été envoyée. Nous vous recontacterons avec plaisir.",
  };
}

export async function sendMessage(
  _prev: FormState | null,
  formData: FormData
): Promise<FormState> {
  if (isSpam(formData.get("website"))) {
    return { ok: true, message: "Merci ! Votre message a été envoyé." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !message) {
    return { ok: false, message: "Merci de renseigner votre nom et votre message." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Merci de saisir une adresse e-mail valide." };
  }

  await prisma.contactMessage.create({ data: { name, email, message } });

  // N0 : notification du bureau (MailService interne). Toujours APRÈS la
  // persistance, et jamais bloquante pour le visiteur.
  try {
    await notifyContactMessage({ name, email, message });
  } catch (err) {
    console.error("[mail] notification de message de contact impossible :", err);
  }

  return {
    ok: true,
    message: "Merci ! Votre message a bien été envoyé. Nous vous répondrons rapidement.",
  };
}
