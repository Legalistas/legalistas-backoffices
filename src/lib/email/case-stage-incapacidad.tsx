import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { CaseInfoBlock, type CaseInfo } from "./_case-info-block";
import { EmailLayout } from "./layout";

interface Props extends CaseInfo {
  customerName?: string;
}

export function CaseStageIncapacidadTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="Etapa de determinación de incapacidad — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Actualización · Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Etapa de determinación de incapacidad
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Tu caso ingresó a la etapa de <strong>determinación de
        incapacidad</strong>. En los próximos pasos se realizarán las
        pericias médicas correspondientes.
      </Text>

      <CaseInfoBlock
        caseNumber={caseNumber}
        caseTitle={caseTitle}
        serviceName={serviceName}
        responsibleLawyerName={responsibleLawyerName}
      />

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
          <strong>A tener en cuenta:</strong> cuando tengamos información
          sobre turnos o fechas de pericia, te lo comunicaremos
          inmediatamente. Asegurate de estar atento a este correo y a tu
          teléfono.
        </Text>
      </Section>

      <Section className="text-center mt-6">
        <Button
          href="https://usuarios.legalistas.ar"
          className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
          style={{ padding: "14px 32px" }}
        >
          Plataforma de Clientes
        </Button>
      </Section>

      <Hr className="border-[#e5e7eb] my-6" />

      <Text className="text-[#6b7280] text-[14px] leading-6 m-0">
        Cualquier consulta, respondé este correo.
        <br />
        <strong className="text-[#1f2937]">Equipo Legalistas</strong>
      </Text>
    </EmailLayout>
  );
}
