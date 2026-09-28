import { Role } from "@/constant/user";

/**
 * Administran RR.HH. (fichas, contratos, recibos, asistencia, licencias y el
 * legajo). Espejo de RRHH_ADMIN_ROLES del backend (src/modules/rrhh/access.ts):
 * el backend es quien bloquea, esto solo decide qué botones se muestran.
 * El SUPERADMIN del menú va escrito acá para no importar menu.ts (que importa esto).
 */
export const RRHH_ADMIN_ROLES: string[] = [
	Role.ADMINISTRATOR,
	"administrator",
	Role.DIRECTOR_GENERAL_CEO,
	Role.DIRECTOR_AREA_IT,
	Role.DIRECTORA_AREA_CONTABLE,
	Role.COORDINADOR_FINANCIERO,
	Role.DIRECTOR_FINANCIERO,
	Role.CONTADOR_SENIOR,
	Role.ANALISTA_FINANCIERO,
	Role.TESORERO,
	Role.AUDITOR_INTERNO,
];

/** Ven el Reporte RR.HH. (los costos, solo RRHH_ADMIN_ROLES). Espejo de RRHH_REPORTE_ROLES. */
export const RRHH_REPORTE_ROLES: string[] = [
	...RRHH_ADMIN_ROLES,
	Role.DIRECTORA_AREA_LEGAL,
	Role.COORDINADOR_LEGAL,
	Role.ASISTENTE_LEGAL,
];

export type Segmento = "INTERNO" | "REPRESENTANTE";

export const SEGMENTO_LABEL: Record<Segmento, string> = {
	INTERNO: "Equipo interno",
	REPRESENTANTE: "Representantes",
};

/** Sin segmento cargado en la ficha, se deduce del rol (igual que el backend). */
export const segmentoDe = (
	cargado: string | null | undefined,
	rol: string | null | undefined,
): Segmento =>
	cargado === "INTERNO" || cargado === "REPRESENTANTE"
		? cargado
		: rol === Role.ABOGADO_REPRESENTANTE
			? "REPRESENTANTE"
			: "INTERNO";

export type TipoDocumento =
	| "CONTRATO"
	| "RECIBO"
	| "CERTIFICADO"
	| "ASISTENCIA"
	| "SANCION"
	| "CAPACITACION"
	| "OTRO";

export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
	CONTRATO: "Contrato",
	RECIBO: "Recibo de sueldo",
	CERTIFICADO: "Certificado de licencia",
	ASISTENCIA: "Planilla de asistencia",
	SANCION: "Sanción / apercibimiento",
	CAPACITACION: "Capacitación",
	OTRO: "Otro",
};

export type ConceptoTipo =
	| "REMUNERACION"
	| "CARGAS_SOCIALES"
	| "OBRA_SOCIAL"
	| "MONOTRIBUTO"
	| "IIBB"
	| "OTRO";

export const CONCEPTO_LABEL: Record<ConceptoTipo, string> = {
	REMUNERACION: "Remuneración",
	CARGAS_SOCIALES: "Cargas sociales",
	OBRA_SOCIAL: "Obra social",
	MONOTRIBUTO: "Monotributo",
	IIBB: "IIBB",
	OTRO: "Otro",
};

export const LICENCIA_LABEL: Record<string, string> = {
	VACATION: "Vacaciones",
	SICK: "Enfermedad",
	STUDY: "Estudio",
	MATERNITY: "Maternidad",
	PATERNITY: "Paternidad",
	UNPAID: "Sin goce",
	OTHER: "Otra",
};
