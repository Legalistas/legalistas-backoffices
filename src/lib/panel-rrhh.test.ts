import { describe, expect, test } from "bun:test";
import {
	borradorRecibo,
	type EmpleadoPanel,
	errorBorrador,
	moverPeriodo,
	type ReciboPanel,
	reciboBase,
	resumenPago,
	sumarMes,
} from "./panel-rrhh";

const recibo = (over: Partial<ReciboPanel> = {}): ReciboPanel => ({
	id: 1,
	period: "2026-10",
	grossAmount: "1000",
	netAmount: "800",
	contributions: null,
	deductions: null,
	currency: "ARS",
	payDate: null,
	conceptos: [],
	...over,
});

const concepto = (status: string | null, monto = "800", id = 1) => ({
	id,
	concepto: "REMUNERACION" as const,
	descripcion: null,
	monto,
	vencimiento: "2026-11-05T00:00:00.000Z",
	scheduledTransaction: status ? { id: id + 100, status } : null,
});

const empleado = (over: Partial<EmpleadoPanel> = {}): EmpleadoPanel => ({
	userId: 7,
	name: "Ana",
	image: null,
	position: null,
	area: null,
	status: "ACTIVE",
	segmento: "INTERNO",
	sueldoBase: null,
	recibos: [],
	recibosAnteriores: [],
	...over,
});

describe("resumenPago", () => {
	test("no payslip", () => {
		expect(resumenPago([]).estado).toBe("SIN_RECIBO");
	});
	test("payslip without rows in Gastos e Ingresos", () => {
		expect(resumenPago([recibo()]).estado).toBe("SIN_PAGO");
	});
	test("pending rows are listed with their amounts", () => {
		const r = resumenPago([
			recibo({ conceptos: [concepto("pending", "800", 1), concepto("paid", "150", 2)] }),
		]);
		expect(r.estado).toBe("PENDIENTE");
		expect(r.pendientes).toEqual([{ id: 101, monto: 800 }]);
		expect(r.montoPendiente).toBe(800);
		expect(r.montoPagado).toBe(150);
	});
	test("everything paid", () => {
		expect(resumenPago([recibo({ conceptos: [concepto("paid")] })]).estado).toBe("PAGADO");
	});
});

describe("reciboBase", () => {
	test("with the bonus in its own payslip, the salary (biggest) is copied", () => {
		const sueldo = recibo({ id: 1, grossAmount: "1000" });
		const aguinaldo = recibo({ id: 2, grossAmount: "500" });
		expect(reciboBase([aguinaldo, sueldo])?.id).toBe(1);
	});
	test("none", () => {
		expect(reciboBase([])).toBeNull();
	});
});

describe("moverPeriodo", () => {
	test("next month across the year", () => {
		expect(moverPeriodo("2026-12", 1)).toBe("2027-01");
	});
	test("previous month across the year", () => {
		expect(moverPeriodo("2026-01", -1)).toBe("2025-12");
	});
});

describe("sumarMes", () => {
	test("same day next month", () => {
		expect(sumarMes("2026-11-05T00:00:00.000Z")).toBe("2026-12-05");
	});
	test("December goes to January", () => {
		expect(sumarMes("2026-12-05")).toBe("2027-01-05");
	});
	test("the 31st becomes the last day of a shorter month", () => {
		expect(sumarMes("2027-01-31")).toBe("2027-02-28");
	});
});

describe("borradorRecibo", () => {
	test("copies last month with its concepts one month later", () => {
		const b = borradorRecibo(
			empleado({ recibosAnteriores: [recibo({ conceptos: [concepto("paid")] })] }),
			"2026-11",
		);
		expect(b.origen).toBe("MES_ANTERIOR");
		expect(b.netAmount).toBe("800");
		expect(b.conceptos).toEqual([
			{ concepto: "REMUNERACION", descripcion: null, monto: "800", vencimiento: "2026-12-05" },
		]);
	});
	test("an old payslip without concepts gets the net as Remuneración", () => {
		const b = borradorRecibo(empleado({ recibosAnteriores: [recibo()] }), "2026-11");
		expect(b.conceptos).toEqual([
			{ concepto: "REMUNERACION", descripcion: null, monto: "800", vencimiento: "2026-12-05" },
		]);
	});
	test("without last month, the base salary", () => {
		const b = borradorRecibo(empleado({ sueldoBase: "900" }), "2026-11");
		expect(b.origen).toBe("SUELDO_BASE");
		expect(b.conceptos[0].monto).toBe("900");
		expect(errorBorrador(b)).toBeNull();
	});
	test("with nothing to copy it starts empty and cannot be saved", () => {
		const b = borradorRecibo(empleado(), "2026-11");
		expect(b.origen).toBe("VACIO");
		expect(errorBorrador(b)).not.toBeNull();
	});
});
