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

	// Patrocinio todavía no tiene los inputs marcados con `name`.
	if (docSrc !== "/srt/anexo-i.html") return {};

	const contingency = data.contingencyType;
	const w = worker(info, defaults);
	const lawyer = defaults?.representativeLawyer;

	return {
		// Bloque trabajador / empleador / ART: vienen de la tab Info.
		trabajador_nombre: str(w.fullName),
		trabajador_cuil: str(w.cuil),

		// Asistencia letrada: el abogado responsable de la causa.
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

		// Tipo de contingencia: tres checkbox excluyentes.
		tipo_accidente_trabajo: contingency === "ACCIDENTE_TRABAJO",
		tipo_in_itinere: contingency === "IN_ITINERE",
		tipo_enfermedad: contingency === "ENFERMEDAD_PROF",

		// Datos propios del anexo.
		fecha_denuncia: toDisplayDate(data.denunciaDate),
		fecha_baja: toDisplayDate(data.bajaLaboralDate),
		fecha_ocurrencia: toDisplayDate(data.ocurrenciaDate),
		detalle_contingencia: str(data.accidentDetail),
		afecciones_diagnosticos: str(data.diagnosticDetail),
		prueba_medica: str(data.medicalProof),

		// Preguntas médicas: cada una es un par SÍ/NO.
		atencion_art_si: data.art_attention === true,
		atencion_art_no: data.art_attention === false,
		alta_si: data.art_alta === true,
		alta_no: data.art_alta === false,
		otra_atencion_si: data.os_attention === true,
		otra_atencion_no: data.os_attention === false,
		estudio_si: data.os_studies === true,
		estudio_no: data.os_studies === false,
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

		default:
			return null;
	}
}
