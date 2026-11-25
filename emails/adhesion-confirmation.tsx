import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";

/**
 * adhesion_confirmation (e-mail n°1 du parcours adhérents, spec §5.3,
 * brique N2) : récapitulatif de la demande + lien de confirmation à usage
 * unique, valable 30 jours (spec §5.1). Sans confirmation, la demande
 * restera sans suite ; aucune donnée personnelle ne figure dans l'URL.
 */

export function AdhesionConfirmation({
  firstName,
  lastName,
  confirmUrl,
  recap,
}: {
  firstName?: string | null;
  lastName?: string | null;
  confirmUrl: string;
  recap: { label: string; value: string }[];
}) {
  const hello = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const signature = [firstName, lastName].filter(Boolean).join(" ");
  return (
    <BaseEmail
      preview="Confirmez votre demande d'adhésion : un clic pour finaliser"
      footerNote="Vous recevez cet e-mail car une demande d'adhésion a été enregistrée depuis cette adresse sur le site de l'association. Sans confirmation de votre part, la demande restera sans suite. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail."
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
        Confirmez votre demande d'adhésion
      </Heading>
      <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "22px" }}>
        {hello} merci pour votre demande d'adhésion à Chemins et Fontaines !
      </Text>
      <Text
        style={{
          margin: "0 0 20px",
          fontSize: "14px",
          lineHeight: "22px",
          color: "#43534a",
        }}
      >
        Dernière étape avant que le bureau ne finalise votre adhésion :
        confirmez votre adresse e-mail en cliquant sur le bouton ci-dessous.
        Votre cotisation est encaissée par le bureau (chèque, virement ou
        espèces) ; vous recevrez ensuite un e-mail de bienvenue.
      </Text>
      {recap.length > 0 && (
        <Section
          style={{
            margin: "0 0 20px",
            padding: "14px 16px",
            backgroundColor: "#f2f6f1",
            border: "1px solid #d2dccb",
            borderRadius: "10px",
          }}
        >
          {recap.map((r) => (
            <Text
              key={r.label}
              style={{ margin: "0 0 4px", fontSize: "13px", lineHeight: "20px" }}
            >
              <strong>{r.label} :</strong> {r.value}
            </Text>
          ))}
          <Text style={{ margin: "4px 0 0", fontSize: "12px", lineHeight: "18px", color: "#43534a" }}>
            Vous pourrez corriger ces informations auprès du bureau.
          </Text>
        </Section>
      )}
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
          Confirmer mon adresse e-mail
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
        {signature ? ` Il confirme l'adresse e-mail de ${signature}.` : ""}
      </Text>
    </BaseEmail>
  );
}
