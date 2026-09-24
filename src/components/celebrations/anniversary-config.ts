// =============================================================================
// Saludo por aniversario de trabajo.
//
// Se activa solo durante el día indicado en `date` (fecha local del navegador,
// de 00:00 a 23:59). Para el próximo aniversario alcanza con editar este archivo.
// =============================================================================

export const ANNIVERSARY_GREETING = {
  /** Día del saludo, formato YYYY-MM-DD. */
  date: "2026-08-07",

  /**
   * Solo el nombre de pila: el saludo suena mucho más cercano que con el
   * apellido, y es como la llama el equipo todos los días.
   */
  name: "Marilén",

  /** Foto, servida desde `public/`. Dejalo en `null` si no hay. */
  photo: "/images/marilen-peralta.webp" as string | null,

  /**
   * Años cumplidos en Legalistas. Si lo dejás en `null`, el saludo no menciona
   * ningún número y queda genérico ("un año más").
   */
  years: 3 as number | null,

  /**
   * Id de quien cumple el aniversario. No define quién ve el saludo (eso es
   * `showToEveryone`), sino a quién se le habla en primera persona: esta
   * persona lee "¡Feliz aniversario!" y el resto del equipo lee "hoy cumple
   * años en Legalistas".
   */
  userId: 619 as number | null,

  /**
   * `true`  → lo ve todo el equipo.
   * `false` → lo ve únicamente la persona de `userId`.
   */
  showToEveryone: true,

  /**
   * Para probarlo en cualquier fecha: agregá `?aniversario=preview` a la URL.
   * En modo preview el modal reaparece siempre, sin recordar que ya se vio.
   */
  previewParam: "aniversario",
  previewValue: "preview",
};

/**
 * Devuelve la fecha local de hoy como YYYY-MM-DD, para comparar contra `date`.
 *
 * Se arma a mano en vez de usar `toLocaleDateString`: con locale "es-AR" saldría
 * "6/8/2026" y la comparación nunca daría verdadera, y con `toISOString()`
 * saldría la fecha en UTC, que acá (GMT-3) se adelanta a las 21:00. Estas tres
 * líneas usan la hora local del navegador, que es lo que queremos: el saludo
 * arranca y termina a la medianoche de Argentina.
 */
export function todayLocalISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
