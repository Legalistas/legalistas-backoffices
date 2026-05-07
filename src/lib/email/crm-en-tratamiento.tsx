import { Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
}

export function CrmEnTratamientoTemplate({ leadName = "Cliente" }: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="Tu caso está en tratamiento — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Esperamos que te recuperes pronto
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        En Legalistas nos importa tu bienestar. Sabemos que durante la
        rehabilitación pueden surgir inconvenientes — y queremos que sepas
        que estamos atentos.
      </Text>

      {/* Bloque destacado: situaciones a las que prestar atención */}
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
          Si te pasa algo de esto, escribinos
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
      </Section>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-6">
        Vamos a acompañarte y asegurarnos de que recibas todo lo que
        necesitás. Respondé este correo o contactanos cuando lo necesites.
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
