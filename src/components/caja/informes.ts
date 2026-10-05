import { CAJA_GRUPO_LABEL } from "@/constant/caja";
import {
	type Celda,
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
import {
	cajaFetch,
	esCambio,
	esCompraDeDolares,
	formatARS,
	formatFecha,
	formatUSD,
	nombrePeriodo,
	traerTodosLosMovimientos,
} from "./api";

// Tablas de los informes de la Caja Contable (Excel y PDF). Las usan los
// paneles (cada uno exporta lo suyo) y el informe general del período.
// Los dólares van en columnas aparte: nunca se suman con los pesos.

const rubroDe = (m: CajaMovimiento) => {
	if (esCambio(m)) return esCompraDeDolares(m) ? "Compra de dólares" : "Venta de dólares";
	if (m.transferenciaId) {
		return `Transferencia ${m.tipo === "EGRESO" ? "a" : "desde"} ${m.cajaContraparte?.nombre ?? "otra caja"}`;
	}
	return [m.rubro?.nombre, m.subRubro?.nombre].filter(Boolean).join(" › ") || "—";
};

/**
 * Lista de movimientos, con ingresos y egresos en columnas separadas. Si hay
 * movimientos en dólares se agregan sus dos columnas (con su propio total).
 */
export const tablaMovimientos = (
	movs: CajaMovimiento[],
	totales: CajaMovimientosResponse["totales"],
	mostrarCaja: boolean,
): TablaInforme => {
	const hayDolares =
		movs.some((m) => m.moneda === "USD") || totales.ingresosUsd > 0 || totales.egresosUsd > 0;
	const fijas = mostrarCaja ? 5 : 4;
	const monto = (m: CajaMovimiento, tipo: CajaMovimiento["tipo"], moneda: CajaMovimiento["moneda"]) =>
		m.tipo === tipo && m.moneda === moneda ? m.monto : null;

	return {
		titulo: "Movimientos",
		columnas: [
			"Fecha",
			...(mostrarCaja ? ["Caja"] : []),
			"Rubro",
			"Descripción",
			"Cargado por",
			"Ingreso",
			"Egreso",
			...(hayDolares ? ["Ingreso US$", "Egreso US$"] : []),
		],
		filas: movs.map((m) => [
			formatFecha(m.fecha),
			...(mostrarCaja ? [m.caja.nombre] : []),
			rubroDe(m),
			[
				m.descripcion,
				// En un ingreso o egreso en dólares, a cuánto se tomó el dólar.
				m.moneda === "USD" && m.cotizacion && !m.transferenciaId
					? `Dólar a ${formatARS(m.cotizacion)}`
					: null,
				m.anulado ? `ANULADO: ${m.motivoAnulacion ?? ""}` : null,
				m.informativo ? "(réplica, no suma)" : null,
			]
				.filter(Boolean)
				.join(" · "),
			m.createdBy.name,
			monto(m, "INGRESO", "ARS"),
			monto(m, "EGRESO", "ARS"),
			...(hayDolares ? [monto(m, "INGRESO", "USD"), monto(m, "EGRESO", "USD")] : []),
		]),
		totales: [
			"Total",
			...Array.from({ length: fijas - 1 }, () => ""),
			totales.ingresos,
			totales.egresos,
			...(hayDolares ? [totales.ingresosUsd, totales.egresosUsd] : []),
		],
		montos: [fijas, fijas + 1],
		montosUsd: hayDolares ? [fijas + 2, fijas + 3] : undefined,
	};
};

/**
 * Saldo de cada caja (y sus sub-cajas) por grupo. Con `general`, la fila de
 * la Caja General. La columna de dólares aparece solo si alguna caja tiene.
 */
export const tablaSaldos = (cajas: Caja[], general: CajaTotales | null): TablaInforme => {
	const hayDolares = cajas.some((c) => !!c.saldoUsd || c.hijas.some((h) => !!h.saldoUsd));
	const fila = (c: Caja, grupo: CajaGrupo, nombre: string): Celda[] => [
		nombre,
		CAJA_GRUPO_LABEL[grupo],
		c.saldo,
		...(hayDolares ? [c.saldoUsd] : []),
		c.ingresosMes,
		c.egresosMes,
	];
	return {
		titulo: "Saldo por caja",
		columnas: [
			"Caja",
			"Grupo",
			"Saldo",
			...(hayDolares ? ["Saldo US$"] : []),
			"Ingresos del período",
			"Egresos del período",
		],
		filas: (Object.keys(CAJA_GRUPO_LABEL) as CajaGrupo[]).flatMap((grupo) =>
			cajas
				.filter((c) => c.grupo === grupo)
				.flatMap((c) => [
					fila(c, grupo, c.nombre),
					...c.hijas.map((h) => fila(h, grupo, `   ${h.nombre}`)),
				]),
		),
		totales: general
			? [
					"Caja General",
					"",
					general.saldo,
					...(hayDolares ? [general.saldoUsd] : []),
					general.ingresosMes,
					general.egresosMes,
				]
			: undefined,
		montos: hayDolares ? [2, 4, 5] : [2, 3, 4],
		montosUsd: hayDolares ? [3] : undefined,
	};
};

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
	const { esAdmin, cajas, general, cotizacion } = datos;
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
		saldoUsd: cajas.reduce((s, c) => s + c.saldoUsd, 0),
		ingresosMes: cajas.reduce((s, c) => s + c.ingresosMes, 0),
		egresosMes: cajas.reduce((s, c) => s + c.egresosMes, 0),
	};
	const diferencia = totales.ingresosMes - totales.egresosMes;
	const etiquetaSaldo = general ? "Caja General" : "Saldo";
	const anual = periodo.length === 4;
	const nombre = nombrePeriodo(periodo);
	// Los dólares, aparte; en pesos solo como referencia, al MEP del día.
	const hayDolares = !!totales.saldoUsd;
	const mep = cotizacion?.venta ?? null;

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
					[`${etiquetaSaldo} en pesos (saldo actual)`, totales.saldo],
					...(hayDolares
						? ([
								[`${etiquetaSaldo} en dólares (saldo actual)`, formatUSD(totales.saldoUsd)],
								...(mep
									? [
											["Dólar MEP del día", mep],
											["Dólares pasados a pesos", Math.round(totales.saldoUsd * mep * 100) / 100],
											["Total en pesos", Math.round((totales.saldo + totales.saldoUsd * mep) * 100) / 100],
										]
									: []),
							] as Celda[][])
						: []),
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
		{
			etiqueta: hayDolares ? `${etiquetaSaldo} · pesos` : etiquetaSaldo,
			valor: formatARS(totales.saldo),
			negativo: totales.saldo < 0,
		},
		...(hayDolares
			? [
					{
						etiqueta: `${etiquetaSaldo} · dólares`,
						valor: formatUSD(totales.saldoUsd),
						negativo: totales.saldoUsd < 0,
					},
				]
			: []),
		{ etiqueta: "Ingresos del período", valor: formatARS(totales.ingresosMes) },
		{ etiqueta: "Egresos del período", valor: formatARS(totales.egresosMes) },
		{ etiqueta: "Diferencia", valor: formatARS(diferencia), negativo: diferencia < 0 },
	];
	await exportarPdf(archivo, {
		titulo: "Informe de Caja",
		subtitulo: `Período: ${nombre}${hayDolares && mep ? ` · Dólar MEP ${formatARS(mep)}` : ""}`,
		horizontal: true,
		resumen: resumenPdf,
		tablas,
	});
}
