import { CAJA_GRUPO_LABEL } from "@/constant/caja";
import {
	type DatoResumen,
	exportarExcel,
	exportarPdf,
	type TablaInforme,
} from "@/lib/exportar";
import type {
	Caja,
	CajaGrupo,
	CajaMovimiento,
	CajaMovimientosResponse,
	CajaResumen,
	CajasResponse,
	CajaTotales,
} from "@/types/caja";
import { cajaFetch, formatARS, formatFecha, nombrePeriodo, traerTodosLosMovimientos } from "./api";

// Tablas de los informes de la Caja Contable (Excel y PDF). Las usan los
// paneles (cada uno exporta lo suyo) y el informe general del período.

/** Lista de movimientos, con ingresos y egresos en columnas separadas. */
export const tablaMovimientos = (
	movs: CajaMovimiento[],
	totales: CajaMovimientosResponse["totales"],
	mostrarCaja: boolean,
): TablaInforme => ({
	titulo: "Movimientos",
	columnas: [
		"Fecha",
		...(mostrarCaja ? ["Caja"] : []),
		"Rubro",
		"Descripción",
		"Cargado por",
		"Ingreso",
		"Egreso",
	],
	filas: movs.map((m) => [
		formatFecha(m.fecha),
		...(mostrarCaja ? [m.caja.nombre] : []),
		m.transferenciaId
			? `Transferencia ${m.tipo === "EGRESO" ? "a" : "desde"} ${m.cajaContraparte?.nombre ?? "otra caja"}`
			: [m.rubro?.nombre, m.subRubro?.nombre].filter(Boolean).join(" › ") || "—",
		[
			m.descripcion,
			m.anulado ? `ANULADO: ${m.motivoAnulacion ?? ""}` : null,
			m.informativo ? "(réplica, no suma)" : null,
		]
			.filter(Boolean)
			.join(" · "),
		m.createdBy.name,
		m.tipo === "INGRESO" ? m.monto : null,
		m.tipo === "EGRESO" ? m.monto : null,
	]),
	totales: ["Total", ...(mostrarCaja ? [""] : []), "", "", "", totales.ingresos, totales.egresos],
	montos: mostrarCaja ? [5, 6] : [4, 5],
});

/** Saldo de cada caja (y sus sub-cajas) por grupo. Con `general`, la fila de la Caja General. */
export const tablaSaldos = (cajas: Caja[], general: CajaTotales | null): TablaInforme => ({
	titulo: "Saldo por caja",
	columnas: ["Caja", "Grupo", "Saldo", "Ingresos del período", "Egresos del período"],
	filas: (Object.keys(CAJA_GRUPO_LABEL) as CajaGrupo[]).flatMap((grupo) =>
		cajas
			.filter((c) => c.grupo === grupo)
			.flatMap((c) => [
				[c.nombre, CAJA_GRUPO_LABEL[grupo], c.saldo, c.ingresosMes, c.egresosMes],
				...c.hijas.map((h) => [
					`   ${h.nombre}`,
					CAJA_GRUPO_LABEL[grupo],
					h.saldo,
					h.ingresosMes,
					h.egresosMes,
				]),
			]),
	),
	totales: general
		? ["Caja General", "", general.saldo, general.ingresosMes, general.egresosMes]
		: undefined,
	montos: [2, 3, 4],
});

export const tablaPorMes = (resumen: CajaResumen): TablaInforme => ({
	titulo: "Resultado por mes",
	columnas: ["Mes", "Ingresos", "Egresos", "Diferencia"],
	filas: resumen.porMes.map((f) => [
		nombrePeriodo(f.mes),
		f.ingresos,
		f.egresos,
		f.ingresos - f.egresos,
	]),
	montos: [1, 2, 3],
});

export const tablaPorRubro = (resumen: CajaResumen): TablaInforme => ({
	titulo: "Por rubro",
	columnas: ["Rubro", "Tipo", "Total"],
	filas: resumen.porRubro.map((r) => [
		r.nombre,
		r.tipo === "INGRESO" ? "Ingreso" : "Egreso",
		r.total,
	]),
	montos: [2],
});

/**
 * Informe general de la Caja para el período elegido: totales, saldo de cada
 * caja, resultado por rubro (y por mes si es un año) y todos los movimientos.
 * Quien no administra la Caja recibe el de sus cajas, sin el desglose por
 * rubro (el resumen general es de administradores).
 */
export async function exportarInformeCaja(
	formato: "xlsx" | "pdf",
	{
		token,
		datos,
		periodo,
		rango,
	}: {
		token: string | undefined;
		datos: CajasResponse;
		/** "YYYY-MM" o "YYYY". */
		periodo: string;
		rango: { desde: string; hasta: string };
	},
): Promise<void> {
	const { esAdmin, cajas, general } = datos;
	const filtros = new URLSearchParams(rango);
	const [movimientos, resumen] = await Promise.all([
		traerTodosLosMovimientos(token, filtros),
		esAdmin
			? cajaFetch<{ data: CajaResumen }>(`/resumen?${filtros}`, token).then((r) => r.data)
			: null,
	]);

	// Sin Caja General (no es administrador): la suma de sus cajas. Las
	// sub-cajas ya están sumadas en la caja que las agrupa.
	const totales = general ?? {
		saldo: cajas.reduce((s, c) => s + c.saldo, 0),
		ingresosMes: cajas.reduce((s, c) => s + c.ingresosMes, 0),
		egresosMes: cajas.reduce((s, c) => s + c.egresosMes, 0),
	};
	const diferencia = totales.ingresosMes - totales.egresosMes;
	const etiquetaSaldo = general ? "Caja General" : "Saldo";
	const anual = periodo.length === 4;
	const nombre = nombrePeriodo(periodo);

	const tablas: TablaInforme[] = [
		tablaSaldos(cajas, general),
		...(resumen && anual ? [tablaPorMes(resumen)] : []),
		...(resumen ? [tablaPorRubro(resumen)] : []),
		tablaMovimientos(movimientos.data, movimientos.totales, true),
	];
	const archivo = `Informe de Caja ${nombre}`;

	if (formato === "xlsx") {
		await exportarExcel(archivo, [
			{
				titulo: "Resumen",
				columnas: ["Concepto", "Valor"],
				filas: [
					["Período", nombre],
					[`${etiquetaSaldo} (saldo actual)`, totales.saldo],
					["Ingresos del período", totales.ingresosMes],
					["Egresos del período", totales.egresosMes],
					["Diferencia del período", diferencia],
					// Como texto: la columna tiene formato de pesos.
					["Cantidad de movimientos", String(movimientos.data.length)],
				],
				montos: [1],
			},
			...tablas,
		]);
		return;
	}

	const resumenPdf: DatoResumen[] = [
		{ etiqueta: etiquetaSaldo, valor: formatARS(totales.saldo), negativo: totales.saldo < 0 },
		{ etiqueta: "Ingresos del período", valor: formatARS(totales.ingresosMes) },
		{ etiqueta: "Egresos del período", valor: formatARS(totales.egresosMes) },
		{ etiqueta: "Diferencia", valor: formatARS(diferencia), negativo: diferencia < 0 },
	];
	await exportarPdf(archivo, {
		titulo: "Informe de Caja",
		subtitulo: `Período: ${nombre}`,
		horizontal: true,
		resumen: resumenPdf,
		tablas,
	});
}
