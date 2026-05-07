import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { CaseInfoBlock, type CaseInfo } from "./_case-info-block";
import { EmailLayout } from "./layout";

interface Props extends CaseInfo {
  customerName?: string;
}

export function CaseStageAdministrativoTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="Tu caso está en etapa administrativa — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Actualización · Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Tu caso está en etapa administrativa
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Te actualizamos sobre tu caso. Actualmente estamos realizando las{" "}
        <strong>gestiones ante el organismo competente</strong> para que el
        trámite avance.
      </Text>

      <CaseInfoBlock
        caseNumber={caseNumber}
        caseTitle={caseTitle}
        serviceName={serviceName}
        responsibleLawyerName={responsibleLawyerName}
      />

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-6">
        Seguimos trabajando en esto y te avisaremos ante cualquier novedad
        importante. Si querés ver el avance en tiempo real, ingresá a tu
        cuenta:
      </Text>

      <Section className="text-center mt-5">
        <Button
          href="https://usuarios.legalistas.ar"
          className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
          style={{ padding: "14px 32px" }}
        >
          Ver estado de mi caso
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
