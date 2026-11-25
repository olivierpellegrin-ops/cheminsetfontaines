import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";
import { type NlBlock } from "@/lib/newsletters";

/**
 * Newsletter mensuelle « Les nouvelles du sentier » (brique N3, spec §5.3/§6.2) :
 * rendu du tableau de blocs dans la coquille BaseEmail (charte 600 px,
 * styles inline, pas d'image distante côté coquille ; les photos des blocs
 * sont servies par le site lui-même). Le pied légal (adresse postale,
 * rappel du contexte d'envoi) vient de BaseEmail ; le lien de
 * désinscription est réservé à l'envoi réel (brique N4) et au test.
 */

const C = {
  ink: "#163c32",
  muted: "#43534a",
  line: "#d2dccb",
  gold: "#c08a21",
  tint: "#e8eee4",
};

const h2 = {
  margin: "0 0 12px",
  fontSize: "16px",
  lineHeight: "22px",
  fontWeight: 700,
  color: C.ink,
} as const;

const kicker = {
  margin: "0 0 6px",
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: C.gold,
} as const;

function paragraphs(body: string, style?: Record<string, unknown>) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => (
      <Text
        key={i}
        style={{
          margin: "0 0 10px",
          fontSize: "14px",
          lineHeight: "21px",
          whiteSpace: "pre-line",
          ...(style ?? {}),
        }}
      >
        {p}
      </Text>
    ));
}

function BlockSwitch({
  block,
  adhesionUrl,
}: {
  block: NlBlock;
  adhesionUrl: string;
}) {
  switch (block.type) {
    case "intro":
      return <>{paragraphs(block.body)}</>;
    case "events":
      return (
        <>
          <Text style={kicker}>{block.title ?? "Les sorties à venir"}</Text>
          {block.cards.map((c) => (
            <Section
              key={c.slug}
              style={{
                margin: "0 0 10px",
                padding: "12px 14px",
                backgroundColor: C.tint,
                borderRadius: "10px",
              }}
            >
              <Text style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: C.ink }}>
                {c.title}
              </Text>
              <Text style={{ margin: "0 0 6px", fontSize: "13px", lineHeight: "18px", color: C.muted }}>
                {c.dateLabel}
              </Text>
              {c.details ? (
                <Text style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: "19px", color: C.muted }}>
                  {c.details}
                </Text>
              ) : null}
              <Link href={c.url} style={{ fontSize: "13px", fontWeight: 700, color: C.ink }}>
                Voir la sortie →
              </Link>
            </Section>
          ))}
        </>
      );
    case "route":
      return (
        <>
          <Text style={kicker}>{block.title ?? "Itinéraire à la une"}</Text>
          {block.card.imageUrl ? (
            <img
              src={block.card.imageUrl}
              alt={block.card.imageAlt ?? block.card.title}
              width={600}
              height={338}
              style={{ width: "100%", maxWidth: "600px", height: "auto", borderRadius: "10px", display: "block" }}
            />
          ) : null}
          <Text style={{ ...h2, margin: "12px 0 2px", fontSize: "18px" }}>{block.card.title}</Text>
          <Text style={{ margin: "0 0 8px", fontSize: "13px", color: C.muted }}>
            {block.card.townshipLabel}
          </Text>
          <Text
            style={{
              margin: "0 0 8px",
              padding: "10px 12px",
              border: "1px solid " + C.line,
              borderRadius: "10px",
              fontSize: "14px",
              lineHeight: "21px",
              color: C.muted,
            }}
          >
            {block.card.excerpt}
          </Text>
          {block.note ? (
            <Text style={{ margin: "0 0 8px", fontSize: "14px", lineHeight: "21px", color: C.ink }}>
              {block.note}
            </Text>
          ) : null}
          <Link
            href={block.card.url}
            style={{
              display: "inline-block",
              border: "1px solid " + C.gold,
              color: C.ink,
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "20px",
              padding: "10px 20px",
              borderRadius: "100px",
              textDecoration: "none",
            }}
          >
            Découvrir l&apos;itinéraire
          </Link>
        </>
      );
    case "album":
      return (
        <>
          <Text style={kicker}>{block.title ?? "Photos du mois"}</Text>
          {block.photos.map((p, i) => (
            <Section key={i} style={{ margin: "0 0 12px" }}>
              <img
                src={p.url}
                alt={p.alt ?? ""}
                width={600}
                height={338}
                style={{ width: "100%", maxWidth: "600px", height: "auto", borderRadius: "10px", display: "block" }}
              />
              {p.caption ? (
                <Text style={{ margin: "6px 0 0", fontSize: "12px", lineHeight: "17px", color: C.muted }}>
                  {p.caption}
                </Text>
              ) : null}
            </Section>
          ))}
        </>
      );
    case "texte":
      return (
        <>
          {block.title ? <Text style={{ ...h2, fontSize: "15px" }}>{block.title}</Text> : null}
          {paragraphs(block.body)}
        </>
      );
    case "adhesion":
      return (
        <Section
          style={{
            margin: "6px 0 10px",
            padding: "14px 16px",
            border: "1px solid " + C.gold,
            borderRadius: "12px",
            textAlign: "center",
            backgroundColor: "#fdf9f0",
          }}
        >
          <Text style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: C.ink }}>
            Envie de rejoindre l&apos;association ?
          </Text>
          <Text style={{ margin: "0 0 12px", fontSize: "13px", lineHeight: "19px", color: C.muted }}>
            Marcher ensemble, protéger les paysages qui nous relient. La
            cotisation se règle simplement auprès du bureau : un
            e-mail suffit pour commencer.
          </Text>
          <Link
            href={adhesionUrl}
            style={{
              display: "inline-block",
              border: "1px solid " + C.gold,
              color: C.ink,
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "20px",
              padding: "10px 22px",
              borderRadius: "100px",
              textDecoration: "none",
            }}
          >
            Adhérer à l&apos;association
          </Link>
        </Section>
      );
  }
}

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
  const adhesionUrl = siteUrl + "/fr";
  const visible = blocks.filter((b) => !b.hidden);
  return (
    <BaseEmail
      preview={summary ?? title}
      footerNote={
        "Vous recevez cet e-mail car vous êtes inscrit(e) aux nouvelles du sentier de l'association Chemins et Fontaines. " +
        "Vous pouvez vous désinscrire à tout moment (lien ci-dessous) ou en répondant à cet e-mail : le bureau vous retirera de la liste."
      }
    >
      <Heading
        as="h1"
        style={{ margin: "0 0 4px", fontSize: "22px", lineHeight: "28px", color: C.ink }}
      >
        {title}
      </Heading>
      <Text style={{ margin: "0 0 18px", fontSize: "13px", color: C.muted }}>
        {publicationLabel}
      </Text>
      {visible.map((b, i) => (
        <div key={i}>
          <BlockSwitch block={b} adhesionUrl={adhesionUrl} />
        </div>
      ))}
      <Section
        style={{
          margin: "18px 0 8px",
          paddingTop: "14px",
          borderTop: "1px solid " + C.line,
          textAlign: "center",
        }}
      >
        <Link
          href={unsubscribeUrl}
          style={{ fontSize: "12px", color: C.muted, textDecoration: "underline" }}
        >
          Se désinscrire des nouvelles du sentier
        </Link>
      </Section>
    </BaseEmail>
  );
}
