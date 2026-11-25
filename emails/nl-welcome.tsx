import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";

/**
 * nl_bienvenue (e-mail n°6 de la spec §5.3, brique N1) : envoyé juste
 * après le clic de confirmation du double opt-in. Contient le lien direct
 * vers la dernière archive (spec §5.2) et rappelle la promesse d'envoi.
 */

export function NlWelcome({
  firstName,
  archiveUrl,
}: {
  firstName?: string | null;
  archiveUrl: string;
}) {
  const hello = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  return (
    <BaseEmail
      preview="Votre inscription aux nouvelles du sentier est confirmée"
      footerNote="Vous recevez cet e-mail car vous venez de confirmer votre inscription à la lettre d'informations de l'association. Chaque e-mail envoyé contiendra un lien de désinscription en 1 clic."
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
        C'est confirmé, bienvenue !
      </Heading>
      <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "22px" }}>
        {hello} votre inscription aux nouvelles du sentier est bien
        enregistrée.
      </Text>
      <Text
        style={{
          margin: "0 0 24px",
          fontSize: "14px",
          lineHeight: "22px",
          color: "#43534a",
        }}
      >
        Vous recevrez notre lettre d'informations une fois par mois, le
        1<sup>er</sup> de chaque mois : les sorties à venir, un itinéraire à
        la une et les nouvelles de l'association. En attendant la prochaine
        édition, vous pouvez relire les précédentes :
      </Text>
      <Section style={{ margin: "0 0 24px", textAlign: "center" }}>
        <Link
          href={archiveUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#163c32",
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: "15px",
            lineHeight: "20px",
            padding: "13px 28px",
            borderRadius: "100px",
            textDecoration: "none",
          }}
        >
          Lire les dernières nouvelles
        </Link>
      </Section>
      <Text style={{ margin: 0, fontSize: "12px", lineHeight: "18px", color: "#43534a" }}>
        Pour ne plus recevoir ces e-mails, chaque newsletter contient un lien
        de désinscription en 1 clic.
      </Text>
    </BaseEmail>
  );
}
