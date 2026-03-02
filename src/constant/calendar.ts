// Función auxiliar para convertir fecha ISO a formato datetime-local
export const toDateTimeLocalFormat = (isoString: string): string => {
  if (!isoString) return "";

  // Fecha-only (YYYY-MM-DD): NO usar new Date() porque el navegador la
  // parsea como UTC midnight y en zonas UTC- queda el día anterior.
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    const now = new Date();
    return `${isoString}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  // Ya tiene formato YYYY-MM-DDThh:mm (sin zona), devolver los primeros 16 chars
  if (isoString.includes("T") && isoString.length >= 16) {
    return isoString.substring(0, 16);
  }

  // Fallback: parsear con Date y usar métodos locales (no toISOString que es UTC)
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

// Función auxiliar para normalizar fechas - versión simplificada
export const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return "";

  if (typeof dateStr !== "string") {
    // Si es un objeto Date, convertirlo a string
    if (dateStr instanceof Date) {
      return dateStr.toISOString().split("T")[0];
    }
    // Si es otro tipo, intentar convertirlo a string
    return String(dateStr);
  }

  // Si ya es string, normalizar el formato
  return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
};

// Función para verificar si una fecha es un día festivo - versión exacta
export const isHolidayDate = (dateStr: any, holidays: any[]): boolean => {
  if (!dateStr || !holidays || !Array.isArray(holidays)) return false;

  // Normalizar la fecha de entrada
  const normalizedDate = normalizeDate(dateStr);

  // Comprobar solo la fecha exacta
  return holidays.some((holiday) => {
    // Verificar tanto start como date (para compatibilidad)
    const holidayDate = normalizeDate(holiday.start || holiday.date);
    return holidayDate === normalizedDate;
  });
};

// Función para verificar si un evento es un día festivo - versión exacta
export const isHolidayEvent = (event: any, holidays: any[]): boolean => {
  if (!event || !event.start || !holidays || !Array.isArray(holidays))
    return false;

  // Normalizar la fecha del evento
  const eventDate = normalizeDate(event.start);

  return holidays.some((holiday) => {
    // Verificar tanto start como date (para compatibilidad)
    const holidayDate = normalizeDate(holiday.start || holiday.date);

    // Verificar si coincide por fecha y título, o por ID
    return (
      (holidayDate === eventDate && holiday.title === event.title) ||
      (holiday.id && event.id && String(holiday.id) === String(event.id))
    );
  });
};

// Función para formatear la hora en formato 12h (7am, 3pm, etc.)
export const formatTime = (dateStr: string): string => {
  if (!dateStr || !dateStr.includes("T")) return "";

  const date = new Date(dateStr);
  let hours = date.getHours();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // la hora '0' debe ser '12'

  return `${hours}${ampm}`;
};

// Función para extraer el tipo de evento y el nombre
export const parseEventTitle = (
  title: string
): { type: string; name: string } => {
  // Intentamos identificar si el título tiene un formato específico
  const dashIndex = title.indexOf(" - ");

  if (dashIndex !== -1) {
    // Ya tiene formato "Nombre - Tipo"
    const name = title.substring(0, dashIndex).trim();
    const type = title.substring(dashIndex + 3).trim();
    return { name, type };
  }

  // Intentamos identificar palabras clave para el tipo de evento
  const lowerTitle = title.toLowerCase();
  let type = "";

  if (lowerTitle.includes("video") || lowerTitle.includes("llamada")) {
    type = "videollamada";
  } else if (lowerTitle.includes("reunión") || lowerTitle.includes("reunion")) {
    type = "reunión";
  } else if (lowerTitle.includes("cita") || lowerTitle.includes("consulta")) {
    type = "cita";
  } else {
    type = "evento";
  }

  // Extraemos el nombre (asumimos que está al principio)
  let name = title;

  // Si hay un guion, tomamos lo que está antes
  if (title.includes(" - ")) {
    name = title.split(" - ")[0];
  }

  return { type, name };
};
