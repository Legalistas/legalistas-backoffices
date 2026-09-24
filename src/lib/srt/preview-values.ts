import type { PreviewValues } from "@/components/srt/SrtDocumentPreview";
import type { CaseSrtDefaults, CaseSrtInfo } from "@/types/srt";

// =============================================================================
// Puente entre el formulario de la pantalla y los <input name="..."> que ya
// traen los HTML de `public/srt/`. Cada clave del objeto que devolvemos es el
// `name` del input en el documento.
//
// El listado de documentos vive en la pantalla (`DOCUMENTS`); acá solo está el
// mapeo de datos. Hoy se rellenan Anexo I y Opción de Competencia: son los
// únicos HTML con los campos marcados.
// =============================================================================

/** YYYY-MM-DD (el value de un <input type="date">) → DD/MM/AAAA. */
function toDisplayDate(value: unknown): string {
	const raw = value == null ? "" : String(value);
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
}

function str(value: unknown): string {
	return value == null ? "" : String(value);
}

/**
 * Datos del trabajador: primero lo cargado a mano en la tab Info y, si está
 * vacío, lo que ya sabemos del cliente de la causa. Así el documento sale
 * completo sin tener que recargar a mano lo que el sistema ya tiene.
 */
function worker(info: CaseSrtInfo | null, defaults: CaseSrtDefaults | null) {
	const d = defaults?.worker;
	return {
		fullName: info?.workerFullName ?? d?.fullName,
		cuil: info?.workerCuil ?? d?.cuil,
		dni: info?.workerDni ?? d?.dni,
		address: info?.workerAddress ?? d?.address,
		city: info?.workerCity ?? d?.city,
		state: info?.workerState ?? d?.state,
	};
}

/** Campos de "Opción de Competencia". */
function competenceValues(
	info: CaseSrtInfo | null,
	defaults: CaseSrtDefaults | null,
): PreviewValues {
	const ground = info?.competenceGround;
	const w = worker(info, defaults);

	// La localidad y provincia del domicilio dependen de qué opción se eligió:
	// el domicilio del trabajador, o el del lugar donde presta servicios.
	const usesWorkplace = ground === "PRESTACION" || ground === "REPORTA";
	const city = usesWorkplace ? info?.workplaceCity : w.city;
	const state = usesWorkplace ? info?.workplaceState : w.state;

	return {
		cm_numero: str(info?.cmNumber),
		cm_delegacion: str(info?.cmJurisdiction),
		ground_domicilio: ground === "DOMICILIO",
		ground_prestacion: ground === "PRESTACION",
		ground_reporta: ground === "REPORTA",
		competencia_domicilio: str(
			info?.competenceAddress ?? (usesWorkplace ? info?.workplace : w.address),
		),
		competencia_localidad: str(city),
		competencia_provincia: str(state),
	};
}

