// Función para preservar la hora exacta de la base de datos
export function formatDistanceToNow(timestamp: number | string | Date): string {
  try {
    // Si es una cadena que parece una fecha de base de datos (sin Z al final)
    if (typeof timestamp === "string" && !timestamp.endsWith("Z")) {
      // Crear una fecha asumiendo que ya está en la zona horaria correcta
      const date = new Date(timestamp);
      const now = new Date();

      // Calcular la diferencia en milisegundos
      const diffInMilliseconds = now.getTime() - date.getTime();

      // Si la diferencia es negativa, es una fecha futura
      if (diffInMilliseconds < 0) {
        const absDiffInMilliseconds = Math.abs(diffInMilliseconds);
        const diffInSeconds = Math.floor(absDiffInMilliseconds / 1000);

        if (diffInSeconds < 60) {
          return `en ${diffInSeconds} segundos`;
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
          return `en ${diffInMinutes} ${
            diffInMinutes === 1 ? "minuto" : "minutos"
          }`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
          return `en ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
          return `en ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
          return `en ${diffInMonths} ${diffInMonths === 1 ? "mes" : "meses"}`;
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return `en ${diffInYears} ${diffInYears === 1 ? "año" : "años"}`;
      } else {
        // Si la fecha es pasada
        const diffInSeconds = Math.floor(diffInMilliseconds / 1000);

        if (diffInSeconds < 60) {
          return `hace ${diffInSeconds} segundos`;
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
          return `hace ${diffInMinutes} ${
            diffInMinutes === 1 ? "minuto" : "minutos"
          }`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
          return `hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
          return `hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
          return `hace ${diffInMonths} ${diffInMonths === 1 ? "mes" : "meses"}`;
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return `hace ${diffInYears} ${diffInYears === 1 ? "año" : "años"}`;
      }
    } else {
      // Para otros formatos de fecha, usar el método estándar
      const date =
        typeof timestamp === "string" || typeof timestamp === "number"
          ? new Date(timestamp)
          : timestamp;

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", timestamp);
        return "fecha inválida";
      }

      // Obtener la fecha actual
      const now = new Date();

      // Calcular la diferencia en milisegundos
      const diffInMilliseconds = now.getTime() - date.getTime();

      // Usar el mismo código que arriba para calcular la diferencia
      if (diffInMilliseconds < 0) {
        // Código para fechas futuras
        const absDiffInMilliseconds = Math.abs(diffInMilliseconds);
        const diffInSeconds = Math.floor(absDiffInMilliseconds / 1000);

        if (diffInSeconds < 60) {
          return `en ${diffInSeconds} segundos`;
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
          return `en ${diffInMinutes} ${
            diffInMinutes === 1 ? "minuto" : "minutos"
          }`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
          return `en ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
          return `en ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
          return `en ${diffInMonths} ${diffInMonths === 1 ? "mes" : "meses"}`;
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return `en ${diffInYears} ${diffInYears === 1 ? "año" : "años"}`;
      } else {
        // Código para fechas pasadas
        const diffInSeconds = Math.floor(diffInMilliseconds / 1000);

        if (diffInSeconds < 60) {
          return `hace ${diffInSeconds} segundos`;
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
          return `hace ${diffInMinutes} ${
            diffInMinutes === 1 ? "minuto" : "minutos"
          }`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
          return `hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
          return `hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
          return `hace ${diffInMonths} ${diffInMonths === 1 ? "mes" : "meses"}`;
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return `hace ${diffInYears} ${diffInYears === 1 ? "año" : "años"}`;
      }
    }
  } catch (error) {
    console.error("Error in formatDistanceToNow:", error);
    return "fecha desconocida";
  }
}

// Función para formatear fecha y hora preservando la hora original
export function formatLocalDateTime(timestamp: number | string | Date): string {
  try {
    // Si es una cadena que parece una fecha de base de datos (sin Z al final)
    if (typeof timestamp === "string" && !timestamp.endsWith("Z")) {
      // Extraer la fecha y hora directamente de la cadena
      // Formato esperado: "2025-05-20 19:01:23.000" o "2025-05-20T19:01:23.000"
      const dateStr = timestamp.replace("T", " ").split(".")[0];

      // Formatear manualmente para mostrar DD/MM/YYYY HH:MM
      const parts = dateStr.split(" ");
      if (parts.length === 2) {
        const datePart = parts[0].split("-");
        const timePart = parts[1].split(":");

        if (datePart.length === 3 && timePart.length >= 2) {
          return `${datePart[2]}/${datePart[1]}/${datePart[0]} ${timePart[0]}:${timePart[1]}`;
        }
      }

      // Si no se puede parsear manualmente, usar el método estándar
      const date = new Date(timestamp);
      return date.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else {
      // Para otros formatos de fecha, usar el método estándar
      const date =
        typeof timestamp === "string" || typeof timestamp === "number"
          ? new Date(timestamp)
          : timestamp;

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return "fecha inválida";
      }

      // Formatear la fecha usando toLocaleString
      return date.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  } catch (error) {
    console.error("Error in formatLocalDateTime:", error);
    return "fecha desconocida";
  }
}

export function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
