"use client";

import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { PreviewValues } from "@/components/srt/SrtDocumentPreview";
import {
	Cell,
	Footer,
	LINE,
	Option,
	YesNo,
	checked,
	s,
	text,
} from "./kit";

// =============================================================================
// Anexo I — Divergencia en la determinación de la incapacidad.
// Res. SRT N° 298/17. Tres páginas.
// =============================================================================

const TITLE = "ANEXO I - DIVERGENCIA EN LA DETERMINACIÓN DE LA INCAPACIDAD";

export function AnexoIDoc({ v }: { v: PreviewValues }) {
	return (
		<Document title="Anexo I — Divergencia en la determinación de la incapacidad">
			{/* ── Página 1 ─────────────────────────────────────────────── */}
			<Page size="A4" style={s.page}>
				<Text style={s.docTitle}>ANEXO I - INCAPACIDAD</Text>

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
				<Cell
					label="Establecimiento del lugar de efectiva prestación de servicios o donde habitualmente reporta"
					value={text(v, "establecimiento")}
				/>
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
				<View style={[s.row, { borderBottomWidth: 0.7, borderBottomColor: LINE }]}>
					<View style={[s.cell, { flex: 4, borderBottomWidth: 0 }]}>
						<Text>Tipo de contingencia</Text>
					</View>
					<View style={[s.cell, s.cellDivider, { flex: 6, borderBottomWidth: 0 }]}>
						<Option on={checked(v, "tipo_accidente_trabajo")}>
							Accidente de trabajo
						</Option>
						<Option on={checked(v, "tipo_in_itinere")}>Accidente in itinere</Option>
						<Option on={checked(v, "tipo_enfermedad")}>Enfermedad Profesional</Option>
					</View>
				</View>
				<Cell label="Fecha de la denuncia:" value={text(v, "fecha_denuncia")} />
				<Cell
					label="Fecha de baja laboral (en caso de corresponder):"
					value={text(v, "fecha_baja")}
				/>
				<Cell label="Fecha de ocurrencia o diagnóstico:" value={text(v, "fecha_ocurrencia")} last />

				<Footer title={TITLE} page={1} total={3} />
			</Page>

			{/* ── Página 2 ─────────────────────────────────────────────── */}
			<Page size="A4" style={s.page}>
				<Text>
					Detallá el accidente de trabajo o enfermedad profesional que diera
					origen a la contingencia:
				</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "detalle_contingencia")}</Text>
				</View>

				<Text style={{ marginTop: 10 }}>
					Detallá la o las afecciones o diagnósticos derivados de la
					contingencia:
				</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "afecciones_diagnosticos")}</Text>
				</View>

				<Text style={s.bar}>Atención médica</Text>
				<YesNo
					n={1}
					question="¿Recibiste atención de la ART?"
					yes={checked(v, "atencion_art_si")}
					no={checked(v, "atencion_art_no")}
				/>
				<YesNo
					n={2}
					question="¿Recibiste el alta médica de la aseguradora?"
					yes={checked(v, "alta_si")}
					no={checked(v, "alta_no")}
				/>
				<YesNo
					n={3}
					question="¿Recibiste atención médica de la Obra Social, Prepaga o Salud Pública?"
					yes={checked(v, "otra_atencion_si")}
					no={checked(v, "otra_atencion_no")}
				/>
				<YesNo
					n={4}
					question="¿Realizaste algún estudio médico en la Obra Social, Prepaga o Salud Pública?"
					yes={checked(v, "estudio_si")}
					no={checked(v, "estudio_no")}
				/>

				<Text style={{ marginTop: 10 }}>
					Detallá la prueba médica ofrecida tendiente a acreditar la incapacidad
					(Historia Clínica; Estudios Diagnósticos; Interconsultas con
					especialista; etc.):
				</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "prueba_medica")}</Text>
				</View>

				<Text style={s.note}>
					Las partes deberán ofrecer, en su primera presentación, toda la prueba
					de la que intenten valerse acompañando en esa oportunidad la
					documental pertinente. Cuando la parte trabajadora invocare haber
					recibido tratamiento médico a través de su Obra Social o de
					prestadores públicos o privados, deberá acompañar la historia clínica
					correspondiente. (art. 7° Res. SRT N° 298/17; punto 19 del Anexo I de
					la Resolución SRT 179/15; art. 14, Ley 27.348).
				</Text>

				<Text style={s.bar}>Preexistencias (opcional)</Text>
				<YesNo
					n={1}
					question="¿Te han otorgado incapacidad por otro siniestro por vía administrativa o judicial?"
					yes={checked(v, "preexistencia_si")}
					no={checked(v, "preexistencia_no")}
				/>
				<Cell label="En caso de Sí:" value={text(v, "preexistencia_detalle")} />
				<View style={[s.row, { borderBottomWidth: 0.7, borderBottomColor: LINE }]}>
					<View style={[s.cell, { flex: 4, borderBottomWidth: 0 }]}>
						<Text>Tipo de contingencia</Text>
					</View>
					<View style={[s.cell, s.cellDivider, { flex: 6, borderBottomWidth: 0 }]}>
						<Option on={checked(v, "pre_tipo_accidente")}>
							Accidente de trabajo
						</Option>
						<Option on={checked(v, "pre_tipo_itinere")}>Accidente in itinere</Option>
						<Option on={checked(v, "pre_tipo_enfermedad")}>
							Enfermedad Profesional
						</Option>
					</View>
				</View>
				<View style={s.row}>
					<Cell label="% de incapacidad" value={text(v, "porcentaje_incapacidad")} />
					<Cell label="Región afectada" value={text(v, "region_afectada")} divider />
				</View>
				<Cell
					label="Prueba de la vía judicial o administrativa"
					value={text(v, "prueba_judicial")}
				last />

				<Footer title={TITLE} page={2} total={3} />
			</Page>

			{/* ── Página 3 ─────────────────────────────────────────────── */}
			<Page size="A4" style={s.page}>
				<Text style={s.bar}>Comisión Médica interviniente</Text>
				<View style={s.row}>
					<Cell label="Comisión Médica N°" value={text(v, "comision_numero")} />
					<Cell label="Jurisdicción" value={text(v, "jurisdiccion")} divider />
				</View>

				<Text style={{ marginTop: 8 }}>
					La competencia de la Comisión Médica se funda en (marcá lo que
					corresponda):
				</Text>
				<Option on={checked(v, "fundamento_domicilio")}>
					El domicilio del trabajador
				</Option>
				<Option on={checked(v, "fundamento_prestacion")}>
					El lugar de efectiva prestación de servicios
				</Option>
				<Option on={checked(v, "fundamento_reporte")}>
					El domicilio donde habitualmente reporta
				</Option>

				<Text style={[s.note, { marginTop: 14 }]}>
					Aclaración: en caso de que los espacios no resulten suficientes,
					incorporá una hoja aparte debidamente firmada con la información
					adicional.
				</Text>

				<View style={{ flexDirection: "row", gap: 40, marginTop: 70 }}>
					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								borderTopWidth: 0.7,
								borderTopColor: "#333",
								width: "100%",
								marginBottom: 4,
							}}
						/>
						<Text style={{ fontSize: 7 }}>Firma y aclaración del trabajador</Text>
					</View>
					<View style={{ flex: 1, alignItems: "center" }}>
						<View
							style={{
								borderTopWidth: 0.7,
								borderTopColor: "#333",
								width: "100%",
								marginBottom: 4,
							}}
						/>
						<Text style={{ fontSize: 7 }}>Firma y aclaración del letrado</Text>
					</View>
				</View>

				<Cell label="Fecha" value={text(v, "fecha_firma")} last />

				<Footer title={TITLE} page={3} total={3} />
			</Page>
		</Document>
	);
}
