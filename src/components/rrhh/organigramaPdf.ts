// Org chart "Por jefe" as a PDF (Jona, 06/11/2026): the same tree as the
// screen, drawn with jsPDF (vector, readable at any zoom). The page grows with
// the tree instead of shrinking the text; representatives go in one column.

import type { jsPDF } from "jspdf";
import {
	ALTO_LOGO,
	ANCHO_LOGO,
	cargarLogo,
	FONDO,
	LINEA,
	MARCA,
	MARCA_OSCURA,
	type Rgb,
	SUAVE,
	TINTA,
} from "@/lib/exportar";
import { type Nodo, separarHijos } from "./OrganigramaPorJefe";

// Sizes in mm.
const CARD_W = 52;
const CARD_H = 15;
const GAP_X = 5;
const GAP_Y = 12;
/** Between the cards of a representatives column. */
const GAP_REP = 2.5;
/** The "Representantes (n)" label on top of the column. */
const REP_HEADER = 5;
const MARGIN = 12;
const HEADER = 24;
const WHITE: Rgb = [255, 255, 255];
/** Connectors: a step darker than the card borders so they survive printing. */
const CONNECTOR: Rgb = [160, 199, 206];

export interface Box {
	n: Nodo;
	x: number;
	y: number;
}
export interface Line {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}
export interface RepLabel {
	text: string;
	x: number;
	y: number;
}

/** Children of a node as horizontal slots: each teammate, then one column with the representatives. */
type Slot = { kind: "node"; n: Nodo } | { kind: "reps"; reps: Nodo[] };

const slotsOf = (n: Nodo): Slot[] => {
	const { equipo, representantes } = separarHijos(n);
	return [
		...equipo.map((h) => ({ kind: "node" as const, n: h })),
		...(representantes.length ? [{ kind: "reps" as const, reps: representantes }] : []),
	];
};

/** Positions of every card and connector, origin at the top left of the tree. */
export function layoutOrganigrama(raices: Nodo[]) {
	const widths = new Map<Nodo, number>();
	const slotWidth = (s: Slot) => (s.kind === "reps" ? CARD_W : measure(s.n));
	const rowWidth = (slots: Slot[]) =>
		slots.reduce((sum, s, i) => sum + slotWidth(s) + (i ? GAP_X : 0), 0);
	function measure(n: Nodo): number {
		const known = widths.get(n);
		if (known !== undefined) return known;
		const w = Math.max(CARD_W, rowWidth(slotsOf(n)));
		widths.set(n, w);
		return w;
	}

	const boxes: Box[] = [];
	const lines: Line[] = [];
	const labels: RepLabel[] = [];
	let bottom = 0;

	const place = (n: Nodo, x: number, level: number) => {
		const w = measure(n);
		const cx = x + w / 2;
		const y = level * (CARD_H + GAP_Y);
		boxes.push({ n, x: cx - CARD_W / 2, y });
		bottom = Math.max(bottom, y + CARD_H);
		const slots = slotsOf(n);
		if (!slots.length) return;

		const mid = y + CARD_H + GAP_Y / 2;
		const childTop = y + CARD_H + GAP_Y;
		lines.push({ x1: cx, y1: y + CARD_H, x2: cx, y2: mid });
		let sx = x + (w - rowWidth(slots)) / 2;
		const centers: number[] = [];
		for (const s of slots) {
			const sw = slotWidth(s);
			const scx = sx + sw / 2;
			centers.push(scx);
			lines.push({ x1: scx, y1: mid, x2: scx, y2: childTop });
			if (s.kind === "node") {
				place(s.n, sx, level + 1);
			} else {
				labels.push({ text: `Representantes (${s.reps.length})`, x: scx, y: childTop + 3.5 });
				// One column, joined by a line on its left like a bracket.
				let ry = childTop + REP_HEADER;
				const railX = sx - 1.5;
				for (const r of s.reps) {
					boxes.push({ n: r, x: sx, y: ry });
					lines.push({ x1: railX, y1: ry + CARD_H / 2, x2: sx, y2: ry + CARD_H / 2 });
					ry += CARD_H + GAP_REP;
				}
				lines.push({ x1: railX, y1: childTop + REP_HEADER, x2: railX, y2: ry - GAP_REP - CARD_H / 2 });
				bottom = Math.max(bottom, ry - GAP_REP);
			}
			sx += sw + GAP_X;
		}
		if (centers.length > 1) lines.push({ x1: centers[0], y1: mid, x2: centers[centers.length - 1], y2: mid });
	};

	let x = 0;
	raices.forEach((r, i) => {
		if (i) x += GAP_X * 2;
		place(r, x, 0);
		x += measure(r);
	});
	return { boxes, lines, labels, width: x, height: bottom };
}

