import { Link, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
  confirmationUrl?: string;
}

export function CrmPendientePoderRecordatorioTemplate({
  leadName = "Cliente",
  confirmationUrl = "https://legalistas.ar/confirmacion-reunion",
}: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="Recordatorio: tu autorización sigue pendiente — Legalistas">
      <Text className="text-[#333333] text-[24px] font-bold leading-tight m-0 mb-5">
        ¡Hola, {firstName}!
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Te recordamos que tu autorización sigue pendiente de firma. Este
        documento es indispensable para que podamos representarte legalmente
        y avanzar con tu caso.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Si todavía no pudiste coordinar la firma, contactanos para agendar
        una reunión en el horario que más te convenga.
      </Text>

      <table
        cellPadding="0"
        cellSpacing="0"
        role="presentation"
        align="center"
        style={{ margin: "0 auto 20px" }}
      >
        <tr>
          <td
            align="center"
            style={{
              backgroundColor: "#09A7B2",
              borderRadius: "6px",
            }}
          >
            <Link
              href={confirmationUrl}
              style={{
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "bold",
                textDecoration: "none",
                display: "inline-block",
                padding: "14px 32px",
              }}
            >
              Coordinar firma
            </Link>
          </td>
        </tr>
      </table>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Estamos a tu disposición para resolver cualquier duda que tengas
        sobre el proceso.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-0">
        Saludos,
        <br />
        Equipo Legalistas
      </Text>
    </EmailLayout>
  );
}
