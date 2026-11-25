"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/service";
import { emailBaseUrl } from "@/lib/mail/notifications";
import { normalizeSlug } from "@/lib/slug";
import { generateMonthlyNewsletter, renderNewsletter } from "@/lib/newsletter-engine";
import { blocksHash, parseBlocks, type NlBlock } from "@/lib/newsletters";
import { modeleStandardBlocks } from "@/lib/newsletter-modele";

/**
 * Server Actions du back-office (brique N3, spec §6.3) : génération du
 * numéro du mois, enregistrement de l'éditeur par blocs, passage « prêt »,
 * test d'envoi (garde-fou vérifiable en base pour l'envoi réel N4) et
 * suppression d'un brouillon.
 *
 * Jamais d'API d'écriture : session vérifiée dans chaque action.
 */

export type NlFormState = { ok: boolean; message: string } | null;

/** Adresse du test : simple garde de format. */
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/**
 * « Générer la newsletter du mois » (spec §6.3) : crée le numéro du mois
 * courant si absent, sinon ROUVRE l'existant (jamais de doublon), puis
 * redirige vers l'éditeur.
 */
export async function generateNewsletterOfMonth(): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await generateMonthlyNewsletter();
  revalidatePath("/admin/newsletters");
  redirect("/admin/newsletters/" + id + "/editer");
}

/**
 * Enregistrement de l'éditeur : champs d'en-tête + tableau de blocs JSON
 * sérialisé par le composant client. Toute modification des blocs
 * invalide le test d'envoi (empreinte testedBlocksHash) et repasse un
 * numéro « pret » en brouillon (le relecture doit suivre l'édition).
 */
export async function saveNewsletter(
  _prev: NlFormState,
  fd: FormData
): Promise<NlFormState> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const summary = String(fd.get("summary") ?? "").trim();
  const coverImageUrl = String(fd.get("coverImageUrl") ?? "").trim() || null;
  const featured = String(fd.get("featured") ?? "").trim() || null;
  // Libellé « Numéro » éditable (ex : « Septembre 2026 » ou « Message
  // spécial ») : champ vide = inchangé (garde anti-effacement accidentel).
  const publicationLabel = String(fd.get("publicationLabel") ?? "").trim();

  let blocks: NlBlock[];
  try {
    blocks = parseBlocks(JSON.parse(String(fd.get("blocks") ?? "[]")));
  } catch {
    return { ok: false, message: "Contenu illisible : enregistrement refusé." };
  }
  if (!id || !title) {
    return { ok: false, message: "Le titre du numéro est obligatoire." };
  }
  const nl = await prisma.newsletter.findUnique({ where: { id } });
  if (!nl) return { ok: false, message: "Numéro introuvable." };
  if (nl.status === "valide_envoyee" || nl.status === "archivee") {
    return { ok: false, message: "Ce numéro a déjà été envoyé : il n'est plus modifiable." };
  }

  const hash = blocksHash(blocks);
  const testInvalidated = nl.testedBlocksHash !== null && nl.testedBlocksHash !== hash;

  await prisma.newsletter.update({
    where: { id },
    data: {
      title,
      summary,
      coverImageUrl,
      featured,
      ...(publicationLabel ? { publicationLabel } : {}),
      blocks: blocks as unknown as Prisma.InputJsonValue,
      ...(testInvalidated ? { testedAt: null, testedBlocksHash: null } : {}),
      ...(nl.status === "pret" ? { status: "brouillon" as const } : {}),
    },
  });

  revalidatePath("/admin/newsletters");
  revalidatePath("/admin/newsletters/" + id + "/editer");
  return {
    ok: true,
    message: testInvalidated
      ? "Enregistré. Le contenu a changé depuis le dernier test : un nouveau test est requis avant l'envoi."
      : "Enregistré.",
  };
}

/** Workflow (spec §6.3) : brouillon → pret (prêt pour relecture/validation). */
export async function markNewsletterReady(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const nl = await prisma.newsletter.findUnique({ where: { id } });
  if (!nl || nl.status !== "brouillon") return;

  await prisma.newsletter.update({ where: { id }, data: { status: "pret" } });
  revalidatePath("/admin/newsletters");
  revalidatePath("/admin/newsletters/" + id + "/editer");
}

/**
 * Test d'envoi (spec §5.3 `newsletter_test`, §6.3) : rend le numéro
 * courant (blocs en base) et l'envoie à l'adresse voulue. Le lien de
 * désinscription est fidèle : celui du souscripteur si l'adresse est
 * inscrite. Succès comme absence de configuration SMTP valident le
 * test (l'empreinte de la version est enregistrée) ; le blocage par
 * la brique N4 exigera ce test sur la MÊME version des blocs.
 */
