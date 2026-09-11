import { Role } from "@/constant/user";

/**
 * Roles con acceso total a la Caja. Espejo de CAJA_ADMIN_ROLES del backend
 * (src/modules/caja/access.ts): el backend es quien bloquea, esto solo arma
 * el menú. "administrator" va además de Role.ADMINISTRATOR ("admin") porque
 * los guards del backend usan ese nombre.
 */
export const CAJA_ADMIN_ROLES: string[] = [
	Role.ADMINISTRATOR,
	"administrator",
	Role.DIRECTOR_GENERAL_CEO,
	Role.GERENTE_GENERAL_COO,
	Role.DIRECTOR_AREA_IT,
	Role.DIRECTORA_AREA_CONTABLE,
	Role.DIRECTOR_FINANCIERO,
	Role.COORDINADOR_FINANCIERO,
	Role.CONTADOR_SENIOR,
	Role.ANALISTA_FINANCIERO,
	Role.TESORERO,
	Role.AUDITOR_INTERNO,
];

export const CAJA_GRUPO_LABEL = {
	PRINCIPAL: "Cajas",
	MONOTRIBUTO: "Monotributos",
} as const;

export const CAJA_RUBRO_TIPO_LABEL = {
	INGRESO: "Ingreso",
	EGRESO: "Egreso",
	AMBOS: "Ingreso y egreso",
} as const;
