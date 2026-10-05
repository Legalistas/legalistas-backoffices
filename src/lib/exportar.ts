// Informes de contabilidad (cajas, Caja General, Gastos e Ingresos, Gestor de
// Cierres) en Excel y PDF, generados en el navegador. Las librerías se
// importan al exportar (no pesan en la carga de la página), igual que
// components/accounting/exportScheduledPdf.ts.

import type { jsPDF } from "jspdf";
import type autoTableFn from "jspdf-autotable";

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

/** Un total destacado arriba del informe en PDF ("Saldo", "Ingresos"…). */
export interface DatoResumen {
	etiqueta: string;
	/** Ya formateado ("$ 1.234,00"). */
	valor: string;
	/** En rojo (saldos o diferencias negativas). */
	negativo?: boolean;
}

export interface OpcionesPdf {
	titulo: string;
	subtitulo?: string;
	tablas: TablaInforme[];
	horizontal?: boolean;
	/** Hasta 4 totales en tarjetas, debajo del encabezado. */
	resumen?: DatoResumen[];
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

// ── PDF con la identidad de Legalistas ───────────────────────────────────
// Encabezado turquesa con el logo en blanco, totales en tarjetas, tablas con
// los colores de la marca y pie con el número de página en cada hoja.

type Rgb = [number, number, number];
const MARCA: Rgb = [9, 164, 181];
const MARCA_OSCURA: Rgb = [6, 124, 137];
const TINTA: Rgb = [18, 49, 58];
const SUAVE: Rgb = [94, 123, 131];
const LINEA: Rgb = [211, 235, 238];
const FONDO: Rgb = [238, 248, 250];
const ROJO: Rgb = [200, 38, 38];

const MARGEN = 14;
const ALTO_BANDA = 27;
const ALTO_LOGO = 10;
/** El PNG del logo mide 908 × 205. */
const ANCHO_LOGO = (ALTO_LOGO * 908) / 205;

const LOGO_BLANCO = "/images/logo/logo-print-blanco.png";

let logoEnCache: Promise<string | null> | null = null;

/** El logo como data URL (jsPDF no lee rutas). Sin red, el PDF sale con el nombre en texto. */
const cargarLogo = () => {
	logoEnCache ??= fetch(LOGO_BLANCO)
		.then((res) => (res.ok ? res.blob() : Promise.reject(new Error("sin logo"))))
		.then(
			(blob) =>
				new Promise<string>((resolver, rechazar) => {
					const lector = new FileReader();
					lector.onload = () => resolver(lector.result as string);
					lector.onerror = () => rechazar(lector.error);
					lector.readAsDataURL(blob);
				}),
		)
		.catch(() => null);
	return logoEnCache;
};

/**
 * Dibuja el informe. Separado de `exportarPdf` para poder armarlo sin
 * navegador (el logo y la fecha llegan como parámetros).
 */
export function armarPdf(
	JsPdf: typeof jsPDF,
	autoTable: typeof autoTableFn,
	opciones: OpcionesPdf,
	logo: string | null,
	generado: Date,
): jsPDF {
	const doc = new JsPdf({
		orientation: opciones.horizontal ? "landscape" : "portrait",
		unit: "mm",
		format: "a4",
	});
	const ancho = doc.internal.pageSize.getWidth();
	const alto = doc.internal.pageSize.getHeight();
	const util = ancho - MARGEN * 2;

	// Encabezado: banda de la marca, logo a la izquierda y título a la derecha.
	doc.setFillColor(...MARCA);
	doc.rect(0, 0, ancho, ALTO_BANDA, "F");
	doc.setTextColor(255, 255, 255);
	if (logo) {
		doc.addImage(logo, "PNG", MARGEN, (ALTO_BANDA - ALTO_LOGO) / 2, ANCHO_LOGO, ALTO_LOGO);
	} else {
		doc.setFont("helvetica", "bold");
		doc.setFontSize(20);
		doc.text("legalistas", MARGEN, ALTO_BANDA / 2 + 2.5);
	}

	const anchoTitulo = util - ANCHO_LOGO - 10;
	doc.setFont("helvetica", "bold");
	let cuerpoTitulo = 15;
	doc.setFontSize(cuerpoTitulo);
	// Un título largo se achica hasta entrar al lado del logo.
	while (cuerpoTitulo > 10 && doc.getTextWidth(opciones.titulo) > anchoTitulo) {
		cuerpoTitulo -= 0.5;
		doc.setFontSize(cuerpoTitulo);
	}
	doc.text(opciones.titulo, ancho - MARGEN, opciones.subtitulo ? 12.4 : 15.5, { align: "right" });
	if (opciones.subtitulo) {
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8.5);
		doc.setTextColor(226, 246, 249);
		const lineas = (doc.splitTextToSize(opciones.subtitulo, anchoTitulo) as string[]).slice(0, 2);
		doc.text(lineas, ancho - MARGEN, 17.6, { align: "right" });
	}

