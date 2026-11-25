import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blocksHash, parseBlocks } from "@/lib/newsletters";
import { generateNewsletterOfMonth, createBlankNewsletter } from "@/app/actions/admin-newsletters";
import NewsletterRowActions from "./newsletter-row-actions";
import "./newsletters.css";

/**
 * Brique N3 « concepteur de newsletters » (spec §6.3) : liste des numéros
 * (statuts brouillon / prêt / envoyée / archivée, test d'envoi valide ou
 * obsolète par version des blocs) + bouton « Générer la newsletter du
 * mois » (rouvre le numéro courant s'il existe déjà : jamais de doublon).
 * L'envoi réel aux souscripteurs arrive avec la brique N4.
 */
export default async function AdminNewslettersPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const nls = await prisma.newsletter.findMany({
    orderBy: { publicationDate: "desc" },
  });

  const statusInfo = (status: string): { label: string; badge: string } => {
    switch (status) {
      case "brouillon":
        return { label: "brouillon", badge: "cf-admin__badge--draft" };
      case "pret":
        return { label: "prêt", badge: "" };
      case "valide_envoyee":
        return { label: "envoyée", badge: "cf-admin__badge--published" };
      default:
        return { label: "archivée", badge: "cf-admin__badge--published" };
    }
  };

  // Test valide = émis ET sur la version actuelle des blocs (empreinte).
  const testInfo = (nl: (typeof nls)[number]): { ok: boolean; label: string } => {
    if (!nl.testedAt) return { ok: false, label: "jamais testé" };
    const upToDate =
      nl.testedBlocksHash === blocksHash(parseBlocks(nl.blocks));
    const date = nl.testedAt.toLocaleDateString("fr-FR");
    return upToDate
      ? { ok: true, label: "à jour (" + date + ")" }
      : { ok: false, label: "obsolète (blocs modifiés)" };
  };

  return (
    <section className="cf-admin__newsletters">
      <div className="cf-admin__head">
        <h1>Newsletters</h1>
        <div className="cf-admin__head-right">
          <form action={createBlankNewsletter} className="cf-nl__new">
            <input
              type="text"
              name="title"
              required
              placeholder="Titre du numéro (ex : Message spécial…)"
            />
            <button type="submit">Nouvelle newsletter</button>
          </form>
          <form action={generateNewsletterOfMonth}>
            <button type="submit">
              Générer la newsletter du mois
            </button>
          </form>
        </div>
      </div>

      <p className="cf-admin__count">
        {nls.length} numéro{nls.length > 1 ? "s" : ""} — les brouillons et les
        numéros « prêts » ne sont JAMAIS visibles sur l&apos;archive publique
        (fr/newsletters) ; seul l&apos;envoi réel (brique N4) les publiera.
      </p>

      {nls.length === 0 ? (
        <p className="cf-admin__empty">
          Aucun numéro pour l'instant. « Générer la newsletter du mois » crée le numéro
          courant pré-rempli : édito à rédiger, sorties à venir figées,
          itinéraire à la une, invitation à adhérer.
        </p>
      ) : (
        <table className="cf-admin__table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Test d&apos;envoi</th>
              <th>Maj</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {nls.map((nl) => {
              const s = statusInfo(nl.status);
              const t = testInfo(nl);
              const sent = nl.status === "valide_envoyee" || nl.status === "archivee";
              return (
                <tr key={nl.id}>
                  <td className="cf-admin__cell-title">{nl.publicationLabel}</td>
                  <td>{nl.title}</td>
                  <td>
                    <span className={`cf-admin__badge ${s.badge}`}>{s.label}</span>
                  </td>
                  <td>
                    <span
                      className={`cf-admin__badge ${t.ok ? "cf-admin__badge--published" : "cf-admin__badge--draft"}`}
                    >
                      {t.label}
                    </span>
                  </td>
                  <td>{nl.updatedAt.toLocaleDateString("fr-FR")}</td>
                  <td>
                    <div className="cf-admin__row-actions">
                      <Link href={`/admin/newsletters/${nl.id}/editer`} className="cf-admin__row-edit">
                        Éditer
                      </Link>
                      <NewsletterRowActions newsletterId={nl.id} sent={sent} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
