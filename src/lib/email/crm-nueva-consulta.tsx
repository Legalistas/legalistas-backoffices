import { Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
}

export function CrmNuevaConsultaTemplate({ leadName = "Cliente" }: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="¡Gracias por contactarnos! — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Recibimos tu consulta
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Gracias por confiar en Legalistas. Nuestro equipo ya está procesando
        tu consulta y vamos a contactarte muy pronto.
      </Text>

      <Section
        style={{
          marginTop: "20px",
          padding: "20px 24px",
          backgroundColor: "rgba(9, 167, 178, 0.06)",
          border: "1px solid rgba(9, 167, 178, 0.25)",
          borderRadius: "8px",
        }}
      >
        <Text className="text-[#09A7B2] text-[12px] uppercase tracking-wider font-bold m-0">
          Próximos pasos
        </Text>

        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-3">
          <strong>1.</strong> Un asesor del Departamento de Atención al
          Cliente se contactará con vos para coordinar una reunión por
          videollamada con un abogado especializado.
        </Text>

        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-3">
          <strong>2.</strong> Te informaremos por este medio el día y horario
          de la videollamada — te pedimos estar atento a tu correo.
        </Text>
      </Section>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-6">
        Si tenés dudas o querés agregar información, podés responder este
        mismo correo.
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
