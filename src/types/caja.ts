export type CajaGrupo = "PRINCIPAL" | "MONOTRIBUTO";
export type CajaMovimientoTipo = "INGRESO" | "EGRESO";
export type CajaRubroTipo = "INGRESO" | "EGRESO" | "AMBOS";

/** Los "Mes" son del mes pedido a la API (`?mes=YYYY-MM`). */
export interface CajaTotales {
	/** Saldo hoy. */
	saldo: number;
	/** Saldo al 1° del mes (arrastre del mes anterior). */
	saldoApertura: number;
	/** Ingresos y egresos reales del mes, sin transferencias entre cajas. */
	ingresosMes: number;
	egresosMes: number;
	transfEntradaMes: number;
	transfSalidaMes: number;
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
	/** Período de los totales "Mes": YYYY-MM (un mes) o YYYY (año completo, `?anio=`). */
	mes: string;
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
	/** Réplica de un gasto de causa: se ve pero no suma al saldo ni a los totales. */
	informativo: boolean;
	/** Gasto de causa que lo generó: se edita y se anula desde el caso. */
	caseExpenseId: number | null;
	caseExpense: { id: number; caseId: number; fileId: number | null } | null;
	/** Cobro de un cierre (HP = fee, PCL = pcl): el monto solo se corrige anulando. */
	closingId: number | null;
	closingConcepto: ConceptoCobro | null;
	closing: { id: number; caseId: number; case: { title: string | null } | null } | null;
	/** Fila de Gastos e Ingresos que cobra o paga. */
	scheduledTransactionId: number | null;
	scheduledTransaction: { id: number; concept: string; type: "income" | "expense" } | null;
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

// ── Cobros de cierres (Gestor de Cierres → Caja) ─────────────────────────

export type ConceptoCobro = "fee" | "pcl";
export type EstadoCobroCierre = "EARRINGS" | "REQUESTED" | "PARTIAL" | "CHARGED";

export interface SituacionCobro {
	/** Lo que le corresponde a Legalistas (neto de representante y aportes). */
	esperado: number;
	/** Máximo cobrable: el HP/PCL total (bruto). */
	tope: number;
	/** Cobrado en la caja vieja + la Caja Contable. */
	cobrado: number;
	/** Lo que falta para llegar a lo esperado. */
	restante: number;
	/** Lo que todavía se puede cobrar sin pasar el tope. */
	disponible: number;
	completo: boolean;
	estado: EstadoCobroCierre;
	cajaVieja: number;
	cajaContable: number;
}

export interface EstadoCobro {
	closingId: number;
	caseId: number;
	caseTitle: string;
	/** null: el cierre no tiene ese concepto (PCL sin convenir). */
	conceptos: { fee: SituacionCobro | null; pcl: SituacionCobro | null };
	cobros: {
		origen: "CAJA_VIEJA" | "CAJA_CONTABLE";
		id: number;
		concepto: ConceptoCobro;
		monto: number;
		fecha: string;
		caja: string;
		descripcion: string | null;
	}[];
}

/** GET /caja/programados/:id — fila de Gastos e Ingresos a cobrar/pagar. */
export interface ProgramadoACobrar {
	id: number;
	type: "income" | "expense";
	concept: string;
	status: string;
	closingId: number | null;
	closingConcept: ConceptoCobro | null;
	/** Resumen de tarjeta: se paga el resumen (PagarResumenDialog). */
	creditCardId: number | null;
	periodoTarjeta: string | null;
	/** Monto en pesos (las filas en USD ya convertidas con su cotización). */
	montoPesos: number;
	/** Rubro sugerido según la categoría. */
	rubroId: number | null;
	subRubroId: number | null;
}

// ── Proyección anual (Caja General) ──────────────────────────────────────

export interface Montos {
	ingresos: number;
	egresos: number;
}

export interface MesProyeccion {
	/** YYYY-MM */
	mes: string;
	estado: "pasado" | "actual" | "futuro";
	real: Montos;
	previsto: Montos;
	saldoReal: number;
	/** null en meses pasados. */
	saldoProyectado: number | null;
}

export interface Proyeccion {
	anio: number;
	saldoInicioAnio: number;
	/** Pendiente vencido antes del año, sin cobrar/pagar. */
	arrastre: Montos;
	meses: MesProyeccion[];
	totales: { real: Montos; previsto: Montos };
}

// ── Tarjetas de crédito (compras en cuotas) ──────────────────────────────

export type TarjetaCuotaEstado = "PENDIENTE" | "PAGADA" | "ANULADA";

export interface Tarjeta {
	id: number;
	nombre: string;
	activa: boolean;
	/** Día del mes en que cierra el resumen (define en qué resumen cae la 1ª cuota). */
	diaCierre: number | null;
	diaVencimiento: number | null;
	pendienteTotal: number;
	cuotasPendientes: number;
	proximoResumen: { periodo: string; vencimiento: string; total: number } | null;
}

export interface TarjetaResumen {
	/** YYYY-MM (mes de cierre). */
	periodo: string;
	vencimiento: string;
	total: number;
	pendiente: number;
	pagado: number;
	pagos: { movimientoId: number; fecha: string; caja: string }[];
	cuotas: {
		id: number;
		compraId: number;
		descripcion: string;
		numero: number;
		de: number;
		monto: number;
		estado: TarjetaCuotaEstado;
	}[];
}

export interface TarjetaCompra {
	id: number;
	fecha: string;
	descripcion: string;
	montoTotal: number;
	cuotas: number;
	cuotasPagadas: number;
	primerPeriodo: string | null;
	rubro: { id: number; nombre: string } | null;
	subRubro: { id: number; nombre: string } | null;
	createdBy: { id: number; name: string };
	anulada: boolean;
	anuladaBy: { id: number; name: string } | null;
	motivoAnulacion: string | null;
}

export interface TarjetaDetalle {
	tarjeta: Omit<Tarjeta, "pendienteTotal" | "cuotasPendientes" | "proximoResumen">;
	resumenes: TarjetaResumen[];
	compras: TarjetaCompra[];
}