	doc.setFont("helvetica", "normal");
	doc.setFontSize(7.5);
	doc.setTextColor(...SUAVE);
	const fecha = generado.toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	doc.text(`Generado el ${fecha}`, MARGEN, ALTO_BANDA + 5.5);

	let y = ALTO_BANDA + 10;

	// Totales en tarjetas.
	const resumen = (opciones.resumen ?? []).slice(0, 4);
	if (resumen.length > 0) {
		const separacion = 4;
		const anchoTarjeta = (util - separacion * (resumen.length - 1)) / resumen.length;
		resumen.forEach((dato, i) => {
			const x = MARGEN + i * (anchoTarjeta + separacion);
			doc.setFillColor(...FONDO);
			doc.roundedRect(x, y, anchoTarjeta, 15, 2, 2, "F");
			doc.setFont("helvetica", "bold");
			doc.setFontSize(6.5);
			doc.setTextColor(...MARCA_OSCURA);
			doc.text(dato.etiqueta.toUpperCase(), x + 4, y + 5.6, { charSpace: 0.25 });
			doc.setFontSize(12);
			doc.setTextColor(...(dato.negativo ? ROJO : TINTA));
			doc.text(dato.valor, x + 4, y + 11.6);
		});
		y += 15 + 7;
	}

	for (const t of opciones.tablas) {
		const montos = new Set(t.montos ?? []);
		const formatear = (fila: Celda[]) =>
			fila.map((v, i) =>
				montos.has(i) && typeof v === "number" ? pesos.format(v) : String(v ?? ""),
			);

		// Si la sección arrancaría al pie de la hoja, pasa a la siguiente.
		if (y > alto - 38) {
			doc.addPage();
			y = 16;
		}
		if (opciones.tablas.length > 1) {
			doc.setFillColor(...MARCA);
			doc.rect(MARGEN, y - 2.5, 2.4, 2.4, "F");
			doc.setFont("helvetica", "bold");
			doc.setFontSize(10.5);
			doc.setTextColor(...MARCA_OSCURA);
			doc.text(t.titulo, MARGEN + 4.4, y);
			y += 3;
		}
		autoTable(doc, {
			startY: y,
			head: [t.columnas],
			body:
				t.filas.length > 0
					? t.filas.map(formatear)
					: [
							[
								{
									content: "Sin datos para este período",
									colSpan: t.columnas.length,
									styles: { halign: "center", textColor: SUAVE },
								},
							],
						],
			foot: t.totales && t.filas.length > 0 ? [formatear(t.totales)] : undefined,
			// Los totales van una sola vez, al final de la tabla.
			showFoot: "lastPage",
			// Una fila no se parte entre dos hojas.
			rowPageBreak: "avoid",
			styles: {
				font: "helvetica",
				fontSize: 8,
				cellPadding: { top: 1.9, bottom: 1.9, left: 2, right: 2 },
				textColor: TINTA,
				lineWidth: 0,
				overflow: "linebreak",
			},
			headStyles: { fillColor: MARCA, textColor: 255, fontStyle: "bold", fontSize: 7.6 },
			alternateRowStyles: { fillColor: [246, 251, 252] },
			footStyles: { fillColor: [222, 242, 245], textColor: TINTA, fontStyle: "bold" },
			// Los montos a la derecha, también en el encabezado y en los totales.
			didParseCell: (celda) => {
				if (montos.has(celda.column.index) && celda.cell.colSpan === 1) {
					celda.cell.styles.halign = "right";
				}
			},
			margin: { top: 15, left: MARGEN, right: MARGEN, bottom: 16 },
		});
		// jspdf-autotable deja la posición final en `lastAutoTable`.
		y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
	}

	// Franja superior en las hojas siguientes y pie en todas.
	const paginas = doc.getNumberOfPages();
	for (let i = 1; i <= paginas; i++) {
		doc.setPage(i);
		if (i > 1) {
			doc.setFillColor(...MARCA);
			doc.rect(0, 0, ancho, 3, "F");
			doc.setFont("helvetica", "bold");
			doc.setFontSize(7.5);
			doc.setTextColor(...MARCA_OSCURA);
			doc.text(opciones.titulo, MARGEN, 9.6);
		}
		doc.setDrawColor(...LINEA);
		doc.setLineWidth(0.2);
		doc.line(MARGEN, alto - 11, ancho - MARGEN, alto - 11);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(7.5);
		doc.setTextColor(...MARCA_OSCURA);
		doc.text("legalistas.ar", MARGEN, alto - 6.6);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(...SUAVE);
		doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 6.6, { align: "right" });
	}

	return doc;
}

export async function exportarPdf(archivo: string, opciones: OpcionesPdf): Promise<void> {
	const [{ default: JsPdf }, { default: autoTable }, logo] = await Promise.all([
		import("jspdf"),
		import("jspdf-autotable"),
		cargarLogo(),
	]);
	armarPdf(JsPdf, autoTable, opciones, logo, new Date()).save(`${nombreArchivo(archivo)}.pdf`);
}
