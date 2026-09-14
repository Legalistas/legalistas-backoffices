// =============================================================================
// Alerta de cumpleaños.
//
// Se activa solo durante el día indicado en `date` (fecha local del navegador,
// de 00:00 a 23:59). Para el próximo cumpleaños alcanza con editar este archivo.
// =============================================================================

export const BIRTHDAY_GREETING = {
	/** Día del cumpleaños, formato YYYY-MM-DD. */
	date: "2026-09-15",

	/**
	 * Solo el nombre de pila: el saludo suena mucho más cercano que con el
	 * apellido, y es como la llama el equipo todos los días.
	 */
	name: "Lucía",

	/** Foto, servida desde `public/`. Dejalo en `null` si no hay. */
	photo: "/images/lucia-manzo-legalistas.webp" as string | null,

	/**
	 * Id de quien cumple años. No define quién ve el saludo (eso es
	 * `showToEveryone`), sino a quién se le habla en primera persona: esta
	 * persona lee "¡Feliz cumpleaños!" y el resto del equipo lee "hoy cumple
	 * años".
	 */
	userId: null as number | null,

	/**
	 * `true`  → lo ve todo el equipo.
	 * `false` → lo ve únicamente la persona de `userId`.
	 */
	showToEveryone: true,

	/**
	 * Para probarlo en cualquier fecha: agregá `?cumple=preview` a la URL.
	 * En modo preview el modal reaparece siempre, sin recordar que ya se vio.
	 */
	previewParam: "cumple",
	previewValue: "preview",
};
