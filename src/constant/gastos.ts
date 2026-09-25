// Gastos de la causa (pestaña Gastos del caso y "Liquidar honorarios").

export const GASTO_CATEGORIAS = [
	{ value: "cedula", label: "Cédula" },
	{ value: "tasa_justicia", label: "Tasa de justicia" },
	{ value: "honorarios", label: "Honorarios" },
	{ value: "peritos", label: "Peritos" },
	{ value: "notificaciones", label: "Notificaciones" },
	{ value: "copias", label: "Copias certificadas" },
	{ value: "bonos", label: "Bonos" },
	{ value: "traslados", label: "Traslados" },
	{ value: "otros", label: "Otros" },
];

export const gastoCategoriaLabel = (value: string | null | undefined) =>
	value ? (GASTO_CATEGORIAS.find((c) => c.value === value)?.label ?? value) : null;

/** Quién pagó el gasto. Si lo pagó el cliente directamente, no se carga. */
export const PAGADO_POR_LABEL = {
	ESTUDIO: "El estudio",
	ABOGADO_EXTERNO: "Abogado externo (a reintegrar)",
} as const;
