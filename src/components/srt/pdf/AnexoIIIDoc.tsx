"use client";

import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { PreviewValues } from "@/components/srt/SrtDocumentPreview";
import { Cell, Footer, YesNo, checked, s, text } from "./kit";

// =============================================================================
// Anexo III — Rechazo de enfermedad profesional. Res. SRT N° 298/17.
//
// A diferencia del Anexo II, el foco está en la exposición laboral: tareas,
// antigüedad y si hubo otros empleadores con la misma exposición.
// =============================================================================

const TITLE = "ANEXO III – RECHAZO DE ENFERMEDAD PROFESIONAL";

export function AnexoIIIDoc({ v }: { v: PreviewValues }) {
	return (
		<Document title="Anexo III — Rechazo de enfermedad profesional">
			<Page size="A4" style={s.page}>
				<Text style={s.docTitle}>{TITLE}</Text>

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
				<Cell label="Fecha de diagnóstico:" value={text(v, "fecha_diagnostico")} />

				<Text style={s.bar}>Exposición laboral</Text>
				<View style={s.row}>
					<Cell label="Sector o área de trabajo" value={text(v, "sector_trabajo")} />
					<Cell label="Antigüedad en la tarea" value={text(v, "antiguedad_tarea")} divider />
					<Cell label="Año de ingreso" value={text(v, "anio_ingreso")} divider last />
				</View>

				<Footer title={TITLE} page={1} total={2} />
			</Page>

			<Page size="A4" style={s.page}>
				<Text>Describí detalladamente las tareas realizadas:</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "descripcion_tareas")}</Text>
				</View>

				<Text style={s.bar}>Exposición en otros empleos</Text>
				<YesNo
					n={1}
					question="¿Realizaste tareas similares para otros empleadores?"
					yes={checked(v, "tareas_similares_si")}
					no={checked(v, "tareas_similares_no")}
				/>
				<YesNo
					n={2}
					question="¿Denunciaste la misma enfermedad a otro empleador?"
					yes={checked(v, "misma_enfermedad_si")}
					no={checked(v, "misma_enfermedad_no")}
				/>
				<Cell label="Relación de otros empleadores" value={text(v, "otros_empleadores")} />

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

				<Text style={{ marginTop: 10 }}>Pruebas ofrecidas:</Text>
				<View style={s.textBlock}>
					<Text>{text(v, "pruebas_ofrecidas")}</Text>
				</View>

				<View style={{ flexDirection: "row", gap: 40, marginTop: 50 }}>
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

				<Footer title={TITLE} page={2} total={2} />
			</Page>
		</Document>
	);
}
