export type CajaGrupo = "PRINCIPAL" | "MONOTRIBUTO";
export type CajaMovimientoTipo = "INGRESO" | "EGRESO";
export type CajaRubroTipo = "INGRESO" | "EGRESO" | "AMBOS";

export interface CajaTotales {
	saldo: number;
	/** Del mes en curso, sin transferencias entre cajas. */
	ingresosMes: number;
	egresosMes: number;
}

export interface Caja extends CajaTotales {
	id: number;
	nombre: string;
	slug: string;
	grupo: CajaGrupo;
	parentId: number | null;
	ownerUserId: number | null;
	owner: { id: number; name: string } | null;
	saldoInicial: number;
	orden: number;
	activa: boolean;
	/** Agrupa sub-cajas: no recibe movimientos, su saldo es la suma de las hijas. */
	esContenedora: boolean;
	hijas: Caja[];
}

export interface CajasResponse {
	esAdmin: boolean;
	cajas: Caja[];
	/** Caja General (solo admins). */
	general: CajaTotales | null;
}

export interface CajaRubro {
	id: number;
	nombre: string;
	tipo: CajaRubroTipo;
	parentId: number | null;
	activo: boolean;
	orden: number;
	subRubros?: CajaRubro[];
}

export interface CajaMovimiento {
	id: number;
	cajaId: number;
	tipo: CajaMovimientoTipo;
	monto: number;
	/** YYYY-MM-DD */
	fecha: string;
	rubroId: number | null;
	subRubroId: number | null;
	descripcion: string | null;
	transferenciaId: string | null;
	createdById: number;
	anulado: boolean;
	anuladoAt: string | null;
	motivoAnulacion: string | null;
	createdAt: string;
	caja: { id: number; nombre: string };
	rubro: { id: number; nombre: string } | null;
	subRubro: { id: number; nombre: string } | null;
	createdBy: { id: number; name: string };
	anuladoBy: { id: number; name: string } | null;
	/** En transferencias: la caja de la otra punta. */
	cajaContraparte: { id: number; nombre: string } | null;
}

export interface CajaMovimientosResponse {
	data: CajaMovimiento[];
	totales: { ingresos: number; egresos: number };
	pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CajaResumen {
	desde: string;
	hasta: string;
	porMes: { mes: string; ingresos: number; egresos: number }[];
	porRubro: { rubroId: number | null; nombre: string; tipo: CajaMovimientoTipo; total: number }[];
}
