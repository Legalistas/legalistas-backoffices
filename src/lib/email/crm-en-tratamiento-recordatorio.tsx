import { Text } from "@react-email/components";
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
      <Text className="text-[#333333] text-[24px] font-bold leading-tight m-0 mb-5">
        ¡Hola, {firstName}!
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Queremos saber cómo va tu recuperación. En Legalistas seguimos
        atentos a tu caso y queremos acompañarte en cada paso del proceso.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Recordá que si durante tu tratamiento surge algún inconveniente —
        como falta de asistencia médica, alta prematura, demoras en estudios
        o cirugías — es importante que nos avises cuanto antes para poder
        actuar a tiempo.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Estamos acá para asegurarnos de que recibas todo lo que te
        corresponde. No dudes en escribirnos.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-0">
        Saludos,
        <br />
        Equipo Legalistas
      </Text>
    </EmailLayout>
  );
}
