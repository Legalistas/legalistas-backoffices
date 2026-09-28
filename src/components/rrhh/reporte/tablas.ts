import { CONCEPTO_LABEL, type ConceptoTipo, LICENCIA_LABEL, SEGMENTO_LABEL } from "@/constant/rrhh";
import type { Celda, TablaInforme } from "@/lib/exportar";
import type { PersonaReporte, TipoLicencia } from "./types";

// Las secciones del reporte se arman una sola vez como TablaInforme: la misma
// tabla se muestra en pantalla y se exporta a Excel (una hoja por sección) o PDF.

export type SeccionKey =
	| "personas"
	| "vacaciones"
	| "licencias"
	| "asistencia"
	| "costos"
	| "legajo";

export const ESTADO_LABEL: Record<PersonaReporte["status"], string> = {
	ACTIVE: "Activo",
	ON_LEAVE: "De licencia",
	SUSPENDED: "Suspendido",
	TERMINATED: "Baja",
};

const CONTRATO_LABEL: Record<string, string> = {
	FIXED_TERM: "Plazo fijo",
	INDEFINITE: "Indeterminado",
	INTERNSHIP: "Pasantía",
	FREELANCE: "Freelance",
};

const TIPOS_LICENCIA = Object.keys(LICENCIA_LABEL) as TipoLicencia[];
const CONCEPTOS = Object.keys(CONCEPTO_LABEL) as ConceptoTipo[];

export const fechaCorta = (iso: string | null) => {
	if (!iso) return "";
	const [y, m, d] = iso.slice(0, 10).split("-");
	return `${d}/${m}/${y}`;
};

export const nombreMesCorto = (periodo: string) => {
	const [y, m] = periodo.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, 1))
		.toLocaleDateString("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" })
		.replace(".", "");
};

const suma = (filas: Celda[][], i: number) =>
	filas.reduce((s, f) => s + (typeof f[i] === "number" ? (f[i] as number) : 0), 0);

/** Fila de totales: "Total" en la primera columna y la suma de las columnas pedidas. */
const totales = (filas: Celda[][], largo: number, columnas: number[]): Celda[] =>
	Array.from({ length: largo }, (_, i) =>
		i === 0
			? `Total (${filas.length})`
			: columnas.includes(i)
				? Math.round(suma(filas, i) * 100) / 100
				: "",
	);

const rango = (desde: number, hasta: number) =>
	Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

