import { Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
}

export function CrmEnTratamientoTemplate({ leadName = "Cliente" }: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="Tu caso está en tratamiento — Legalistas">
      <Text className="text-[#333333] text-[24px] font-bold leading-tight m-0 mb-5">
        ¡Hola, {firstName}!
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Esperamos que te recuperes pronto y de la mejor manera.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        En Legalistas, nos importa tu bienestar. Sabemos que durante la
        rehabilitación pueden surgir inconvenientes, como falta de asistencia
        médica, alta prematura o demoras en cirugías.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Si te pasa algo así, escribinos cuanto antes. Vamos a acompañarte y
        asegurarnos de que recibas todo lo que necesitás.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-0">
        Saludos,
        <br />
        Equipo Legalistas
      </Text>
    </EmailLayout>
  );
}
