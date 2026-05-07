import { Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
}

export function CrmEnTratamientoRecordatorioTemplate({
  leadName = "Cliente",
}: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="¿Cómo va tu recuperación? — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Recordatorio · Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        ¿Cómo va tu recuperación?
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Queremos saber cómo estás. En Legalistas seguimos atentos a tu caso
        y queremos acompañarte en cada paso del proceso.
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
          Avisanos si surge alguno de estos problemas
        </Text>

        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-3">
          • Falta de asistencia médica.
        </Text>
        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-2">
          • Alta prematura.
        </Text>
        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-2">
          • Demoras en estudios o cirugías.
        </Text>

        <Text className="text-[#374151] text-[13px] leading-6 m-0 mt-4 italic">
          Cuanto antes nos avises, antes podemos actuar.
        </Text>
      </Section>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-6">
        Estamos acá para asegurarnos de que recibas todo lo que te
        corresponde. No dudes en escribirnos.
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
