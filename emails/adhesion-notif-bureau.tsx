import { Heading } from "@react-email/heading";
import { Link } from "@react-email/link";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { BaseEmail } from "./base";

/**
 * adhesion_notif_bureau (e-mail n°2 du parcours adhérents, spec §5.3,
 * brique N2) : fiche complète de la nouvelle demande d'adhésion au bureau
 * (NOTIFY_EMAIL), Reply-To le demandeur pour lui répondre directement.
 */

export function AdhesionNotifBureau({
  rows,
  adminUrl,
}: {
  rows: { label: string; value: string }[];
  adminUrl: string;
}) {
  return (
    <BaseEmail
      preview="Nouvelle demande d'adhésion reçue sur le site"
      footerNote="Notification automatique du site : chaque demande d'adhésion enregistrée par la modale publique génère cet e-mail. La validation de la cotisation s'effectue dans le back-office après confirmation de l'e-mail par le demandeur."
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
        Nouvelle demande d'adhésion
      </Heading>
      <Text
        style={{
          margin: "0 0 20px",
          fontSize: "14px",
          lineHeight: "22px",
          color: "#43534a",
        }}
      >
        Une demande vient d'être enregistrée via la modale d'adhésion du site.
        Le demandeur doit d'abord confirmer son adresse e-mail (lien valable
        30 jours) ; la validation de la cotisation attend ensuite son
        enregistrement dans le back-office.
      </Text>
      <Section
        style={{
          margin: "0 0 20px",
          padding: "14px 16px",
          backgroundColor: "#f2f6f1",
          border: "1px solid #d2dccb",
          borderRadius: "10px",
        }}
      >
        {rows.map((r) => (
          <Text
            key={r.label}
            style={{ margin: "0 0 6px", fontSize: "13px", lineHeight: "20px" }}
          >
            <strong>{r.label} :</strong> {r.value}
          </Text>
        ))}
      </Section>
      <Section style={{ margin: 0, textAlign: "center" }}>
        <Link
          href={adminUrl}
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
          Ouvrir la liste des demandes (back-office)
        </Link>
      </Section>
    </BaseEmail>
  );
}
