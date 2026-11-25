import { Body } from "@react-email/body";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Html } from "@react-email/html";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import type { ReactNode } from "react";
import {
  type NlBlock,
  type NlEventCard,
  type NlPhoto,
} from "@/lib/newsletters";

/**
 * Newsletter « Lettre d'information » (N3.6) : rendu CALÉ SUR LE MODÈLE
 * MAILCHIMP de l'association (modèle « CeF - newsletters - 09.26 », HTML
 * fourni par Olivier). Structure du modèle, verrouillée à l'identique :
 * fond de page #f9f9f9, conteneur blanc 660 px, lien « version
 * navigateur », logo d'en-tête (416 px, cliquable), titre h1 20 px vert
 * #4d6b4b, édito 14 px gras centré, QR « Scannez-moi » (110 px, cliquable
 * vers le site), itinéraires groupés par bandes grises de 3 colonnes
 * (commune 18 px, panneau 172 px, nom 14 px, bouton « Accédez »),
 * réseaux sociaux, séparateur 2 px vert, logo de pied (434 px), pied
 * légal 12 px. Textes partout en Helvetica Neue, #4d6b4b, gras, centré.
 *
 * Ce composant NE PASSE PAS par BaseEmail (coquille 600 px de la charte
 * du site) : le modèle Mailchimp est une coquille à part, les autres
 * e-mails transactionnels restent sur BaseEmail. Le lien de
 * désinscription est paramétrique (test = Mailpit, envoi réel = brique N4).
 *
 * NB : depuis le 27/11, les images d'identité (logos, QR, icônes
 * sociales) sont re-hébergées dans public/images/brand — copies
 * conformes des fichiers des CDN Mailchimp/Framer, plus aucune
 * dépendance externe pour l'e-mail.
 *
 * N3.9 : le rendu du CONTENU est exporté séparément (NewsletterContenu)
 * pour être affiché tel quel dans le canvas WYSIWYG de l'admin — même
 * moteur, donc aperçu éditable 100 % fidèle. Le surçouche d'édition
 * (wrapBlock) n'est JAMAIS utilisée pour l'e-mail : avec wrapBlock
 * absent, l'arbre de rendu est identique à celui de la N3.6.
 */

/**
 * N3.9 : enveloppe d'édition posée autour du rendu d'un bloc visible,
 * uniquement par le canvas WYSIWYG de l'admin. `index` = position dans le
 * tableau COMPLET des blocs (y compris masqués), pour que l'éditeur
 * adresse les blocs sans remapping.
 */
export type WrapBlock = (
  index: number,
  block: NlBlock,
  children: ReactNode
) => ReactNode;

/** Palette du modèle Mailchimp (relevé HTML de septembre 2026). */
const C = {
  vert: "#4d6b4b",
  fond: "#f9f9f9",
  blanc: "#ffffff",
  noir: "#000000",
};

const FONT = "'Helvetica Neue', Helvetica, Arial, Verdana, sans-serif";

/**
 * Images d'identité re-hébergées dans public/images/brand (logos, QR,
 * icônes sociales). L'E-MAIL exige des URL absolues : elles sont
 * construites depuis siteUrl (le canvas WYSIWYG de l'admin et la
 * version navigateur passent par la même base).
 */
const brand = (siteUrl: string, fichier: string) =>
  siteUrl + "/images/brand/" + fichier;

/** Paragraphe standard du modèle : 14 px gras #4d6b4b centré, interligne 1,5. */
const pStyle = {
  margin: "0 0 12px",
  fontSize: "14px",
  lineHeight: "21px",
  fontWeight: 700,
  color: C.vert,
  textAlign: "center" as const,
};

/** Titre h1 du modèle : 20 px gras #4d6b4b centré, interligne 1,5. */
const h1Style = {
  margin: "0 0 12px",
  fontSize: "20px",
  lineHeight: "30px",
  fontWeight: 700,
  color: C.vert,
  textAlign: "center" as const,
};

/** Intertitre de colonne/section du modèle : 18 px gras centré. */
const h2Style = {
  margin: "0 0 12px",
  fontSize: "18px",
  lineHeight: "27px",
  fontWeight: 700,
  color: C.vert,
  textAlign: "center" as const,
};

/** Petit texte du pied légal du modèle : 12 px, noir. */
const footStyle = {
  margin: "0 0 12px",
  fontSize: "12px",
  lineHeight: "18px",
  color: C.noir,
  textAlign: "center" as const,
};

