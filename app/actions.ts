"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { notifyContactMessage, sendSubscriberConfirmation } from "@/lib/mail/notifications";

/**
 * v0.1 : les soumissions sont persistées localement (source de vérité).
 * Chantier « Remplacement Mailchimp » (spec du 25/11/2026, décisions D1-D6
 * actées : développement interne, PAS de SaaS emailing) :
 * - N0 (livrée) : sendMessage notifie le bureau via le MailService interne.
 * - N1 (cette brique) : subscribe envoie l'e-mail de confirmation du double
 *   opt-in (lien à usage unique valable 30 jours, spec §5.2). Aucun envoi
 *   plus d'une fois par heure à la même adresse (lastEmailAt).
 * - N2 : parcours e-mails des adhérents (TODO ci-dessous).
 */

export type FormState = { ok: boolean; message: string };

/** Garde anti-renvoi : un seul e-mail de confirmation par heure et par adresse. */
const CONFIRMATION_RESEND_GUARD_MS = 60 * 60 * 1000;

/** Nouveau jeton de confirmation (64 hex, à usage unique, valable 30 jours). */
function newConfirmToken(): string {
  return randomBytes(32).toString("hex");
}

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

  // Garde anti-renvoi : si une confirmation vient d'être envoyée, on ne
  // renvoie rien (le lien déjà reçu reste valable 30 jours).
  if (existing?.lastEmailAt) {
    const since = Date.now() - existing.lastEmailAt.getTime();
    if (since < CONFIRMATION_RESEND_GUARD_MS) {
      return {
        ok: true,
        message:
          "Votre inscription est en attente : un e-mail de confirmation vous a déjà été envoyé il y a moins d'une heure. Vérifiez votre boîte mail (et vos indésirables).",
      };
    }
  }

  // N1 : double opt-in — le statut reste pending jusqu'au clic sur le lien
  // de confirmation (usage unique, valable 30 jours). Les adresses déjà
  // désinscrites qui re-souscrivent repassent par la même confirmation.
  const confirmToken = newConfirmToken();
  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    create: { email, firstName, lastName, status: "pending", source: "formulaire", confirmToken, lastEmailAt: new Date() },
    update: { firstName, lastName, status: "pending", confirmToken, lastEmailAt: new Date() },
  });

  // E-mail n°5 (spec §5.3) : confirmation. Jamais bloquante pour le visiteur.
  try {
    await sendSubscriberConfirmation({
      subscriberId: subscriber.id,
      to: email,
      firstName,
      confirmToken,
    });
  } catch (err) {
    console.error("[mail] envoi de la confirmation d'inscription impossible :", err);
  }

  return {
    ok: true,
    message:
      "Merci ! Votre inscription est enregistrée. Un e-mail de confirmation vous attend : cliquez sur le lien qu'il contient (valable 30 jours) pour recevoir la lettre d'informations du 1er de chaque mois.",
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
