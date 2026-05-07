const CASE_STAGES_WITH_EMAIL = [1, 2, 3, 4, 5, 6, 7];

interface SendCaseStageEmailParams {
  email?: string;
  customerName?: string;
  caseId: number;
  stageId: number;
  caseNumber?: string;
  caseTitle?: string;
  serviceName?: string;
  responsibleLawyerName?: string;
  reviewUrl?: string;
  accessToken?: string;
  isResend?: boolean;
}

/**
 * Envía email al cliente cuando una causa cambia de etapa en el gestor de causas.
 * Solo envía si la etapa tiene email configurado y el caso tiene email del cliente.
 * Registra el envío en el historial del caso.
 * No bloquea el flujo — errores se loguean en consola.
 */
export async function sendCaseStageEmail({
  email,
  customerName,
  caseId,
  stageId,
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
  reviewUrl,
  accessToken,
  isResend = false,
}: SendCaseStageEmailParams): Promise<void> {
  if (!email || !CASE_STAGES_WITH_EMAIL.includes(stageId)) return;

  try {
    await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        caseId,
        stageId,
        isResend,
        accessToken,
        variables: {
          customerName,
          caseNumber,
          caseTitle,
          serviceName,
          responsibleLawyerName,
          reviewUrl,
        },
      }),
    });
  } catch (error) {
    console.error("[Case Stage Email] Error enviando notificación:", error);
  }
}
