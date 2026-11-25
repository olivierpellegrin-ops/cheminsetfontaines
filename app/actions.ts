"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  notifyContactMessage,
  sendMembershipBureauNotification,
  sendMembershipConfirmation,
  sendSubscriberConfirmation,
} from "@/lib/mail/notifications";

/**
 * v0.1 : les soumissions sont persistées localement (source de vérité).
 * Chantier « Remplacement Mailchimp » (spec du 25/11/2026, décisions D1-D6
 * actées : développement interne, PAS de SaaS emailing) :
 * - N0 (livrée) : sendMessage notifie le bureau via le MailService interne.
 * - N1 (livrée) : subscribe envoie l'e-mail de confirmation du double
 *   opt-in (lien à usage unique valable 30 jours, spec §5.2). Aucun envoi
 *   plus d'une fois par heure à la même adresse (lastEmailAt).
 * - N2 (cette brique) : requestMembership envoie la confirmation de demande
 *   au demandeur + la fiche complète au bureau (spec §5.1) ; la case
 *   « nouvelles du sentier » déclenche le double opt-in en parallèle.
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

/**
 * Double opt-in des souscripteurs (N1, spec §5.2) : partagé entre le
 * formulaire dédié et la case « nouvelles du sentier » de la modale
 * d'adhésion (N2, source « adhesion »). Retourne le message visiteur.
 * Jamais deux e-mails de confirmation à moins d'une heure d'intervalle.
 */
async function runDoubleOptIn(input: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: "formulaire" | "adhesion";
}): Promise<string> {
  const existing = await prisma.subscriber.findUnique({
    where: { email: input.email },
  });

  if (existing && existing.status === "subscribed") {
    return "Vous êtes déjà inscrit aux nouvelles du sentier.";
  }

  // Garde anti-renvoi : si une confirmation vient d'être envoyée, on ne
  // renvoie rien (le lien déjà reçu reste valable 30 jours).
  if (existing?.lastEmailAt) {
    const since = Date.now() - existing.lastEmailAt.getTime();
    if (since < CONFIRMATION_RESEND_GUARD_MS) {
      return (
        "Votre inscription est en attente : un e-mail de confirmation vous a déjà été envoyé il y a moins d'une heure. " +
        "Vérifiez votre boîte mail (et vos indésirables)."
      );
    }
  }

  // N1 : double opt-in — le statut reste pending jusqu'au clic sur le lien
  // de confirmation (usage unique, valable 30 jours). Les adresses déjà
  // désinscrites qui re-souscrivent repassent par la même confirmation.
  const confirmToken = newConfirmToken();
  const subscriber = await prisma.subscriber.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      status: "pending",
      source: input.source,
      confirmToken,
      lastEmailAt: new Date(),
    },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      status: "pending",
      confirmToken,
      lastEmailAt: new Date(),
    },
  });

  // E-mail n°5 (spec §5.3) : confirmation. Jamais bloquante pour le visiteur.
  try {
    await sendSubscriberConfirmation({
      subscriberId: subscriber.id,
      to: input.email,
      firstName: input.firstName,
      confirmToken,
    });
  } catch (err) {
    console.error("[mail] envoi de la confirmation d'inscription impossible :", err);
  }

  return (
    "Merci ! Votre inscription est enregistrée. Un e-mail de confirmation vous attend : " +
    "cliquez sur le lien qu'il contient (valable 30 jours) pour recevoir la lettre d'informations du 1er de chaque mois."
  );
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

  return {
    ok: true,
    message: await runDoubleOptIn({ email, firstName, lastName, source: "formulaire" }),
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
  const firstName = get("firstName");
  const lastName = get("lastName");
  const newsletter = formData.get("newsletter") === "on";
  const photoConsent = formData.get("photoConsent") === "on";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Merci de saisir une adresse e-mail valide." };
  }

  // N2 : la demande est enregistrée avec son jeton de confirmation (usage
  // unique, valable 30 jours, spec §5.1) ; lastEmailAt porte la garde
  // anti-renvoi 1 h. Les cases reçues (newsletter, droit à l'image) sont
  // jamais cochées par défaut côté modale (RGPD).
  const confirmToken = newConfirmToken();
  const request = await prisma.membershipRequest.create({
    data: {
      civilite: get("civilite"),
      firstName,
      lastName,
      address: get("address"),
      email,
      phone: get("phone"),
      postalCode: get("postalCode"),
      city: get("city"),
      country: get("country"),
      newsletter,
      photoConsent,
      confirmToken,
      lastEmailAt: new Date(),
    },
  });

  // E-mails n°1 et n°2 (spec §5.3) : confirmation au demandeur, fiche au
  // bureau. TOUJOURS après la persistance, jamais bloquants pour le visiteur.
  try {
    await sendMembershipConfirmation({
      to: email,
      firstName,
      lastName,
      civilite: get("civilite"),
      address: get("address"),
      postalCode: get("postalCode"),
      city: get("city"),
      country: get("country"),
      confirmToken,
    });
  } catch (err) {
    console.error("[mail] envoi de la confirmation d'adhésion impossible :", err);
  }
  try {
    await sendMembershipBureauNotification({
      email,
      civilite: get("civilite"),
      firstName,
      lastName,
      address: get("address"),
      phone: get("phone"),
      postalCode: get("postalCode"),
      city: get("city"),
      country: get("country"),
      newsletter,
      photoConsent,
      requestedAt: request.createdAt,
    });
  } catch (err) {
    console.error("[mail] notification au bureau d'une adhésion impossible :", err);
  }

  // Case « nouvelles du sentier » : même double opt-in que le formulaire
  // dédié (source « adhesion », spec §4.1), jamais deux envois/heure.
  if (newsletter) {
    try {
      await runDoubleOptIn({ email, firstName, lastName, source: "adhesion" });
    } catch (err) {
      console.error("[mail] inscription newsletter depuis adhésion impossible :", err);
    }
  }

  return {
    ok: true,
    message:
      "Merci ! Votre demande d'adhésion est enregistrée. Un e-mail de confirmation vous attend : cliquez sur le lien qu'il contient (valable 30 jours), le bureau finalisera ensuite votre adhésion.",
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
