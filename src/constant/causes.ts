export const TYPES_PROCCESS = [
	{ id: 1, value: "Administrativo SRT - Pendiente Documentación" },
	{ id: 2, value: "Administrativo SRT - Determinacion Incapacidad" },
	{ id: 3, value: "Administrativo SRT - Rechazo" },
	{ id: 4, value: "Administrativo SRT - Divergencia Alta" },
	{ id: 5, value: "Administrativo SRT - Valoracion Daño" },
	{ id: 6, value: "Accidente de Trabajo - Sumarísimo" },
	{ id: 7, value: "Accidente de Trabajo - Ordinario" },
	{ id: 8, value: "Administrativo - AGEM" },
	{ id: 9, value: "Administrativo - Reclamo Extrajudicial" },
	{ id: 10, value: "Medidas Aseguramiento Pruebas" },
	{ id: 11, value: "Medidas Cautelar Bienes" },
	{ id: 12, value: "Daños y Perjuicios" },
	{ id: 13, value: "Ejecutivos" },
	{ id: 14, value: "Declaratoria de Herederos" },
	{ id: 15, value: "Sucesorio" },
	{ id: 16, value: "Jubilacion" },
	{ id: 17, value: "Reajuste de Haberes" },
];

export const STATUS_PROCESS = [
	{ id: 1, value: "Asunto extrajudicial" },
	{ id: 2, value: "Asunto con prioridad" },
	{ id: 3, value: "Iniciado" },
	{ id: 4, value: "Trámite en SRT" },
	{ id: 5, value: "Demanda presentada" },
	{ id: 6, value: "Demanda notificada" },
	{ id: 7, value: "Demanda contestada" },
	{ id: 8, value: "Traslados a contestar" },
	{ id: 9, value: "En trámite - impulso" },
	{ id: 10, value: "Abierto a prueba" },
	{ id: 11, value: "Prueba en curso de producción" },
	{ id: 12, value: "Clausura probatoria solicitada" },
	{ id: 13, value: "Audiencia" },
	{ id: 14, value: "Autos para alegar" },
	{ id: 15, value: "Alegatos presentados" },
	{ id: 16, value: "Autos para dictar sentencia" },
	{ id: 17, value: "Sentencia emitida" },
	{ id: 18, value: "Sentencia firme" },
	{ id: 19, value: "Ejecución de Sentencia" },
	{ id: 20, value: "Recurso interpuesto" },
	{ id: 21, value: "Diligenciamiento de cedulas" },
	{ id: 22, value: "Valuacion bienes" },
	{ id: 23, value: "Declaratoria de herederos dictada" },
	{ id: 24, value: "Declaratoria de herederos mandada a inscribir" },
	{ id: 25, value: "Edictos publicados" },
	{ id: 26, value: "Embargo trabado" },
	{ id: 27, value: "Espera: documentos o información del cliente" },
	{ id: 28, value: "Espera: instrucciones del cliente" },
	{ id: 29, value: "Excepciones previas en trámite" },
	{ id: 30, value: "Expediente Paralizado por juzgado" },
	{ id: 31, value: "Incidente en resolucion" },
	{ id: 32, value: "Oficio en trámite" },
	{ id: 33, value: "Perito designado" },
	{ id: 34, value: "Fecha pericia" },
	{ id: 35, value: "Negociacion en tramite" },
	{ id: 36, value: "Acuerdo" },
	{ id: 37, value: "Ratificado" },
	{ id: 38, value: "Orden de pago solicitada" },
	{ id: 39, value: "Cobro de Honorarios" },
	{ id: 40, value: "Moroso en pago" },
	{ id: 41, value: "Satisfaccion Cliente" },
	{ id: 42, value: "Archivado" },
];

export const FILES_TYPE = [
	{ id: 1, value: 1, label: "Administrativo" },
	{ id: 2, value: 2, label: "Judicial" },
];

export const FILES_MOVEMENTS_MODE = [
	{ id: 1, value: 1, label: "Judicial" },
	{ id: 2, value: 2, label: "Extrajudicial" },
];

export const FILES_MOVEMENTS_TYPE = [
	{
		id: 1,
		value: 1,
		label: "Audiencia",
		subType: [
			{ id: 1, value: 1, label: "Homologación" },
			{ id: 2, value: 2, label: "Trámite" },
			{ id: 3, value: 3, label: "AVC" },
			{ id: 4, value: 4, label: "Ratificación" },
			{ id: 5, value: 5, label: "Testimonial" },
			{ id: 6, value: 6, label: "Confesional" },
			{ id: 7, value: 7, label: "Reconocimiento" },
		],
	},
	{
		id: 2,
		value: 2,
		label: "Pericia",
		subType: [
			{ id: 1, value: 1, label: "Pericia SRT" },
			{ id: 2, value: 2, label: "Pericia JPM (Privada)" },
			{ id: 3, value: 3, label: "Pericia Oficial (Judicial)" },
			{ id: 4, value: 4, label: "Pericia Psicológica" },
			{ id: 5, value: 5, label: "Otras Pericias" },
		],
	},
	{ id: 3, value: 3, label: "Vencimiento", subType: [] },
	{ id: 4, value: 4, label: "Reunión", subType: [] },
	{ id: 5, value: 5, label: "Videollamada", subType: [] },
];

