import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
  meetingType?: string;
  date?: string;
  hours?: string;
  phoneNumber?: string;
  confirmationUrl?: string;
}

export function CrmPendientePoderTemplate({
  leadName = "Cliente",
  meetingType = "Reunión poder",
  date = "",
  hours = "",
  phoneNumber = "",
  confirmationUrl = "https://legalistas.ar/confirmacion-reunion",
}: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="Firma de autorización pendiente — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Firma de autorización pendiente
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Para poder avanzar con tu caso necesitamos que firmes la
        autorización. Tu <strong>{meetingType.toLowerCase()}</strong> fue
        registrada para coordinar la firma.
      </Text>

      {/* Card con datos de la reunión */}
      <Section
        style={{
          marginTop: "20px",
          padding: "20px 24px",
          backgroundColor: "#f9fafb",
          borderLeft: "4px solid #09A7B2",
          borderRadius: "0 8px 8px 0",
        }}
      >
        <Text className="text-[#6b7280] text-[11px] uppercase tracking-wider font-bold m-0">
          Fecha
        </Text>
        <Text className="text-[#111827] text-[15px] font-semibold m-0 mt-1">
          {date}
        </Text>

        <Text className="text-[#6b7280] text-[11px] uppercase tracking-wider font-bold m-0 mt-4">
          Hora
        </Text>
        <Text className="text-[#111827] text-[15px] font-semibold m-0 mt-1">
          {hours}
        </Text>

        {phoneNumber ? (
          <>
            <Text className="text-[#6b7280] text-[11px] uppercase tracking-wider font-bold m-0 mt-4">
              Te llamaremos al
            </Text>
            <Text className="text-[#111827] text-[15px] font-semibold m-0 mt-1">
              {phoneNumber}
            </Text>
          </>
        ) : null}
      </Section>

      {/* Importante */}
      <Section
        style={{
          marginTop: "16px",
          padding: "12px 16px",
          backgroundColor: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: "6px",
        }}
      >
        <Text className="text-[#92400e] text-[14px] leading-6 m-0">
          <strong>Importante:</strong> sin la autorización firmada no podemos
          representarte legalmente. Recordá tener tu DNI a mano.
        </Text>
      </Section>

      <Section className="text-center mt-6">
        <Button
          href={confirmationUrl}
          className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
          style={{ padding: "14px 32px" }}
        >
          Confirmar asistencia
        </Button>
      </Section>

      <Text className="text-[#374151] text-[14px] leading-6 m-0 mt-6 text-center">
        Si no podés asistir, <strong>avisanos con anticipación</strong> para
        reprogramar.
      </Text>

      <Hr className="border-[#e5e7eb] my-6" />

      <Text className="text-[#6b7280] text-[14px] leading-6 m-0">
        Saludos,
        <br />
        <strong className="text-[#1f2937]">Equipo Legalistas</strong>
      </Text>
    </EmailLayout>
  );
}