/** Découpe un corps de texte en paragraphes (séparés par une ligne vide). */
function paragraphs(body: string, style?: Record<string, unknown>) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => (
      <Text key={i} style={{ ...pStyle, ...(style ?? {}) }}>
        {p}
      </Text>
    ));
}

/**
 * Bouton du modèle « Accédez » : pastille pleine #4d6b4b, coins 8 px,
 * bordure 2 px, texte blanc 16 px, remplissage 16 x 28 px.
 */
function BoutonModele({ href, label }: { href: string; label: string }) {
  return (
    <table
      align="center"
      role="presentation"
      style={{ margin: "0 auto" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: C.vert,
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <a
              href={href}
              target="_blank"
              style={{
                backgroundColor: C.vert,
                borderRadius: "8px",
                border: "2px solid " + C.vert,
                color: C.blanc,
                display: "block",
                fontFamily: FONT,
                fontSize: "16px",
                fontWeight: "normal",
                padding: "16px 28px",
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** QR « Scannez-moi » du modèle : image 110 px centrée, cliquable vers le site. */
function QrModele({ siteUrl, qrSrc }: { siteUrl: string; qrSrc: string }) {
  return (
    <Section align="center" style={{ padding: "12px 24px" }}>
      <a href={siteUrl} target="_blank" style={{ display: "block" }}>
        <img
          src={qrSrc}
          alt="Scannez-moi : le site Chemins et Fontaines"
          width={110}
          style={{
            display: "block",
            width: "110px",
            maxWidth: "100%",
            height: "auto",
            margin: "0 auto",
          }}
        />
      </a>
    </Section>
  );
}

type NlRouteBlock = Extract<NlBlock, { type: "route" }>;

/**
 * Entrée visible d'un bloc, avec son index DANS LE TABLEAU COMPLET
 * (N3.9) : le canvas WYSIWYG adresse les blocs par cet index, sans
 * remapping des blocs masqués.
 */
type EntreeVisible<B extends NlBlock = NlBlock> = { block: B; index: number };

/**
 * Bande grise du modèle (#f9f9f9, marges 24 px) : les itinéraires
 * consécutifs se regroupent par 3 — une colonne 33,33 % par parcours :
 * commune 18 px, image du panneau 172 px (cliquable), nom 14 px,
 * bouton « Accédez » vers la fiche.
 */
function BandeItineraires({
  cards,
  wrapBlock,
}: {
  cards: EntreeVisible<NlRouteBlock>[];
  wrapBlock?: WrapBlock;
}) {
  return (
    <Section
      style={{
        backgroundColor: C.fond,
        paddingTop: "24px",
        paddingBottom: "24px",
        marginTop: "12px",
        marginBottom: "12px",
      }}
    >
      <table
        width="100%"
        role="presentation"
        style={{ borderCollapse: "separate" }}
      >
        <tbody>
          <tr>
            {cards.map((entry) => {
              const blocRoute = entry.block;
              const cell = (
                <>
                  <Text style={h2Style}>{blocRoute.card.townshipLabel}</Text>
                  {blocRoute.card.imageUrl ? (
                    <a
                      href={blocRoute.card.url}
                      target="_blank"
                      style={{ display: "block", margin: "0 0 12px" }}
                    >
                      <img
                        src={blocRoute.card.imageUrl}
                        alt={blocRoute.card.imageAlt ?? blocRoute.card.title}
                        width={172}
                        style={{
                          display: "block",
                          width: "172px",
                          maxWidth: "100%",
                          height: "auto",
                          margin: "0 auto",
                        }}
                      />
                    </a>
                  ) : null}
                  <Text style={pStyle}>{blocRoute.card.title}</Text>
                  {blocRoute.note ? <Text style={pStyle}>{blocRoute.note}</Text> : null}
                  <BoutonModele href={blocRoute.card.url} label="Accédez" />
                </>
              );
              return (
                <td
                  key={blocRoute.card.slug}
                  width="33.33333333333333%"
                  valign="top"
                  style={{ padding: "0 8px", verticalAlign: "top" }}
                >
                  {wrapBlock ? wrapBlock(entry.index, blocRoute, cell) : cell}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

/** Bloc image autonome : centrée, largeur libre (défaut 172 px), lien facultatif. */
function ImageModele({
  src,
  alt,
  width,
  href,
}: {
  src: string;
  alt?: string;
  width?: number;
  href?: string;
}) {
  if (!src) return null;
  const w = width && width > 0 ? width : 172;
  const img = (
    <img
      src={src}
      alt={alt ?? ""}
      width={w}
      style={{
        display: "block",
        width: w + "px",
        maxWidth: "100%",
        height: "auto",
        margin: "12px auto",
        border: 0,
      }}
    />
  );
  return (
    <Section align="center">
      {href ? (
        <a href={href} target="_blank" style={{ display: "block" }}>
          {img}
        </a>
      ) : (
        img
      )}
    </Section>
  );
}

/** Bloc photo d'album : pleine largeur, légende 12 px centrée. */
function PhotoAlbum({ photo, i }: { photo: NlPhoto; i: number }) {
  return (
    <Section key={i} align="center" style={{ padding: "0 16px" }}>
      <img
        src={photo.url}
        alt={photo.alt ?? ""}
        width={628}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "628px",
          height: "auto",
          margin: "12px auto",
          border: 0,
        }}
      />
      {photo.caption ? (
        <Text
          style={{
            margin: "0 0 12px",
            fontSize: "12px",
            lineHeight: "18px",
            color: C.vert,
            textAlign: "center",
          }}
        >
          {photo.caption}
        </Text>
      ) : null}
    </Section>
  );
}

/** Bloc sortie : nom en lien + libellé de date, une ligne centrée par sortie. */
function LigneSortie({ card }: { card: NlEventCard }) {
  return (
    <Text style={pStyle}>
      <a href={card.url} target="_blank" style={{ color: C.vert, textDecoration: "none" }}>
        {card.title}
      </a>
      {" — " + card.dateLabel}
    </Text>
  );
}

/**
 * Rendu d'un bloc autonome (tout sauf les itinéraires, regroupés en
 * bandes par le composant principal).
 */
function BlocSansGroupe({ block, adhesionUrl }: { block: NlBlock; adhesionUrl: string }) {
  switch (block.type) {
    case "intro":
      return (
        <Section style={{ padding: "0 16px" }}>{paragraphs(block.body)}</Section>
      );
    case "events":
      return (
        <Section style={{ padding: "0 16px", marginTop: "12px" }}>
          <Text style={h2Style}>{block.title ?? "Les sorties à venir"}</Text>
          {block.cards.map((c) => (
            <LigneSortie key={c.slug} card={c} />
          ))}
        </Section>
      );
    case "album":
      return (
        <Section style={{ marginTop: "12px" }}>
          {block.title ? (
            <Section style={{ padding: "0 16px" }}>
              <Text style={h2Style}>{block.title}</Text>
            </Section>
          ) : null}
          {block.photos.map((p, i) => (
            <PhotoAlbum key={i} photo={p} i={i} />
          ))}
        </Section>
      );
    case "texte":
      return (
        <Section style={{ padding: "0 16px", marginTop: "12px" }}>
          {block.title ? <Text style={h2Style}>{block.title}</Text> : null}
          {paragraphs(block.body)}
        </Section>
      );
    case "image":
      return (
        <ImageModele src={block.src} alt={block.alt} width={block.width} href={block.href} />
      );
    case "bouton":
      if (!block.label || !block.href) return null;
      return (
        <Section style={{ padding: "12px 16px" }}>
          <BoutonModele href={block.href} label={block.label} />
        </Section>
      );
    case "separateur":
      return (
        <Section
          style={{
            padding: "20px 48px",
            marginTop: "12px",
            marginBottom: "12px",
          }}
        >
          <table
            width="100%"
            role="presentation"
            style={{ width: "100%", backgroundColor: "transparent" }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    borderTopWidth: "2px",
                    borderTopStyle: "solid",
                    borderTopColor: C.vert,
                    fontSize: 0,
                    lineHeight: 0,
                  }}
                >
                  {" "}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      );
    case "adhesion":
      return (
        <Section style={{ padding: "0 16px", marginTop: "24px", marginBottom: "12px" }}>
          <Text style={h2Style}>Envie de rejoindre l&apos;association ?</Text>
          <Text style={pStyle}>
            Marcher ensemble, protéger les paysages qui nous relient. La
            cotisation se règle simplement auprès du bureau : un e-mail
            suffit pour commencer.
          </Text>
          <BoutonModele href={adhesionUrl} label="Adhérer à l'association" />
        </Section>
      );
    case "route":
      // Les blocs itinéraire sont regroupés en bandes par le composant
      // principal : ce cas n'est jamais atteint individuellement.
      return null;
  }
}

/**
 * Élément de séquence : un bloc autonome, ou une bande de 3 colonnes
 * d'itinéraires (chunks de parcours consécutifs). `index` = position du
 * bloc dans le tableau COMPLET (N3.9), pour que le canvas adresse le
 * bon bloc sans recalcul.
 */
type NlItem =
  | { kind: "bloc"; block: NlBlock; index: number }
  | { kind: "bande"; cards: EntreeVisible<NlRouteBlock>[] };

/**
 * N3.9 : CONTENU de la newsletter (conteneur blanc 660 px, sans la
 * coquille <html>/<body> réservée à l'e-mail). Rendu tel quel par le
 * canvas WYSIWYG de l'admin : mêmes composants, même gabarit que
 * l'e-mail envoyé — d'où un aperçu éditable 100 % fidèle.
 */
export function NewsletterContenu({
  title,
  publicationLabel,
  blocks,
  siteUrl,
  unsubscribeUrl,
  wrapBlock,
}: {
  title: string;
  publicationLabel: string;
  blocks: NlBlock[];
  siteUrl: string; // base du site (liens interns complets)
  unsubscribeUrl: string; // lien de désinscription 1 clic (test ou envoi réel)
  wrapBlock?: WrapBlock;
}) {
  const adhesionUrl = siteUrl + "/fr";
  const webVersionUrl = siteUrl + "/fr/newsletters";
  const logoHeader = brand(siteUrl, "mail-logo-header.png");
  const logoFooter = brand(siteUrl, "mail-logo-footer.png");
  const icons = {
    facebook: brand(siteUrl, "icon-facebook.png"),
    instagram: brand(siteUrl, "icon-instagram.png"),
    website: brand(siteUrl, "icon-website.png"),
  };
  const visibles: EntreeVisible[] = blocks
    .map((block, index) => ({ block, index }))
    .filter((e) => !e.block.hidden);

  // Regroupement : les itinéraires CONSECUTIFS forment des bandes de 3
  // colonnes, à l'identique du modèle (2 bandes de 3 pour 6 parcours).
  const items: NlItem[] = [];
  let run: EntreeVisible<NlRouteBlock>[] = [];
  const vider = () => {
    while (run.length > 0) {
      items.push({ kind: "bande", cards: run.slice(0, 3) });
      run = run.slice(3);
    }
  };
  for (const e of visibles) {
    if (e.block.type === "route") {
      run.push({ block: e.block, index: e.index });
      continue;
    }
    vider();
    items.push({ kind: "bloc", block: e.block, index: e.index });
  }
  vider();

  // QR du modèle : rendu juste après le bloc édito (en tête du numéro,
  // à l'identique du modèle qui le place entre l'édito et la 1re bande).
  // Sans édito en tête de blocs, pas de QR (cas rare : le numéro reste maître).
  let qrRestant = visibles.length > 0 && visibles[0].block.type === "intro";

  return (
    <Container
      style={{
        maxWidth: "660px",
        margin: "0 auto",
        backgroundColor: C.blanc,
      }}
    >
      {/* Lien « version navigateur » du modèle (b1). */}
      <Section style={{ padding: "0 16px" }}>
        <Text style={footStyle}>
          <a href={webVersionUrl} target="_blank" style={{ color: C.noir }}>
            Voir cette newsletter dans votre navigateur
          </a>
        </Text>
      </Section>

      {/* Logo d'en-tête du modèle (b2) : 416 px, cliquable. */}
      <Section align="center" style={{ padding: "12px 24px" }}>
        <a href={siteUrl} target="_blank" style={{ display: "block" }}>
          <img
            src={logoHeader}
            alt="Chemins et Fontaines"
            width={416}
            style={{
              display: "block",
              width: "416px",
              maxWidth: "100%",
              height: "auto",
              margin: "0 auto",
              border: 0,
            }}
          />
        </a>
      </Section>

      {/* Titres du modèle (b5) : « Lettre d'information - <numéro> » + titre du numéro. */}
      <Section style={{ padding: "0 16px" }}>
        <Text style={h1Style}>{"Lettre d'information" + (publicationLabel ? " - " + publicationLabel : "")}</Text>
        {title ? <Text style={h1Style}>{title}</Text> : null}
      </Section>

      {items.map((item, i) => {
        if (item.kind === "bande") {
          return <BandeItineraires key={i} cards={item.cards} wrapBlock={wrapBlock} />;
        }
        const contenu = (
          <BlocSansGroupe key={i} block={item.block} adhesionUrl={adhesionUrl} />
        );
        const avecQr = qrRestant;
        qrRestant = false;
        return avecQr ? (
          <div key={i} style={{ display: "contents" }}>
            {wrapBlock ? wrapBlock(item.index, item.block, contenu) : contenu}
            <QrModele siteUrl={siteUrl} qrSrc={brand(siteUrl, "qr-site.png")} />
          </div>
        ) : wrapBlock ? (
          wrapBlock(item.index, item.block, contenu)
        ) : (
          contenu
        );
      })}

      {/* Réseaux sociaux du modèle (b39) : Facebook, Instagram, site. */}
      <Section style={{ padding: "48px 0 24px" }}>
        <table align="center" role="presentation">
          <tbody>
            <tr>
              <td style={{ padding: "3px 12px" }}>
                <a href="https://www.facebook.com/profile.php?id=61568993068777" target="_blank">
                  <img src={icons.facebook} width={24} height={24} alt="Facebook" className="mceSocialFollowImage" style={{ display: "block", border: 0 }} />
                </a>
              </td>
              <td style={{ padding: "3px 12px" }}>
                <a href="https://www.instagram.com/" target="_blank">
                  <img src={icons.instagram} width={24} height={24} alt="Instagram" className="mceSocialFollowImage" style={{ display: "block", border: 0 }} />
                </a>
              </td>
              <td style={{ padding: "3px 12px" }}>
                <a href={siteUrl} target="_blank">
                  <img src={icons.website} width={24} height={24} alt="Site web" className="mceSocialFollowImage" style={{ display: "block", border: 0 }} />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Séparateur du modèle (b40) : 2 px vert. */}
      <Section style={{ padding: "20px 48px" }}>
        <table width="100%" role="presentation" style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td
                style={{
                  borderTopWidth: "2px",
                  borderTopStyle: "solid",
                  borderTopColor: C.vert,
                  fontSize: 0,
                  lineHeight: 0,
                }}
              >
                {" "}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Logo de pied du modèle (b41) : 434 px, cliquable. */}
      <Section align="center" style={{ padding: "12px 24px", backgroundColor: C.blanc }}>
        <a href={siteUrl} target="_blank" style={{ display: "block" }}>
          <img
            src={logoFooter}
            alt="Chemins et Fontaines"
            width={434}
            style={{
              display: "block",
              width: "434px",
              maxWidth: "100%",
              height: "auto",
              margin: "0 auto",
              border: 0,
            }}
          />
        </a>
      </Section>

      {/* Pied légal du modèle (b45) : copyright, adresse postale, désinscription. */}
      <Section style={{ padding: "12px 16px 24px" }}>
        <Text style={footStyle}>
          {"Copyright (C) " + new Date().getFullYear() + " Chemins et Fontaines. Tous droits réservés."}
        </Text>
        <Text style={footStyle}>
          Notre adresse postale : 14 Le Sirieix, 19220 Bassignac-le-Haut, France
        </Text>
        <Text style={footStyle}>
          Vous ne souhaitez plus recevoir ces e-mails ?{" "}
          <a href={unsubscribeUrl} target="_blank" style={{ color: C.noir }}>
            Vous pouvez vous désinscrire
          </a>{" "}
          ou en répondant à cet e-mail : le bureau vous retirera de la liste.
        </Text>
      </Section>
    </Container>
  );
}

/**
 * Coquille e-mail complète (N3.6) : <html>/<head>/<body> autour du
 * contenu. Le rendu texte/HTML de l'e-mail et de l'aperçu passe par
 * lib/newsletter-engine.tsx ; l'admin affiche NewsletterContenu
 * directement dans son canvas (N3.9) — jamais <html> imbriqué.
 */
export function NewsletterMensuelle({
  title,
  publicationLabel,
  blocks,
  siteUrl,
  unsubscribeUrl,
  summary,
}: {
  title: string;
  publicationLabel: string;
  blocks: NlBlock[];
  siteUrl: string; // base du site (liens internes complets)
  unsubscribeUrl: string; // lien de désinscription 1 clic (test ou envoi réel)
  summary?: string;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{summary ?? title}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "24px 0",
          backgroundColor: C.fond,
          fontFamily: FONT,
        }}
      >
        <NewsletterContenu
          title={title}
          publicationLabel={publicationLabel}
          blocks={blocks}
          siteUrl={siteUrl}
          unsubscribeUrl={unsubscribeUrl}
        />
      </Body>
    </Html>
  );
}
