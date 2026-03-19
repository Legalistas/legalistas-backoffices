// =============================================================================
// Tipos de cierre
// =============================================================================
export const closingType: Record<string, string> = {
	SRT: "SRT/ ADMINISTRATIVO",
	JUDICIAL: "JUDICIAL",
	EXTRAJUDICIAL: "EXTRAJUDICIAL",
	DIRECTO: "DIRECTO",
	OTROS: "OTROS",
	srt: "SRT/ ADMINISTRATIVO",
	judicial: "JUDICIAL",
	extrajudicial: "EXTRAJUDICIAL",
	directo: "DIRECTO",
	otros: "OTROS",
};

export const closingTypeColors: Record<string, string> = {
	SRT: "bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300",
	JUDICIAL: "bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
	EXTRAJUDICIAL: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
	DIRECTO: "bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300",
	OTROS: "bg-orange-200 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
	srt: "bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300",
	judicial: "bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
	extrajudicial: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
	directo: "bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300",
	otros: "bg-orange-200 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
};

// =============================================================================
// Estados de capital
// =============================================================================
export const statusCapital: Record<string, string> = {
	AGREEMENT_IN_MANAGEMENT: "ACUERDO EN GESTIÓN",
	AGREEMENT_PRESENTED: "ACUERDO PRESENTADO",
	AWAITING_DEADLINE: "ESPERANDO PLAZO",
	REQUESTED_OP: "OP SOLICITADA",
	TRANSFER_REQUESTED: "TRANSFERENCIA SOLICITADA",
	K_RECEIVED_BY_ACTOR: "K PERCIBIDO ACTOR",
	agreement_in_management: "ACUERDO EN GESTIÓN",
	agreement_presented: "ACUERDO PRESENTADO",
	awaiting_deadline: "ESPERANDO PLAZO",
	requested_op: "OP SOLICITADA",
	transfer_requested: "TRANSFERENCIA SOLICITADA",
	k_received_by_actor: "K PERCIBIDO ACTOR",
};

export const statusCapitalColor: Record<string, string> = {
	AGREEMENT_IN_MANAGEMENT: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
	AGREEMENT_PRESENTED: "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300",
	AWAITING_DEADLINE: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
	REQUESTED_OP: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300",
	TRANSFER_REQUESTED: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
	K_RECEIVED_BY_ACTOR: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
	agreement_in_management: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
	agreement_presented: "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300",
	awaiting_deadline: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
	requested_op: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300",
	transfer_requested: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
	k_received_by_actor: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
};

// =============================================================================
// Estados de honorarios y PCL
// =============================================================================
export const statusData: Record<string, string> = {
	EARRINGS: "PENDIENTES",
	REQUESTED: "SOLICITADOS",
	CHARGED: "COBRADOS",
	earrings: "PENDIENTES",
	requested: "SOLICITADOS",
	charged: "COBRADOS",
};

export const statusColors: Record<string, string> = {
	EARRINGS: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
	REQUESTED: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
	CHARGED: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
	earrings: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
	requested: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
	charged: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
};

// =============================================================================
// Opciones para dropdowns de tipo de cierre
// =============================================================================
export const closingTypeOptions = [
	{ value: "SRT", label: "SRT/ Administrativo" },
	{ value: "JUDICIAL", label: "Judicial" },
	{ value: "EXTRAJUDICIAL", label: "Extrajudicial" },
	{ value: "DIRECTO", label: "Directo" },
	{ value: "OTROS", label: "Otros" },
];

// =============================================================================
// Meses para filtro
// =============================================================================
export const monthOptions = [
	{ value: 1, label: "Enero" },
	{ value: 2, label: "Febrero" },
	{ value: 3, label: "Marzo" },
	{ value: 4, label: "Abril" },
	{ value: 5, label: "Mayo" },
	{ value: 6, label: "Junio" },
	{ value: 7, label: "Julio" },
	{ value: 8, label: "Agosto" },
	{ value: 9, label: "Septiembre" },
	{ value: 10, label: "Octubre" },
	{ value: 11, label: "Noviembre" },
	{ value: 12, label: "Diciembre" },
];