export async function sendNewsletterTest(
  _prev: NlFormState,
  fd: FormData
): Promise<NlFormState> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "").trim().toLowerCase();
  if (!to || !isEmail(to)) {
    return { ok: false, message: "Adresse e-mail de test invalide." };
  }
  const nl = await prisma.newsletter.findUnique({ where: { id } });
  if (!nl) return { ok: false, message: "Numéro introuvable." };
  if (nl.status === "valide_envoyee" || nl.status === "archivee") {
    return { ok: false, message: "Ce numéro a déjà été envoyé." };
  }

  const base = emailBaseUrl();
  const blocks = parseBlocks(nl.blocks);

  // Lien de désinscription fidèle pour l'adresse de test.
  const subscriber = await prisma.subscriber.findUnique({ where: { email: to } });
  let unsubToken = subscriber?.unsubToken ?? null;
  if (subscriber && subscriber.status === "subscribed" && !unsubToken) {
    unsubToken = randomBytes(32).toString("hex");
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { unsubToken },
    });
  }
  const unsubscribeUrl = unsubToken
    ? base + "/fr/newsletters/desinscription?token=" + unsubToken
    : base + "/fr/newsletters";

  const { html, text } = await renderNewsletter(
    { title: nl.title, summary: nl.summary, publicationLabel: nl.publicationLabel, blocks: nl.blocks },
    { unsubscribeUrl }
  );

  const res = await sendMail({
    kind: "newsletter_test",
    to,
    subject: "[Test] " + nl.title,
    html,
    text,
    newsletterId: nl.id,
  });

  if (res.status === "failed") {
    return {
      ok: false,
      message: "Échec de l'envoi du test (" + res.error + "). Le test n'est pas validé.",
    };
  }

  await prisma.newsletter.update({
    where: { id },
    data: {
      testedAt: new Date(),
      testedBlocksHash: blocksHash(blocks),
    },
  });
  revalidatePath("/admin/newsletters");
  revalidatePath("/admin/newsletters/" + id + "/editer");

  return {
    ok: true,
    message:
      res.status === "sent"
        ? "Test envoyé à " + to + ". Le test valide cette version des blocs."
        : "Test enregistré mais AUCUN e-mail n'est parti (SMTP_HOST absent : Mailpit en local, à configurer en prod). La version est validée pour l'envoi réel.",
  };
}

/** Suppression d'un numéro NON envoyé (brouillon ou pret uniquement). */
export async function deleteNewsletterDraft(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const nl = await prisma.newsletter.findUnique({ where: { id } });
  if (!nl) return;
  if (nl.status === "valide_envoyee" || nl.status === "archivee") return;

  await prisma.emailOutbox.deleteMany({ where: { newsletterId: id } });
  await prisma.newsletter.delete({ where: { id } });

  revalidatePath("/admin/newsletters");
}

/**
 * Duplication d'un numéro (retour Olivier du 25/11 : « newsletter
 * exceptionnelle » — message particulier, don, nouvel évènement) :
 * la CONCEPTION entière (blocs, couverture, à la une) est copiée en
 * brouillon, titre et libellé « Numéro » restent éditables dans
 * l'éditeur. Le test d'envoi repart de zéro (jamais hérité : la copie
 * est une nouvelle version à relire et re-tester).
 */
export async function duplicateNewsletter(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const id = String(fd.get("id") ?? "");
  const nl = await prisma.newsletter.findUnique({ where: { id } });
  if (!nl) return;

  // Slug unique : <slug>-copie, puis suffixe numérique si collision.
  let slug = (nl.slug + "-copie").slice(0, 80);
  let n = 2;
  while (await prisma.newsletter.findUnique({ where: { slug } })) {
    slug = (nl.slug + "-copie-" + n).slice(0, 80);
    n++;
  }

  const copy = await prisma.newsletter.create({
    data: {
      slug,
      title: nl.title + " (copie)",
      publicationDate: new Date(),
      publicationLabel: nl.publicationLabel,
      summary: nl.summary,
      coverImageUrl: nl.coverImageUrl,
      featured: nl.featured,
      status: "brouillon",
      blocks: nl.blocks ?? Prisma.DbNull,
      snapshot: nl.snapshot ?? Prisma.DbNull,
    },
  });

  revalidatePath("/admin/newsletters");
  redirect("/admin/newsletters/" + copy.id + "/editer");
}

/**
 * Numéro vierge (retour Olivier du 25/11) : édito vide + invitation à
 * adhérer, tout le reste se compose dans l'éditeur via les blocs. Le
 * titre saisi devient le libellé « Numéro » (éditable ensuite).
 */
export async function createBlankNewsletter(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const title = String(fd.get("title") ?? "").trim();
  if (!title) {
    revalidatePath("/admin/newsletters");
    return;
  }

  const base = normalizeSlug(title) || "newsletter";
  let slug = base;
  let n = 2;
  while (await prisma.newsletter.findUnique({ where: { slug } })) {
    slug = (base + "-" + n).slice(0, 80);
    n++;
  }

  const blocks: NlBlock[] = [
    { type: "intro", body: "" },
    { type: "adhesion" },
  ];

  const nl = await prisma.newsletter.create({
    data: {
      slug,
      title,
      publicationDate: new Date(),
      publicationLabel: title,
      summary: "",
      status: "brouillon",
      blocks: blocks as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/newsletters");
  redirect("/admin/newsletters/" + nl.id + "/editer");
}

/**
 * « Créer d'après le modèle standard » (brique N3.7) : nouveau numéro
 * parti de la newsletter de septembre 2026 reconstruite en blocs
 * (édito, 6 itinéraires commune/vignette/lien, texte du bureau,
 * invitation à adhérer) — la structure complète du modèle Mailchimp,
 * prête à retoucher ou à dupliquer.
 */
export async function createNewsletterModele(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const title = String(fd.get("title") ?? "").trim();
  const numero = String(fd.get("numero") ?? "").trim();
  if (!title) {
    revalidatePath("/admin/newsletters");
    return;
  }

  const label = numero || title;
  const base = normalizeSlug(label) || "newsletter";
  let slug = base;
  let n = 2;
  while (await prisma.newsletter.findUnique({ where: { slug } })) {
    slug = (base + "-" + n).slice(0, 80);
    n++;
  }

  const blocks = modeleStandardBlocks();

  const nl = await prisma.newsletter.create({
    data: {
      slug,
      title,
      publicationDate: new Date(),
      publicationLabel: label,
      summary: "",
      status: "brouillon",
      blocks: blocks as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/newsletters");
  redirect("/admin/newsletters/" + nl.id + "/editer");
}
