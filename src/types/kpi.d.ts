export type ManualKpiArea = "sales" | "legal" | "cx" | "marketing";
export type ManualKpiPeriod = "WEEKLY" | "MONTHLY";

/** Definición de un KPI manual (del catálogo). */
export interface ManualKpiDef {
	key: string;
	label: string;
	area: ManualKpiArea;
	periodType: ManualKpiPeriod;
	perUser: boolean;
	/**
	 * Se carga un valor POR PROVINCIA (KPIs v1.1, punto 7.4) en vez de uno
	 * global. Estos KPIs no usan el form genérico: van en su propia grilla.
	 */
	perProvince?: boolean;
	description?: string;
}

/** Entry persistida en manual_kpi_entries. */
export interface ManualKpiEntry {
	id: number;
	metricKey: string;
	periodType: ManualKpiPeriod;
	periodStart: string; // ISO date
	periodEnd: string; // ISO date
	userId: number | null;
	/** Provincia del valor. null = valor global (todos los demás KPIs). */
	stateId?: number | null;
	state?: { id: number; name: string } | null;
	value: number | string; // Decimal viene como string desde Prisma
	notes: string | null;
	createdById: number;
	createdAt: string;
	updatedAt: string;
	user?: { id: number; name: string } | null;
	createdBy?: { id: number; name: string } | null;
}

// ─── Matriz de KPIs (vista planilla) ────────────────────────────────────

export type KpiFormat = "number" | "currency" | "percent";

export interface KpiMatrixRow {
	key: string;
	label: string;
	indentLevel?: 0 | 1 | 2;
	format?: KpiFormat;
	/** 12 valores mensuales (índice 0 = enero). null = sin dato. */
	monthlyValues: (number | null)[];
	/** Si se omite, se calcula como suma de monthlyValues no-null. */
	accumulated?: number | null;
	/** Sub-filas (ej. Interno/Representantes bajo "Cantidad de casos"). */
	subRows?: KpiMatrixRow[];
	/** Marcar la fila como editable inline (KPIs manuales). */
	editable?: boolean;
	/** metricKey del catálogo manual, si `editable`. */
	sourceKey?: string;
	/**
	 * userId del vendedor/abogado si la fila representa a un usuario específico
	 * (KPIs manuales con `perUser=true`). Se envía al PUT /manual-kpis en vez
	 * de null. Requerido cuando `editable` + el sourceKey es perUser.
	 */
	sourceUserId?: number;
}

export interface KpiMatrixSubSection {
	key: string;
	label: string;
	rows: KpiMatrixRow[];
}

export interface KpiMatrixSection {
	key: string;
	label: string;
	subSections: KpiMatrixSubSection[];
}

// ─── Response de /kpis/legal ────────────────────────────────────────────

export interface KpiLegalData {
	ingresos: {
		total: number;
		judiciales: number;
		srt: number;
		rafaela: number;
		representantes: number;
		byResponsible: Array<{ userId: number | null; count: number }>;
	};
	cierres: {
		total: number;
		judiciales: number;
		srt: number;
		extrajudiciales: number;
		rafaela: number;
		representantes: number;
		capitalTotal: number;
		capitalRafaela: number;
		capitalRepresentantes: number;
		ticketPromedio: number;
		porcentajeSobreActivas: number;
		cobradasInterno: number;
		cobradasReps: number;
	};
	negociaciones: {
		activas: number;
		iniciadas: number;
		porEstado: Record<
			"INICIAR" | "CURSO" | "SUSPENSO" | "FINALIZADAS" | "PERDIDAS",
			number
		>;
		tasaExito: number;
	};
	causasSinMovimiento: {
		count60Dias: number;
		count90Dias: number;
	};
	representantes: {
		totalActivos: number;
		nuevosDelPeriodo: number;
		reunionesRealizadas: number;
	};
	cx: { consultasBO: number };
	plataforma: { usuariosActivos: number };
	casosActivos: number;
	porAbogadoInterno: Array<{
		userId: number;
		name: string;
		causasActivas: number;
		ingresos: number;
		cierres: number;
		capitalCerrado: number;
		ticketPromedio: number;
		reunionesRealizadas: number;
		tasaConversion: number;
	}>;
	rafaelaLawyerId: number | null;
}

export interface KpiResponse<T> {
	period: {
		granularity: "month" | "week" | "year";
		year: number;
		month?: number;
		week?: number;
		startDate: string;
		endDate: string;
		label: string;
	};
	data: T;
}