export function armarTablas(
	personas: PersonaReporte[],
	verCostos: boolean,
	anioVacaciones: number,
): Record<SeccionKey, TablaInforme | null> {
	const personasT: TablaInforme = {
		titulo: "Personas",
		columnas: [
			"Nombre",
			"Segmento",
			"Área",
			"Puesto",
			"Reporta a",
			"Estado",
			"Ingreso",
			"Antigüedad (años)",
			"Contrato",
			"Vence",
		],
		filas: personas.map((p) => [
			p.name,
			SEGMENTO_LABEL[p.segmento],
			p.area ?? "",
			p.position ?? "",
			p.jefe?.name ?? "",
			p.tieneFicha ? ESTADO_LABEL[p.status] : "Sin ficha",
			fechaCorta(p.hireDate),
			p.antiguedadAnios,
			p.contrato ? (CONTRATO_LABEL[p.contrato.type] ?? p.contrato.type) : "",
			p.contrato?.endDate ? fechaCorta(p.contrato.endDate) : p.contrato ? "Sin vencimiento" : "",
		]),
	};

	const vacFilas = personas.map((p) => [
		p.name,
		SEGMENTO_LABEL[p.segmento],
		p.vacaciones.antiguedadAnios,
		p.vacaciones.corresponden,
		p.vacaciones.tomados,
		p.vacaciones.pedidos,
		p.vacaciones.disponibles,
		p.vacaciones.proporcional
			? "Proporcional (ingresó en el año)"
			: p.vacaciones.corresponden == null
				? "Falta fecha de ingreso"
				: "",
	]);
	const vacaciones: TablaInforme = {
		titulo: `Vacaciones ${anioVacaciones}`,
		columnas: [
			"Nombre",
			"Segmento",
			"Antigüedad",
			"Corresponden",
			"Tomadas",
			"Pedidas",
			"Disponibles",
			"Nota",
		],
		filas: vacFilas,
		totales: totales(vacFilas, 8, [3, 4, 5, 6]),
	};

	const licFilas = personas.map((p) => {
		const dias = TIPOS_LICENCIA.map((t) => p.licencias.dias[t] ?? 0);
		return [
			p.name,
			SEGMENTO_LABEL[p.segmento],
			...dias,
			dias.reduce((s, n) => s + n, 0),
			p.licencias.pendientes,
		];
	});
	const licencias: TablaInforme = {
		titulo: "Licencias (días)",
		columnas: [
			"Nombre",
			"Segmento",
			...TIPOS_LICENCIA.map((t) => LICENCIA_LABEL[t]),
			"Total días",
			"Pendientes",
		],
		filas: licFilas,
		totales: totales(licFilas, TIPOS_LICENCIA.length + 4, rango(2, TIPOS_LICENCIA.length + 3)),
	};

	const asisFilas = personas.map((p) => [
		p.name,
		SEGMENTO_LABEL[p.segmento],
		p.asistencia.dias,
		p.asistencia.horas,
		p.asistencia.horasExtra,
		p.legajo.ASISTENCIA ?? 0,
	]);
	const asistencia: TablaInforme = {
		titulo: "Asistencia",
		columnas: [
			"Nombre",
			"Segmento",
			"Días con registro",
			"Horas",
			"Horas extra",
			"Planillas en legajo",
		],
		filas: asisFilas,
		totales: totales(asisFilas, 6, [2, 3, 4, 5]),
	};

	let costos: TablaInforme | null = null;
	if (verCostos) {
		const conCosto = personas.filter((p) => p.costos && p.costos.recibos > 0);
		const filas = conCosto.map((p) => {
			const c = p.costos;
			return [
				p.name,
				SEGMENTO_LABEL[p.segmento],
				c?.recibos ?? 0,
				...CONCEPTOS.map((k) => c?.porConcepto[k] ?? 0),
				c?.total ?? 0,
				c?.pagado ?? 0,
				c?.pendiente ?? 0,
			];
		});
		const n = CONCEPTOS.length;
		costos = {
			titulo: "Costos laborales",
			columnas: [
				"Nombre",
				"Segmento",
				"Recibos",
				...CONCEPTOS.map((k) => CONCEPTO_LABEL[k]),
				"Total",
				"Pagado",
				"Pendiente",
			],
			filas,
			totales: totales(filas, n + 6, rango(2, n + 5)),
			montos: rango(3, n + 5),
		};
	}

	const legFilas = personas.map((p) => [
		p.name,
		SEGMENTO_LABEL[p.segmento],
		p.legajo.CONTRATO ?? 0,
		p.legajo.RECIBO ?? 0,
		p.legajo.CERTIFICADO ?? 0,
		p.legajo.ASISTENCIA ?? 0,
		p.legajo.SANCION ?? 0,
		p.legajo.CAPACITACION ?? 0,
		p.legajo.OTRO ?? 0,
	]);
	const legajo: TablaInforme = {
		titulo: "Legajo digital (documentos)",
		columnas: [
			"Nombre",
			"Segmento",
			"Contratos",
			"Recibos",
			"Certificados",
			"Planillas",
			"Sanciones",
			"Capacitaciones",
			"Otros",
		],
		filas: legFilas,
		totales: totales(legFilas, 9, rango(2, 8)),
	};

	return { personas: personasT, vacaciones, licencias, asistencia, costos, legajo };
}
