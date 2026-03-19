export type Unidad =
	| "Legalistas"
	| "Lexias"
	| "Fixer"
	| "Brixar"
	| "Anderregen"
	| "Generales";

export type Prioridad = "Baja" | "Media" | "Alta";

export type Categoria =
	| "Backend"
	| "Frontend"
	| "APP"
	| "Server"
	| "Backend-Frontend";

export type Responsable = "Jonatan" | "Agustin" | "Todos";

export type Estado =
	| "Para Iniciar"
	| "En Desarrollo"
	| "En Proceso"
	| "En Testeo"
	| "Finalizada"
	| "No Alcanzada";

export interface OKRArea {
	id: string;
	nombre: string;
	descripcion?: string;
	color: string;
	orden: number;
	activo: boolean;
}

export interface OKRItem {
	id: string;
	areaId: string; // Agregado areaId para vincular con el área
	unidad: Unidad;
	prioridad: Prioridad;
	categoria: Categoria;
	objetivo: string;
	resultadosClave: string;
	accionesClave: string;
	responsable: Responsable;
	estado: Estado;
	gradoAvance: number;
	fechaObjetivo: Date | null;
}

export const UNIDADES: Unidad[] = [
	"Legalistas",
	"Lexias",
	"Fixer",
	"Brixar",
	"Anderregen",
	"Generales",
];
export const PRIORIDADES: Prioridad[] = ["Baja", "Media", "Alta"];
export const CATEGORIAS: Categoria[] = [
	"Backend",
	"Frontend",
	"APP",
	"Server",
	"Backend-Frontend",
];
export const RESPONSABLES: Responsable[] = ["Jonatan", "Agustin", "Todos"];
export const ESTADOS: Estado[] = [
	"Para Iniciar",
	"En Desarrollo",
	"En Proceso",
	"En Testeo",
	"Finalizada",
	"No Alcanzada",
];

export const AREA_COLORS = [
	"#3b82f6", // blue
	"#10b981", // emerald
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#06b6d4", // cyan
	"#84cc16", // lime
];
