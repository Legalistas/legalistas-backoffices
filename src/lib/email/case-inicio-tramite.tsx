import { Hr, Link, Text } from "@react-email/components";
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

  return (
    <EmailLayout preview="Certificado de inicio de trámite — Legalistas">
      <Text className="text-[#333333] text-[24px] font-bold leading-tight m-0 mb-5">
        ¡Hola, {firstName}!
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Te informamos que tu caso ha sido registrado exitosamente en nuestro
        sistema. A partir de este momento, nuestro equipo legal se encuentra
        trabajando en tu trámite.
      </Text>

      {/* Certificado */}
      <table
        cellPadding="0"
        cellSpacing="0"
        role="presentation"
        width="100%"
        style={{
          border: "2px solid #09A7B2",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <tr>
          <td
            style={{
              backgroundColor: "#09A7B2",
              padding: "12px 20px",
              textAlign: "center",
            }}
          >
            <Text className="text-white text-[18px] font-bold m-0">
              Certificado de Inicio de Trámite
            </Text>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "20px" }}>
            {caseNumber && (
              <Text className="text-[#333333] text-[15px] leading-6 m-0 mb-2">
                <strong>N° de caso:</strong> {caseNumber}
              </Text>
            )}
            {caseTitle && (
              <Text className="text-[#333333] text-[15px] leading-6 m-0 mb-2">
                <strong>Título:</strong> {caseTitle}
              </Text>
            )}
            {serviceName && (
              <Text className="text-[#333333] text-[15px] leading-6 m-0 mb-2">
                <strong>Tipo de servicio:</strong> {serviceName}
              </Text>
            )}
            {injury && (
              <Text className="text-[#333333] text-[15px] leading-6 m-0 mb-2">
                <strong>Lesión:</strong> {injury}
              </Text>
            )}
            {accidentDate && (
              <Text className="text-[#333333] text-[15px] leading-6 m-0 mb-2">
                <strong>Fecha de accidente:</strong> {accidentDate}
              </Text>
            )}
            {responsibleLawyerName && (
              <Text className="text-[#333333] text-[15px] leading-6 m-0 mb-2">
                <strong>Abogado responsable:</strong> {responsibleLawyerName}
              </Text>
            )}
          </td>
        </tr>
      </table>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Podés seguir el estado de tu trámite en cualquier momento desde nuestra
        plataforma de clientes:
      </Text>

      <table
        cellPadding="0"
        cellSpacing="0"
        role="presentation"
        width="100%"
        style={{ marginBottom: "20px" }}
      >
        <tr>
          <td align="center">
            <Link
              href="https://usuarios.legalistas.ar"
              target="_blank"
              style={{
                backgroundColor: "#09A7B2",
                color: "#ffffff",
                padding: "12px 30px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "16px",
                display: "inline-block",
              }}
            >
              Acceder a mi trámite
            </Link>
          </td>
        </tr>
      </table>

      <Hr className="border-[#e0e0e0] my-5" />

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-5">
        Si tenés alguna duda o necesitás comunicarte con nosotros, no dudes en
        escribirnos por WhatsApp o email.
      </Text>

      <Text className="text-[#555555] text-[16px] leading-6 m-0 mb-0">
        Saludos,
        <br />
        Equipo Legalistas
      </Text>
    </EmailLayout>
  );
}
