import { Link, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
}

export function CrmGanadoPoderTemplate({ leadName = "Cliente" }: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="¡Recibimos tu autorización! — Legalistas">
      <Text className="text-[#333333] text-[24px] font-bold leading-tight m-0 mb-5">
        ¡Hola, {firstName}!
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Recibimos tu autorización y ya estamos trabajando en tu caso.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Te agradecemos por confiar en Legalistas. Nos encargaremos de
        gestionar todo el proceso para que obtengas la indemnización que te
        corresponde.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-3">
        <strong>Acceso a la Plataforma de Clientes:</strong>{" "}
        <Link
          href="https://usuarios.legalistas.ar"
          target="_blank"
          style={{ color: "#09A7B2", textDecoration: "underline" }}
        >
          Ingresar
        </Link>
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Si la aseguradora te contacta, es posible que sea por nuestras
        gestiones. Ante cualquier duda, escribinos.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-0">
        Saludos,
        <br />
        Equipo Legalistas
      </Text>
    </EmailLayout>
  );
}
