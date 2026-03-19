import { FILES_TYPE, STATUS_PROCESS, TYPES_PROCCESS } from "@/constant/causes";
import { servicesType, stageCases, statusType } from "./constant";

export const getServiceName = (serviceId: number | string) => {
	const serviceIdNum =
		typeof serviceId === "string" ? Number.parseInt(serviceId, 10) : serviceId;
	const service = servicesType.find(
		(s: { value: number }) => s.value === serviceIdNum,
	);
	return service ? service.label : "Desconocido";
};

export const getStatusName = (statusId: number | string) => {
	const statusIdNum =
		typeof statusId === "string" ? Number.parseInt(statusId, 10) : statusId;
	const status = stageCases.find((s) => s.value === statusIdNum);
	return status ? status.label : "Desconocido";
};

export const getStatusLabel = (status: string | undefined): string => {
	if (!status) return "En Progreso";
	const statusItem = statusType.find((item) => item.value === status);
	return statusItem ? statusItem.label : "En Progreso";
};

export const getStatusColor = (statusId: number | string) => {
	const statusIdNum =
		typeof statusId === "string" ? Number.parseInt(statusId, 10) : statusId;
	switch (statusIdNum) {
		case 1:
			return "success";
		case 2:
			return "warning";
		case 3:
			return "error";
		default:
			return "dark";
	}
};

export const getFileTypeLabel = (fileTypeValue: number): string => {
	const fileType = FILES_TYPE.find((type) => type.value === fileTypeValue);
	return fileType ? fileType.label : `Tipo ${fileTypeValue}`;
};

export function getProcessTypeLabel(typeProcessId: number | null): string {
	if (!typeProcessId) return "No especificado";

	const processType = TYPES_PROCCESS.find((type) => type.id === typeProcessId);
	return processType ? processType.value : `Tipo ${typeProcessId}`;
}

export function getStatusProcessLabel(statusId: number): string {
	const statusProcess = STATUS_PROCESS.find((status) => status.id === statusId);
	return statusProcess ? statusProcess.value : `Estado ${statusId}`;
}

export function getProceduralStageLabel(
	stageId: number,
	fileType: number,
): string {
	switch (stageId) {
		case 1:
			return "DOCUMENTACIÓN PENDIENTE";
		case 2:
			return "POR INICIAR";
		case 3:
			return "EXPEDIENTE INICIADO";
		case 4:
			return fileType === 1
				? "FECHA DE LA PRIMERA AUDIENCIA"
				: "FECHA DEL DICTAMEN EXPERTO: JMP";
		case 5:
			return fileType === 1
				? "GESTIÓN DE ESTUDIOS MÉDICOS"
				: "IMPULSO PROCESAL";
		case 6:
			return "EN ESPERA DE RESOLUCIÓN";
		case 7:
			return "FECHA DE LA AUDIENCIA DE HOMOLOGACIÓN";
		case 8:
			return "NEGOCIACIÓN EN TRÁMITE";
		case 9:
			return "ACUERDO";
		case 10:
			return "RATIFICADO";
		case 11:
			return "ORDEN DE PAGO SOLICITADA";
		case 12:
			return "COBRO DE HONORARIOS";
		case 13:
			return "PRIMER MENSAJE DE SATISFACCIÓN";
		case 14:
			return "LINK";
		case 15:
			return "ARCHIVO";
		default:
			return `Etapa ${stageId}`;
	}
}

/**
 * Formatea una fecha en formato ISO a un formato legible en español
 * @param dateString - Fecha en formato ISO o null/undefined
 * @returns Fecha formateada como "DD/MesCompleto/YYYY" o "N/A" si la fecha es inválida
 */
export const formatDate = (dateString: string | null | undefined) => {
	// Si es null, undefined o cadena vacía
	if (!dateString) return "N/A";

	try {
		// Verificar si la fecha es válida antes de intentar formatearla
		const date = new Date(dateString);

		// Si la fecha es inválida (NaN), retornar "N/A"
		if (isNaN(date.getTime())) {
			console.warn("Fecha inválida:", dateString);
			return "N/A";
		}

		// Obtener el día con formato de dos dígitos (01-31)
		const day = date.getDate().toString().padStart(2, "0");

		// Obtener el año completo
		const year = date.getFullYear();

		// Obtener el nombre del mes en español con la primera letra en mayúscula
		const monthNames = [
			"Enero",
			"Febrero",
			"Marzo",
			"Abril",
			"Mayo",
			"Junio",
			"Julio",
			"Agosto",
			"Septiembre",
			"Octubre",
			"Noviembre",
			"Diciembre",
		];
		const month = monthNames[date.getMonth()];

		// Formatear como "DD/MesCompleto/YYYY"
		return `${day}/${month}/${year}`;
	} catch (e) {
		console.error("Error formatting date:", e, "for value:", dateString);
		return "N/A";
	}
};

/**
 * Formatea una fecha con opciones personalizadas
 * @param dateString - Fecha en formato ISO o null/undefined
 * @param format - Formato deseado: 'short' (04/05/2025), 'medium' (04/Mayo/2025), 'long' (04 de Mayo de 2025)
 * @returns Fecha formateada según el formato especificado o "N/A" si la fecha es inválida
 */
export const formatDateCustom = (
	dateString: string | null | undefined,
	format: "short" | "medium" | "long" = "medium",
) => {
	if (!dateString) return "N/A";

	try {
		const date = new Date(dateString);

		if (isNaN(date.getTime())) {
			console.warn("Fecha inválida:", dateString);
			return "N/A";
		}

		const day = date.getDate().toString().padStart(2, "0");
		const year = date.getFullYear();

		const monthNames = [
			"Enero",
			"Febrero",
			"Marzo",
			"Abril",
			"Mayo",
			"Junio",
			"Julio",
			"Agosto",
			"Septiembre",
			"Octubre",
			"Noviembre",
			"Diciembre",
		];
		const month = monthNames[date.getMonth()];

		// Formato numérico del mes (01-12)
		const monthNumber = (date.getMonth() + 1).toString().padStart(2, "0");

		switch (format) {
			case "short":
				return `${day}/${monthNumber}/${year}`;
			case "medium":
				return `${day}/${month}/${year}`;
			case "long":
				return `${day} de ${month} de ${year}`;
			default:
				return `${day}/${month}/${year}`;
		}
	} catch (e) {
		console.error("Error formatting date:", e);
		return "N/A";
	}
};

/**
 * Verifica si una fecha es válida
 * @param dateString - Fecha a verificar
 * @returns true si la fecha es válida, false en caso contrario
 */
export const isValidDate = (dateString: string | null | undefined): boolean => {
	if (!dateString) return false;

	try {
		const date = new Date(dateString);
		return !isNaN(date.getTime());
	} catch {
		return false;
	}
};

export function getBuenosAiresTime(date: Date = new Date()): string {
	return date.toLocaleTimeString("es-AR", {
		timeZone: "America/Argentina/Buenos_Aires",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function getBuenosAiresDateTime(date: Date = new Date()): string {
	return date.toLocaleString("es-AR", {
		timeZone: "America/Argentina/Buenos_Aires",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}
