"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";
import { composeDetailsRaw } from "@/lib/details";

/**
 * Server Actions d'écriture du back-office (B2) — jamais d'API route :
 * chaque action vérifie la session et valide par zod avant d'écrire.
 */

export type RouteFormState = { error?: string };

const routeSchema = z.object({
  title: z.string().trim().min(3, "Le titre est requis (3 caractères minimum)."),
  communeId: z.string().min(1, "La commune est requise."),
  townshipLabel: z.string().trim().min(1, "Le libellé affiché est requis."),
  description: z.string().trim().min(10, "La description est requise (10 caractères minimum)."),
  distanceKm: z
    .number({ invalid_type_error: "Distance invalide." })
    .positive("La distance doit être positive.")
    .nullable(),
  elevationGainM: z
    .number({ invalid_type_error: "Dénivelé invalide." })
    .int("Le dénivelé doit être un entier.")
    .nonnegative("Le dénivelé doit être positif.")
    .nullable(),
  difficulty: z.enum(["facile", "moyen", "difficile"]).nullable(),
});

/** FormData brut (chaînes, champs vides) -> valeurs typées pour zod. */
function parseForm(fd: FormData) {
  const num = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim().replace(",", ".");
    return s === "" ? null : Number(s);
  };
  const diff = String(fd.get("difficulty") ?? "");
  return routeSchema.safeParse({
    title: String(fd.get("title") ?? ""),
    communeId: String(fd.get("communeId") ?? ""),
    townshipLabel: String(fd.get("townshipLabel") ?? ""),
    description: String(fd.get("description") ?? ""),
    distanceKm: num(fd.get("distanceKm")),
    elevationGainM: num(fd.get("elevationGainM")),
    difficulty: diff === "" ? null : (diff as "facile" | "moyen" | "difficile"),
  });
}

/**
 * Ligne détails composée dans lib/details.ts (partagée avec le formulaire).
 */

export async function createRoute(
  _prev: RouteFormState,
  fd: FormData
): Promise<RouteFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Session expirée, reconnectez-vous." };

  const parsed = parseForm(fd);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const data = parsed.data;

  const commune = await prisma.commune.findUnique({ where: { id: data.communeId } });
  if (!commune) return { error: "Commune introuvable." };

  // Slug normalisé (Q2) auto-généré depuis le titre, unique sinon refus.
  const slug = normalizeSlug(data.title);
  if (slug.length < 3) return { error: "Titre trop court pour générer un slug." };
  const existing = await prisma.route.findUnique({ where: { slug } });
  if (existing) {
    return { error: `Un itinéraire existe déjà avec ce titre (slug « ${slug} »). Choisissez un autre titre.` };
  }

  await prisma.route.create({
    data: {
      slug,
      title: data.title,
      detailsRaw: composeDetailsRaw(data.distanceKm, data.elevationGainM, data.difficulty) ?? "",
      distanceKm: data.distanceKm,
      elevationGainM: data.elevationGainM,
      difficulty: data.difficulty,
      description: data.description,
      townshipLabel: data.townshipLabel,
      communeId: data.communeId,
      status: "draft", // création en brouillon, publication explicite (B4)
      source: "saisie_manuelle",
    },
  });

  revalidatePath("/admin/routes");
  revalidatePath("/fr/routes");
  redirect("/admin/routes?status=draft");
}
