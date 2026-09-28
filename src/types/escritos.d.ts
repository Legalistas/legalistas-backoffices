// Tipos del módulo Escritos (backend: src/modules/escritos).

export interface FormatoHoja {
	fuente: string;
	tamanoFuente: number;
	interlineado: number;
	margenSuperior: number;
	margenInferior: number;
	margenIzquierdo: number;
	margenDerecho: number;
	numerarPaginas: boolean;
	/** LEGALISTAS (logo en cada página) | RPU (encabezado del Poder Judicial en la primera). */
	membrete?: MembreteEscrito;
}

export type MembreteEscrito = "LEGALISTAS" | "RPU";

/** ESCRITO: texto editable. FORMULARIO: diseño fijo (Foja Cero). */
export type TipoEscrito = "ESCRITO" | "FORMULARIO";
/** En qué expedientes se ofrece una plantilla. */
export type AmbitoPlantilla = "ADMINISTRATIVO" | "JUDICIAL" | "AMBOS";

export interface ExpedienteResumen {
	id: number;
	title: string | null;
	cuij: string | null;
}

export interface EscritoListItem {
	id: number;
	titulo: string;
	caseId: number | null;
	fileId: number | null;
	/** Último PDF guardado en la carpeta del expediente. */
	pdfObjectKey: string | null;
	pdfGeneradoAt: string | null;
	tipo?: TipoEscrito;
	createdAt: string;
	updatedAt: string;
	case: { id: number; number: string | null; title: string | null } | null;
	file: ExpedienteResumen | null;
	plantilla: { id: number; nombre: string } | null;
	createdBy: { id: number; name: string } | null;
}

export interface Escrito extends FormatoHoja {
	id: number;
	titulo: string;
	contenidoHtml: string;
	caseId: number | null;
	fileId: number | null;
	plantillaId: number | null;
	pdfObjectKey: string | null;
	pdfGeneradoAt: string | null;
	tipo?: TipoEscrito;
	createdAt: string;
	updatedAt: string;
	case: { id: number; number: string | null; title: string | null } | null;
	file: ExpedienteResumen | null;
	/** Variables que la plantilla exige para guardar el PDF (p. ej. "CUIJ,JUZGADO"). */
	plantilla?: { id: number; nombre: string; requiere: string | null; tipo: TipoEscrito } | null;
}

export interface PlantillaListItem {
	id: number;
	nombre: string;
	descripcion: string | null;
	categoria: string | null;
	activa: boolean;
	membrete?: MembreteEscrito;
	tipo?: TipoEscrito;
	ambito?: AmbitoPlantilla;
	requiere?: string | null;
	/** Plantillas del sistema (FOJA_CERO, DEMANDA_SISTEMICA): no se borran. */
	clave?: string | null;
	updatedAt: string;
	createdBy: { id: number; name: string } | null;
	_count: { escritos: number };
}

export interface Plantilla extends FormatoHoja {
	id: number;
	nombre: string;
	descripcion: string | null;
	categoria: string | null;
	contenidoHtml: string;
	activa: boolean;
	tipo?: TipoEscrito;
	ambito?: AmbitoPlantilla;
	requiere?: string | null;
	clave?: string | null;
}

export interface VariableEscrito {
	clave: string;
	etiqueta: string;
	grupo: string;
}
