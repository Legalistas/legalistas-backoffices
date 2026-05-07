import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { CaseInfoBlock, type CaseInfo } from "./_case-info-block";
import { EmailLayout } from "./layout";

interface Props extends CaseInfo {
  customerName?: string;
}

export function CaseStageDocumentacionTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="Comenzamos a trabajar en tu caso — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Comenzamos a trabajar en tu caso
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Te confirmamos que ya iniciamos la gestión. En este momento estamos
        en la <strong>etapa de documentación</strong>: recopilando todo lo
        necesario para avanzar correctamente con tu trámite.
      </Text>

      <CaseInfoBlock
        caseNumber={caseNumber}
        caseTitle={caseTitle}
        serviceName={serviceName}
        responsibleLawyerName={responsibleLawyerName}
      />

      <Section
        style={{
          marginTop: "20px",
          padding: "16px 20px",
          backgroundColor: "rgba(9, 167, 178, 0.06)",
          border: "1px solid rgba(9, 167, 178, 0.25)",
          borderRadius: "8px",
        }}
      >
        <Text className="text-[#09A7B2] text-[12px] uppercase tracking-wider font-bold m-0">
          ¿Qué sigue?
        </Text>
        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-2">
          Si necesitamos algún dato o documento adicional, te lo vamos a
          pedir por este medio. Podés mantenerte al tanto del avance desde
          tu cuenta.
        </Text>
      </Section>

      <Section className="text-center mt-6">
        <Button
          href="https://usuarios.legalistas.ar"
          className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
          style={{ padding: "14px 32px" }}
        >
          Ver mi caso
        </Button>
      </Section>

      <Hr className="border-[#e5e7eb] my-6" />

      <Text className="text-[#6b7280] text-[14px] leading-6 m-0">
        Cualquier duda, respondé este correo.
        <br />
        <strong className="text-[#1f2937]">Equipo Legalistas</strong>
      </Text>
    </EmailLayout>
  );
}
