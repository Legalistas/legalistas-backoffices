// Informes de contabilidad (cajas, Caja General, Gastos e Ingresos, Gestor de
// Cierres) en Excel y PDF, generados en el navegador. Las librerías se
// importan al exportar (no pesan en la carga de la página), igual que
// components/accounting/exportScheduledPdf.ts.

export type Celda = string | number | null | undefined;

export interface TablaInforme {
	/** Nombre de la hoja de Excel y título de la sección en el PDF. */
	titulo: string;
	columnas: string[];
	filas: Celda[][];
	/** Fila de totales al pie (opcional). */
	totales?: Celda[];
	/** Índices de las columnas con montos en pesos (formato $ y alineadas a la derecha). */
	montos?: number[];
}

const pesos = new Intl.NumberFormat("es-AR", {
	style: "currency",
	currency: "ARS",
	minimumFractionDigits: 2,
});

/** "Caja General septiembre 2026" → "Caja_General_septiembre_2026". */
const nombreArchivo = (s: string) =>
	s
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^\w-]+/g, "_")
		.replace(/^_+|_+$/g, "");

export async function exportarExcel(archivo: string, tablas: TablaInforme[]): Promise<void> {
	const XLSX = await import("xlsx");
	const libro = XLSX.utils.book_new();
	const usados = new Set<string>();

	for (const t of tablas) {
		const aoa: Celda[][] = [t.columnas, ...t.filas, ...(t.totales ? [t.totales] : [])];
		const hoja = XLSX.utils.aoa_to_sheet(aoa);

		// Montos como número con formato de pesos (se pueden sumar en Excel).
		for (const c of t.montos ?? []) {
			for (let r = 1; r < aoa.length; r++) {
				const ref = XLSX.utils.encode_cell({ r, c });
				const celda = hoja[ref];
				if (celda && typeof celda.v === "number") celda.z = '"$" #,##0.00';
			}
		}
		hoja["!cols"] = t.columnas.map((col, i) => ({
			wch: Math.min(60, Math.max(col.length, ...aoa.map((f) => String(f[i] ?? "").length)) + 2),
		}));

		// Nombres de hoja: máx. 31 caracteres, sin repetir.
		let nombre = t.titulo.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
		for (let n = 2; usados.has(nombre); n++) nombre = `${t.titulo.slice(0, 27)} (${n})`;
		usados.add(nombre);
		XLSX.utils.book_append_sheet(libro, hoja, nombre);
	}

	XLSX.writeFile(libro, `${nombreArchivo(archivo)}.xlsx`);
}

export async function exportarPdf(
	archivo: string,
	opciones: { titulo: string; subtitulo?: string; tablas: TablaInforme[]; horizontal?: boolean },
): Promise<void> {
	const { default: jsPDF } = await import("jspdf");
	const { default: autoTable } = await import("jspdf-autotable");

	const doc = new jsPDF({
		orientation: opciones.horizontal ? "landscape" : "portrait",
		unit: "mm",
		format: "a4",
	});

	doc.setFontSize(14);
	doc.setTextColor(9, 164, 181);
	doc.text(opciones.titulo, 14, 14);
	doc.setFontSize(9);
	doc.setTextColor(120);
	const linea = [opciones.subtitulo, `Generado: ${new Date().toLocaleString("es-AR")}`]
		.filter(Boolean)
		.join(" · ");
	doc.text(linea, 14, 19);
	doc.setTextColor(0);

	let y = 25;
	for (const t of opciones.tablas) {
		const montos = new Set(t.montos ?? []);
		const formatear = (fila: Celda[]) =>
			fila.map((v, i) =>
				montos.has(i) && typeof v === "number" ? pesos.format(v) : String(v ?? ""),
			);

		// Si la sección arrancaría al pie de la hoja, pasa a la siguiente.
		if (y > doc.internal.pageSize.getHeight() - 30) {
			doc.addPage();
			y = 16;
		}
		if (opciones.tablas.length > 1) {
			doc.setFontSize(11);
			doc.text(t.titulo, 14, y);
			y += 2;
		}
		autoTable(doc, {
			startY: y + 1,
			head: [t.columnas],
			body: t.filas.map(formatear),
			foot: t.totales ? [formatear(t.totales)] : undefined,
			styles: { fontSize: 8, cellPadding: 1.5 },
			headStyles: { fillColor: [9, 164, 181] },
			footStyles: { fillColor: [235, 245, 247], textColor: 20, fontStyle: "bold" },
			columnStyles: Object.fromEntries([...montos].map((i) => [i, { halign: "right" }])),
			margin: { left: 14, right: 14 },
		});
		// jspdf-autotable deja la posición final en `lastAutoTable`.
		y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
	}

	doc.save(`${nombreArchivo(archivo)}.pdf`);
}
