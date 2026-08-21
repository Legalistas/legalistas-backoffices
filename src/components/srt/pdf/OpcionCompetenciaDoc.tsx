"use client";

import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import { FONT } from "./kit";

// =============================================================================
// Opción de Competencia — Res. SRT N° 326/17.
//
// Es el PDF de verdad, no una previsualización: el mismo componente alimenta
// el visor de la pantalla y el archivo que se guarda en la causa. Por eso no
// puede haber dos diseños distintos.
//
// react-pdf soporta un subconjunto de flexbox. No hay grid, ni ::before, ni
// unidades mm: se trabaja en pt (1pt = 1/72") sobre una hoja A4.
// =============================================================================

export interface CompetenciaData {
	cmNumero?: string;
	cmDelegacion?: string;
	ground?: "DOMICILIO" | "PRESTACION" | "REPORTA" | null;
	domicilio?: string;
	localidad?: string;
	provincia?: string;
}

const styles = StyleSheet.create({
	page: {
		paddingTop: 48,
		paddingHorizontal: 48,
		paddingBottom: 40,
		fontSize: 10.5,
		fontFamily: FONT,
		color: "#1a1a1a",
		lineHeight: 1.5,
	},
	year: {
		textAlign: "right",
		fontSize: 8.5,
		fontStyle: "italic" as const,
		color: "#444",
		marginBottom: 28,
	},
	paragraph: { textAlign: "justify", marginBottom: 22 },
	option: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
	box: {
		width: 16,
		height: 16,
		borderWidth: 1.4,
		borderColor: "#444",
		marginRight: 10,
		marginTop: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	cross: { fontSize: 12, fontFamily: FONT, fontWeight: 700, lineHeight: 1 },
	optionText: { flex: 1 },
	hint: { color: "#666", fontSize: 9 },
	sectionTitle: {
		fontFamily: FONT, fontWeight: 700,
		fontSize: 12,
		marginTop: 18,
		marginBottom: 10,
	},
	field: { marginBottom: 14 },
	label: { fontFamily: FONT, fontWeight: 700, marginBottom: 4 },
	// La línea de puntos del formulario original: un borde inferior punteado.
	value: {
		borderBottomWidth: 1,
		borderBottomColor: "#777",
		borderBottomStyle: "dotted",
		minHeight: 16,
		paddingBottom: 2,
	},
	row: { flexDirection: "row", gap: 24 },
	col: { flex: 1 },
	closing: { marginTop: 22, textAlign: "justify" },
	signatures: { flexDirection: "row", gap: 40, marginTop: 56 },
	signature: { flex: 1, alignItems: "center" },
	signatureLine: {
		borderTopWidth: 1,
		borderTopColor: "#555",
		borderTopStyle: "dashed",
		width: "100%",
		marginBottom: 6,
	},
	signatureLabel: { fontSize: 9, color: "#444" },
});

function Option({
	checked,
	title,
	hint,
}: {
	checked: boolean;
	title: string;
	hint: string;
}) {
	return (
		<View style={styles.option}>
			<View style={styles.box}>{checked && <Text style={styles.cross}>X</Text>}</View>
			<Text style={styles.optionText}>
				{title} <Text style={styles.hint}>({hint})</Text>
			</Text>
		</View>
	);
}

export function OpcionCompetenciaDoc({ data }: { data: CompetenciaData }) {
	const blank = "____________________";

	return (
		<Document title="Opción de Competencia">
			<Page size="A4" style={styles.page}>
				<Text style={styles.year}>
					"2018 - Año del Centenario de la Reforma Universitaria"
				</Text>

				<Text style={styles.paragraph}>
					Por medio de la presente, y en virtud de lo previsto en el art. 1° de
					la Ley 27.348, en el art. 6° de la Res. 326/17 y resoluciones
					modificatorias, solicito la intervención de la Comisión Médica N°{" "}
					{data.cmNumero || blank} Delegación {data.cmDelegacion || blank}, la
					cual será competente en virtud de (marque con una X):
				</Text>

				<Option
					checked={data.ground === "DOMICILIO"}
					title="Opción de la C.M. correspondiente a su domicilio"
					hint="deberá presentar su D.N.I."
				/>
				<Option
					checked={data.ground === "PRESTACION"}
					title="Opción de la C.M. correspondiente al lugar de efectiva prestación de servicio"
					hint="deberá presentar constancia expedida por su empleador"
				/>
				<Option
					checked={data.ground === "REPORTA"}
					title="Opción de la C.M. correspondiente al domicilio laboral donde habitualmente reporto"
					hint="deberá presentar constancia expedida por su empleador"
				/>

				<Text style={styles.sectionTitle}>Domicilio correspondiente</Text>

				<View style={styles.field}>
					<Text style={styles.label}>Domicilio</Text>
					<Text style={styles.value}>{data.domicilio || " "}</Text>
				</View>

				<View style={styles.row}>
					<View style={[styles.field, styles.col]}>
						<Text style={styles.label}>Localidad</Text>
						<Text style={styles.value}>{data.localidad || " "}</Text>
					</View>
					<View style={[styles.field, styles.col]}>
						<Text style={styles.label}>Provincia</Text>
						<Text style={styles.value}>{data.provincia || " "}</Text>
					</View>
				</View>

				<Text style={styles.closing}>
					Adjunto a la presente la documentación respaldatoria, a efectos de
					validar la opción ejercida.
				</Text>

				<View style={styles.signatures}>
					<View style={styles.signature}>
						<View style={styles.signatureLine} />
						<Text style={styles.signatureLabel}>Firma</Text>
					</View>
					<View style={styles.signature}>
						<View style={styles.signatureLine} />
						<Text style={styles.signatureLabel}>Damnificado / Apoderado</Text>
					</View>
					<View style={styles.signature}>
						<View style={styles.signatureLine} />
						<Text style={styles.signatureLabel}>Aclaración</Text>
					</View>
				</View>
			</Page>
		</Document>
	);
}