// Status options
export const FILES_MOVEMENTS_STATUS_OPTIONS = [
	{ value: "pendiente", label: "Pendiente" },
	{ value: "completado", label: "Completado" },
	{ value: "cancelado", label: "Cancelado" },
	{ value: "reprogramado", label: "Reprogramado" },
];

// Schedule options
export const FILES_MOVEMENTS_SCHEDULE_OPTIONS = [
	{ value: "no", label: "No" },
	{ value: "si", label: "Si" },
];

// ============================================================================
// CASE EVENTS - Tipos de eventos (solo Audiencia y Pericia)
// ============================================================================
export const CASE_EVENTS_TYPE = [
	{
		id: 1,
		value: 1,
		label: "Audiencia",
		subType: [
			{ id: 1, value: 1, label: "Homologación" },
			{ id: 2, value: 2, label: "Trámite" },
			{ id: 3, value: 3, label: "AVC" },
			{ id: 4, value: 4, label: "Ratificación" },
			{ id: 5, value: 5, label: "Testimonial" },
			{ id: 6, value: 6, label: "Confesional" },
			{ id: 7, value: 7, label: "Reconocimiento" },
		],
	},
	{
		id: 2,
		value: 2,
		label: "Pericia",
		subType: [
			{ id: 1, value: 1, label: "Pericia SRT" },
			{ id: 2, value: 2, label: "Pericia JPM (Privada)" },
			{ id: 3, value: 3, label: "Pericia Oficial (Judicial)" },
			{ id: 4, value: 4, label: "Pericia Psicológica" },
			{ id: 5, value: 5, label: "Otras Pericias" },
		],
	},
];

export const CASE_EVENTS_STATUS_OPTIONS = [
	{ value: "pendiente", label: "Pendiente" },
	{ value: "completado", label: "Completado" },
	{ value: "cancelado", label: "Cancelado" },
	{ value: "reprogramado", label: "Reprogramado" },
];

export const CASE_EVENTS_SCHEDULE_OPTIONS = [
	{ value: "no", label: "No" },
	{ value: "si", label: "Si" },
];

export const LOG_TYPES = [
	{ type: "CREATED", label: "Creación" },
	{ type: "FILES", label: "Expediente" },
	{ type: "NOTES", label: "Notas" },
];

export const PARTS_TYPES = [
	{
		id: "parte-actor",
		code: "actor",
		name: "Actor/Demandante",
		description: "Parte que inicia la demanda",
		order: 1,
	},
	{
		id: "parte-demandado",
		code: "demandado",
		name: "Demandado",
		description: "Parte contra quien se dirige la demanda",
		order: 2,
	},
	{
		id: "parte-coactor",
		code: "coactor",
		name: "Coactor",
		description: "Actor en litisconsorcio activo",
		order: 3,
	},
	{
		id: "parte-codemandado",
		code: "codemandado",
		name: "Codemandado",
		description: "Demandado en litisconsorcio pasivo",
		order: 4,
	},
	{
		id: "parte-tercero",
		code: "tercero",
		name: "Tercero",
		description: "Tercero interviniente",
		order: 5,
	},
	{
		id: "parte-tercero-citado",
		code: "tercero_citado",
		name: "Tercero Citado",
		description: "Tercero citado por alguna de las partes",
		order: 6,
	},
	{
		id: "parte-citado-eviccion",
		code: "citado_eviccion",
		name: "Citado en Garantía/Evicción",
		description: "Citado por evicción o saneamiento",
		order: 7,
	},
	{
		id: "parte-citado-codemanda",
		code: "citado_codemanda",
		name: "Citado en Codemanda",
		description: "Citado como codemandado",
		order: 8,
	},
	{
		id: "parte-aseguradora",
		code: "aseguradora",
		name: "Aseguradora Citada",
		description: "Compañía de seguros citada en garantía",
		order: 9,
	},
	{
		id: "parte-art",
		code: "art",
		name: "ART Citada",
		description: "Aseguradora de Riesgos del Trabajo",
		order: 10,
	},
	{
		id: "parte-heredero",
		code: "heredero",
		name: "Heredero",
		description: "Heredero en proceso sucesorio",
		order: 11,
	},
	{
		id: "parte-legatario",
		code: "legatario",
		name: "Legatario",
		description: "Beneficiario de legado",
		order: 12,
	},
	{
		id: "parte-acreedor",
		code: "acreedor",
		name: "Acreedor",
		description: "Acreedor en proceso concursal/sucesorio",
		order: 13,
	},
	{
		id: "parte-sindico",
		code: "sindico",
		name: "Síndico",
		description: "Síndico en concurso o quiebra",
		order: 14,
	},
	{
		id: "parte-ministerio-publico",
		code: "ministerio_publico",
		name: "Ministerio Público",
		description: "Fiscal o Defensor Público",
		order: 15,
	},
	{
		id: "parte-asesor-menores",
		code: "asesor_menores",
		name: "Asesor de Menores",
		description: "Representante de menores e incapaces",
		order: 16,
	},
];
