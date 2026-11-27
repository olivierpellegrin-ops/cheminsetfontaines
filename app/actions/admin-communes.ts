"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";

/**
 * Brique « ajout de commune en ligne » (décision D7 du 26/11, option A) :
 * depuis le formulaire d'itinéraire, la liste déroulante des communes ne
 * couvre que le référentiel Xaintrie initial (seed). Quand une randonnée
 * part d'une commune absente, l'admin la crée ICI, sans quitter le
 * formulaire — le retour l'ajoute à la liste et la sélectionne.
 *
 * Garde-fous : session admin, nom ≥ 2 caractères, slug normalisé unique ;
 * un nom EXACTEMENT identique renvoie la commune existante (pas d'erreur,
 * cas « je ne l'avais pas vue dans la liste »), un slug proche (ex. accents
 * différents) renvoie une erreur explicite qui nomme la doublon.
 * inseeCode/lat/lng restent vides : peuplage possible plus tard dans une
 * éventuelle page de gestion (option B non retenue à ce jour).
 */
export type CommuneCreateResult =
  | { ok: true; commune: { id: string; name: string } }
  | { ok: false; error: string };

export async function createCommune(fd: FormData): Promise<CommuneCreateResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Session expirée, reconnecte-toi." };
  }

  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) {
    return { ok: false, error: "Nom de commune trop court (2 caractères minimum)." };
  }
  if (name.length > 80) {
    return { ok: false, error: "Nom de commune trop long (80 caractères maximum)." };
  }

  // Même nom (insensible à la casse) : la commune existe déjà, on la
  // retourne telle quelle — le formulaire la sélectionne, sans erreur.
  const sameName = await prisma.commune.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (sameName) return { ok: true, commune: sameName };

  const slug = normalizeSlug(name);
  const sameSlug = await prisma.commune.findUnique({ where: { slug } });
  if (sameSlug) {
    return {
      ok: false,
      error: `Une commune au nom proche existe déjà : « ${sameSlug.name} ». Utilise-la plutôt.`,
    };
  }

  const created = await prisma.commune.create({
    data: { name, slug },
    select: { id: true, name: true },
  });
  return { ok: true, commune: created };
}
