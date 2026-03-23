import { Button, Hr, Link, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
  meetingType?: string;
  date?: string;
  hours?: string;
  phoneNumber?: string;
  confirmationUrl?: string;
}

export function CrmReunionConcretarTemplate({
  leadName = "Cliente",
  meetingType = "Videollamada",
  date = "",
  hours = "",
  phoneNumber = "",
  confirmationUrl = "https://legalistas.ar/confirmacion-reunion",
}: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="Tu reunión fue registrada — Legalistas">
      <Text className="text-[#333333] text-[24px] font-bold leading-tight m-0 mb-5">
        ¡Hola, {firstName}!
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Tu {meetingType} fue registrada.
      </Text>

      <table
        cellPadding="0"
        cellSpacing="0"
        role="presentation"
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          padding: "20px",
          width: "100%",
          marginBottom: "20px",
        }}
      >
        <tr>
          <td style={{ padding: "20px" }}>
            <Text className="text-[#333333] text-[16px] leading-8 m-0">
              <strong>Fecha:</strong> {date}
              <br />
              <strong>Hora:</strong> {hours}
              <br />
              <strong>Te llamaremos al:</strong> {phoneNumber}
            </Text>
          </td>
        </tr>
      </table>

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
              Confirmar asistencia
            </Link>
          </td>
        </tr>
      </table>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Si no podés asistir, avisanos con anticipación.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-0">
        Saludos,
        <br />
        Equipo Legalistas
      </Text>
    </EmailLayout>
  );
}
