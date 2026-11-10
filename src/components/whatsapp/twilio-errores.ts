// Why Twilio could not deliver a WhatsApp message, in Spanish for the team.
// Codes: https://www.twilio.com/docs/api/errors (the WhatsApp ones are 63xxx).
const MOTIVOS: Record<string, string> = {
	"30008": "Error desconocido de WhatsApp; probá de nuevo más tarde",
	"63003": "El número no existe en WhatsApp",
	"63013": "WhatsApp lo rechazó por sus políticas de mensajes",
	"63016": "Pasaron más de 24 h del último mensaje del cliente: solo se le puede escribir con una plantilla",
	"63018": "WhatsApp frenó los envíos por exceso de mensajes; probá más tarde",
	"63024": "El número no tiene WhatsApp o no puede recibir mensajes",
	"63049": "Meta no lo entregó: limita cuántos mensajes de marketing recibe cada persona",
};

/** The reason in Spanish; an unknown code is shown as is. */
export const motivoTwilio = (code: string) => MOTIVOS[code] ?? `Error de Twilio ${code}`;
