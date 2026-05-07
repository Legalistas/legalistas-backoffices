import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { CaseInfoBlock, type CaseInfo } from "./_case-info-block";
import { EmailLayout } from "./layout";

interface Props extends CaseInfo {
  customerName?: string;
}

export function CaseStageCierreTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="Tu caso está en su etapa final — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Etapa final · Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Tu caso está en su etapa final
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Te contamos que tu trámite se encuentra en{" "}
        <strong>etapa de cierre</strong>. Estamos realizando las últimas
        gestiones necesarias para llegar a la resolución definitiva.
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
          Cómo seguimos
        </Text>
        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-2">
          Apenas tengamos novedades importantes — resolución, montos, fechas
          de cobro — vamos a comunicártelas por este medio.
        </Text>
      </Section>

      <Section className="text-center mt-6">
        <Button
          href="https://usuarios.legalistas.ar"
          className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
          style={{ padding: "14px 32px" }}
        >
          Ver detalles del cierre
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
