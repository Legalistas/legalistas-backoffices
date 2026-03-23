import { Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
}

export function CrmNuevaConsultaTemplate({ leadName = "Cliente" }: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="¡Gracias por contactarnos! — Legalistas">
      <Text className="text-[#333333] text-[24px] font-bold leading-tight m-0 mb-5">
        ¡Hola, {firstName}!
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Gracias por confiar en Legalistas. Nuestro equipo ya está procesando
        tu consulta.
      </Text>

      <Text className="text-[#555555] text-[16px] font-bold leading-6 m-0 mb-3">
        Próximos pasos:
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-3">
        1. Un asesor del Departamento de Atención al Cliente se contactará
        con vos para coordinar una reunión por videollamada con un abogado
        especializado.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-3">
        2. Te informaremos por este medio el día y horario de la
        videollamada, por lo que te pedimos estar atento a tu correo.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Nos comunicaremos pronto con más detalles. Si tenés dudas, respondé
        este mail.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-0">
        Saludos,
        <br />
        Equipo Legalistas
      </Text>
    </EmailLayout>
  );
}