/** Cuts the text with "…" so it fits in `max` mm with the current font. */
const fit = (doc: jsPDF, text: string, max: number) => {
	if (doc.getTextWidth(text) <= max) return text;
	let t = text;
	while (t.length > 1 && doc.getTextWidth(`${t}…`) > max) t = t.slice(0, -1);
	return `${t.trimEnd()}…`;
};

export async function exportarOrganigramaPdf(raices: Nodo[], sinUbicar: { name: string }[]) {
	const [{ default: JsPdf }, logo] = await Promise.all([import("jspdf"), cargarLogo()]);
	const today = new Date();
	armarOrganigramaPdf(JsPdf, raices, sinUbicar, logo, today).save(
		`Organigrama_${today.toLocaleDateString("es-AR").replaceAll("/", "-")}.pdf`,
	);
}

/** Draws the PDF; apart from the download so it can be built without a browser. */
export function armarOrganigramaPdf(
	JsPdf: typeof jsPDF,
	raices: Nodo[],
	sinUbicar: { name: string }[],
	logo: string | null,
	fecha: Date,
): jsPDF {
	const tree = layoutOrganigrama(raices);
	const sinUbicarText = sinUbicar.map((u) => u.name).join("  ·  ");

	// The page fits the tree (at least A4 landscape); the left-out people go below it.
	const pageW = Math.max(297, tree.width + MARGIN * 2);
	const probe = new JsPdf({ unit: "mm", format: [pageW, 297], orientation: "landscape" });
	probe.setFontSize(8);
	const sinUbicarLines = sinUbicar.length ? probe.splitTextToSize(sinUbicarText, pageW - MARGIN * 2) : [];
	const extra = sinUbicar.length ? 12 + sinUbicarLines.length * 4 : 0;
	const pageH = Math.max(210, HEADER + MARGIN + tree.height + extra + MARGIN);

	const doc = new JsPdf({
		unit: "mm",
		format: [pageW, pageH],
		orientation: pageW >= pageH ? "landscape" : "portrait",
	});

	// Header band, like the other reports.
	doc.setFillColor(...MARCA);
	doc.rect(0, 0, pageW, HEADER - 6, "F");
	if (logo) doc.addImage(logo, "PNG", MARGIN, (HEADER - 6 - ALTO_LOGO) / 2, ANCHO_LOGO, ALTO_LOGO);
	doc.setTextColor(255, 255, 255);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(14);
	doc.text("Organigrama", pageW - MARGIN, 9, { align: "right" });
	doc.setFont("helvetica", "normal");
	doc.setFontSize(8);
	doc.text(
		`Según a quién reporta cada persona · ${fecha.toLocaleDateString("es-AR")}`,
		pageW - MARGIN,
		14,
		{ align: "right" },
	);

	const ox = MARGIN + (pageW - MARGIN * 2 - tree.width) / 2;
	const oy = HEADER + MARGIN / 2;

	doc.setDrawColor(...CONNECTOR);
	doc.setLineWidth(0.35);
	for (const l of tree.lines) doc.line(ox + l.x1, oy + l.y1, ox + l.x2, oy + l.y2);

	doc.setFont("helvetica", "bold");
	doc.setFontSize(6.5);
	doc.setTextColor(...SUAVE);
	for (const t of tree.labels) doc.text(t.text.toUpperCase(), ox + t.x, oy + t.y, { align: "center" });

	for (const { n, x, y } of tree.boxes) {
		const bx = ox + x;
		const by = oy + y;
		doc.setDrawColor(...LINEA);
		doc.setFillColor(...(n.representante ? FONDO : WHITE));
		doc.roundedRect(bx, by, CARD_W, CARD_H, 1.5, 1.5, "FD");
		doc.setFillColor(...MARCA);
		doc.rect(bx, by + 1.5, 1.2, CARD_H - 3, "F");

		doc.setTextColor(...TINTA);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(7.5);
		doc.text(fit(doc, n.nombre, CARD_W - 6), bx + 3.5, by + 5.5);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(6.5);
		doc.setTextColor(...SUAVE);
		if (n.puesto) doc.text(fit(doc, n.puesto, CARD_W - 6), bx + 3.5, by + 9.5);
		if (n.representante) {
			doc.setTextColor(...MARCA_OSCURA);
			doc.setFontSize(5.5);
			doc.text("REPRESENTANTE", bx + 3.5, by + 13);
		}
	}

	if (sinUbicar.length) {
		const sy = oy + tree.height + 10;
		doc.setTextColor(...TINTA);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(9);
		doc.text(`Sin ubicar (${sinUbicar.length}): sin ficha laboral o sin "Reporta a"`, MARGIN, sy);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(...SUAVE);
		doc.text(sinUbicarLines, MARGIN, sy + 5);
	}

	return doc;
}
