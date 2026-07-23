// Export de la matriz KPI a Excel y PDF (client-side).
// Excel: exceljs (soporta estilos completos).
// PDF: jspdf.

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import type { KpiMatrixRow, KpiMatrixSection } from "@/types/kpi";

const MONTHS = [
	"Ene",
	"Feb",
	"Mar",
	"Abr",
	"May",
	"Jun",
	"Jul",
	"Ago",
	"Sep",
	"Oct",
	"Nov",
	"Dic",
];

function formatValue(
	v: number | null,
	format: "number" | "currency" | "percent" | undefined,
): string {
	if (v == null) return "";
	if (format === "currency") {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			maximumFractionDigits: 0,
		}).format(v);
	}
	if (format === "percent") return `${v.toFixed(1)}%`;
	return new Intl.NumberFormat("es-AR").format(v);
}

/** Aplana la estructura anidada (sections → subSections → rows → subRows) a
 * un array plano de filas para renderizar. */
interface FlatRow {
	indent: number;
	isSectionHeader: boolean;
	isSubSectionHeader: boolean;
	label: string;
	monthlyValues: (number | null)[];
	accumulated: number;
	format?: KpiMatrixRow["format"];
}

function flatten(sections: KpiMatrixSection[]): FlatRow[] {
	const out: FlatRow[] = [];
	for (const section of sections) {
		out.push({
			indent: 0,
			isSectionHeader: true,
			isSubSectionHeader: false,
			label: section.label,
			monthlyValues: new Array(12).fill(null),
			accumulated: 0,
		});
		for (const sub of section.subSections) {
			out.push({
				indent: 0,
				isSectionHeader: false,
				isSubSectionHeader: true,
				label: sub.label,
				monthlyValues: new Array(12).fill(null),
				accumulated: 0,
			});
			for (const row of sub.rows) {
				pushRow(out, row, 1);
			}
		}
	}
	return out;
}

function pushRow(out: FlatRow[], row: KpiMatrixRow, indent: number): void {
	const acc =
		row.accumulated ??
		row.monthlyValues.reduce<number>((a, b) => a + (b ?? 0), 0);
	out.push({
		indent,
		isSectionHeader: false,
		isSubSectionHeader: false,
		label: row.label,
		monthlyValues: row.monthlyValues,
		accumulated: acc,
		format: row.format,
	});
	if (row.subRows) {
		for (const sub of row.subRows) pushRow(out, sub, indent + 1);
	}
}

// ─── Excel ────────────────────────────────────────────────────────────

// ─── Colores del panel admin ──────────────────────────────────────────
const COLOR_PRIMARY = "FF09A4B5"; // Teal — mismo que --primary / sidebar-primary
const COLOR_PRIMARY_LIGHT = "FFD9F1F4"; // Teal claro para sub-headers
const COLOR_ACCUMULATED = "FFF3F4F6"; // Gris muy claro para col Acumulado
const COLOR_WHITE = "FFFFFFFF";
const COLOR_BORDER = "FFD1D5DB"; // Gris borde
const COLOR_TEXT_HEADER = "FFFFFFFF";
const COLOR_TEXT_DARK = "FF1F2937";

// Formato numérico Excel según tipo de KPI.
function excelNumberFormat(format?: "number" | "currency" | "percent"): string {
	if (format === "currency") return '"$"#,##0';
	if (format === "percent") return "0.00%";
	return "#,##0";
}

// Convierte un valor a formato Excel — si es porcentaje, dividir por 100
// (Excel espera 0.42 para mostrar 42%).
function toExcelValue(
	v: number | null,
	format?: "number" | "currency" | "percent",
): number | null {
	if (v === null || v === undefined || Number.isNaN(v)) return null;
	if (format === "percent") return v / 100;
	return v;
}

