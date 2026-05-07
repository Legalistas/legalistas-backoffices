import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
  customerName?: string;
  caseNumber?: string;
  caseTitle?: string;
  serviceName?: string;
  injury?: string;
  accidentDate?: string;
  responsibleLawyerName?: string;
}

export function CaseInicioTramiteTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  injury,
  accidentDate,
  responsibleLawyerName,
}: Props) {
  const firstName = customerName.split(" ")[0];

  const fields: { label: string; value?: string }[] = [
    { label: "N° de caso", value: caseNumber },
    { label: "Título", value: caseTitle },
    { label: "Tipo de servicio", value: serviceName },
    { label: "Lesión", value: injury },
    { label: "Fecha de accidente", value: accidentDate },
    { label: "Abogado responsable", value: responsibleLawyerName },
  ].filter((f) => !!f.value);

  return (
    <EmailLayout preview="Certificado de inicio de trámite — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        Tu trámite ya está iniciado
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Tu caso fue registrado en nuestro sistema. A partir de este momento
        nuestro equipo legal está trabajando en tu trámite.
      </Text>

      {/* Certificado */}
      <Section
        style={{
          marginTop: "20px",
          backgroundColor: "#ffffff",
          border: "2px solid #09A7B2",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <Section
          style={{
            backgroundColor: "#09A7B2",
            padding: "14px 24px",
            textAlign: "center",
          }}
        >
          <Text className="text-white text-[11px] uppercase tracking-[2px] font-semibold m-0">
            Certificado
          </Text>
          <Text className="text-white text-[18px] font-bold m-0 mt-1">
            Inicio de Trámite
          </Text>
        </Section>

        <Section style={{ padding: "20px 24px" }}>
          {fields.map((f, i) => (
            <Section
              key={f.label}
              style={{
                paddingTop: i === 0 ? 0 : "12px",
                paddingBottom: i === fields.length - 1 ? 0 : "12px",
                borderBottom:
                  i === fields.length - 1 ? "none" : "1px solid #f3f4f6",
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
      </Section>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-6">
        Podés seguir el estado de tu trámite en cualquier momento desde
        nuestra plataforma de clientes.
      </Text>

      <Section className="text-center mt-5">
        <Button
          href="https://usuarios.legalistas.ar"
          className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
          style={{ padding: "14px 32px" }}
        >
          Acceder a mi trámite
        </Button>
      </Section>

      <Hr className="border-[#e5e7eb] my-6" />

      <Text className="text-[#374151] text-[14px] leading-6 m-0">
        Si tenés dudas o necesitás comunicarte con nosotros, podés escribirnos
        por WhatsApp o email respondiendo este correo.
      </Text>

      <Text className="text-[#6b7280] text-[14px] leading-6 m-0 mt-5">
        Saludos,
        <br />
        <strong className="text-[#1f2937]">Equipo Legalistas</strong>
      </Text>
    </EmailLayout>
  );
}
