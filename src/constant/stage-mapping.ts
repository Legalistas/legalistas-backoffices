// Mapeo de valores del select a etapas principales (7 etapas)
export const stageMapping = {
  1: 1, // DOCUMENTACIÓN PENDIENTE -> DOCUMENTACIÓN
  2: 1, // POR INICIAR -> DOCUMENTACIÓN
  3: 2, // EXPEDIENTE INICIADO -> ADMINISTRATIVO
  4: 2, // FECHA DE LA PRIMERA AUDIENCIA / FECHA DEL DICTAMEN EXPERTO -> ADMINISTRATIVO
  5: 3, // GESTIÓN DE ESTUDIOS MÉDICOS / IMPULSO PROCESAL -> JUDICIAL
  6: 3, // EN ESPERA DE RESOLUCIÓN -> JUDICIAL
  7: 3, // FECHA DE LA AUDIENCIA DE HOMOLOGACIÓN -> JUDICIAL
  8: 4, // NEGOCIACIÓN EN TRÁMITE -> INCAPACIDAD
  9: 5, // ACUERDO -> CIERRE
  10: 5, // RATIFICADO -> CIERRE
  11: 5, // ORDEN DE PAGO SOLICITADA -> CIERRE
  12: 5, // COBRO DE HONORARIOS -> CIERRE
  13: 6, // PRIMER MENSAJE DE SATISFACCIÓN -> EXPERIENCIA
  14: 6, // LINK -> EXPERIENCIA
  15: 7, // ARCHIVO -> ARCHIVADO
} as const;

// Definición de las etapas principales
export const mainSteps = [
  "Documentación",
  "Administrativo",
  "Judicial",
  "Incapacidad",
  "Cierre",
  "Experiencia",
  "Archivado",
];

export const mainStepsComplete = [
  "DOCUMENTACIÓN",
  "ADMINISTRATIVO",
  "JUDICIAL",
  "INCAPACIDAD",
  "CIERRE",
  "EXPERIENCIA",
  "ARCHIVADO",
];

// Función para obtener la etapa principal basada en el valor del select
export const getCurrentMainStage = (proceduralStageId: number): number => {
  return stageMapping[proceduralStageId as keyof typeof stageMapping] || 1;
};

// Mapeo de nombres de etapas procesales para debugging
export const proceduralStageNames = {
  1: "DOCUMENTACIÓN PENDIENTE",
  2: "POR INICIAR",
  3: "EXPEDIENTE INICIADO",
  4: "FECHA DE LA PRIMERA AUDIENCIA / FECHA DEL DICTAMEN EXPERTO",
  5: "GESTIÓN DE ESTUDIOS MÉDICOS / IMPULSO PROCESAL", // ⭐ TU CASO ACTUAL
  6: "EN ESPERA DE RESOLUCIÓN",
  7: "FECHA DE LA AUDIENCIA DE HOMOLOGACIÓN",
  8: "NEGOCIACIÓN EN TRÁMITE",
  9: "ACUERDO",
  10: "RATIFICADO",
  11: "ORDEN DE PAGO SOLICITADA",
  12: "COBRO DE HONORARIOS",
  13: "PRIMER MENSAJE DE SATISFACCIÓN",
  14: "LINK",
  15: "ARCHIVO",
} as const;

