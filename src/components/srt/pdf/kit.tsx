"use client";

import { Font, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LogoSRT } from "./LogoSRT";
import type { ReactNode } from "react";
import type { PreviewValues } from "@/components/srt/SrtDocumentPreview";

// =============================================================================
// Piezas compartidas de los formularios SRT en react-pdf.
//
// Los documentos leen `PreviewValues` — el mismo record `name → valor` que ya
// alimenta el formulario. Un solo mapeo de datos para pantalla y PDF.
//
// TIPOGRAFÍA. El original usa Akko Pro, que es comercial. Se reemplaza por
// Roboto, que es libre y de proporciones parecidas. Los TAMAÑOS son los del
// formulario oficial.
//
// Registrar la familia (y no usar las fuentes built-in) es además lo que
// permite combinar `fontWeight` con `fontStyle`. Con las estándar hay que
// nombrar la variante exacta —`Helvetica-BoldOblique`— y pedir bold + italic
// por separado tira "Could not resolve font for Helvetica-Bold, fontWeight
// 400, fontStyle italic", que es lo que dejaba los anexos sin vista previa.
// =============================================================================

export const FONT = "Roboto";

Font.register({
	family: FONT,
	fonts: [
		{ src: "/fonts/Roboto-Regular.ttf", fontWeight: 400 },
		{ src: "/fonts/Roboto-Bold.ttf", fontWeight: 700 },
		{ src: "/fonts/Roboto-Italic.ttf", fontWeight: 400, fontStyle: "italic" },
		{
			src: "/fonts/Roboto-BoldItalic.ttf",
			fontWeight: 700,
			fontStyle: "italic",
		},
	],
});

// Cortar palabras largas en cualquier punto arruina un formulario legal.
Font.registerHyphenationCallback((word) => [word]);

const bold = { fontFamily: FONT, fontWeight: 700 } as const;
const italic = { fontFamily: FONT, fontStyle: "italic" } as const;
const boldItalic = { fontFamily: FONT, fontWeight: 700, fontStyle: "italic" } as const;

export const BLUE = "#1f76bd";
export const INK = "#1a1a1a";
export const LINE = "#9aa0a6";

/** 1 mm = 2.8346 pt. Las medidas oficiales vienen en milímetros. */
export const mm = (v: number) => v * 2.8346;

/** Ancho oficial del logo SRT del pie: 42,7 mm, alto proporcional. */
const LOGO_WIDTH = mm(42.7);

export const s = StyleSheet.create({
	page: {
		paddingTop: mm(12),
		paddingHorizontal: mm(12),
		paddingBottom: mm(20),
		fontSize: 10,
		fontFamily: FONT,
		color: INK,
	},
	docTitle: {
		textAlign: "center",
		...bold,
		fontSize: 12,
		marginBottom: mm(4),
	},
	bar: {
		backgroundColor: BLUE,
		color: "#fff",
		...bold,
		fontSize: 10,
		textAlign: "center",
		paddingVertical: mm(1.1),
		marginTop: mm(1.6),
	},
	row: { flexDirection: "row" },
	cell: {
		flex: 1,
		borderBottomWidth: 0.7,
		borderBottomColor: LINE,
		paddingVertical: mm(0.5),
		paddingHorizontal: mm(1),
		minHeight: mm(5),
	},
	cellDivider: { borderLeftWidth: 0.7, borderLeftColor: LINE },
	label: { color: BLUE, fontSize: 7.5, lineHeight: 1.1 },
	value: { fontSize: 10, lineHeight: 1.1, marginTop: 0.5 },
	box: {
		width: mm(3.2),
		height: mm(3.2),
		borderWidth: 1,
		borderColor: BLUE,
		alignItems: "center",
		justifyContent: "center",
	},
	boxMark: {
		width: mm(1.9),
		height: mm(1.9),
		backgroundColor: BLUE,
	},
	optionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: mm(1.8),
		paddingVertical: mm(0.4),
	},
	textBlock: {
		borderWidth: 0.7,
		borderColor: LINE,
		minHeight: mm(18),
		padding: mm(1.5),
		marginTop: mm(1),
	},
	note: { fontSize: 8, ...italic, color: "#444", marginTop: mm(1.5), textAlign: "justify" },
	noteLead: { fontSize: 8, ...boldItalic },
	footer: {
		position: "absolute",
		bottom: mm(8),
		left: mm(12),
		right: mm(12),
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
	},
	footerTitle: { fontSize: 8, ...bold, color: "#6c6c6c", textAlign: "right" },
	footerText: { fontSize: 8, ...italic, color: "#6c6c6c", textAlign: "right" },
	footerWeb: { fontSize: 8, ...boldItalic, color: "#6c6c6c" },
	// El número de página lo estampa GEDO, con su propia tipografía.
	gedoPage: { fontSize: 11, fontFamily: "Times-Roman", textAlign: "center", marginTop: 2 },
});

export function text(v: PreviewValues, key: string): string {
	const value = v[key];
	return value == null || typeof value === "boolean" ? "" : String(value);
}

export function checked(v: PreviewValues, key: string): boolean {
	return v[key] === true;
}

export function Cell({
	label,
	value,
	flex = 1,
	divider = false,
	last = false,
}: {
	label: string;
	value?: string;
	flex?: number;
	divider?: boolean;
	/** Última celda de la página: sin borde inferior, que si no queda una
	 *  línea suelta flotando arriba del pie. */
	last?: boolean;
}) {
	return (
		<View
			style={[
				s.cell,
				{ flex },
				divider ? s.cellDivider : {},
				last ? { borderBottomWidth: 0 } : {},
			]}
		>
			<Text style={s.label}>{label}</Text>
			<Text style={s.value}>{value || " "}</Text>
		</View>
	);
}

export function Box({ on }: { on: boolean }) {
	return <View style={s.box}>{on && <View style={s.boxMark} />}</View>;
}

export function Option({ on, children }: { on: boolean; children: ReactNode }) {
	return (
		<View style={s.optionRow}>
			<Box on={on} />
			<Text>{children}</Text>
		</View>
	);
}

export function YesNo({
	n,
	question,
	yes,
	no,
}: {
	n: number;
	question: string;
	yes: boolean;
	no: boolean;
}) {
	const answer = {
		flex: 2,
		borderBottomWidth: 0,
		flexDirection: "row" as const,
		alignItems: "center" as const,
		gap: mm(1.8),
	};
	return (
		<View style={[s.row, { borderBottomWidth: 0.7, borderBottomColor: LINE }]}>
			<View style={[s.cell, { flex: 6, borderBottomWidth: 0 }]}>
				<Text>
					{n}. {question}
				</Text>
			</View>
			<View style={[s.cell, s.cellDivider, answer]}>
				<Text>Sí</Text>
				<Box on={yes} />
			</View>
			<View style={[s.cell, s.cellDivider, answer]}>
				<Text>No</Text>
				<Box on={no} />
			</View>
		</View>
	);
}

export function Footer({
	title,
	page,
	total,
}: {
	title: string;
	page: number;
	total: number;
}) {
	return (
		<View style={s.footer} fixed>
			<LogoSRT width={LOGO_WIDTH} />
			<View>
				<Text style={s.footerTitle}>
					{title} | {page}
				</Text>
				<Text style={s.footerText}>
					Los formularios deben completarse en su formato editable
				</Text>
				<Text style={s.footerText}>
					disponible en la web del Organismo{" "}
					<Text style={s.footerWeb}>www.argentina.gob.ar/srt</Text>
				</Text>
				<Text style={s.gedoPage}>
					Página {page} de {total}
				</Text>
			</View>
		</View>
	);
}
