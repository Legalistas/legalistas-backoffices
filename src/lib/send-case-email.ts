import { MAILER_SEND_ENDPOINT } from "@/constant/api-endpoints";
import { shouldBlockAutomaticEmail } from "./send-stage-email";

interface SendCaseEmailParams {
  email: string;
  customerName: string;
  /** El backend completa el certificado con los datos del caso. */
  caseId?: number;
  caseNumber?: string;
  caseTitle?: string;
  serviceName?: string;
  injury?: string;
  accidentDate?: string;
  responsibleLawyerName?: string;
  accessToken?: string;
}

/**
 * Mail de bienvenida al cliente cuando se crea un caso: el mismo que se manda
 * al ganar el lead en el CRM (bienvenida + certificado de inicio de trámite +
 * cómo entrar a la plataforma). Antes eran dos mails distintos.
 * No bloquea el flujo — errores se loguean en consola.
 */
export async function sendCaseEmail({
  email,
  customerName,
  caseId,
  caseNumber,
  caseTitle,
  serviceName,
  injury,
  accidentDate,
  responsibleLawyerName,
  accessToken,
}: SendCaseEmailParams): Promise<void> {
  if (shouldBlockAutomaticEmail(email)) {
    console.log(
      `[Case Email] Bloqueado para "${email || "(vacío)"}" (interno o de prueba).`,
    );
    return;
  }

  try {
    await fetch(MAILER_SEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        to: email,
        template: "cliente-bienvenida",
        caseId,
        variables: {
          customerName,
          caseNumber,
          caseTitle,
          serviceName,
          injury,
          accidentDate,
          responsibleLawyerName,
        },
      }),
    });
  } catch (error) {
    console.error("[Case Email] Error enviando la bienvenida:", error);
  }
}
