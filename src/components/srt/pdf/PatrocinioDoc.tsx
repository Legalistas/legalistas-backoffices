"use client";

import {
	Document,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import { FONT } from "./kit";

// =============================================================================
// Notificación y aceptación de patrocinio letrado — Res. SRT N° 298/17.
//
// Medidas del HTML original (`public/srt/patrocinio.html`): título en Times
// sobre barra gris #707477 a 12.2pt, cuerpo a 10.3pt, marco de 1.3px y barra
// oscura al pie con los dos logos.
//
// El cuerpo va como texto corrido con los datos intercalados. Se probó
// maquetarlo con filas y líneas sueltas, como el formulario en papel, pero
// react-pdf no tiene `white-space: nowrap`: los textos largos se parten y
// empujan las líneas a un renglón aparte, y el documento termina ocupando dos
// hojas.
//
// react-pdf trabaja en puntos: 1mm = 2.8346pt.
// =============================================================================

const mm = (v: number) => v * 2.8346;

const st = StyleSheet.create({
	page: {
		paddingTop: mm(9),
		paddingHorizontal: mm(11),
		paddingBottom: mm(9),
		fontFamily: FONT,
		fontSize: 10.3,
		color: "#202020",
	},
	frame: {
		borderWidth: 1.3,
		borderColor: "#2f3437",
		paddingTop: mm(6),
		paddingHorizontal: mm(9),
		paddingBottom: mm(6),
	},
	title: {
		backgroundColor: "#707477",
		color: "#fff",
		textAlign: "center",
		fontFamily: "Times-Bold",
		fontSize: 12.2,
		letterSpacing: 1,
		paddingTop: mm(3),
		paddingBottom: mm(2.8),
		paddingHorizontal: mm(4),
		marginBottom: mm(4),
	},
	p: { lineHeight: 1.4, textAlign: "justify", marginBottom: mm(2.8) },
	intro2: { lineHeight: 1.4, textAlign: "justify", marginBottom: mm(2.8) },
	formBody: { lineHeight: 1.55, textAlign: "justify" },
	slot: { fontFamily: FONT, fontWeight: 700 },
	blank: { color: "#5b5b5b" },
	note: { lineHeight: 1.4, textAlign: "justify", marginTop: mm(2.5) },
	signatureRow: {
		flexDirection: "row",
		gap: mm(25),
		marginTop: mm(7),
		marginHorizontal: mm(6),
		marginBottom: mm(3),
	},
	signatureCol: { flex: 1 },
	signatureLine: {
		borderTopWidth: 1,
		borderTopColor: "#333",
		borderTopStyle: "dotted",
		paddingTop: mm(2.1),
	},
	signatureLabel: { fontSize: 9.6, textAlign: "center" },
	verificationBox: {
		borderWidth: 1,
		borderColor: "#363636",
		marginHorizontal: mm(2),
		paddingTop: mm(2.6),
		paddingHorizontal: mm(7),
		paddingBottom: mm(3),
		minHeight: mm(32),
		fontSize: 9.6,
	},
	verificationTitle: { fontSize: 9.6, marginBottom: mm(2.3) },
	checkItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: mm(4),
		marginVertical: mm(0.5),
	},
	checkBox: { width: mm(3.4), height: mm(3.4), borderWidth: 1, borderColor: "#444" },
	checkLabel: { fontSize: 9.6 },
	officialSignature: {
		position: "absolute",
		right: mm(4),
		bottom: mm(3),
		width: mm(78),
	},
	officialLine: { borderTopWidth: 1, borderTopColor: "#333", marginBottom: mm(1.5) },
	officialLabel: { fontSize: 9.6, textAlign: "right" },
	logoBar: {
		marginTop: mm(5),
		backgroundColor: "#555b5f",
		borderBottomLeftRadius: mm(4),
		borderBottomRightRadius: mm(4),
		minHeight: mm(19),
		paddingVertical: mm(3),
		paddingHorizontal: mm(8),
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	logo: { height: mm(11), objectFit: "contain" },
	// Bloque del Ministerio: escudo a la izquierda y las dos líneas al lado,
	// la segunda en bold y más grande, como el lockup oficial.
	ministryBlock: { flexDirection: "row", alignItems: "center", gap: mm(2.5) },
	escudo: { height: mm(11.5), objectFit: "contain" },
	ministryLine1: { color: "#fff", fontSize: 8.5, lineHeight: 1.25 },
	ministryLine2: {
		color: "#fff",
		fontSize: 10.5,
		fontFamily: FONT,
		fontWeight: 700,
		lineHeight: 1.25,
	},
});

export interface PatrocinioData {
	trabajadorNombre?: string;
	trabajadorDni?: string;
	trabajadorDomicilio?: string;
	trabajadorLocalidad?: string;
	trabajadorCp?: string;
	trabajadorTelefono?: string;
	dia?: string;
	mes?: string;
	anio?: string;
	letradoNombre?: string;
	letradoCuit?: string;
	letradoMatricula?: string;
	letradoDomicilio?: string;
	letradoNumero?: string;
	letradoPiso?: string;
	letradoOficina?: string;
	letradoLocalidad?: string;
	letradoDomicilioElectronico?: string;
	cmNumero?: string;
	cmCiudad?: string;
}

/** Dato cargado en negrita; si falta, la línea para completar a mano. */
function Slot({ value, width = 22 }: { value?: string; width?: number }) {
	if (value) return <Text style={st.slot}>{value}</Text>;
	return <Text style={st.blank}>{"_".repeat(width)}</Text>;
}

export function PatrocinioDoc({ data }: { data: PatrocinioData }) {
	return (
		<Document title="Notificación y aceptación de patrocinio letrado">
			<Page size="A4" style={st.page}>
				<View style={st.frame}>
					<Text style={st.title}>
						NOTIFICACIÓN Y ACEPTACIÓN DE PATROCINIO LETRADO
					</Text>

					<Text style={st.p}>
						En el marco del procedimiento dispuesto por la Resolución S.R.T. N°
						298/2017, reglamentaria de la Ley Complementaria N° 27.348, Usted
						deberá DESIGNAR un ABOGADO particular de su confianza que lo
						acompañará en el trámite, cuyos honorarios profesionales estarán a
						cargo de su Aseguradora. Se le recuerda que el asesoramiento por
						parte de un ABOGADO resulta necesario durante todo el trámite ante
						la Comisión Médica Jurisdiccional. En ningún caso, el abogado
						elegido por Usted podrá exigirle pago alguno por sus servicios.
					</Text>

					<Text style={st.intro2}>
						A continuación, complete sus datos en IMPRENTA MAYÚSCULA y declare
						la ACEPTACIÓN de su PATROCINIO LETRADO:
					</Text>

					<Text style={st.formBody}>
						Quien suscribe, <Slot value={data.trabajadorNombre} width={30} />,
						D.N.I. N° <Slot value={data.trabajadorDni} width={14} />, con
						domicilio real en la calle{" "}
						<Slot value={data.trabajadorDomicilio} width={26} />, de la localidad
						de <Slot value={data.trabajadorLocalidad} width={20} />, C.P.{" "}
						<Slot value={data.trabajadorCp} width={8} />, Tel.:{" "}
						<Slot value={data.trabajadorTelefono} width={14} />, a los{" "}
						<Slot value={data.dia} width={4} /> días del mes de{" "}
						<Slot value={data.mes} width={12} /> de{" "}
						<Slot value={data.anio} width={6} />, acepta el patrocinio letrado
						del/ de la Dr. /Dra. <Slot value={data.letradoNombre} width={28} />,
						C.U.I.T. <Slot value={data.letradoCuit} width={16} />, Matrícula{" "}
						<Slot value={data.letradoMatricula} width={14} />, con domicilio
						legal constituido en la calle{" "}
						<Slot value={data.letradoDomicilio} width={22} /> N°{" "}
						<Slot value={data.letradoNumero} width={6} />, Piso{" "}
						<Slot value={data.letradoPiso} width={5} />, Of.{" "}
						<Slot value={data.letradoOficina} width={5} />, de la localidad de{" "}
						<Slot value={data.letradoLocalidad} width={18} />, y domicilio
						electrónico en{" "}
						<Slot value={data.letradoDomicilioElectronico} width={24} />, para
						actuar en los procedimientos administrativos establecidos en la Ley
						Complementaria de Riesgos del Trabajo N° 27.348, que sean tramitados
						en la Comisión Médica N° <Slot value={data.cmNumero} width={8} /> de
						la ciudad de <Slot value={data.cmCiudad} width={18} />, conforme lo
						reglamentado en la Resolución S.R.T. N° 298/2017.
					</Text>

					<Text style={st.note}>
						El Letrado Patrocinante deberá estar inscripto en "e-Servicios
						S.R.T. - Sistema de Ventanilla Electrónica" para ser notificado,
						según Resolución S.R.T. N° 22/2018.
					</Text>

					<View style={st.signatureRow}>
						<View style={st.signatureCol}>
							<View style={st.signatureLine}>
								<Text style={st.signatureLabel}>
									Firma y aclaración del trabajador
								</Text>
							</View>
						</View>
						<View style={st.signatureCol}>
							<View style={st.signatureLine}>
								<Text style={st.signatureLabel}>
									Firma y aclaración del Letrado
								</Text>
							</View>
						</View>
					</View>

					<View style={st.verificationBox} wrap={false}>
						<Text style={st.verificationTitle}>
							Funcionario S.R.T: por favor, verificar que se acompañe la
							siguiente documentación:
						</Text>
						{[
							"D.N.I. trabajador",
							"Opción de Jurisdicción y documentación respaldatoria",
							"Credencial del Letrado Patrocinante",
							"D.N.I. Letrado Patrocinante",
						].map((item) => (
							<View style={st.checkItem} key={item}>
								<View style={st.checkBox} />
								<Text style={st.checkLabel}>{item}</Text>
							</View>
						))}

						<View style={st.officialSignature}>
							<View style={st.officialLine} />
							<Text style={st.officialLabel}>
								Firma, fecha y sello de funcionario
							</Text>
						</View>
					</View>

					<View style={st.logoBar}>
						<Image src="/srt/logo-srt-blanco.png" style={st.logo} />
						<View style={st.ministryBlock}>
							<Image src="/srt/logo-argentina-blanco.png" style={st.escudo} />
							<View>
								<Text style={st.ministryLine1}>
									Ministerio de Producción y Trabajo
								</Text>
								<Text style={st.ministryLine2}>Presidencia de la Nación</Text>
							</View>
						</View>
					</View>
				</View>
			</Page>
		</Document>
	);
}
