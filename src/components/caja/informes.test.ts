import { describe, expect, test } from "bun:test";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CAJA_GRUPO_LABEL } from "@/constant/caja";
import { armarPdf } from "@/lib/exportar";
import type { Caja, CajaMovimiento, CajaResumen } from "@/types/caja";
import { tablaMovimientos, tablaPorMes, tablaPorRubro, tablaSaldos } from "./informes";

const caja = (id: number, nombre: string, extra: Partial<Caja> = {}): Caja => ({
	id,
	nombre,
	slug: nombre.toLowerCase(),
	grupo: "PRINCIPAL",
	parentId: null,
	ownerUserId: null,
	owner: null,
	saldoInicial: 0,
	orden: id,
	activa: true,
	esContenedora: false,
	hijas: [],
	saldo: 1000 * id,
	saldoApertura: 0,
	ingresosMes: 100 * id,
	egresosMes: 10 * id,
	transfEntradaMes: 0,
	transfSalidaMes: 0,
	...extra,
});

const mov = (id: number, extra: Partial<CajaMovimiento> = {}): CajaMovimiento =>
	({
		id,
		cajaId: 1,
		tipo: "INGRESO",
		monto: 500,
		fecha: "2026-09-11",
		descripcion: "Honorarios",
		transferenciaId: null,
		anulado: false,
		motivoAnulacion: null,
		informativo: false,
		caja: { id: 1, nombre: "Caja Agustín" },
		rubro: { id: 1, nombre: "Honorarios" },
		subRubro: { id: 2, nombre: "HP" },
		createdBy: { id: 9, name: "Zeballos Julieta" },
		cajaContraparte: null,
		...extra,
	}) as CajaMovimiento;

describe("tablaSaldos", () => {
	const cajas = [
		caja(3, "Monotributo Julieta", { grupo: "MONOTRIBUTO" }),
		caja(1, "Caja Agustín", { esContenedora: true, hijas: [caja(2, "Banco Macro", { parentId: 1 })] }),
	];

	test("agrupa por grupo (el principal primero) y pone las sub-cajas debajo de la suya", () => {
		const t = tablaSaldos(cajas, null);
		expect(t.filas.map((f) => f[0])).toEqual(["Caja Agustín", "   Banco Macro", "Monotributo Julieta"]);
		expect(t.filas[0]).toEqual(["Caja Agustín", CAJA_GRUPO_LABEL.PRINCIPAL, 1000, 100, 10]);
		expect(t.filas[2][1]).toBe(CAJA_GRUPO_LABEL.MONOTRIBUTO);
		expect(t.totales).toBeUndefined();
	});

	test("con Caja General: fila de totales", () => {
		const general = { saldo: 4000, saldoApertura: 0, ingresosMes: 400, egresosMes: 40, transfEntradaMes: 0, transfSalidaMes: 0 };
		expect(tablaSaldos(cajas, general).totales).toEqual(["Caja General", "", 4000, 400, 40]);
	});
});

describe("tablaMovimientos", () => {
	const movs = [
		mov(1),
		mov(2, {
			tipo: "EGRESO",
			monto: 200,
			transferenciaId: "t1",
			cajaContraparte: { id: 2, nombre: "Banco Macro" },
			descripcion: null,
		}),
		mov(3, { rubro: null, subRubro: null, anulado: true, motivoAnulacion: "duplicado", informativo: true }),
	];
	const totales = { ingresos: 500, egresos: 200 };

	test("con la columna Caja: ingreso y egreso en columnas separadas", () => {
		const t = tablaMovimientos(movs, totales, true);
		expect(t.columnas).toEqual(["Fecha", "Caja", "Rubro", "Descripción", "Cargado por", "Ingreso", "Egreso"]);
		expect(t.filas[0]).toEqual(["11/09/2026", "Caja Agustín", "Honorarios › HP", "Honorarios", "Zeballos Julieta", 500, null]);
		expect(t.filas[1].slice(2)).toEqual(["Transferencia a Banco Macro", "", "Zeballos Julieta", null, 200]);
		expect(t.filas[2][2]).toBe("—");
		expect(t.filas[2][3]).toBe("Honorarios · ANULADO: duplicado · (réplica, no suma)");
		expect(t.totales).toEqual(["Total", "", "", "", "", 500, 200]);
		expect(t.montos).toEqual([5, 6]);
	});

	test("sin la columna Caja, los montos se corren un lugar", () => {
		const t = tablaMovimientos(movs, totales, false);
		expect(t.columnas).toHaveLength(6);
		expect(t.totales).toEqual(["Total", "", "", "", 500, 200]);
		expect(t.montos).toEqual([4, 5]);
	});
});

describe("resumen por mes y por rubro", () => {
	const resumen: CajaResumen = {
		desde: "2026-01-01",
		hasta: "2026-12-31",
		porMes: [{ mes: "2026-09", ingresos: 900, egresos: 400 }],
		porRubro: [{ rubroId: 1, nombre: "Sueldos", tipo: "EGRESO", total: 400 }],
	};

	test("diferencia del mes y tipo en palabras", () => {
		expect(tablaPorMes(resumen).filas).toEqual([["septiembre de 2026", 900, 400, 500]]);
		expect(tablaPorRubro(resumen).filas).toEqual([["Sueldos", "Egreso", 400]]);
	});
});

describe("armarPdf", () => {
	const tabla = tablaMovimientos(
		Array.from({ length: 90 }, (_, i) => mov(i)),
		{ ingresos: 45000, egresos: 0 },
		true,
	);
	const opciones = {
		titulo: "Informe de Caja",
		subtitulo: "Período: septiembre de 2026",
		horizontal: true,
		resumen: [
			{ etiqueta: "Caja General", valor: "$ 1.000,00" },
			{ etiqueta: "Diferencia", valor: "-$ 5,00", negativo: true },
		],
		tablas: [tabla, { titulo: "Vacía", columnas: ["A", "B"], filas: [], totales: ["Total", 0], montos: [1] }],
	};

	test("pagina las tablas largas; sin logo (sin red) igual sale", () => {
		const doc = armarPdf(jsPDF, autoTable, opciones, null, new Date("2026-10-05T12:00:00Z"));
		expect(doc.getNumberOfPages()).toBeGreaterThan(2);
		const pdf = Buffer.from(doc.output("arraybuffer")).toString("latin1");
		expect(pdf.startsWith("%PDF-")).toBe(true);
		expect(pdf).toContain("legalistas.ar");
		expect(pdf).toContain(`gina ${doc.getNumberOfPages()} de ${doc.getNumberOfPages()}`);
		expect(pdf).toContain("Sin datos para este per");
	});

	test("vertical y sin tarjetas de resumen: una sola tabla sin título de sección", () => {
		const doc = armarPdf(
			jsPDF,
			autoTable,
			{ titulo: "Movimientos · Caja Agustín", tablas: [tablaMovimientos([mov(1)], { ingresos: 500, egresos: 0 }, false)] },
			null,
			new Date(),
		);
		expect(doc.getNumberOfPages()).toBe(1);
		expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210, 0);
	});
});
