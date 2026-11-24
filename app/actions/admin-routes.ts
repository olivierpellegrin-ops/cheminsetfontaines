"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile, rename, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizeSlug } from "@/lib/slug";
import { composeDetailsRaw } from "@/lib/details";

/**
 * Server Actions d'écriture du back-office — jamais d'API route :
 * chaque action vérifie la session et valide par zod avant d'écrire.
 * B2 : création. B4 : édition, publication/dépublication, suppression
 * (avec nettoyage des fichiers disque associés).
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
  const wrote = await readFile(path.join(dir, filename));
  if (wrote.length !== buf.length) {
    return { error: `Écriture incomplète de ${filename} sur le disque. Réessayez.` };
  }
  return { saved: filename };
}

const gpxDir = () => path.join(process.cwd(), "public", "gpx");
const imgDir = () => path.join(process.cwd(), "public", "images", "routes");

/** true si le champ FormData est un fichier GPX à traiter. */
function gpxCheck(v: FormDataEntryValue | null): v is File {
  return v instanceof File && v.size > 0;
}

/** true si l'URL d'image est un fichier local (uploads), false si externe. */
const isLocalImage = (url: string | null) => !!url && url.startsWith("/images/routes/");

/** Décode une data URL JPEG (capture 1200×800 du viewer) -> Buffer+extension. */
async function decodeCapture(capture: string): Promise<{ buf: Buffer; ext: string } | { error: string }> {
  const JPEG_PREFIX = "data:image/jpeg;base64,";
  if (capture.startsWith(JPEG_PREFIX)) {
    const buf = Buffer.from(capture.slice(JPEG_PREFIX.length), "base64");
    if (buf.length > MAX_IMG_BYTES) {
      return { error: `La capture dépasse 4 Mo (${(buf.length / 1048576).toFixed(1)} Mo).` };
    }
    return { buf, ext: "jpg" };
  }
  return { error: "Format de capture inattendu." };
}

/** Renomme silencieusement (absent = rien à faire). */
async function renameIfExists(from: string, to: string) {
  try {
    await rename(from, to);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(`Impossible de renommer ${path.basename(from)} sur le disque.`);
    }
  }
}

/** Supprime silencieusement (absent = rien à faire). */
async function unlinkIfExists(p: string) {
  try {
    await unlink(p);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(`Impossible de supprimer ${path.basename(p)} sur le disque.`);
    }
  }
}

