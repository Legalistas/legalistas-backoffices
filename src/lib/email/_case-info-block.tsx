import { Section, Text } from "@react-email/components";

export interface CaseInfo {
  caseNumber?: string;
  caseTitle?: string;
  serviceName?: string;
  responsibleLawyerName?: string;
}

/**
 * Bloque de datos del caso reusable. Renderiza solo los campos con valor.
 * Card con border-left turquesa — coherente con el resto de las plantillas.
 */
export function CaseInfoBlock({
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
}: CaseInfo) {
  const fields: { label: string; value?: string }[] = [
    { label: "N° de causa", value: caseNumber },
    { label: "Título", value: caseTitle },
    { label: "Tipo de servicio", value: serviceName },
    { label: "Abogado responsable", value: responsibleLawyerName },
  ].filter((f) => !!f.value);

  if (fields.length === 0) return null;

  return (
    <Section
      style={{
        marginTop: "20px",
        padding: "20px 24px",
        backgroundColor: "#f9fafb",
        borderLeft: "4px solid #09A7B2",
        borderRadius: "0 8px 8px 0",
      }}
    >
      {fields.map((f, i) => (
        <Section
          key={f.label}
          style={{
            paddingTop: i === 0 ? 0 : "12px",
          }}
        >
          <Text className="text-[#6b7280] text-[11px] uppercase tracking-wider font-bold m-0">
            {f.label}
          </Text>
          <Text className="text-[#111827] text-[15px] font-semibold m-0 mt-1">
            {f.value}
          </Text>
        </Section>
      ))}
    </Section>
  );
}
