import { MAILER_SEND_ENDPOINT } from "@/constant/api-endpoints";
import { shouldBlockAutomaticEmail } from "./send-stage-email";

interface SendCaseEmailParams {
  email: string;
  customerName: string;
  caseNumber?: string;
  caseTitle?: string;
  serviceName?: string;
  injury?: string;
  accidentDate?: string;
  responsibleLawyerName?: string;
  accessToken?: string;
}

/**
 * Envía el certificado de inicio de trámite al cliente cuando se crea un caso.
 * No bloquea el flujo — errores se loguean en consola.
 */
export async function sendCaseEmail({
  email,
  customerName,
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
        template: "case-inicio-tramite",
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
    console.error("[Case Email] Error enviando certificado:", error);
  }
}