export function buildPreviewValues(
	docSrc: string,
	info: CaseSrtInfo | null,
	data: Record<string, unknown>,
	defaults: CaseSrtDefaults | null = null,
): PreviewValues {
	if (docSrc === "/srt/opcion-competencia.html")
		return competenceValues(info, defaults);

	const contingency = data.contingencyType;
	const w = worker(info, defaults);
	const lawyer = defaults?.representativeLawyer;

	// Bloques comunes a los tres anexos: trabajador, letrado, empleador y ART.
	// Antes solo se armaban para el Anexo I y por eso el II y el III salían en
	// blanco aunque la causa tuviera todos los datos cargados.
	const common: PreviewValues = {
		trabajador_nombre: str(w.fullName),
		trabajador_cuil: str(w.cuil),
		letrado_nombre: str(lawyer?.name),
		letrado_cuit_domicilio: str(lawyer?.cuit),
		letrado_matricula: str(lawyer?.srtMatricula),
		empleador_nombre: str(info?.employerName),
		empleador_cuit: str(info?.employerCuit),
		establecimiento: str(info?.workplace),
		empleador_localidad: str(info?.workplaceCity),
		empleador_provincia: str(info?.workplaceState),
		art_denominacion: str(info?.artName),
		art_cuit: str(info?.artCuit),
		comision_numero: str(info?.cmNumber),
		jurisdiccion: str(info?.cmJurisdiction),
		fecha_denuncia: toDisplayDate(data.denunciaDate),
		fecha_baja: toDisplayDate(data.bajaLaboralDate),
		fecha_ocurrencia: toDisplayDate(data.ocurrenciaDate),
		afecciones_diagnosticos: str(data.diagnosticDetail),
		atencion_art_si: data.art_attention === true,
		atencion_art_no: data.art_attention === false,
		otra_atencion_si: data.os_attention === true,
		otra_atencion_no: data.os_attention === false,
		estudio_si: data.os_studies === true,
		estudio_no: data.os_studies === false,
	};

	// ── Anexo II — rechazo de accidente (y su variante in itinere) ────────
	if (docSrc === "/srt/anexo-ii.html") {
		return {
			...common,
			fecha_primera_atencion: toDisplayDate(data.firstAttentionDate),
			descripcion_accidente: str(data.accidentDescription),
			prueba_origen: str(data.originProof),
			horario_trabajo: str(data.workScheduleInOut),
			domicilio_trabajo: str(data.workAddress),
			domicilio_residencia: str(data.residenceAddress),
			lugar_accidente: str(data.accidentPlace),
			hora_accidente: str(data.accidentTime),
			denuncia_policial_si: data.policeReport === true,
			denuncia_policial_no: data.policeReport === false,
		};
	}

	// ── Anexo III — rechazo de enfermedad profesional ─────────────────────
	if (docSrc === "/srt/anexo-iii.html") {
		return {
			...common,
			fecha_diagnostico: toDisplayDate(data.diagnosticoDate),
			sector_trabajo: str(data.workSector),
			antiguedad_tarea: str(data.taskSeniority),
			anio_ingreso: str(data.hireYear),
			descripcion_tareas: str(data.tasksDescription),
			tareas_similares_si: data.similarTasksOthers === true,
			tareas_similares_no: data.similarTasksOthers === false,
			misma_enfermedad_si: data.sameDiseaseReported === true,
			misma_enfermedad_no: data.sameDiseaseReported === false,
			otros_empleadores: str(data.otherEmployers),
			pruebas_ofrecidas: str(data.proofOffered),
		};
	}

	if (docSrc !== "/srt/anexo-i.html") return {};

	// ── Anexo I — divergencia en la determinación de la incapacidad ───────
	return {
		...common,

		// Tipo de contingencia: tres checkbox excluyentes.
		tipo_accidente_trabajo: contingency === "ACCIDENTE_TRABAJO",
		tipo_in_itinere: contingency === "IN_ITINERE",
		tipo_enfermedad: contingency === "ENFERMEDAD_PROF",

		detalle_contingencia: str(data.accidentDetail),
		prueba_medica: str(data.medicalProof),
		alta_si: data.art_alta === true,
		alta_no: data.art_alta === false,

		// Preexistencias (opcional).
		preexistencia_si: data.hasPreexistence === true,
		preexistencia_no: data.hasPreexistence === false,
		preexistencia_detalle: str(data.preexistenceDetail),
		pre_tipo_accidente: data.preexistenceType === "ACCIDENTE_TRABAJO",
		pre_tipo_itinere: data.preexistenceType === "IN_ITINERE",
		pre_tipo_enfermedad: data.preexistenceType === "ENFERMEDAD_PROF",
		porcentaje_incapacidad: str(data.disabilityPercent),
		region_afectada: str(data.affectedRegion),
		prueba_judicial: str(data.judicialProof),
	};
}

// ── Del documento de vuelta al formulario ──────────────────────────────────

