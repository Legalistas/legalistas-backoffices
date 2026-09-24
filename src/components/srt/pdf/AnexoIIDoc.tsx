"use client";

import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { PreviewValues } from "@/components/srt/SrtDocumentPreview";
import { Cell, Footer, LINE, YesNo, checked, s, text } from "./kit";

// =============================================================================
// Anexo II — Rechazo de accidente de trabajo / in itinere. Res. SRT N° 298/17.
//
// El mismo formulario cubre los dos supuestos: con `inItinere` se agrega el
// bloque de horarios, domicilios y denuncia policial que pide ese caso.
// =============================================================================

export function AnexoIIDoc({
	v,
	inItinere = false,
}: {
	v: PreviewValues;
	inItinere?: boolean;
}) {
	const title = inItinere
		? "ANEXO II – RECHAZO DE ACCIDENTE IN ITINERE"
		: "ANEXO II – RECHAZO DE ACCIDENTE DE TRABAJO";
	const total = inItinere ? 3 : 2;

	return (
		<Document title={title}>
			<Page size="A4" style={s.page}>
				<Text style={s.docTitle}>{title}</Text>

				<Text style={s.bar}>Datos del trabajador</Text>
				<Cell label="Nombre y Apellido" value={text(v, "trabajador_nombre")} />
				<Cell label="CUIL" value={text(v, "trabajador_cuil")} />

				<Text style={s.bar}>
					Asistencia Letrada (Procedimientos Res. SRT N° 298/17)
				</Text>
				<Cell label="Nombre y Apellido" value={text(v, "letrado_nombre")} />
				<Cell
					label="CUIT/Domicilio electrónico"
					value={text(v, "letrado_cuit_domicilio")}
				/>
				<Cell label="Matrícula - Jurisdicción" value={text(v, "letrado_matricula")} />

				<Text style={s.bar}>Datos del Empleador</Text>
				<View style={s.row}>
					<Cell label="Nombre/Razón Social" value={text(v, "empleador_nombre")} flex={2} />
					<Cell label="CUIT" value={text(v, "empleador_cuit")} divider />
				</View>
				<View style={s.row}>
					<Cell label="Localidad" value={text(v, "empleador_localidad")} />
					<Cell label="Provincia" value={text(v, "empleador_provincia")} divider />
				</View>

				<Text style={s.bar}>
					DATOS DE LA ART, EMPLEADOR AUTOASEGURADO O EMPLEADOR NO ASEGURADO
				</Text>
				<Cell label="Denominación/Razón Social" value={text(v, "art_denominacion")} />
				<Cell label="CUIT (En caso de empleadores)" value={text(v, "art_cuit")} />

				<Text style={s.bar}>Datos de la contingencia</Text>
				<Cell label="Fecha de la denuncia:" value={text(v, "fecha_denuncia")} />
				<Cell
					label="Fecha de baja laboral (en caso de corresponder):"
					value={text(v, "fecha_baja")}
				/>
				<Cell label="Fecha de ocurrencia:" value={text(v, "fecha_ocurrencia")} last />

				<Footer title={title} page={1} total={total} />
			</Page>

			<Page size="A4" style={s.page}>
				<Text>
					Describí los hechos y circunstancias en que ocurrió el accidente:
				</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "descripcion_accidente")}</Text>
				</View>

				<Text style={{ marginTop: 10 }}>
					Detallá los compromisos o diagnósticos derivados del accidente:
				</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "afecciones_diagnosticos")}</Text>
				</View>

				<Cell
					label="Fecha de primera atención médica"
					value={text(v, "fecha_primera_atencion")}
				/>

				<Text style={s.bar}>Atención médica</Text>
				<YesNo
					n={1}
					question="¿Recibiste atención de la ART?"
					yes={checked(v, "atencion_art_si")}
					no={checked(v, "atencion_art_no")}
				/>
				<YesNo
					n={2}
					question="¿Recibiste atención médica de la Obra Social, Prepaga o Salud Pública?"
					yes={checked(v, "otra_atencion_si")}
					no={checked(v, "otra_atencion_no")}
				/>
				<YesNo
					n={3}
					question="¿Realizaste algún estudio médico en la Obra Social, Prepaga o Salud Pública?"
					yes={checked(v, "estudio_si")}
					no={checked(v, "estudio_no")}
				/>

				<Text style={{ marginTop: 10 }}>
					Detallá las pruebas que acreditan el origen laboral del accidente:
				</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "prueba_origen")}</Text>
				</View>

				{!inItinere && <Signatures v={v} />}
				<Footer title={title} page={2} total={total} />
			</Page>

			{inItinere && (
				<Page size="A4" style={s.page}>
					<Text style={s.bar}>Datos específicos — Accidente in itinere</Text>
					<Cell
						label="Horario de ingreso y egreso al puesto de trabajo"
						value={text(v, "horario_trabajo")}
					/>
					<Cell
						label="Domicilio del lugar de prestación de servicios o donde reporta"
						value={text(v, "domicilio_trabajo")}
					/>
					<Cell label="Domicilio de residencia" value={text(v, "domicilio_residencia")} />
					<View style={s.row}>
						<Cell label="Lugar del accidente" value={text(v, "lugar_accidente")} flex={2} />
						<Cell label="Hora" value={text(v, "hora_accidente")} divider />
					</View>
					<View style={[s.row, { borderBottomWidth: 0.7, borderBottomColor: LINE }]}>
						<View style={[s.cell, { flex: 6, borderBottomWidth: 0 }]}>
							<Text>¿Realizaste denuncia policial?</Text>
						</View>
						<View
							style={[
								s.cell,
								s.cellDivider,
								{ flex: 4, borderBottomWidth: 0, flexDirection: "row", gap: 12 },
							]}
						>
							<Text>Sí {checked(v, "denuncia_policial_si") ? "☒" : "☐"}</Text>
							<Text>No {checked(v, "denuncia_policial_no") ? "☒" : "☐"}</Text>
						</View>
					</View>

					<Signatures v={v} />
					<Footer title={title} page={3} total={total} />
				</Page>
			)}
		</Document>
	);
}

function Signatures({ v }: { v: PreviewValues }) {
	return (
		<>
			<View style={{ flexDirection: "row", gap: 40, marginTop: 60 }}>
				<View style={{ flex: 1, alignItems: "center" }}>
					<View
						style={{ borderTopWidth: 0.7, borderTopColor: "#333", width: "100%", marginBottom: 4 }}
					/>
					<Text style={{ fontSize: 7 }}>Firma y aclaración del trabajador</Text>
				</View>
				<View style={{ flex: 1, alignItems: "center" }}>
					<View
						style={{ borderTopWidth: 0.7, borderTopColor: "#333", width: "100%", marginBottom: 4 }}
					/>
					<Text style={{ fontSize: 7 }}>Firma y aclaración del letrado</Text>
				</View>
			</View>
			<Cell label="Fecha" value={text(v, "fecha_firma")} last />
		</>
	);
}
