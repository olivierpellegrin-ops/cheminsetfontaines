import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";

/**
 * adhesion_renouvellement (e-mail n°4 du parcours adhérents, spec §5.3,
 * brique N2) : rappel de renouvellement envoyé par le bureau à la cohorte
 * « à renouveler » (actifs sans cotisation de la saison en cours), jamais
 * deux fois à moins de 30 jours d'intervalle pour un même membre.
 */

export function AdhesionRenouvellement({
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
      preview={`Votre adhésion pour la saison ${season} : un petit rappel pour renouveler`}
      footerNote={`Vous recevez cet e-mail car vous avez été membre de l'association et que le renouvellement de la saison ${season} n'a pas encore été enregistré. Si vous ne souhaitez plus recevoir ces rappels, répondez simplement à cet e-mail : le bureau vous retirera de la liste.`}
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
        Votre adhésion pour la saison {season}
      </Heading>
      <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "22px" }}>
        {hello} la nouvelle année arrive, et avec elle le moment de renouveler
        votre adhésion aux Chemins et Fontaines pour la saison {season}.
      </Text>
      <Text
        style={{
          margin: "0 0 20px",
          fontSize: "14px",
          lineHeight: "22px",
          color: "#43534a",
        }}
      >
        Comme chaque année, la cotisation se règle hors-ligne : remettez-la à
        un membre du bureau lors d'une sortie, par courrier, ou lors de
        l'assemblée générale. Dès réception, votre adhésion {season} sera
        enregistrée et vous serez de nouveau à jour.
      </Text>
      <Section style={{ margin: "0 0 8px", textAlign: "center" }}>
        <Link
          href={siteUrl}
          style={{
            display: "inline-block",
            border: "1px solid #c08a21",
            color: "#163c32",
            fontWeight: "bold",
            fontSize: "15px",
            lineHeight: "20px",
            padding: "12px 26px",
            borderRadius: "100px",
            textDecoration: "none",
          }}
        >
          Voir les sorties de la saison {season}
        </Link>
      </Section>
      <Text style={{ margin: 0, fontSize: "12px", lineHeight: "18px", color: "#43534a" }}>
        Merci pour votre soutien, et à bientôt sur les chemins.
      </Text>
    </BaseEmail>
  );
}
