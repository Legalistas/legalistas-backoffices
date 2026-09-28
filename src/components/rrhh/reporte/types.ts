import type { ConceptoTipo, Segmento, TipoDocumento } from "@/constant/rrhh";

// Respuesta de GET /rrhh/reporte (backend src/modules/rrhh/reporte.service.ts).

export type TipoLicencia =
	| "VACATION"
	| "SICK"
	| "STUDY"
	| "MATERNITY"
	| "PATERNITY"
	| "UNPAID"
	| "OTHER";

export interface PersonaReporte {
	id: number;
	name: string;
	email: string | null;
	image: string | null;
	roles: string[];
	segmento: Segmento;
	tieneFicha: boolean;
	status: "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";
	area: string | null;
	position: string | null;
	representativeLevel: string | null;
	hireDate: string | null;
	terminationDate: string | null;
	antiguedadAnios: number | null;
	jefe: { id: number; name: string } | null;
	contrato: { type: string; startDate: string; endDate: string | null } | null;
	vacaciones: {
		anio: number;
		corresponden: number | null;
		antiguedadAnios: number | null;
		proporcional: boolean;
		tomados: number;
		pedidos: number;
		disponibles: number | null;
	};
	licencias: {
		aprobadas: number;
		pendientes: number;
		dias: Record<TipoLicencia, number>;
		porMes: Record<string, Partial<Record<TipoLicencia, number>>>;
	};
	asistencia: { registros: number; dias: number; horas: number; horasExtra: number };
	legajo: Partial<Record<TipoDocumento, number>>;
	costos: {
		recibos: number;
		bruto: number;
		neto: number;
		total: number;
		pagado: number;
		pendiente: number;
		porConcepto: Record<ConceptoTipo, number>;
		porMes: Record<string, Partial<Record<ConceptoTipo, number>>>;
	} | null;
}

export interface ReporteRrhhData {
	rango: { desde: string; hasta: string };
	periodos: string[];
	verCostos: boolean;
	personas: PersonaReporte[];
}