/** Camera du viewer (capture 1200x800) depuis le champ cache JSON. */
function parseViewerCamera(v: FormDataEntryValue | null): {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
} | null {
  if (typeof v !== "string" || v === "") return null;
  try {
    const o = JSON.parse(v) as Record<string, unknown>;
    const nums = [o.lng, o.lat, o.zoom, o.bearing, o.pitch];
    if (nums.every((n) => typeof n === "number" && Number.isFinite(n))) {
      return { lng: o.lng as number, lat: o.lat as number, zoom: o.zoom as number, bearing: o.bearing as number, pitch: o.pitch as number };
    }
  } catch {
    /* JSON invalide : ignore */
  }
  return null;
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

  // --- Pre-check tailles : AUCUNE écriture disque tant qu'un fichier
  // dépasse sa limite (sinon un échec tardif laisse des orphelins, vécu 24/11)
  {
    const sizes: { name: string; size: number; max: number }[] = [];
    if (gpxCheck(fd.get("gpxFile"))) {
      sizes.push({ name: (fd.get("gpxFile") as File).name, size: (fd.get("gpxFile") as File).size, max: MAX_GPX_BYTES });
    }
    const imgF = fd.get("imageFile");
    if (imgF instanceof File && imgF.size > 0) {
      sizes.push({ name: imgF.name, size: imgF.size, max: MAX_IMG_BYTES });
    }
    for (let i = 0; ; i++) {
      const f = fd.get(`photo.file-${i}`);
      if (!(f instanceof File)) break;
      if (f.size > 0) sizes.push({ name: f.name, size: f.size, max: MAX_IMG_BYTES });
    }
    const tooBig = sizes.find((x) => x.size > x.max);
    if (tooBig) {
      return {
        error: `« ${tooBig.name} » dépasse la limite (${(tooBig.max / 1048576).toFixed(0)} Mo). Aucun fichier n'a été écrit.`,
      };
    }
  }

  // --- Uploads ---
  let viewerCamera: { lng: number; lat: number; zoom: number; bearing: number; pitch: number } | null = null;
  let gpxFileName: string | null = null;
  const gpx = fd.get("gpxFile");
  if (gpx instanceof File && gpx.size > 0) {
    const r = await saveFile(gpx, gpxDir(), slug, "gpx");
    if (r.error) return { error: r.error };
    gpxFileName = gpx.name; // nom lisible d'origine (colonne GPX File)
  }

  let imageUrl: string | null = null;
  const imageAlt = String(fd.get("imageAlt") ?? "").trim() || null;
  const img = fd.get("imageFile");
  if (img instanceof File && img.size > 0) {
    const r = await saveFile(img, imgDir(), `${slug}-main`, "image");
    if (r.error) return { error: r.error };
    imageUrl = `/images/routes/${r.saved}`;
  } else {
    // Capture 1200×800 du viewer (data URL JPEG) -> photo principale
    const capture = String(fd.get("captureDataUrl") ?? "");
    if (capture !== "") {
      const dec = await decodeCapture(capture);
      if ("error" in dec) return { error: dec.error };
      await mkdir(imgDir(), { recursive: true });
      const filename = `${slug}-main.${dec.ext}`;
      await writeFile(path.join(imgDir(), filename), dec.buf);
      const wrote = await readFile(path.join(imgDir(), filename));
      if (wrote.length !== dec.buf.length) {
        return { error: `Écriture incomplète de ${filename} sur le disque. Réessayez.` };
      }
      imageUrl = `/images/routes/${filename}`;
      viewerCamera = parseViewerCamera(fd.get("captureCamera"));
    }
  }

  // Album photos : lignes photo.file-N / photo.title-N / photo.alt-N
  const photoRows: { title: string; imageUrl: string; imageAlt: string | null }[] = [];
  const dir = imgDir();
  for (let i = 0; ; i++) {
    const f = fd.get(`photo.file-${i}`);
    if (!(f instanceof File)) break;
    if (f.size === 0) continue;
    const r = await saveFile(f, dir, `${slug}-${String(i + 1).padStart(2, "0")}`, "image");
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
      viewerCamera: viewerCamera ?? Prisma.DbNull,
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

/**
 * B4 : édition complète d'un itinéraire. Fichiers laissés vides = inchangés ;
 * capture viewer = remplace la photo principale ; un slug modifié déplace
 * proprement les fichiers locaux associés.
 */
export async function updateRoute(
  _prev: RouteFormState,
  fd: FormData
): Promise<RouteFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Session expirée, reconnectez-vous." };

  const routeId = String(fd.get("routeId") ?? "");
  const existing = await prisma.route.findUnique({
    where: { id: routeId },
    include: { photos: true },
  });
  if (!existing) return { error: "Itinéraire introuvable." };

  const parsed = parseForm(fd);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const data = parsed.data;

  const commune = await prisma.commune.findUnique({ where: { id: data.communeId } });
  if (!commune) return { error: "Commune introuvable." };

  // Slug (modifiable) : normalisé, unique hors itinéraire courant.
  const rawSlug = String(fd.get("slug") ?? "").trim() || data.title;
  const slug = normalizeSlug(rawSlug);
  if (slug.length < 3) return { error: "Slug trop court (3 caractères minimum après normalisation)." };
  if (slug !== existing.slug) {
    const conflict = await prisma.route.findUnique({ where: { slug } });
    if (conflict && conflict.id !== existing.id) {
      return { error: `Le slug « ${slug} » appartient déjà à un autre itinéraire.` };
    }
  }

  const published = fd.get("published") === "on";
  const hasAlbumToggle = fd.get("hasPhotoAlbum") === "on";
  const detailsOverride = String(fd.get("detailsRaw") ?? "").trim();
  const detailsRaw =
    detailsOverride ||
    composeDetailsRaw(data.distanceKm, data.elevationGainM, data.difficulty) ||
    "";

  // --- Pre-check tailles avant toute écriture disque (anti-orphelin) ---
  {
    const sizes: { name: string; size: number; max: number }[] = [];
    if (gpxCheck(fd.get("gpxFile"))) {
      sizes.push({ name: (fd.get("gpxFile") as File).name, size: (fd.get("gpxFile") as File).size, max: MAX_GPX_BYTES });
    }
    const imgF = fd.get("imageFile");
    if (imgF instanceof File && imgF.size > 0) {
      sizes.push({ name: imgF.name, size: imgF.size, max: MAX_IMG_BYTES });
    }
    for (let i = 0; ; i++) {
      const f = fd.get(`photo.file-${i}`);
      if (!(f instanceof File)) break;
      if (f.size > 0) sizes.push({ name: f.name, size: f.size, max: MAX_IMG_BYTES });
    }
    const tooBig = sizes.find((x) => x.size > x.max);
    if (tooBig) {
      return {
        error: `« ${tooBig.name} » dépasse la limite (${(tooBig.max / 1048576).toFixed(0)} Mo). Aucun fichier n'a été écrit.`,
      };
    }
  }

  // --- Slug modifié : déplacer GPX, photo principale et photos locales ---
  if (slug !== existing.slug) {
    await renameIfExists(
      path.join(gpxDir(), `${existing.slug}.gpx`),
      path.join(gpxDir(), `${slug}.gpx`)
    );
    const oldMain = isLocalImage(existing.imageUrl)
      ? path.basename(existing.imageUrl)
      : null;
    if (oldMain) {
      const ext = extOf(oldMain) || "jpg";
      await renameIfExists(
        path.join(imgDir(), oldMain),
        path.join(imgDir(), `${slug}-main.${ext}`)
      );
    }
    for (const p of existing.photos) {
      if (!isLocalImage(p.imageUrl)) continue;
      const oldName = path.basename(p.imageUrl);
      const ext = extOf(oldName) || "jpg";
      // pattern <oldSlug>-NN.ext -> <slug>-NN.ext
      const m = oldName.match(/^.*-(\d+)\.([a-z0-9]+)$/i);
      const suffix = m ? `-${m[1]}.${ext}` : `-${Date.now()}.${ext}`;
      const newName = `${slug}${suffix}`;
      if (newName !== oldName) {
        await renameIfExists(path.join(imgDir(), oldName), path.join(imgDir(), newName));
        await prisma.routePhoto.update({
          where: { id: p.id },
          data: { imageUrl: `/images/routes/${newName}` },
        });
      }
    }
  }

  // --- GPX : remplacé si nouveau fichier ---
  let gpxFileName = existing.gpxFileName;
  const gpx = fd.get("gpxFile");
  if (gpx instanceof File && gpx.size > 0) {
    const r = await saveFile(gpx, gpxDir(), slug, "gpx");
    if (r.error) return { error: r.error };
    gpxFileName = gpx.name;
  }

  // --- Photo principale : fichier manuel OU capture, sinon inchangée ---
  let imageUrl = existing.imageUrl;
  let viewerCamera: { lng: number; lat: number; zoom: number; bearing: number; pitch: number } | null =
    existing.viewerCamera as { lng: number; lat: number; zoom: number; bearing: number; pitch: number } | null;
  const img = fd.get("imageFile");
  if (img instanceof File && img.size > 0) {
    const r = await saveFile(img, imgDir(), `${slug}-main`, "image");
    if (r.error) return { error: r.error };
    if (isLocalImage(existing.imageUrl) && path.basename(existing.imageUrl) !== r.saved) {
      await unlinkIfExists(path.join(imgDir(), path.basename(existing.imageUrl)));
    }
    imageUrl = `/images/routes/${r.saved}`;
  } else {
    const capture = String(fd.get("captureDataUrl") ?? "");
    if (capture !== "") {
      const dec = await decodeCapture(capture);
      if ("error" in dec) return { error: dec.error };
      const filename = `${slug}-main.${dec.ext}`;
      if (isLocalImage(existing.imageUrl) && path.basename(existing.imageUrl) !== filename) {
        await unlinkIfExists(path.join(imgDir(), path.basename(existing.imageUrl)));
      }
      await mkdir(imgDir(), { recursive: true });
      await writeFile(path.join(imgDir(), filename), dec.buf);
      imageUrl = `/images/routes/${filename}`;
      viewerCamera = parseViewerCamera(fd.get("captureCamera"));
    }
  }
  const imageAlt = String(fd.get("imageAlt") ?? "").trim() || null;

  // --- Album : ajout de nouvelles photos (numérotation après l'existant) ---
  const startIndex = existing.photos.length + 1;
  const newPhotos: { title: string; imageUrl: string; imageAlt: string | null; routeId: string }[] = [];
  for (let i = 0; ; i++) {
    const f = fd.get(`photo.file-${i}`);
    if (!(f instanceof File)) break;
    if (f.size === 0) continue;
    const r = await saveFile(f, imgDir(), `${slug}-${String(startIndex + i).padStart(2, "0")}`, "image");
    if (r.error) return { error: r.error };
    newPhotos.push({
      title: String(fd.get(`photo.title-${i}`) ?? "").trim() || f.name,
      imageUrl: `/images/routes/${r.saved}`,
      imageAlt: String(fd.get(`photo.alt-${i}`) ?? "").trim() || null,
      routeId: existing.id,
    });
  }
  if (newPhotos.length > 0) {
    await prisma.routePhoto.createMany({ data: newPhotos });
  }

  await prisma.route.update({
    where: { id: existing.id },
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
      viewerCamera: viewerCamera ?? Prisma.DbNull,
      hasPhotoAlbum: hasAlbumToggle || existing.hasPhotoAlbum || newPhotos.length > 0,
    },
  });

  revalidatePath("/admin/routes");
  revalidatePath(`/fr/routes`);
  revalidatePath(`/fr/routes/${slug}`);
  redirect(published ? "/admin/routes" : "/admin/routes?status=draft");
}

