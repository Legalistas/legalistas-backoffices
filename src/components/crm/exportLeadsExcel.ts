import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { CRM_COLUMNS, SOURCE_CHANNEL } from "@/constant/crm";
import type { Lead } from "@/types/crm";

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
const BORDER: Partial<ExcelJS.Borders> = {
	top: { style: "thin", color: { argb: "D1D5DB" } },
	bottom: { style: "thin", color: { argb: "D1D5DB" } },
	left: { style: "thin", color: { argb: "D1D5DB" } },
	right: { style: "thin", color: { argb: "D1D5DB" } },
};
const ALT_FILL: ExcelJS.FillPattern = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "F0FAFB" },
};

function getColumnName(columnId: number | string): string {
	return (
		CRM_COLUMNS.find((c) => c.id === String(columnId))?.title ??
		String(columnId)
	);
}

function getChannelName(channelId?: number | null): string {
	if (!channelId) return "-";
	return SOURCE_CHANNEL.find((c) => c.id === channelId)?.name ?? "-";
}

function getStatusLabel(status: string): string {
	const map: Record<string, string> = {
		IN_PROGRESS: "En Progreso",
		WON: "Ganada",
		LOST: "Perdida",
	};
	return map[status] || status;
}

function formatDate(dateStr?: string): string {
	if (!dateStr) return "-";
	try {
		return new Date(dateStr).toLocaleDateString("es-AR");
	} catch {
		return "-";
	}
}

export async function exportLeadsExcel(leads: Lead[]) {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Legalistas";
	workbook.created = new Date();

	const ws = workbook.addWorksheet("Oportunidades CRM", {
		properties: { defaultRowHeight: 22 },
	});

	// Title
	const titleRow = ws.addRow([
		`Oportunidades CRM — Exportado ${new Date().toLocaleDateString("es-AR")}`,
	]);
	ws.mergeCells(titleRow.number, 1, titleRow.number, 13);
	titleRow.getCell(1).font = {
		bold: true,
		size: 14,
		color: { argb: BRAND_COLOR },
	};
	titleRow.height = 30;

	const countRow = ws.addRow([`Total: ${leads.length} oportunidades`]);
	ws.mergeCells(countRow.number, 1, countRow.number, 13);
	countRow.getCell(1).font = { size: 11, color: { argb: "666666" } };
	ws.addRow([]);

	// Headers
	const headers = [
		"Nombre",
		"Email",
		"Teléfono",
		"Ciudad",
		"Servicio",
		"Etapa",
		"Estado",
		"Vendedor",
		"Abogado Interno",
		"Representante",
		"Canal de Ingreso",
		"Documentación",
		"Fecha Creación",
	];

	const headerRow = ws.addRow(headers);
	headerRow.height = 28;
	for (let i = 1; i <= headers.length; i++) {
		const cell = headerRow.getCell(i);
		cell.fill = HEADER_FILL;
		cell.font = HEADER_FONT;
		cell.alignment = { horizontal: "center", vertical: "middle" };
		cell.border = BORDER;
	}

	// Data rows
	leads.forEach((lead, idx) => {
		const row = ws.addRow([
			lead.name || lead.user?.name || "-",
			lead.email || lead.user?.email || "-",
			lead.phone || "-",
			lead.company || "-",
			lead.services?.label || "-",
			getColumnName(lead.columnId),
			getStatusLabel(lead.status),
			lead.seller?.name || "-",
			lead.internalLawyer?.name || "-",
			lead.responsibleLawyer?.name || "-",
			getChannelName(lead.sourceChannelId),
			lead.documentationComplete ? "Completa" : "Pendiente",
			formatDate(lead.createdAt),
		]);

		for (let i = 1; i <= headers.length; i++) {
			const cell = row.getCell(i);
			cell.border = BORDER;
			cell.alignment = { vertical: "middle" };
			if (idx % 2 === 0) cell.fill = ALT_FILL;
		}

		// Color status column
		const statusCell = row.getCell(7);
		if (lead.status === "WON") {
			statusCell.font = { bold: true, color: { argb: "059669" } };
		} else if (lead.status === "LOST") {
			statusCell.font = { bold: true, color: { argb: "DC2626" } };
		}
	});

	// Column widths
	const widths = [28, 28, 18, 18, 20, 22, 14, 24, 24, 24, 18, 16, 14];
	widths.forEach((w, i) => {
		ws.getColumn(i + 1).width = w;
	});

	// Auto-filter
	ws.autoFilter = {
		from: { row: headerRow.number, column: 1 },
		to: { row: headerRow.number, column: headers.length },
	};

	// Download
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	saveAs(
		blob,
		`oportunidades-crm-${new Date().toISOString().slice(0, 10)}.xlsx`,
	);
}
