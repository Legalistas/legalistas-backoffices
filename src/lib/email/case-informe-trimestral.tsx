import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  customerName?: string;
  caseNumber?: string;
  caseTitle?: string;
  stageLabel?: string;
  stageMessage?: string;
  informeLink?: string;
  responsibleLawyerName?: string;
}

export function CaseInformeTrimestralTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  stageLabel,
  stageMessage,
  informeLink,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="Tu informe trimestral está disponible — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Informe trimestral de tu caso
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Te enviamos el informe trimestral con el estado actual de tu reclamo
        {caseNumber ? ` (Caso #${caseNumber})` : ""}.
      </Text>

      {/* Card resumen */}
      <Section
        style={{
          marginTop: "20px",
          backgroundColor: "#ffffff",
          border: "2px solid #09A7B2",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <Section
          style={{
            backgroundColor: "#09A7B2",
            padding: "14px 24px",
            textAlign: "center",
          }}
        >
          <Text className="text-white text-[11px] uppercase tracking-[2px] font-semibold m-0">
            Informe Trimestral
          </Text>
          <Text className="text-white text-[18px] font-bold m-0 mt-1">
            {stageLabel || "Estado del caso"}
          </Text>
        </Section>

        <Section style={{ padding: "20px 24px" }}>
          {caseTitle && (
            <Section style={{ paddingBottom: "12px", borderBottom: "1px solid #f3f4f6" }}>
              <Text className="text-[#6b7280] text-[11px] uppercase tracking-wider font-bold m-0">
                Caso
              </Text>
              <Text className="text-[#111827] text-[15px] font-semibold m-0 mt-1">
                {caseTitle}
              </Text>
            </Section>
          )}

          {stageMessage && (
            <Section style={{ paddingTop: caseTitle ? "12px" : 0 }}>
              <Text className="text-[#374151] text-[14px] leading-6 m-0">
                {stageMessage}
              </Text>
            </Section>
          )}
        </Section>
      </Section>

      {informeLink && (
        <Section className="text-center mt-5">
          <Button
            href={informeLink}
            className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
            style={{ padding: "14px 32px" }}
          >
            Descargar informe en PDF
          </Button>
          <Text className="text-[#6b7280] text-[12px] m-0 mt-3 break-all">
            {informeLink}
          </Text>
        </Section>
      )}

      <Hr className="border-[#e5e7eb] my-6" />

      <Text className="text-[#374151] text-[14px] leading-6 m-0">
        Si ves algún dato incorrecto en el informe o tenés consultas sobre tu
        caso, podés escribirnos respondiendo este email.
      </Text>

      <Text className="text-[#6b7280] text-[14px] leading-6 m-0 mt-5">
        Saludos,
        <br />
        <strong className="text-[#1f2937]">
          {responsibleLawyerName || "Equipo Legalistas"}
        </strong>
      </Text>
    </EmailLayout>
  );
}
