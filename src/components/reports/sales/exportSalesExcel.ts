import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type {
	ChartDataItem,
	MonthlyChartItem,
	SalesStatsCard,
	WonLeadPerson,
} from "./types";

interface ExportData {
	statsCard: SalesStatsCard;
	monthlyLeadsData: MonthlyChartItem[];
	channelLeadsData: ChartDataItem[];
	salesBySellerData: ChartDataItem[];
	salesByLocationData: ChartDataItem[];
	leadsGanadasPersonas: WonLeadPerson[];
	dateRange: string;
}

const BRAND_COLOR = "09A7B2";
const HEADER_FILL: ExcelJS.FillPattern = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: BRAND_COLOR },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
	bold: true,
	color: { argb: "FFFFFF" },
	size: 11,
};
const SUBHEADER_FILL: ExcelJS.FillPattern = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "F0FAFB" },
};
const BORDER_STYLE: Partial<ExcelJS.Borders> = {
	top: { style: "thin", color: { argb: "D1D5DB" } },
	bottom: { style: "thin", color: { argb: "D1D5DB" } },
	left: { style: "thin", color: { argb: "D1D5DB" } },
	right: { style: "thin", color: { argb: "D1D5DB" } },
};

function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
	for (let i = 1; i <= colCount; i++) {
		const cell = row.getCell(i);
		cell.fill = HEADER_FILL;
		cell.font = HEADER_FONT;
		cell.alignment = { horizontal: "center", vertical: "middle" };
		cell.border = BORDER_STYLE;
	}
	row.height = 28;
}

function styleDataRow(row: ExcelJS.Row, colCount: number, index: number) {
	for (let i = 1; i <= colCount; i++) {
		const cell = row.getCell(i);
		cell.border = BORDER_STYLE;
		cell.alignment = { vertical: "middle" };
		if (index % 2 === 0) {
			cell.fill = SUBHEADER_FILL;
		}
	}
}

function addSheetTitle(
	ws: ExcelJS.Worksheet,
	title: string,
	colCount: number,
) {
	const titleRow = ws.addRow([title]);
	ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);
	const cell = titleRow.getCell(1);
	cell.font = { bold: true, size: 14, color: { argb: BRAND_COLOR } };
	cell.alignment = { horizontal: "left", vertical: "middle" };
	titleRow.height = 30;
	ws.addRow([]);
}

