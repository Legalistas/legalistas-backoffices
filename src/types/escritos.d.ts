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
	createdAt: string;
	updatedAt: string;
	case: { id: number; number: string | null; title: string | null } | null;
	file: ExpedienteResumen | null;
}

export interface PlantillaListItem {
	id: number;
	nombre: string;
	descripcion: string | null;
	categoria: string | null;
	activa: boolean;
	membrete?: MembreteEscrito;
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
}

export interface VariableEscrito {
	clave: string;
	etiqueta: string;
	grupo: string;
}
