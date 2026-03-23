import { CRM_COLUMN_TO_TEMPLATE } from "./email";

const CRM_COLUMNS_WITH_EMAIL = [1, 2, 4, 8, 9];

interface SendStageEmailParams {
  email?: string;
  leadName?: string;
  columnId: number;
  meetingType?: string;
  date?: string;
  hours?: string;
  phoneNumber?: string;
  confirmationUrl?: string;
}

/**
 * Envía email de notificación al cambiar de etapa en el CRM.
 * Solo envía si la etapa tiene email configurado y el lead tiene email.
 * No bloquea el flujo — errores se loguean en consola.
 */
export async function sendStageEmail({
  email,
  leadName,
  columnId,
  meetingType,
  date,
  hours,
  phoneNumber,
  confirmationUrl,
}: SendStageEmailParams): Promise<void> {
  if (!email || !CRM_COLUMNS_WITH_EMAIL.includes(columnId)) return;

  try {
    await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        columnId,
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
