"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { runStravaSync } from "@/lib/strava-sync";

/**
 * Brique S2 : « Synchroniser maintenant » côté back-office (bouton manuel).
 * Le même moteur (runStravaSync) sert le cron hebdo (brique S5) — ici on
 * redirige avec un bilan lisible en paramètres d'URL.
 */
export async function syncStrava(): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  let params: URLSearchParams;
  try {
    const report = await runStravaSync();
    params = new URLSearchParams({
      sync: "ok",
      imp: String(report.imported),
      maj: String(report.updated),
      ign: String(report.ignored),
      filt: String(report.filtered),
    });
  } catch (error) {
    params = new URLSearchParams({
      sync: "err",
      msg: error instanceof Error ? error.message : "erreur inconnue",
    });
  }

  redirect(`/admin/traces?${params.toString()}`);
}
