import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  leadName?: string;
}

export function CrmGanadoPoderTemplate({ leadName = "Cliente" }: Props) {
  const firstName = leadName.split(" ")[0];

  return (
    <EmailLayout preview="¡Recibimos tu autorización! — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        ¡Excelente noticia! · Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Recibimos tu autorización
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Ya estamos trabajando en tu caso. Te agradecemos por confiar en
        Legalistas — vamos a gestionar todo el proceso para que obtengas la
        indemnización que te corresponde.
      </Text>

      {/* Bloque destacado: acceso a plataforma */}
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
          Plataforma de Clientes
        </Text>

        <Text className="text-[#1f2937] text-[14px] leading-6 m-0 mt-2">
          Te enviamos por separado un correo con tu <strong>usuario y
          contraseña</strong> para acceder a la plataforma. Desde ahí podés
          seguir el avance de tu trámite, ver documentos y mensajes.
        </Text>

        <Section className="mt-4">
          <Button
            href="https://usuarios.legalistas.ar"
            className="bg-[#09A7B2] text-white text-[14px] font-bold no-underline rounded-md"
            style={{ padding: "12px 24px" }}
          >
            Ingresar a mi cuenta
          </Button>
        </Section>
      </Section>

      {/* Bloque destacado: apps móviles */}
      <Section
        style={{
          marginTop: "16px",
          padding: "20px 24px",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
        }}
      >
        <Text className="text-[#111827] text-[14px] font-bold m-0">
          Descargá la app de Legalistas
        </Text>
        <Text className="text-[#6b7280] text-[13px] leading-6 m-0 mt-1">
          Tené tu caso en tu bolsillo. Disponible para Android y iPhone.
        </Text>

        <Section className="mt-4">
          <Button
            href="https://play.google.com/store/apps/details?id=com.lexiatechs.legalistas&hl=es_AR"
            className="bg-[#111827] text-white text-[13px] font-bold no-underline rounded-md mr-2"
            style={{ padding: "10px 20px" }}
          >
            Google Play
          </Button>
          <Button
            href="https://apps.apple.com/ar/app/legalistas/id6762129942"
            className="bg-[#111827] text-white text-[13px] font-bold no-underline rounded-md"
            style={{ padding: "10px 20px" }}
          >
            App Store
          </Button>
        </Section>
      </Section>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-6">
        Si la aseguradora te contacta, es posible que sea por nuestras
        gestiones. Ante cualquier duda, respondé este correo y te orientamos.
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
