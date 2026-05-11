/**
 * Estructura de carpetas del bucket `legalistas` en MinIO.
 *
 * El bucket se divide en dos secciones:
 *  - `crm/`   → leads activos en el CRM, organizados por etapa.
 *  - `casos/` → expedientes judiciales activos, organizados por etapa.
 *
 * Cada lead/caso vive dentro de su carpeta de etapa actual. Cuando cambia
 * de etapa en la plataforma, sus archivos se mueven automáticamente al
 * prefix de la nueva etapa.
 *
 * Estos slugs son la convención canónica — no cambiar sin migrar el bucket.
 */

export interface StorageStage {
	slug: string;
	label: string;
	description: string;
}

export const SECTION_CRM = "crm";
export const SECTION_CASES = "casos";

export const STAGES_CRM: StorageStage[] = [
	{
		slug: "nueva-consulta",
		label: "Nueva consulta",
		description: "Leads en etapa 1",
	},
	{
		slug: "reunion-a-concretar",
		label: "Reunión a concretar",
		description: "Leads en etapa 2",
	},
	{
		slug: "reunion-coordinada",
		label: "Reunión coordinada",
		description: "Leads en etapa 3",
	},
	{
		slug: "en-tratamiento",
		label: "En tratamiento",
		description: "Leads en etapa 4",
	},
	{
		slug: "telegramas",
		label: "Telegramas",
		description: "Leads en etapa 5",
	},
	{
		slug: "pendiente-de-confirmacion",
		label: "Pendiente de confirmación",
		description: "Leads en etapa 6",
	},
	{
		slug: "coordinador-reunion-poder",
		label: "Coordinador reunión poder",
		description: "Leads en etapa 7",
	},
	{
		slug: "pendiente-de-poder",
		label: "Pendiente de poder",
		description: "Leads en etapa 8",
	},
	{
		slug: "ganados",
		label: "Ganados",
		description: "Lead ganado (transición a casos)",
	},
	{
		slug: "perdidos",
		label: "Perdidos",
		description: "Leads no convertidos",
	},
	{
		slug: "archivados",
		label: "Archivados",
		description: "Leads archivados sin conversión",
	},
];

export const STAGES_CASES: StorageStage[] = [
	{
		slug: "documentacion",
		label: "Documentación",
		description: "Expediente ingresado, documentos pendientes",
	},
	{
		slug: "administrativo",
		label: "Administrativo",
		description: "Trámite administrativo iniciado",
	},
	{
		slug: "judicial",
		label: "Judicial",
		description: "Causa judicial iniciada",
	},
	{
		slug: "incapacidad",
		label: "Incapacidad",
		description: "Incapacidad fijada",
	},
	{
		slug: "cierre",
		label: "Cierre",
		description: "En gestión de cierre",
	},
	{
		slug: "experiencia",
		label: "Experiencia",
		description: "Cierre completado, en feedback de cliente",
	},
	{
		slug: "archivado",
		label: "Archivado",
		description: "Expediente cerrado y archivado",
	},
];

/** Lista plana de prefixes (`crm/nueva-consulta/`, `casos/documentacion/`, …). */
export const ALL_STAGE_PREFIXES: string[] = [
	...STAGES_CRM.map((s) => `${SECTION_CRM}/${s.slug}/`),
	...STAGES_CASES.map((s) => `${SECTION_CASES}/${s.slug}/`),
];

/**
 * Mapeo `columnId` del Kanban CRM → slug de la etapa de almacenamiento.
 * Sigue la convención de [CRM_COLUMNS](src/constant/crm.ts).
 */
export const CRM_COLUMN_TO_STAGE_SLUG: Record<number, string> = {
	1: "nueva-consulta",
	2: "reunion-a-concretar",
	3: "reunion-coordinada",
	4: "en-tratamiento",
	5: "pendiente-de-confirmacion",
	6: "coordinador-reunion-poder",
	8: "pendiente-de-poder",
	9: "ganados",
	10: "perdidos",
	11: "archivados",
	12: "telegramas",
};

/** Devuelve el prefix completo (`crm/<slug>/`) para una columna del CRM. */
export function getCrmStoragePrefix(columnId: number | null | undefined): string | null {
	if (!columnId) return null;
	const slug = CRM_COLUMN_TO_STAGE_SLUG[columnId];
	return slug ? `${SECTION_CRM}/${slug}/` : null;
}

