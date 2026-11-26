"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchTraceGpx } from "@/lib/strava-gpx";

/**
 * Brique S3 « Agent Strava » : actions des 3 listes (spec §5 et §7).
 * Machine à états sans retour arrière : NEW -> SELECTED (GPX téléchargé via
 * Streams) -> BUFFER ; DELETED = tombestone jamais resynchronisé. Chaque
 * action revérifie le statut attendu AVANT d'écrire : un double clic ou une
 * page périmée ne peut pas faire sauter un étage de la machine.
 *
 * Les actions renvoient un résultat lisible : le composant client affiche
 * l'erreur sans recharger (et ré-affiche la ligne si l'action a échoué).
 */

export interface TraceActionResult {
  ok: boolean;
  error?: string;
}

const OK: TraceActionResult = { ok: true };

async function requireSession(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");
}

/** Liste 1 -> liste 2 : télécharge le GPX (Streams) et passe à SELECTED. */
export async function selectTrace(formData: FormData): Promise<TraceActionResult> {
  await requireSession();
  const id = String(formData.get("traceId") ?? "");
  const trace = await prisma.stravaTrace.findUnique({ where: { id } });
  if (!trace || trace.status !== "NEW") {
    return { ok: false, error: "Trace introuvable ou déjà traitée : recharge la page." };
  }
  try {
    const gpxContent = await fetchTraceGpx(trace.stravaId, trace.localTitle);
    await prisma.stravaTrace.update({
      where: { id },
      data: { status: "SELECTED", gpxContent, gpxFetchedAt: new Date() },
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/admin/traces");
  return OK;
}

/** Liste 2 -> liste 3 (stock tampon) : le GPX doit déjà être en base. */
export async function moveTraceToBuffer(formData: FormData): Promise<TraceActionResult> {
  await requireSession();
  const id = String(formData.get("traceId") ?? "");
  const trace = await prisma.stravaTrace.findUnique({ where: { id } });
  if (!trace || trace.status !== "SELECTED" || !trace.gpxContent) {
    return { ok: false, error: "Trace introuvable ou GPX absent : recharge la page." };
  }
  await prisma.stravaTrace.update({
    where: { id },
    data: { status: "BUFFER" },
  });
  revalidatePath("/admin/traces");
  return OK;
}

/**
 * Renommage en ligne du titre local (listes 1 et 2). titleSource passe à
 * « local » : la synchronisation ne touchera plus jamais ce titre (spec §4).
 */
export async function renameTrace(formData: FormData): Promise<TraceActionResult> {
  await requireSession();
  const id = String(formData.get("traceId") ?? "");
  const title = String(formData.get("title") ?? "")
    .trim()
    .replace(/
s+/g, " ");
  if (title.length < 1 || title.length > 120) {
    return { ok: false, error: "Le titre doit contenir entre 1 et 120 caractères." };
  }
  const trace = await prisma.stravaTrace.findUnique({ where: { id } });
  if (!trace || (trace.status !== "NEW" && trace.status !== "SELECTED")) {
    return { ok: false, error: "Seuls les tracés des listes 1 et 2 peuvent être renommés." };
  }
  await prisma.stravaTrace.update({
    where: { id },
    data: { localTitle: title, titleSource: "local" },
  });
  revalidatePath("/admin/traces");
  return OK;
}

/** Suppression définitive : tombestone DELETED, jamais resynchronisée (spec §2). */
export async function deleteTrace(formData: FormData): Promise<TraceActionResult> {
  await requireSession();
  const id = String(formData.get("traceId") ?? "");
  const trace = await prisma.stravaTrace.findUnique({ where: { id } });
  if (!trace || !["NEW", "SELECTED", "BUFFER"].includes(trace.status)) {
    return { ok: false, error: "Trace introuvable ou déjà traitée : recharge la page." };
  }
  await prisma.stravaTrace.update({
    where: { id },
    data: { status: "DELETED" },
  });
  revalidatePath("/admin/traces");
  return OK;
}
