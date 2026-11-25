import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blocksHash, parseBlocks } from "@/lib/newsletters";
import NewsletterEditor from "./newsletter-editor";

export const dynamic = "force-dynamic";

/**
 * Éditeur d'un numéro (brique N3, spec §6.2) : en-tête du numéro, blocs
 * réordonnables/masquables, panneau test d'envoi et aperçu fidèle.
 * La version des blocs en base fait foi ; le composant client
 * sérialise ses blocs vers l'action saveNewsletter à l'enregistrement.
 */
export default async function EditNewsletterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const { id } = await params;
  const nl = await prisma.newsletter.findUnique({ where: { id } });
  if (!nl) notFound();

  const blocks = parseBlocks(nl.blocks);
  const testUpToDate =
    nl.testedAt !== null && nl.testedBlocksHash === blocksHash(blocks);

  return (
    <NewsletterEditor
      id={nl.id}
      initialTitle={nl.title}
      initialPublicationLabel={nl.publicationLabel}
      initialSummary={nl.summary}
      initialCoverImageUrl={nl.coverImageUrl ?? ""}
      initialFeatured={nl.featured ?? ""}
      initialStatus={nl.status}
      initialBlocks={blocks}
      testedAtIso={nl.testedAt ? nl.testedAt.toISOString() : null}
      testUpToDate={testUpToDate}
    />
  );
}