/**
 * Mapeo `stageId` del Gestor de Causas → slug de la etapa de almacenamiento.
 * Sigue la convención de [CASE_STAGE_TO_TEMPLATE](src/lib/email.ts).
 */
export const CASE_STAGE_TO_STORAGE_SLUG: Record<number, string> = {
	1: "documentacion",
	2: "administrativo",
	3: "judicial",
	4: "incapacidad",
	5: "cierre",
	6: "experiencia",
	7: "archivado",
};

/** Devuelve el prefix completo (`casos/<slug>/`) para una etapa de caso. */
export function getCaseStoragePrefix(stageId: number | null | undefined): string | null {
	if (!stageId) return null;
	const slug = CASE_STAGE_TO_STORAGE_SLUG[stageId];
	return slug ? `${SECTION_CASES}/${slug}/` : null;
}

// ── Nomenclatura de carpetas de lead/caso ─────────────────────────────
//
// Cada lead o caso tiene una única carpeta cuyo nombre sigue el formato
// `APELLIDO_Nombre_ID`. El ID del lead y el del caso son el mismo número
// (único de por vida del cliente).
//
// Reglas:
//  - Apellido en MAYÚSCULAS para facilitar el orden alfabético.
//  - Nombre con la primera letra mayúscula.
//  - Sin espacios — se reemplazan por guion bajo `_`.
//  - Caracteres no [A-Za-z0-9] (acentos, ñ, etc.) se normalizan.
//
// Ejemplo: ANDEREGGEN_Agustin_780

/** Quita acentos y reemplaza espacios/caracteres no alfanuméricos por `_`. */
function sanitizeNamePart(value: string): string {
	return value
		.normalize("NFD")
		// rango Unicode de marcas diacríticas combinables (acentos)
		.replace(/[̀-ͯ]/g, "")
		.replace(/ñ/g, "n")
		.replace(/Ñ/g, "N")
		.replace(/[^A-Za-z0-9]+/g, "_") // cualquier otro → _
		.replace(/^_+|_+$/g, ""); // sin _ al inicio o fin
}

/** Capitaliza: primera letra mayúscula, resto minúsculas. */
function capitalize(value: string): string {
	if (!value) return "";
	return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Construye el nombre de carpeta de un lead/caso según la nomenclatura
 * `APELLIDO_Nombre_ID`. Devuelve `null` si faltan datos esenciales.
 *
 * @example
 *   buildEntityFolderName({ firstName: "agustin", lastName: "andereggen", id: 780 })
 *   // → "ANDEREGGEN_Agustin_780"
 */
export function buildEntityFolderName(input: {
	firstName?: string | null;
	lastName?: string | null;
	id: number | string;
}): string | null {
	const last = sanitizeNamePart(input.lastName ?? "").toUpperCase();
	const first = capitalize(sanitizeNamePart(input.firstName ?? ""));
	const id = String(input.id ?? "").trim();

	if (!last || !id) return null;
	return first ? `${last}_${first}_${id}` : `${last}_${id}`;
}

/**
 * Construye el prefix completo (incluyendo etapa) para la carpeta de un
 * lead o caso.
 *
 * @example
 *   buildEntityFolderPrefix("crm", "nueva-consulta", { lastName: "Pérez", firstName: "Juan", id: 12 })
 *   // → "crm/nueva-consulta/PEREZ_Juan_12/"
 */
export function buildEntityFolderPrefix(
	section: typeof SECTION_CRM | typeof SECTION_CASES,
	stageSlug: string,
	entity: {
		firstName?: string | null;
		lastName?: string | null;
		id: number | string;
	},
): string | null {
	const folderName = buildEntityFolderName(entity);
	if (!folderName) return null;
	return `${section}/${stageSlug}/${folderName}/`;
}

/** Valida que un nombre de carpeta cumpla con el patrón `APELLIDO_Nombre_ID`. */
export const ENTITY_FOLDER_REGEX =
	/^[A-Z][A-Z0-9_]*_[A-Za-z][A-Za-z0-9_]*_\d+$/;
