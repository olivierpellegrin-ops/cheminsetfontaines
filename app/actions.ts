"use server";

import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";

/**
 * v0.1 : les soumissions sont persistées localement (source de vérité).
 * v0.2 (Brevo) : relay transactionnel + inscription liste (clé dans
 * .env, jamais dans le repo) — points d'extension marqués TODO(v2).
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

  // TODO(v2 Brevo) : e-mail de double opt-in + inscription liste Brevo.

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

  // TODO(v2 Brevo) : notification à NOTIFY_EMAIL (contact@cheminsetfontaines.fr)
  // + inscription liste avec attribut source=adhesion -> e-mail de bienvenue
  // unique (abonnés et adhérents, spec §9.8).

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

  // TODO(v2 Brevo) : notification à NOTIFY_EMAIL.

  return {
    ok: true,
    message: "Merci ! Votre message a bien été envoyé. Nous vous répondrons rapidement.",
  };
}
