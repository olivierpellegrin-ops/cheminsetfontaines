"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { decryptToken, stravaRevoke } from "@/lib/strava";

/**
 * Brique S1 : déconnexion Strava — révocation best-effort chez Strava puis
 * suppression définitive des jetons en base. Une reconnexion repassera par
 * la page d'autorisation complète.
 */
export async function disconnectStrava(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");

  const cred = await prisma.stravaCredential.findFirst();
  if (!cred) {
    revalidatePath("/admin/traces");
    return;
  }

  try {
    await stravaRevoke(decryptToken(cred.accessToken));
  } catch {
    // Révocation impossible (réseau, jeton déjà expiré...) : la sécurité est
    // assurée par la suppression locale, l'échec n'est pas bloquant.
  }

  await prisma.stravaCredential.delete({ where: { id: cred.id } });
  revalidatePath("/admin/traces");
}
