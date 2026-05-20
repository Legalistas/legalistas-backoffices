const CRM_COLUMNS_WITH_EMAIL = [1, 4, 8, 9];

/**
 * Reglas para NO enviar email automático (sin tocar la DB):
 *  - Email vacío o nulo.
 *  - Dominio interno: @legalistas.com, @legalistas.com.ar, @legalistas.ar.
 *  - El local part (antes del @) contiene "falso" / "Falso".
 */
const BLOCKED_EMAIL_DOMAINS = [
  "legalistas.com",
  "legalistas.com.ar",
  "legalistas.ar",
];

export function shouldBlockAutomaticEmail(email?: string | null): boolean {
  const trimmed = email?.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  const atIdx = lower.indexOf("@");
  const localPart = atIdx >= 0 ? lower.slice(0, atIdx) : lower;
  const domain = atIdx >= 0 ? lower.slice(atIdx + 1) : "";

  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) return true;
  if (localPart.includes("falso")) return true;

  return false;
}

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
 * Solo envía si la etapa tiene email configurado y el lead tiene un email
 * válido (no interno, no de prueba). Registra el envío en el historial del
 * lead. No bloquea el flujo — errores se loguean en consola.
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
  if (!CRM_COLUMNS_WITH_EMAIL.includes(columnId)) return;
  if (shouldBlockAutomaticEmail(email)) {
    console.log(
      `[CRM Email] Bloqueado para "${email ?? "(vacío)"}" en etapa ${columnId} (interno o de prueba).`,
    );
    return;
  }

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
