// Informe PDF detallado del Gestor de Gastos e Ingresos — todo el historial,
// generado client-side. Mismo patrón de import dinámico que
// src/app/api/generate-case-pdf/route.ts (jsPDF + jspdf-autotable).

import { CURRENCY_SYMBOL } from "@/constant/scheduled-categories";
import type { ScheduledCurrency, ScheduledTransaction } from "@/types/scheduled-transaction";

const STATUS_LABEL: Record<string, string> = {
	pending: "Pendiente",
	paid: "Pagado",
	cancelled: "Cancelado",
};

const PAYMENT_LABEL: Record<string, string> = {
	cash: "Efectivo",
	transfer: "Transferencia",
	debit: "Débito automático",
};

const numberFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 });

function formatAmount(amount: number | string, currency: ScheduledCurrency): string {
	return `${CURRENCY_SYMBOL[currency]} ${numberFmt.format(Number(amount))}`;
}

function arsEquivalent(tx: ScheduledTransaction): number {
	return tx.currency === "USD"
		? Number(tx.amount) * Number(tx.exchangeRate ?? 0)
		: Number(tx.amount);
}

export async function exportScheduledPdf(records: ScheduledTransaction[]): Promise<void> {
	const { default: jsPDF } = await import("jspdf");
	const { default: autoTable } = await import("jspdf-autotable");

	const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

	doc.setFontSize(14);
	doc.setTextColor(9, 164, 181);
	doc.text("Gestor de Gastos e Ingresos — Informe completo", 14, 12);
	doc.setFontSize(9);
	doc.setTextColor(120);
	doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, 14, 17);
	doc.setTextColor(0);

	// Totales por moneda, sin mezclar — se excluyen cancelados.
	const totals = {
		ARS: { income: 0, expense: 0 },
		USD: { income: 0, expense: 0 },
	};
	for (const r of records) {
		if (r.status === "cancelled") continue;
		totals[r.currency][r.type] += Number(r.amount);
	}

	let y = 24;
	doc.setFontSize(9);
	doc.setFont("helvetica", "bold");
	doc.text("Totales (excluye cancelados):", 14, y);
	doc.setFont("helvetica", "normal");
	y += 5;
	doc.text(
		`ARS — Ingresos: $ ${numberFmt.format(totals.ARS.income)}  |  Egresos: $ ${numberFmt.format(totals.ARS.expense)}  |  Balance: $ ${numberFmt.format(totals.ARS.income - totals.ARS.expense)}`,
		14,
		y,
	);
	y += 5;
	doc.text(
		`USD — Ingresos: US$ ${numberFmt.format(totals.USD.income)}  |  Egresos: US$ ${numberFmt.format(totals.USD.expense)}  |  Balance: US$ ${numberFmt.format(totals.USD.income - totals.USD.expense)}`,
		14,
		y,
	);
	y += 6;

	const rows = records.map((r) => [
		new Date(r.dueDate).toLocaleDateString("es-AR"),
		r.type === "income" ? "Cobro" : "Gasto",
		r.subcategory ? `${r.category} / ${r.subcategory}` : r.category,
		r.concept,
		r.detail ?? "—",
		formatAmount(r.amount, r.currency),
		r.currency === "USD" ? formatAmount(arsEquivalent(r), "ARS") : "—",
		PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod,
		r.offBooksAmount != null ? formatAmount(r.offBooksAmount, r.currency) : "—",
		STATUS_LABEL[r.status] ?? r.status,
		r.createdBy?.name ?? "—",
	]);

	autoTable(doc, {
		startY: y,
		head: [
			[
				"Fecha",
				"Tipo",
				"Categoría",
				"Concepto",
				"Detalle",
				"Monto",
				"Equiv. ARS",
				"Medio de pago",
				"En negro",
				"Estado",
				"Cargado por",
			],
		],
		body: rows,
		styles: { fontSize: 7, cellPadding: 1.5 },
		headStyles: { fillColor: [9, 164, 181], textColor: 255 },
		columnStyles: { 3: { cellWidth: 34 }, 4: { cellWidth: 28 } },
	});

	doc.save(`Gastos_e_Ingresos_completo_${new Date().toLocaleDateString("en-CA")}.pdf`);
}
