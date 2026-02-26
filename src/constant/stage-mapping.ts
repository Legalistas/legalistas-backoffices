// Mapeo de valores del select a etapas principales
export const stageMapping = {
  1: 1, // DOCUMENTACIÓN PENDIENTE -> ETAPA 1
  2: 1, // POR INICIAR -> ETAPA 1
  3: 2, // EXPEDIENTE INICIADO -> ETAPA 2
  4: 2, // FECHA DE LA PRIMERA AUDIENCIA / FECHA DEL DICTAMEN EXPERTO -> ETAPA 2
  5: 2, // GESTIÓN DE ESTUDIOS MÉDICOS / IMPULSO PROCESAL -> ETAPA 2 ⭐ ESTE ES TU CASO
  6: 2, // EN ESPERA DE RESOLUCIÓN -> ETAPA 2
  7: 2, // FECHA DE LA AUDIENCIA DE HOMOLOGACIÓN -> ETAPA 2
  8: 2, // NEGOCIACIÓN EN TRÁMITE -> ETAPA 2
  9: 3, // ACUERDO -> ETAPA 3
  10: 3, // RATIFICADO -> ETAPA 3
  11: 3, // ORDEN DE PAGO SOLICITADA -> ETAPA 3
  12: 4, // COBRO DE HONORARIOS -> ETAPA 4
  13: 5, // PRIMER MENSAJE DE SATISFACCIÓN -> ETAPA 5
  14: 5, // LINK -> ETAPA 5
  15: 6, // ARCHIVO -> ETAPA 6
} as const;

// Definición de las etapas principales
export const mainSteps = [
  "Documentación P...", // Versión corta para móvil
  "Caso En Trámite",
  "Cierre Logrado",
  "Cobrado",
  "Experiencia",
  "Cerrado",
];

export const mainStepsComplete = [
  "DOCUMENTACIÓN PENDIENTE",
  "CASO EN TRÁMITE",
  "CIERRE LOGRADO",
  "COBRADO",
  "EXPERIENCIA (CX)",
  "CERRADO",
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

