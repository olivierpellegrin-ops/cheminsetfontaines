"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";
import { composeDetailsRaw } from "@/lib/details";

/**
 * Server Actions d'écriture du back-office — jamais d'API route :
 * chaque action vérifie la session et valide par zod avant d'écrire.
 * B3 : uploads GPX + photo principale + album photos (fichiers dans public/,
 * empreinte vérifiable, cf. incident globals.css du 24/11).
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

const MAX_GPX_BYTES = 10 * 1024 * 1024; // 10 Mo
const MAX_IMG_BYTES = 4 * 1024 * 1024; // 4 Mo
const IMG_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);

function extOf(name: string): string {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

/** Écrit un fichier uploadé et retourne le nom enregistré, ou un message d'erreur. */
async function saveFile(
  file: File,
  dir: string,
  base: string,
  kind: "gpx" | "image"
): Promise<{ saved?: string; error?: string }> {
  if (file.size > (kind === "gpx" ? MAX_GPX_BYTES : MAX_IMG_BYTES)) {
    return {
      error: `« ${file.name} » dépasse la limite (${kind === "gpx" ? "10" : "4"} Mo).`,
    };
  }
  const ext = kind === "gpx" ? extOf(file.name) || "gpx" : extOf(file.name);
  if (kind === "gpx" ? !["gpx", "xml"].includes(ext) : !IMG_EXTS.has(ext)) {
    return { error: `Type de fichier non autorisé : .${ext} (${file.name}).` };
  }
  await mkdir(dir, { recursive: true });
  const filename = `${base}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);
  // Règle durable (incident globals.css) : vérifier ce qu'on vient d'écrire.
  const wrote = await (await import("node:fs/promises")).readFile(path.join(dir, filename));
  if (wrote.length !== buf.length) {
    return { error: `Écriture incomplète de ${filename} sur le disque. Réessayez.` };
  }
  return { saved: filename };
}

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

  // Slug : champ éditable pré-rempli depuis le titre, normalisé (Q2), unique.
  const rawSlug = String(fd.get("slug") ?? "").trim() || data.title;
  const slug = normalizeSlug(rawSlug);
  if (slug.length < 3) return { error: "Slug trop court (3 caractères minimum après normalisation)." };
  const existing = await prisma.route.findUnique({ where: { slug } });
  if (existing) {
    return {
      error: `Un itinéraire existe déjà avec ce slug « ${slug} ». Changez le titre ou le slug.`,
    };
  }

  const published = fd.get("published") === "on";
  const hasAlbumToggle = fd.get("hasPhotoAlbum") === "on";
  const detailsOverride = String(fd.get("detailsRaw") ?? "").trim();
  const detailsRaw =
    detailsOverride ||
    composeDetailsRaw(data.distanceKm, data.elevationGainM, data.difficulty) ||
    "";

  // --- Uploads ---
  const gpxDir = path.join(process.cwd(), "public", "gpx");
  const imgDir = path.join(process.cwd(), "public", "images", "routes");

  let gpxFileName: string | null = null;
  const gpx = fd.get("gpxFile");
  if (gpx instanceof File && gpx.size > 0) {
    const r = await saveFile(gpx, gpxDir, slug, "gpx");
    if (r.error) return { error: r.error };
    gpxFileName = gpx.name; // nom lisible d'origine (colonne GPX File)
  }

  let imageUrl: string | null = null;
  const imageAlt = String(fd.get("imageAlt") ?? "").trim() || null;
  const img = fd.get("imageFile");
  if (img instanceof File && img.size > 0) {
    const r = await saveFile(img, imgDir, `${slug}-main`, "image");
    if (r.error) return { error: r.error };
    imageUrl = `/images/routes/${r.saved}`;
  } else {
    // Capture 1200×800 du viewer (data URL PNG) -> photo principale
    const capture = String(fd.get("captureDataUrl") ?? "");
    const DATAURL_PREFIX = "data:image/png;base64,";
    if (capture.startsWith(DATAURL_PREFIX)) {
      const buf = Buffer.from(capture.slice(DATAURL_PREFIX.length), "base64");
      if (buf.length > MAX_IMG_BYTES) {
        return { error: `La capture dépasse 4 Mo (${(buf.length / 1048576).toFixed(1)} Mo).` };
      }
      await mkdir(imgDir, { recursive: true });
      const filename = `${slug}-main.png`;
      await writeFile(path.join(imgDir, filename), buf);
      const wrote = await (await import("node:fs/promises")).readFile(path.join(imgDir, filename));
      if (wrote.length !== buf.length) {
        return { error: `Écriture incomplète de ${filename} sur le disque. Réessayez.` };
      }
      imageUrl = `/images/routes/${filename}`;
    }
  }

  // Album photos : lignes photo.file-N / photo.title-N / photo.alt-N
  const photoRows: { title: string; imageUrl: string; imageAlt: string | null }[] = [];
  for (let i = 0; ; i++) {
    const f = fd.get(`photo.file-${i}`);
    if (!(f instanceof File)) break;
    if (f.size === 0) continue;
    const r = await saveFile(f, imgDir, `${slug}-${String(i + 1).padStart(2, "0")}`, "image");
    if (r.error) return { error: r.error };
    photoRows.push({
      title: String(fd.get(`photo.title-${i}`) ?? "").trim() || f.name,
      imageUrl: `/images/routes/${r.saved}`,
      imageAlt: String(fd.get(`photo.alt-${i}`) ?? "").trim() || null,
    });
  }

  const route = await prisma.route.create({
    data: {
      slug,
      title: data.title,
      detailsRaw,
      distanceKm: data.distanceKm,
      elevationGainM: data.elevationGainM,
      difficulty: data.difficulty,
      description: data.description,
      gpxFileName,
      imageUrl,
      imageAlt,
      townshipLabel: data.townshipLabel,
      communeId: data.communeId,
      status: published ? "published" : "draft",
      hasPhotoAlbum: hasAlbumToggle || photoRows.length > 0,
      source: "saisie_manuelle",
    },
  });

  if (photoRows.length > 0) {
    await prisma.routePhoto.createMany({
      data: photoRows.map((p) => ({ ...p, routeId: route.id })),
    });
  }

  revalidatePath("/admin/routes");
  revalidatePath("/fr/routes");
  redirect(published ? "/admin/routes" : "/admin/routes?status=draft");
}
