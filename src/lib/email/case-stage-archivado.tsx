import { Heading, Hr, Section, Text } from "@react-email/components";
import { CaseInfoBlock, type CaseInfo } from "./_case-info-block";
import { EmailLayout } from "./layout";

interface Props extends CaseInfo {
  customerName?: string;
}

export function CaseStageArchivadoTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="Tu caso fue archivado — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Tu caso fue archivado
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Te informamos que tu caso ha sido archivado. Esto significa que el
        expediente queda guardado en nuestros registros pero ya no se
        encuentra en gestión activa.
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
          backgroundColor: "#f3f4f6",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
        }}
      >
        <Text className="text-[#374151] text-[14px] leading-6 m-0">
          Si en algún momento necesitás <strong>retomar el tema</strong> o
          hacer una nueva consulta, podés comunicarte con nosotros sin
          problema. Estamos para ayudarte.
        </Text>
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
