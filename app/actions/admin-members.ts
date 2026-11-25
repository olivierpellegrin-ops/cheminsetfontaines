"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RENEWAL_REMINDER_GUARD_MS,
  RENEWAL_REMINDER_MIN_AGE_MS,
} from "@/lib/renewal";
import {
  sendMemberWelcome,
  sendMembershipConfirmation,
  sendRenewalReminder,
} from "@/lib/mail/notifications";

/**
 * Server Actions du back-office (brique N2, spec §5.1/§8) : pilotage de
 * /admin/members — renvoi de la confirmation de demande (garde 1 h),
 * validation de la cotisation (création/mise à jour du Member + MemberYear
 * de la saison en cours, e-mail de bienvenue à la création uniquement),
 * renouvellement direct d'un membre, relances de renouvellement (garde
 * « anniversaire » : dernier règlement de plus de ~11 mois, et jamais deux
 * relances à moins de 30 jours) et suppressions RGPD.
 *
 * Jamais d'API d'écriture : session vérifiée dans chaque action.
 */

/** Garde anti-renvoi : un seul e-mail de confirmation par heure et par demande. */
const CONFIRMATION_RESEND_GUARD_MS = 60 * 60 * 1000;

/**
 * Renvoie l'e-mail de confirmation d'une demande non confirmée : nouveau
 * jeton à usage unique (l'ancien est invalidé), lastEmailAt rafraîchi.
 * Sans effet si le dernier envoi date de moins d'une heure ou si la
 * demande est déjà confirmée/traitée.
 */
export async function resendMembershipConfirmation(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const request = await prisma.membershipRequest.findUnique({ where: { id } });
  if (!request || request.confirmedAt || request.handledAt) return;

  if (request.lastEmailAt) {
    const since = Date.now() - request.lastEmailAt.getTime();
    if (since < CONFIRMATION_RESEND_GUARD_MS) return; // garde anti-renvoi
  }

  const confirmToken = randomBytes(32).toString("hex");
  await prisma.membershipRequest.update({
    where: { id: request.id },
    data: { confirmToken, lastEmailAt: new Date() },
  });

  try {
    await sendMembershipConfirmation({
      to: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      civilite: request.civilite,
      address: request.address,
      postalCode: request.postalCode,
      city: request.city,
      country: request.country,
      confirmToken,
    });
  } catch (err) {
    console.error("[mail] renvoi de la confirmation d'adhésion impossible :", err);
  }

  revalidatePath("/admin/members");
}

/**
 * Validation de la cotisation d'une demande confirmée (spec §5.1/§10) :
 * upsert du Member par e-mail (la ré-adhésion fusionne sur l'adresse),
 * MemberYear de la saison en cours, demande marquée traitée. L'e-mail
 * de bienvenue part uniquement à la CRÉATION du membre (jamais au
 * renouvellement). Non bloquant côté envoi.
 */
export async function markCotisationReceived(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const request = await prisma.membershipRequest.findUnique({ where: { id } });
  if (!request || !request.confirmedAt) return; // cotisation : demande confirmée uniquement

  const season = new Date().getFullYear();
  const existing = await prisma.member.findUnique({
    where: { email: request.email },
  });

  const member = existing
    ? await prisma.member.update({
        where: { id: existing.id },
        data: {
          civilite: request.civilite,
          firstName: request.firstName,
          lastName: request.lastName,
          address: request.address,
          postalCode: request.postalCode,
          city: request.city,
          country: request.country,
          phone: request.phone,
          newsletter: request.newsletter,
          photoConsent: request.photoConsent,
          status: "actif", // consentAt existant conservé
        },
      })
    : await prisma.member.create({
        data: {
          email: request.email,
          civilite: request.civilite,
          firstName: request.firstName,
          lastName: request.lastName,
          address: request.address,
          postalCode: request.postalCode,
          city: request.city,
          country: request.country,
          phone: request.phone,
          newsletter: request.newsletter,
          photoConsent: request.photoConsent,
          consentAt: request.confirmedAt,
          status: "actif",
        },
      });

  await prisma.memberYear.upsert({
    where: { memberId_season: { memberId: member.id, season } },
    create: { memberId: member.id, season, paidAt: new Date() },
    update: { paidAt: new Date() },
  });

  await prisma.membershipRequest.update({
    where: { id: request.id },
    data: { memberId: member.id, handledAt: new Date() },
  });

  if (!existing) {
    // E-mail n°3 (spec §5.3) : bienvenue, à la création uniquement.
    try {
      await sendMemberWelcome({
        memberId: member.id,
        to: member.email,
        firstName: member.firstName,
        season,
      });
    } catch (err) {
      console.error("[mail] envoi de la bienvenue adhérent impossible :", err);
    }
  }

  revalidatePath("/admin/members");
}