/**
 * B4 : publication/dépublication en un clic depuis la liste.
 */
export async function toggleRouteStatus(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const id = String(fd.get("id") ?? "");
  const route = await prisma.route.findUnique({ where: { id } });
  if (route) {
    await prisma.route.update({
      where: { id },
      data: { status: route.status === "published" ? "draft" : "published" },
    });
    revalidatePath("/admin/routes");
    revalidatePath("/fr/routes");
    revalidatePath(`/fr/routes/${route.slug}`);
  }
}

/**
 * B4 : suppression d'un itinéraire — cascade base (photos) et nettoyage
 * complet des fichiers disque locaux (GPX, photo principale, album).
 */
export async function deleteRoute(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const id = String(fd.get("id") ?? "");
  const route = await prisma.route.findUnique({
    where: { id },
    include: { photos: true },
  });
  if (!route) return;

  // Fichiers (les anciennes routes Framer ont des images distantes : on ne
  // touche qu'aux fichiers locaux sous /public)
  await unlinkIfExists(path.join(gpxDir(), `${route.slug}.gpx`));
  if (isLocalImage(route.imageUrl)) {
    await unlinkIfExists(path.join(imgDir(), path.basename(route.imageUrl)));
  }
  for (const p of route.photos) {
    if (isLocalImage(p.imageUrl)) {
      await unlinkIfExists(path.join(imgDir(), path.basename(p.imageUrl)));
    }
  }

  await prisma.routePhoto.deleteMany({ where: { routeId: route.id } });
  await prisma.route.delete({ where: { id: route.id } });

  revalidatePath("/admin/routes");
  revalidatePath("/fr/routes");
}