/** DD/MM/AAAA → YYYY-MM-DD, para devolverlo a un <input type="date">. */
function toIsoDate(value: string): string {
	const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
	return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

/** Dónde guardar lo que se editó sobre el documento. */
export type PreviewEdit =
	| { target: "anexo"; key: string; value: unknown }
	| { target: "info"; key: keyof CaseSrtInfo; value: unknown };

/**
 * Traduce una edición hecha sobre el documento al campo del formulario que le
 * corresponde. Devuelve `null` para los campos que no son editables desde acá
 * (los que salen de la tab Info, como empleador o ART).
 */
export function mapPreviewEdit(
	name: string,
	value: string | boolean,
): PreviewEdit | null {
	// Grupos de checkbox excluyentes: solo importa el que se acaba de marcar.
	const checked = value === true;

	switch (name) {
		// ── Opción de Competencia ───────────────────────────────────────────
		case "cm_numero":
			return { target: "info", key: "cmNumber", value };
		case "cm_delegacion":
			return { target: "info", key: "cmJurisdiction", value };
		case "competencia_domicilio":
			return { target: "info", key: "competenceAddress", value };
		case "ground_domicilio":
			return checked
				? { target: "info", key: "competenceGround", value: "DOMICILIO" }
				: { target: "info", key: "competenceGround", value: null };
		case "ground_prestacion":
			return checked
				? { target: "info", key: "competenceGround", value: "PRESTACION" }
				: { target: "info", key: "competenceGround", value: null };
		case "ground_reporta":
			return checked
				? { target: "info", key: "competenceGround", value: "REPORTA" }
				: { target: "info", key: "competenceGround", value: null };

		// ── Anexo I ─────────────────────────────────────────────────────────
		case "tipo_accidente_trabajo":
			return {
				target: "anexo",
				key: "contingencyType",
				value: checked ? "ACCIDENTE_TRABAJO" : null,
			};
		case "tipo_in_itinere":
			return {
				target: "anexo",
				key: "contingencyType",
				value: checked ? "IN_ITINERE" : null,
			};
		case "tipo_enfermedad":
			return {
				target: "anexo",
				key: "contingencyType",
				value: checked ? "ENFERMEDAD_PROF" : null,
			};

		case "fecha_denuncia":
			return { target: "anexo", key: "denunciaDate", value: toIsoDate(String(value)) };
		case "fecha_baja":
			return { target: "anexo", key: "bajaLaboralDate", value: toIsoDate(String(value)) };
		case "fecha_ocurrencia":
			return { target: "anexo", key: "ocurrenciaDate", value: toIsoDate(String(value)) };

		case "detalle_contingencia":
			return { target: "anexo", key: "accidentDetail", value };
		case "afecciones_diagnosticos":
			return { target: "anexo", key: "diagnosticDetail", value };
		case "prueba_medica":
			return { target: "anexo", key: "medicalProof", value };

		// Cada pregunta médica es un par SÍ/NO: marcar uno define el valor.
		case "atencion_art_si":
			return { target: "anexo", key: "art_attention", value: checked ? true : null };
		case "atencion_art_no":
			return { target: "anexo", key: "art_attention", value: checked ? false : null };
		case "alta_si":
			return { target: "anexo", key: "art_alta", value: checked ? true : null };
		case "alta_no":
			return { target: "anexo", key: "art_alta", value: checked ? false : null };
		case "otra_atencion_si":
			return { target: "anexo", key: "os_attention", value: checked ? true : null };
		case "otra_atencion_no":
			return { target: "anexo", key: "os_attention", value: checked ? false : null };
		case "estudio_si":
			return { target: "anexo", key: "os_studies", value: checked ? true : null };
		case "estudio_no":
			return { target: "anexo", key: "os_studies", value: checked ? false : null };

		// ── Preexistencias ──────────────────────────────────────────────────
		case "preexistencia_si":
			return { target: "anexo", key: "hasPreexistence", value: checked ? true : null };
		case "preexistencia_no":
			return { target: "anexo", key: "hasPreexistence", value: checked ? false : null };
		case "preexistencia_detalle":
			return { target: "anexo", key: "preexistenceDetail", value };
		case "pre_tipo_accidente":
			return {
				target: "anexo",
				key: "preexistenceType",
				value: checked ? "ACCIDENTE_TRABAJO" : null,
			};
		case "pre_tipo_itinere":
			return {
				target: "anexo",
				key: "preexistenceType",
				value: checked ? "IN_ITINERE" : null,
			};
		case "pre_tipo_enfermedad":
			return {
				target: "anexo",
				key: "preexistenceType",
				value: checked ? "ENFERMEDAD_PROF" : null,
			};
		case "porcentaje_incapacidad":
			return { target: "anexo", key: "disabilityPercent", value };
		case "region_afectada":
			return { target: "anexo", key: "affectedRegion", value };
		case "prueba_judicial":
			return { target: "anexo", key: "judicialProof", value };

		default:
			return null;
	}
}
