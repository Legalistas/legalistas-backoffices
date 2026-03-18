// =============================================================================
// Tipos de cierre
// =============================================================================
export const closingType: Record<string, string> = {
  SRT: "SRT/ ADMINISTRATIVO",
  JUDICIAL: "JUDICIAL",
  EXTRAJUDICIAL: "EXTRAJUDICIAL",
  DIRECTO: "DIRECTO",
  OTROS: "OTROS",
  // Compatibilidad minúsculas
  srt: "SRT/ ADMINISTRATIVO",
  judicial: "JUDICIAL",
  extrajudicial: "EXTRAJUDICIAL",
  directo: "DIRECTO",
  otros: "OTROS",
};

export const closingTypeColors: Record<string, string> = {
  SRT: "bg-green-200 text-green-800",
  JUDICIAL: "bg-blue-200 text-blue-800",
  EXTRAJUDICIAL: "bg-gray-200 text-gray-800",
  DIRECTO: "bg-purple-200 text-purple-800",
  OTROS: "bg-orange-200 text-orange-800",
  // Compatibilidad minúsculas
  srt: "bg-green-200 text-green-800",
  judicial: "bg-blue-200 text-blue-800",
  extrajudicial: "bg-gray-200 text-gray-800",
  directo: "bg-purple-200 text-purple-800",
  otros: "bg-orange-200 text-orange-800",
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
  // Compatibilidad minúsculas
  agreement_in_management: "ACUERDO EN GESTIÓN",
  agreement_presented: "ACUERDO PRESENTADO",
  awaiting_deadline: "ESPERANDO PLAZO",
  requested_op: "OP SOLICITADA",
  transfer_requested: "TRANSFERENCIA SOLICITADA",
  k_received_by_actor: "K PERCIBIDO ACTOR",
};

export const statusCapitalColor: Record<string, string> = {
  AGREEMENT_IN_MANAGEMENT: "bg-gray text-gray-800",
  AGREEMENT_PRESENTED: "bg-violet-100 text-violet-800",
  AWAITING_DEADLINE: "bg-amber-100 text-amber-800",
  REQUESTED_OP: "bg-pink-100 text-pink-800",
  TRANSFER_REQUESTED: "bg-red text-red-800",
  K_RECEIVED_BY_ACTOR: "bg-emerald-100 text-emerald-800",
  // Compatibilidad minúsculas
  agreement_in_management: "bg-gray text-gray-800",
  agreement_presented: "bg-violet-100 text-violet-800",
  awaiting_deadline: "bg-amber-100 text-amber-800",
  requested_op: "bg-pink-100 text-pink-800",
  transfer_requested: "bg-red text-red-800",
  k_received_by_actor: "bg-emerald-100 text-emerald-800",
};

// =============================================================================
// Estados de honorarios y PCL
// =============================================================================
export const statusData: Record<string, string> = {
  EARRINGS: "PENDIENTES",
  REQUESTED: "SOLICITADOS",
  CHARGED: "COBRADOS",
  // Compatibilidad minúsculas
  earrings: "PENDIENTES",
  requested: "SOLICITADOS",
  charged: "COBRADOS",
};

export const statusColors: Record<string, string> = {
  EARRINGS: "bg-amber-50 text-amber-800",
  REQUESTED: "bg-blue-50 text-blue-800",
  CHARGED: "bg-green-100 text-green-800",
  // Compatibilidad minúsculas
  earrings: "bg-amber-50 text-amber-800",
  requested: "bg-blue-50 text-blue-800",
  charged: "bg-green-100 text-green-800",
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