/**
 * Renouvellement direct d'un membre existant : enregistre la cotisation
 * de la saison en cours (le bureau a encaissé hors-ligne, D2) et repasse
 * le membre actif. Pas d'e-mail (la bienvenue n'est qu'à la création).
 */
export async function markMemberSeasonPaid(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return;

  const season = new Date().getFullYear();
  await prisma.memberYear.upsert({
    where: { memberId_season: { memberId: member.id, season } },
    create: { memberId: member.id, season, paidAt: new Date() },
    update: { paidAt: new Date() },
  });
  await prisma.member.update({ where: { id: member.id }, data: { status: "actif" } });

  revalidatePath("/admin/members");
}

/** Relance de renouvellement : regroupe les gardes communes (anniversaire
 * + 30 jours) évaluées pareillement par la page et par l'action. */
function reminderEligibility(
  status: string,
  years: { season: number; paidAt: Date }[],
  lastReminderAt: Date | null,
  now: number
): "at-jour" | "grace" | "recent" | "eligible" {
  const currentSeason = new Date(now).getFullYear();
  if (status !== "actif") return "at-jour";
  if (years.some((y) => y.season === currentSeason)) return "at-jour";
  if (years.length > 0) {
    const lastPaid = Math.max(...years.map((y) => y.paidAt.getTime()));
    if (now - lastPaid < RENEWAL_REMINDER_MIN_AGE_MS) return "grace";
  }
  if (lastReminderAt && now - lastReminderAt.getTime() < RENEWAL_REMINDER_GUARD_MS) {
    return "recent";
  }
  return "eligible";
}

/**
 * Relance d'un seul membre (bouton « Relance » de la liste) : mêmes gardes
 * que l'envoi en masse — cotisation de la saison absente, dernier
 * règlement de plus de ~11 mois (grâce « anniversaire »), pas de relance
 * depuis 30 jours. Non bloquant ; lastReminderAt porte la garde des 30 j.
 */
export async function sendMemberRenewalReminder(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const member = await prisma.member.findUnique({
    where: { id },
    include: { years: { select: { season: true, paidAt: true } } },
  });
  if (!member) return;

  if (reminderEligibility(member.status, member.years, member.lastReminderAt, Date.now()) !== "eligible") {
    return;
  }

  const season = new Date().getFullYear();
  try {
    await sendRenewalReminder({
      memberId: member.id,
      to: member.email,
      firstName: member.firstName,
      season,
    });
  } catch (err) {
    console.error("[mail] relance de renouvellement impossible :", err);
  }
  try {
    await prisma.member.update({
      where: { id: member.id },
      data: { lastReminderAt: new Date() },
    });
  } catch (err) {
    console.error("[mail] enregistrement de la relance impossible :", err);
  }

  revalidatePath("/admin/members");
}

/**
 * Relances de renouvellement en masse (spec §5.1) : membres actifs dont la
 * cotisation de la saison en cours est absente, dont le dernier règlement
 * date de plus de ~11 mois (règle « anniversaire » : un paiement de
 * novembre/décembre n'est pas ressassé en janvier) et sans relance depuis
 * 30 jours. Chaque envoi est non bloquant.
 */
export async function sendRenewalReminders(fd: FormData): Promise<void> {
  void fd;
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const members = await prisma.member.findMany({
    where: { status: "actif" },
    include: { years: { select: { season: true, paidAt: true } } },
  });

  const now = Date.now();
  for (const m of members) {
    if (reminderEligibility(m.status, m.years, m.lastReminderAt, now) !== "eligible") {
      continue;
    }
    try {
      await sendRenewalReminder({
        memberId: m.id,
        to: m.email,
        firstName: m.firstName,
        season: new Date(now).getFullYear(),
      });
    } catch (err) {
      console.error("[mail] rappel de renouvellement impossible :", err);
    }
    try {
      await prisma.member.update({
        where: { id: m.id },
        data: { lastReminderAt: new Date() },
      });
    } catch (err) {
      console.error("[mail] enregistrement du rappel impossible :", err);
    }
  }

  revalidatePath("/admin/members");
}

/**
 * Suppression RGPD d'un membre (spec §8) : le membre (ses saisons partent
 * en cascade), ses demandes d'adhésion (mêmes données personnelles) et
 * les lignes du journal EmailOutbox qui le référencent. Irréversible,
 * confirmation côté client.
 */
export async function deleteMember(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return;

  await prisma.emailOutbox.deleteMany({ where: { memberId: id } });
  await prisma.membershipRequest.deleteMany({ where: { email: member.email } });
  await prisma.member.delete({ where: { id } }); // MemberYear en cascade

  revalidatePath("/admin/members");
}

/** Suppression RGPD unitaire d'une demande d'adhésion. */
export async function deleteMembershipRequest(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const request = await prisma.membershipRequest.findUnique({ where: { id } });
  if (!request) return;

  await prisma.membershipRequest.delete({ where: { id } });
  revalidatePath("/admin/members");
}
