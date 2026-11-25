import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";

/**
 * nl_confirmation (e-mail n°5 de la spec §5.3, brique N1) : demande au
 * souscripteur de confirmer son inscription (double opt-in). Le lien est
 * à usage unique, valable 30 jours (spec §5.2). Sans confirmation, aucune
 * newsletter ne sera jamais envoyée à cette adresse.
 */

export function NlConfirmation({
  firstName,
  confirmUrl,
}: {
  firstName?: string | null;
  confirmUrl: string;
}) {
  const hello = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  return (
    <BaseEmail
      preview="Un clic pour confirmer votre inscription aux nouvelles du sentier"
      footerNote="Vous recevez cet e-mail car une inscription à la lettre d'informations de l'association a été demandée depuis cette adresse. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : rien ne sera enregistré sans votre confirmation."
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
        Confirmez votre inscription
      </Heading>
      <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "22px" }}>
        {hello} merci de votre intérêt pour les nouvelles du sentier !
      </Text>
      <Text
        style={{
          margin: "0 0 24px",
          fontSize: "14px",
          lineHeight: "22px",
          color: "#43534a",
        }}
      >
        Il ne reste qu'une étape : cliquez sur le bouton ci-dessous pour
        confirmer votre inscription. Vous recevrez ensuite notre lettre
        d'informations une fois par mois, le 1er de chaque mois.
      </Text>
      <Section style={{ margin: "0 0 24px", textAlign: "center" }}>
        <Link
          href={confirmUrl}
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
          Confirmer mon inscription
        </Link>
      </Section>
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: "12px",
          lineHeight: "18px",
          color: "#43534a",
        }}
      >
        Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre
        navigateur :
      </Text>
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: "12px",
          lineHeight: "18px",
          wordBreak: "break-all",
        }}
      >
        <Link href={confirmUrl} style={{ color: "#163c32" }}>
          {confirmUrl}
        </Link>
      </Text>
      <Text style={{ margin: 0, fontSize: "12px", lineHeight: "18px", color: "#43534a" }}>
        Ce lien est personnel, à usage unique et valable 30 jours.
      </Text>
    </BaseEmail>
  );
}
