import type { ConceptoTipo, Segmento } from "@/constant/rrhh";

// Panel RR.HH. (Sueldos del mes): what each person's month looks like and the
// draft payslip to generate. Pure functions, tested in panel-rrhh.test.ts.

export interface ConceptoPanel {
	id: number;
	concepto: ConceptoTipo;
	descripcion: string | null;
	monto: string;
	/** ISO date (stored as a plain date, read in UTC). */
	vencimiento: string;
	/** Its row in Gastos e Ingresos (null in old payslips). */
	scheduledTransaction: { id: number; status: string } | null;
}

export interface ReciboPanel {
	id: number;
	period: string;
	grossAmount: string;
	netAmount: string;
	contributions: string | null;
	deductions: string | null;
	currency: string;
	payDate: string | null;
	conceptos: ConceptoPanel[];
}

export interface EmpleadoPanel {
	userId: number;
	name: string;
	image: string | null;
	position: string | null;
	area: string | null;
	status: string | null;
	segmento: Segmento;
	sueldoBase: string | null;
	recibos: ReciboPanel[];
	recibosAnteriores: ReciboPanel[];
}

/** SIN_PAGO = there is a payslip but nothing of it goes through Gastos e Ingresos. */
export type EstadoPago = "SIN_RECIBO" | "SIN_PAGO" | "PENDIENTE" | "PAGADO";

export interface ResumenPago {
	estado: EstadoPago;
	/** Rows of Gastos e Ingresos still to pay. */
	pendientes: { id: number; monto: number }[];
	montoPendiente: number;
	montoPagado: number;
}

const num = (v: string | number | null | undefined) => Number(v) || 0;

export function resumenPago(recibos: ReciboPanel[]): ResumenPago {
	const conFila = recibos.flatMap((r) => r.conceptos).filter((c) => c.scheduledTransaction);
	const pendientes = conFila
		.filter((c) => c.scheduledTransaction?.status === "pending")
		.map((c) => ({ id: c.scheduledTransaction?.id as number, monto: num(c.monto) }));
	const montoPendiente = pendientes.reduce((acc, p) => acc + p.monto, 0);
	const montoPagado = conFila
		.filter((c) => c.scheduledTransaction?.status === "paid")
		.reduce((acc, c) => acc + num(c.monto), 0);
	const estado: EstadoPago = !recibos.length
		? "SIN_RECIBO"
		: !conFila.length
			? "SIN_PAGO"
			: pendientes.length
				? "PENDIENTE"
				: "PAGADO";
	return { estado, pendientes, montoPendiente, montoPagado };
}

/**
 * The payslip of last month to copy. With more than one (the June or December
 * bonus goes in its own payslip), the regular salary is the biggest one.
 */
export function reciboBase(anteriores: ReciboPanel[]): ReciboPanel | null {
	return anteriores.reduce<ReciboPanel | null>(
		(best, r) => (!best || num(r.grossAmount) > num(best.grossAmount) ? r : best),
		null,
	);
}

/** "2026-11-05..." → "2026-12-05"; the 31st becomes the last day of a shorter month. */
export function sumarMes(fecha: string): string {
	const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
	const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
	const out = new Date(Date.UTC(y, m, Math.min(d, ultimo)));
	return out.toISOString().slice(0, 10);
}

/** "2026-11" → "octubre de 2026" (the month the drafts are copied from). */
export function periodoAnteriorLabel(periodo: string): string {
	const [y, m] = periodo.split("-").map(Number);
	return new Date(Date.UTC(y, m - 2, 1)).toLocaleDateString("es-AR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

/** Day 5 of the month after the period (same default as the payslip form). */
export function vencimientoSugerido(periodo: string): string {
	const [y, m] = periodo.split("-").map(Number);
	return new Date(Date.UTC(y, m, 5)).toISOString().slice(0, 10);
}

export interface ConceptoBorrador {
	concepto: ConceptoTipo;
	descripcion: string | null;
	monto: string;
	vencimiento: string;
}

export interface BorradorRecibo {
	userId: number;
	name: string;
	grossAmount: string;
	netAmount: string;
	contributions: string | null;
	deductions: string | null;
	currency: string;
	conceptos: ConceptoBorrador[];
	/** Where the numbers came from, shown next to the person. */
	origen: "MES_ANTERIOR" | "SUELDO_BASE" | "VACIO";
}

/**
 * Draft payslip of the month: a copy of last month's (its concepts one month
 * later) or, without one, the base salary as the net pay. A payslip without
 * concepts gets one "Remuneración" for the net, so it can be paid from here.
 */
export function borradorRecibo(e: EmpleadoPanel, periodo: string): BorradorRecibo {
	const comun = { userId: e.userId, name: e.name };
	const base = reciboBase(e.recibosAnteriores);
	if (base) {
		return {
			...comun,
			grossAmount: base.grossAmount,
			netAmount: base.netAmount,
			contributions: base.contributions,
			deductions: base.deductions,
			currency: base.currency,
			conceptos: base.conceptos.length
				? base.conceptos.map((c) => ({
						concepto: c.concepto,
						descripcion: c.descripcion,
						monto: c.monto,
						vencimiento: sumarMes(c.vencimiento),
					}))
				: [
						{
							concepto: "REMUNERACION",
							descripcion: null,
							monto: base.netAmount,
							vencimiento: vencimientoSugerido(periodo),
						},
					],
			origen: "MES_ANTERIOR",
		};
	}
	const sueldo = e.sueldoBase ?? "";
	return {
		...comun,
		grossAmount: sueldo,
		netAmount: sueldo,
		contributions: null,
		deductions: null,
		currency: "ARS",
		// Empty amount when there is nothing to copy: filled in before saving.
		conceptos: [
			{ concepto: "REMUNERACION", descripcion: null, monto: sueldo, vencimiento: vencimientoSugerido(periodo) },
		],
		origen: sueldo ? "SUELDO_BASE" : "VACIO",
	};
}

/** Error of a draft, or null if it can be saved. */
export function errorBorrador(b: BorradorRecibo): string | null {
	if (!(num(b.grossAmount) > 0) || !(num(b.netAmount) > 0)) return "Faltan el bruto y el neto";
	if (!b.conceptos.length) return "Falta al menos un concepto a pagar";
	if (b.conceptos.some((c) => !(num(c.monto) > 0))) return "Hay un concepto sin monto";
	return null;
}
