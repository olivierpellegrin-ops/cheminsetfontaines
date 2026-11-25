import { Body } from "@react-email/body";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import type { ReactNode } from "react";

/**
 * Coquille commune des e-mails de l'association (charte du site) :
 * vert #163c32, fond clair #e8eee4, bordure #d2dccb, accent #c08a21.
 * Largeur 600 px, styles inline (rendu React Email) : pas d'image distante,
 * polices system. Colonne `footerNote` obligatoire : rappel du contexte
 * d'envoi (RGPD).
 *
 * NB : paquets @react-email/* individuels (mêmes versions que celles pingées
 * par l'agrégat @react-email/components@1.0.12) plutôt que l'agrégat :
 * ce dernier impose tailwindcss + prismjs + marked, inutiles ici.
 */

const STYLE = {
  bodyBg: "#f2f6f1",
  ink: "#163c32",
  muted: "#43534a",
  line: "#d2dccb",
  gold: "#c08a21",
  tint: "#e8eee4",
};

const POSTAL_ADDRESS =
  "Chemins et Fontaines, 14 Le Sirieix, 19220 Bassignac-Le-Haut, France";

export function BaseEmail({
  preview,
  footerNote,
  children,
}: {
  preview: string;
  footerNote: string;
  children: ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "24px 0",
          backgroundColor: STYLE.bodyBg,
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          color: STYLE.ink,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            border: `1px solid ${STYLE.line}`,
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <Section style={{ backgroundColor: STYLE.ink, padding: "24px 32px" }}>
            <Text
              style={{
                margin: 0,
                color: STYLE.tint,
                fontSize: "12px",
                letterSpacing: "2px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              Chemins et Fontaines
            </Text>
            <Text
              style={{
                margin: "6px 0 0",
                color: STYLE.gold,
                fontSize: "13px",
                lineHeight: "18px",
              }}
            >
              Marcher ensemble, protéger les paysages qui nous relient.
            </Text>
          </Section>
          <Section style={{ padding: "32px" }}>{children}</Section>
          <Hr style={{ margin: "0", borderColor: STYLE.line }} />
          <Section style={{ padding: "20px 32px", backgroundColor: STYLE.tint }}>
            <Text
              style={{
                margin: 0,
                fontSize: "11px",
                lineHeight: "16px",
                color: STYLE.muted,
              }}
            >
              {footerNote}
            </Text>
            <Text
              style={{
                margin: "8px 0 0",
                fontSize: "11px",
                lineHeight: "16px",
                color: STYLE.muted,
              }}
            >
              Association Chemins et Fontaines · {POSTAL_ADDRESS}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
