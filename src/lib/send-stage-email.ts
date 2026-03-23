const CRM_COLUMNS_WITH_EMAIL = [1, 4, 9];

interface SendStageEmailParams {
  email?: string;
  leadName?: string;
  leadId: number;
  columnId: number;
  accessToken?: string;
  meetingType?: string;
  date?: string;
  hours?: string;
  phoneNumber?: string;
  confirmationUrl?: string;
  isResend?: boolean;
}

/**
 * Envía email de notificación al cambiar de etapa en el CRM.
 * Solo envía si la etapa tiene email configurado y el lead tiene email.
 * Registra el envío en el historial del lead.
 * No bloquea el flujo — errores se loguean en consola.
 */
export async function sendStageEmail({
  email,
  leadName,
  leadId,
  columnId,
  accessToken,
  meetingType,
  date,
  hours,
  phoneNumber,
  confirmationUrl,
  isResend = false,
}: SendStageEmailParams): Promise<void> {
  if (!email || !CRM_COLUMNS_WITH_EMAIL.includes(columnId)) return;

  try {
    await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        leadId,
        columnId,
        isResend,
        accessToken,
        variables: {
          leadName,
          meetingType,
          date,
          hours,
          phoneNumber,
          confirmationUrl,
        },
      }),
    });
  } catch (error) {
    console.error("[CRM Email] Error enviando notificación:", error);
  }
}