export async function exportMatrixToExcel(
	sections: KpiMatrixSection[],
	year: number,
	departmentLabel: string,
): Promise<void> {
	const wb = new ExcelJS.Workbook();
	wb.creator = "Legalistas KPIs";
	wb.created = new Date();
	const ws = wb.addWorksheet(departmentLabel.slice(0, 30), {
		views: [{ state: "frozen", xSplit: 1, ySplit: 4 }], // Freeze primera col + hasta fila 4
	});

	// ── Anchos de columna ────────────────────────────────────────────
	ws.columns = [
		{ width: 55 }, // KPI
		...MONTHS.map(() => ({ width: 14 })),
		{ width: 18 }, // Acumulado
	];

	// ── Fila 1: título grande ────────────────────────────────────────
	ws.mergeCells(1, 1, 1, 14);
	const titleCell = ws.getCell(1, 1);
	titleCell.value = `KPIs — ${departmentLabel} · ${year}`;
	titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: COLOR_TEXT_HEADER } };
	titleCell.alignment = { horizontal: "left", vertical: "middle" };
	titleCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: COLOR_PRIMARY },
	};
	ws.getRow(1).height = 28;

	// ── Fila 2: subtítulo ────────────────────────────────────────────
	ws.mergeCells(2, 1, 2, 14);
	const subCell = ws.getCell(2, 1);
	subCell.value = `Generado: ${new Date().toLocaleString("es-AR")}`;
	subCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF6B7280" } };
	subCell.alignment = { horizontal: "left", vertical: "middle" };

	// Fila 3 vacía como spacer.
	ws.getRow(3).height = 6;

	// ── Fila 4: headers de columnas ──────────────────────────────────
	const headerRow = ws.getRow(4);
	headerRow.values = ["KPI", ...MONTHS, `Acumulado ${year}`];
	headerRow.height = 22;
	headerRow.eachCell((cell) => {
		cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR_TEXT_HEADER } };
		cell.alignment = { horizontal: "center", vertical: "middle" };
		cell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: COLOR_PRIMARY },
		};
		cell.border = {
			top: { style: "thin", color: { argb: COLOR_BORDER } },
			left: { style: "thin", color: { argb: COLOR_BORDER } },
			bottom: { style: "thin", color: { argb: COLOR_BORDER } },
			right: { style: "thin", color: { argb: COLOR_BORDER } },
		};
	});
	// La primera col ("KPI") alineada a la izquierda.
	headerRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

	// ── Filas de datos ───────────────────────────────────────────────
	const flat = flatten(sections);
	let rowNum = 5;

	for (const r of flat) {
		const row = ws.getRow(rowNum);

		if (r.isSectionHeader) {
			ws.mergeCells(rowNum, 1, rowNum, 14);
			const cell = row.getCell(1);
			cell.value = r.label;
			cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: COLOR_TEXT_HEADER } };
			cell.alignment = { horizontal: "center", vertical: "middle" };
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: COLOR_PRIMARY },
			};
			row.height = 20;
		} else if (r.isSubSectionHeader) {
			ws.mergeCells(rowNum, 1, rowNum, 14);
			const cell = row.getCell(1);
			cell.value = r.label;
			cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR_TEXT_DARK } };
			cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: COLOR_PRIMARY_LIGHT },
			};
			row.height = 18;
		} else {
			// Fila de datos.
			const values: (string | number | null)[] = [
				r.label,
				...r.monthlyValues.map((v) => toExcelValue(v, r.format)),
				toExcelValue(r.accumulated, r.format),
			];
			row.values = values;

			const numFormat = excelNumberFormat(r.format);
			const isIndented = r.indent > 0;
			const isSubRow = r.indent >= 2;

			// Celda KPI (col 1).
			const labelCell = row.getCell(1);
			labelCell.font = {
				name: "Calibri",
				size: 10,
				color: { argb: COLOR_TEXT_DARK },
				bold: !isIndented,
			};
			labelCell.alignment = {
				horizontal: "left",
				vertical: "middle",
				indent: r.indent + 1,
			};
			labelCell.fill = isSubRow
				? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } }
				: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_WHITE } };
			labelCell.border = {
				top: { style: "hair", color: { argb: COLOR_BORDER } },
				left: { style: "thin", color: { argb: COLOR_BORDER } },
				bottom: { style: "hair", color: { argb: COLOR_BORDER } },
				right: { style: "hair", color: { argb: COLOR_BORDER } },
			};

			// Celdas mensuales (col 2-13).
			for (let i = 2; i <= 13; i++) {
				const c = row.getCell(i);
				c.numFmt = numFormat;
				c.alignment = { horizontal: "right", vertical: "middle" };
				c.font = { name: "Calibri", size: 10, color: { argb: COLOR_TEXT_DARK } };
				c.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: COLOR_WHITE },
				};
				c.border = {
					top: { style: "hair", color: { argb: COLOR_BORDER } },
					left: { style: "hair", color: { argb: COLOR_BORDER } },
					bottom: { style: "hair", color: { argb: COLOR_BORDER } },
					right: { style: "hair", color: { argb: COLOR_BORDER } },
				};
			}

			// Celda Acumulado (col 14) — destacada.
			const accCell = row.getCell(14);
			accCell.numFmt = numFormat;
			accCell.alignment = { horizontal: "right", vertical: "middle" };
			accCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR_TEXT_DARK } };
			accCell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: COLOR_ACCUMULATED },
			};
			accCell.border = {
				top: { style: "hair", color: { argb: COLOR_BORDER } },
				left: { style: "thin", color: { argb: COLOR_BORDER } },
				bottom: { style: "hair", color: { argb: COLOR_BORDER } },
				right: { style: "thin", color: { argb: COLOR_BORDER } },
			};

			row.height = 16;
		}
		rowNum += 1;
	}

	// ── Escribir y descargar ─────────────────────────────────────────
	const buf = await wb.xlsx.writeBuffer();
	const blob = new Blob([buf], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	saveAs(
		blob,
		`KPIs_${departmentLabel.replace(/\s+/g, "_")}_${year}.xlsx`,
	);
}

