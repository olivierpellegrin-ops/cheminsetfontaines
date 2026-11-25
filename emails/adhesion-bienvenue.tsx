import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";

/**
 * adhesion_bienvenue (e-mail n°3 du parcours adhérents, spec §5.3, brique
 * N2) : envoyé quand le bureau valide la cotisation de la saison — le
 * membre est créé et son adhésion enregistrée pour l'année civile en cours.
 */

export function AdhesionBienvenue({
  firstName,
  season,
  siteUrl,
}: {
  firstName?: string | null;
  season: number;
  siteUrl: string;
}) {
  const hello = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  return (
    <BaseEmail
      preview={`Votre adhésion ${season} est enregistrée : bienvenue !`}
      footerNote="Vous recevez cet e-mail parce que le bureau de l'association vient d'enregistrer votre cotisation. Ce message ne donne accès à aucun espace privé : vos données restent dans la base de l'association, que vous pouvez faire rectifier ou effacer à tout moment en nous écrivant."
    >
      <Heading
        as="h1"
        style={{
          margin: "0 0 16px",
          fontSize: "22px",
          lineHeight: "28px",
          color: "#163c32",
        }}
      >
        Bienvenue parmi les marcheurs !
      </Heading>
      <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "22px" }}>
        {hello} votre adhésion à Chemins et Fontaines pour la saison {season}{" "}
        est bien enregistrée. Merci de votre soutien !
      </Text>
      <Text
        style={{
          margin: "0 0 20px",
          fontSize: "14px",
          lineHeight: "22px",
          color: "#43534a",
        }}
      >
        Vous recevrez les annonces des sorties sur le site, et la lettre
        d'informations mensuelle si vous l'avez demandée. Bonne route !
      </Text>
      <Section style={{ margin: "0 0 8px", textAlign: "center" }}>
        <Link
          href={siteUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#c08a21",
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: "15px",
            lineHeight: "20px",
            padding: "13px 28px",
            borderRadius: "100px",
            textDecoration: "none",
          }}
        >
          Découvrir le site de l'association
        </Link>
      </Section>
      <Text style={{ margin: 0, fontSize: "12px", lineHeight: "18px", color: "#43534a" }}>
        Une question, un changement d'adresse ? Écrivez-nous simplement en
        répondant à cet e-mail.
      </Text>
    </BaseEmail>
  );
}