export async function exportSalesExcel(data: ExportData) {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Legalistas";
	workbook.created = new Date();

	// ─── Hoja 1: Resumen General ─────────────────
	const wsResumen = workbook.addWorksheet("Resumen General", {
		properties: { defaultRowHeight: 22 },
	});

	addSheetTitle(wsResumen, `Reporte de Ventas — ${data.dateRange}`, 4);

	// Stats cards
	const statsHeaders = ["Métrica", "Valor", "Tendencia vs Anterior"];
	const headerRow = wsResumen.addRow(statsHeaders);
	styleHeaderRow(headerRow, 3);

	const statsRows = [
		[
			"Total Leads",
			data.statsCard.oportunidadesCreadas +
				data.statsCard.oportunidadesGanadas +
				data.statsCard.oportunidadesPerdidas,
			"—",
		],
		[
			"Pendientes (En Progreso)",
			data.statsCard.oportunidadesCreadas,
			`${data.statsCard.tendenciaCreadas > 0 ? "+" : ""}${data.statsCard.tendenciaCreadas}%`,
		],
		[
			"Ganadas",
			data.statsCard.oportunidadesGanadas,
			`${data.statsCard.tendenciaGanadas > 0 ? "+" : ""}${data.statsCard.tendenciaGanadas}%`,
		],
		[
			"Perdidas",
			data.statsCard.oportunidadesPerdidas,
			`${data.statsCard.tendenciaPerdidas > 0 ? "+" : ""}${data.statsCard.tendenciaPerdidas}%`,
		],
		[
			"Tasa de Conversión",
			`${data.statsCard.tasaConversion}%`,
			`${data.statsCard.tendenciaConversion > 0 ? "+" : ""}${data.statsCard.tendenciaConversion}%`,
		],
	];

	statsRows.forEach((row, i) => {
		const r = wsResumen.addRow(row);
		styleDataRow(r, 3, i);
	});

	wsResumen.getColumn(1).width = 30;
	wsResumen.getColumn(2).width = 18;
	wsResumen.getColumn(3).width = 22;

	// ─── Hoja 2: Ganadas vs Perdidas por Mes ─────
	const wsMensual = workbook.addWorksheet("Mensual", {
		properties: { defaultRowHeight: 22 },
	});

	addSheetTitle(wsMensual, "Oportunidades Ganadas vs Perdidas por Mes", 3);

	const monthHeaders = ["Mes", "Ganadas", "Perdidas"];
	const mhRow = wsMensual.addRow(monthHeaders);
	styleHeaderRow(mhRow, 3);

	data.monthlyLeadsData.forEach((item, i) => {
		const r = wsMensual.addRow([item.month, item.ganadas, item.perdidas]);
		styleDataRow(r, 3, i);
	});

	// Totales
	const totalGanadas = data.monthlyLeadsData.reduce(
		(sum, m) => sum + m.ganadas,
		0,
	);
	const totalPerdidas = data.monthlyLeadsData.reduce(
		(sum, m) => sum + m.perdidas,
		0,
	);
	const totalRow = wsMensual.addRow(["TOTAL", totalGanadas, totalPerdidas]);
	for (let i = 1; i <= 3; i++) {
		const cell = totalRow.getCell(i);
		cell.font = { bold: true };
		cell.border = BORDER_STYLE;
		cell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "E5E7EB" },
		};
	}

	wsMensual.getColumn(1).width = 15;
	wsMensual.getColumn(2).width = 15;
	wsMensual.getColumn(3).width = 15;

	// ─── Hoja 3: Por Canal de Ingreso ────────────
	const wsCanal = workbook.addWorksheet("Por Canal", {
		properties: { defaultRowHeight: 22 },
	});

	addSheetTitle(wsCanal, "Oportunidades por Canal de Ingreso", 3);

	const canalHeaders = ["Canal", "Cantidad", "% del Total"];
	const chRow = wsCanal.addRow(canalHeaders);
	styleHeaderRow(chRow, 3);

	const totalCanal = data.channelLeadsData.reduce(
		(sum, c) => sum + c.value,
		0,
	);
	data.channelLeadsData
		.sort((a, b) => b.value - a.value)
		.forEach((item, i) => {
			const pct = totalCanal > 0 ? ((item.value / totalCanal) * 100).toFixed(1) : "0";
			const r = wsCanal.addRow([item.name, item.value, `${pct}%`]);
			styleDataRow(r, 3, i);
		});

	wsCanal.getColumn(1).width = 25;
	wsCanal.getColumn(2).width = 15;
	wsCanal.getColumn(3).width = 15;

	// ─── Hoja 4: Por Vendedor ────────────────────
	const wsVendedor = workbook.addWorksheet("Por Vendedor", {
		properties: { defaultRowHeight: 22 },
	});

	addSheetTitle(wsVendedor, "Oportunidades Ganadas por Vendedor", 3);

	const vendedorHeaders = ["Vendedor", "Ganadas", "% del Total"];
	const vhRow = wsVendedor.addRow(vendedorHeaders);
	styleHeaderRow(vhRow, 3);

	const totalVendedor = data.salesBySellerData.reduce(
		(sum, s) => sum + s.value,
		0,
	);
	data.salesBySellerData
		.sort((a, b) => b.value - a.value)
		.forEach((item, i) => {
			const pct =
				totalVendedor > 0
					? ((item.value / totalVendedor) * 100).toFixed(1)
					: "0";
			const r = wsVendedor.addRow([item.name, item.value, `${pct}%`]);
			styleDataRow(r, 3, i);
		});

	wsVendedor.getColumn(1).width = 30;
	wsVendedor.getColumn(2).width = 15;
	wsVendedor.getColumn(3).width = 15;

	// ─── Hoja 5: Por Localidad ───────────────────
	const wsLocalidad = workbook.addWorksheet("Por Localidad", {
		properties: { defaultRowHeight: 22 },
	});

	addSheetTitle(wsLocalidad, "Oportunidades Ganadas por Localidad", 3);

	const locHeaders = ["Provincia / Ciudad", "Ganadas", "% del Total"];
	const lhRow = wsLocalidad.addRow(locHeaders);
	styleHeaderRow(lhRow, 3);

	const totalLoc = data.salesByLocationData.reduce(
		(sum, l) => sum + l.value,
		0,
	);
	data.salesByLocationData
		.sort((a, b) => b.value - a.value)
		.forEach((item, i) => {
			const pct = totalLoc > 0 ? ((item.value / totalLoc) * 100).toFixed(1) : "0";
			const r = wsLocalidad.addRow([item.name, item.value, `${pct}%`]);
			styleDataRow(r, 3, i);
		});

	wsLocalidad.getColumn(1).width = 30;
	wsLocalidad.getColumn(2).width = 15;
	wsLocalidad.getColumn(3).width = 15;

	// ─── Hoja 6: Detalle de Oportunidades Ganadas
	const wsDetalle = workbook.addWorksheet("Detalle Ganadas", {
		properties: { defaultRowHeight: 22 },
	});

	addSheetTitle(wsDetalle, "Detalle de Oportunidades Ganadas", 5);

	const detalleHeaders = [
		"Nombre Completo",
		"Email",
		"Vendedor",
		"Servicio",
		"Fecha",
	];
	const dhRow = wsDetalle.addRow(detalleHeaders);
	styleHeaderRow(dhRow, 5);

	data.leadsGanadasPersonas.forEach((item, i) => {
		const r = wsDetalle.addRow([
			item.nombreCompleto,
			item.email,
			item.vendedor,
			item.servicio,
			item.fecha,
		]);
		styleDataRow(r, 5, i);
	});

	wsDetalle.getColumn(1).width = 30;
	wsDetalle.getColumn(2).width = 30;
	wsDetalle.getColumn(3).width = 25;
	wsDetalle.getColumn(4).width = 22;
	wsDetalle.getColumn(5).width = 15;

	// ─── Generar y descargar ─────────────────────
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const fileName = `reporte-ventas-${data.dateRange.replace(/\s/g, "-")}.xlsx`;
	saveAs(blob, fileName);
}