// ─── PDF ──────────────────────────────────────────────────────────────

export function exportMatrixToPdf(
	sections: KpiMatrixSection[],
	year: number,
	departmentLabel: string,
): void {
	const rows = flatten(sections);
	const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

	// Header.
	doc.setFontSize(14);
	doc.text(`KPIs ${departmentLabel} — ${year}`, 14, 12);
	doc.setFontSize(9);
	doc.setTextColor(120);
	doc.text(
		`Generado: ${new Date().toLocaleString("es-AR")}`,
		14,
		17,
	);
	doc.setTextColor(0);

	// Tabla manual (para evitar dependencia de jspdf-autotable si no está).
	const startX = 14;
	let y = 24;
	const colWidths = [70, ...MONTHS.map(() => 15), 18];
	const rowHeight = 5;

	// Header de la tabla.
	doc.setFontSize(8);
	doc.setFont("helvetica", "bold");
	let x = startX;
	doc.setFillColor(230, 230, 230);
	doc.rect(
		x,
		y - 4,
		colWidths.reduce((a, b) => a + b, 0),
		rowHeight,
		"F",
	);
	doc.text("KPI", x + 1, y);
	x += colWidths[0] ?? 0;
	for (let i = 0; i < 12; i++) {
		doc.text(MONTHS[i] ?? "", x + 1, y);
		x += colWidths[i + 1] ?? 0;
	}
	doc.text(`Acum ${year}`, x + 1, y);
	y += rowHeight;
	doc.setFont("helvetica", "normal");

	for (const r of rows) {
		// Salto de página si es necesario.
		if (y > 195) {
			doc.addPage();
			y = 14;
		}
		if (r.isSectionHeader) {
			doc.setFillColor(180, 200, 230);
			doc.rect(startX, y - 4, 265, rowHeight, "F");
			doc.setFont("helvetica", "bold");
			doc.text(r.label, startX + 1, y);
			doc.setFont("helvetica", "normal");
		} else if (r.isSubSectionHeader) {
			doc.setFillColor(220, 230, 245);
			doc.rect(startX, y - 4, 265, rowHeight, "F");
			doc.setFont("helvetica", "bold");
			doc.text(r.label, startX + 1, y);
			doc.setFont("helvetica", "normal");
		} else {
			x = startX;
			const label = "  ".repeat(r.indent) + r.label;
			doc.text(label.slice(0, 55), x + 1, y);
			x += colWidths[0] ?? 0;
			for (let i = 0; i < 12; i++) {
				const cell = formatValue(r.monthlyValues[i] ?? null, r.format);
				doc.text(cell.slice(0, 8), x + 1, y);
				x += colWidths[i + 1] ?? 0;
			}
			doc.text(formatValue(r.accumulated, r.format).slice(0, 10), x + 1, y);
		}
		y += rowHeight;
	}

	doc.save(`KPIs_${departmentLabel.replace(/\s+/g, "_")}_${year}.pdf`);
}
