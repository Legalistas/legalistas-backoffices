import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { CaseInfoBlock, type CaseInfo } from "./_case-info-block";
import { EmailLayout } from "./layout";

interface Props extends CaseInfo {
  customerName?: string;
}

export function CaseStageJudicialTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="Tu caso ingresó a etapa judicial — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hito importante · Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Tu caso ingresó a etapa judicial
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Te informamos que tu proceso fue <strong>iniciado ante el juzgado
        correspondiente</strong>. A partir de ahora comienza el trámite
        judicial propiamente dicho.
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
          Qué esperar
        </Text>
        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-2">
          Los procesos judiciales tienen sus tiempos. Te iremos informando
          cada avance importante por este medio y desde la plataforma.
        </Text>
      </Section>

      <Section className="text-center mt-6">
        <Button
          href="https://usuarios.legalistas.ar"
          className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
          style={{ padding: "14px 32px" }}
        >
          Seguir mi caso
        </Button>
      </Section>

      <Hr className="border-[#e5e7eb] my-6" />

      <Text className="text-[#6b7280] text-[14px] leading-6 m-0">
        Saludos,
        <br />
        <strong className="text-[#1f2937]">Equipo Legalistas</strong>
      </Text>
    </EmailLayout>
  );
}
