"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSubscriberConfirmation } from "@/lib/mail/notifications";

/**
 * Server Actions du back-office (brique N1, spec §5.2) : liste des
 * souscripteurs gérée dans /admin/subscribers — renvoi de la confirmation
 * (garde anti-renvoi 1 h) et suppression RGPD unitaire (souscripteur +
 * lignes EmailOutbox associées).
 *
 * Jamais d'API d'écriture : session vérifiée dans chaque action.
 */

/** Même garde que le formulaire public : max 1 e-mail de confirmation/heure. */
const CONFIRMATION_RESEND_GUARD_MS = 60 * 60 * 1000;

/**
 * Renvoie l'e-mail de confirmation à un souscripteur pending : nouveau
 * jeton à usage unique (l'ancien est invalidé), lastEmailAt rafraîchi.
 * Sans effet si le dernier envoi date de moins d'une heure ou si le
 * souscripteur n'est plus en attente.
 */
export async function resendSubscriberConfirmation(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber || subscriber.status !== "pending") return;

  if (subscriber.lastEmailAt) {
    const since = Date.now() - subscriber.lastEmailAt.getTime();
    if (since < CONFIRMATION_RESEND_GUARD_MS) return; // garde anti-renvoi
  }

  const confirmToken = randomBytes(32).toString("hex");
  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { confirmToken, lastEmailAt: new Date() },
  });

  try {
    await sendSubscriberConfirmation({
      subscriberId: subscriber.id,
      to: subscriber.email,
      firstName: subscriber.firstName,
      confirmToken,
    });
  } catch (err) {
    console.error("[mail] renvoi de la confirmation impossible :", err);
  }

  revalidatePath("/admin/subscribers");
}

/**
 * Suppression RGPD unitaire (spec §8) : efface le souscripteur ET les
 * lignes du journal EmailOutbox qui le référencent. Action irréversible,
 * confirmation demandée côté client.
 */
export async function deleteSubscriber(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber) return;

  await prisma.emailOutbox.deleteMany({ where: { subscriberId: id } });
  await prisma.subscriber.delete({ where: { id } });

  revalidatePath("/admin/subscribers");
}
