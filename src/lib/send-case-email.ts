interface SendCaseEmailParams {
  email: string;
  customerName: string;
  caseNumber?: string;
  caseTitle?: string;
  serviceName?: string;
  injury?: string;
  accidentDate?: string;
  responsibleLawyerName?: string;
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
}: SendCaseEmailParams): Promise<void> {
  if (!email) return;

  try {
    await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
