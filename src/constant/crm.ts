type ServiceType = {
  id: number;
  value: number;
  label: string;
};

type CRMColumn = {
  id: string;
  title: string;
};

type LOGType = {
  type: string;
  label: string;
};

type MeetingType = {
  id: string;
  name: string;
};

export const CRM_COLUMNS: CRMColumn[] = [
  { id: "1", title: "Nueva Consulta" },
  { id: "2", title: "Reunión a concretar" },
  { id: "3", title: "Reunión Coordinada" },
  { id: "4", title: "En Tratamiento" },
  { id: "12", title: "Telegramas" },
  { id: "5", title: "Pendiente De Confirmación" },
  { id: "6", title: "Coordinar Reunión Poder" },
  { id: "8", title: "Pendiente Poder" },
  { id: "9", title: "Ganado - Trajo Poder" },
  { id: "10", title: "Perdida" },
  { id: "11", title: "Archivados" },
];

type SourceChannel = {
  id: number;
  name: string;
  /** false = no se ofrece al cargar un lead, pero sí resuelve nombre en históricos. */
  active: boolean;
};

// Catálogo de canales de ingreso.
//
// FUENTE DE VERDAD: "Requerimientos de Sistemas — KPIs de Ventas v1.1"
// (Legalistas, 01/08/2026), punto 6.2. Orden del doc: Telemarketing primero
// por volumen, Otros al final.
//
// ESPEJO EXACTO de `legalistas_backend/src/constants/sourceChannel.ts`.
// Si tocás uno, tocá el otro.
//
// Los `id` NO se cambian nunca (hay leads históricos apuntando a ellos):
// el id 1 se renombró Website → Formulario, es el mismo canal.
export const SOURCE_CHANNEL: SourceChannel[] = [
  { id: 2, name: "Telemarketing", active: true },
  { id: 3, name: "Facebook", active: true },
  { id: 4, name: "Instagram", active: true },
  { id: 11, name: "TikTok", active: true },
  { id: 13, name: "Pauta", active: true },
  // ex "Website". Canal general: puede venir de SEO o SEM (no se divide).
  { id: 1, name: "Formulario", active: true },
  // Recomendación de un conocido, fuera del plan de referidos.
  { id: 8, name: "Referido", active: true },
  { id: 14, name: "Plan de referidos", active: true },
  // Canal general: puede venir de SEO o SEM (no se divide).
  { id: 5, name: "Google", active: true },
  { id: 6, name: "Whatsapp", active: true },
  { id: 7, name: "Radio", active: true },
  { id: 12, name: "Bot Precalificación", active: true },
  { id: 10, name: "Otros", active: true },
  // Discontinuado (nunca hubo ventas). Solo lectura de históricos.
  { id: 9, name: "Correo Electrónico", active: false },
];

// Motivos de pérdida de una oportunidad.
//
// FUENTE DE VERDAD: "KPIs de Ventas v1.1", punto 5. Clasificación FIJA —
// el módulo reporta el total de perdidos por cada motivo, así que sumar
// valores sin aprobación de Dirección rompe la comparación mes a mes.
//
// ESPEJO de `legalistas_backend/src/constants/lostReasons.ts`.
export type LostReasonValue =
  | "PRESCRIPTO"
  | "YA_TIENE_ABOGADO"
  | "SIN_COBERTURA"
  | "DESESTIMO"
  | "OTROS";

type LostReason = {
  value: LostReasonValue;
  label: string;
  /** Pide detalle libre obligatorio. */
  requiresNotes?: boolean;
};

export const LOST_REASONS: LostReason[] = [
  { value: "PRESCRIPTO", label: "Caso prescrito" },
  { value: "YA_TIENE_ABOGADO", label: "Ya tiene abogado" },
  { value: "SIN_COBERTURA", label: "No tiene ART / seguro / cobertura" },
  {
    value: "DESESTIMO",
    label: "Desestimó el servicio / no quiere avanzar el trámite",
  },
  { value: "OTROS", label: "Otros", requiresNotes: true },
];

export const SERVICES_TYPE: ServiceType[] = [
  { id: 1, value: 1, label: "Acc. de trabajo" },
  { id: 2, value: 2, label: "Acc. de tránsito" },
  { id: 3, value: 3, label: "Jubilaciones" },
  { id: 4, value: 4, label: "Sucesiones" },
  { id: 5, value: 5, label: "Daños y Materiales" },
  { id: 6, value: 6, label: "Civil" },
  { id: 7, value: 7, label: "Ejecutivos" },
];

export const LOG_TYPES: LOGType[] = [
  { type: "CREATED", label: "Creación" },
  { type: "EMAIL", label: "Email" },
  { type: "CALL", label: "Llamada" },
  { type: "MEETING", label: "Reunión" },
  { type: "NOTE", label: "Nota" },
  { type: "TASK", label: "Tarea" },
  { type: "STATUS_CHANGE", label: "Cambio de Estado" },
  { type: "OTHER", label: "Otro" },
];

export const MEETING_TYPES: MeetingType[] = [
  { id: "VIDEO_CALL", name: "Videollamada" },
  { id: "IN_PERSON_MEETING", name: "Reunión presencial" },
  { id: "POWER_MEETING", name: "Reunión poder" },
];

export const ART_COMPANIES = [
  { id: 1, name: "Galeno ART" },
  { id: 2, name: "Experta ART" },
  { id: 3, name: "La Segunda ART" },
  { id: 4, name: "Provincia ART" },
  { id: 5, name: "Swiss Medical ART" },
  { id: 6, name: "OMINT ART" },
  { id: 7, name: "Asociart ART" },
  { id: 8, name: "Berkley ART" },
  { id: 9, name: "Federación Patronal ART" },
  { id: 10, name: "Prevención ART" },
  { id: 11, name: "QBE ART" },
];

export const INSURANCE_COMPANIES = [
  { id: 1, name: "La Segunda" },
  { id: 2, name: "Federación Patronal" },
  { id: 3, name: "San Cristóbal" },
  { id: 4, name: "Mapfre" },
  { id: 5, name: "Zurich" },
  { id: 6, name: "Allianz" },
  { id: 7, name: "Rivadavia" },
  { id: 8, name: "La Holando" },
  { id: 9, name: "Sancor Seguros" },
  { id: 10, name: "Provincia Seguros" },
  { id: 11, name: "La Meridional" },
  { id: 12, name: "Mercantil Andina" },
  { id: 13, name: "Integrity Seguros" },
  { id: 14, name: "La Caja" },
  { id: 15, name: "SMG Seguros" },
  { id: 16, name: "HDI Seguros" },
  { id: 17, name: "Galeno Seguros" },
  { id: 18, name: "SURA" },
];

export const WHATSAPP_MESSAGES: Record<
  string,
  { withMeeting: string; withoutMeeting: string }
> = {
  "1": {
    withMeeting:
      "Hola *{nombre}*,\n\nGracias por confiar en *Legalistas*. Ya estamos procesando tu consulta.\n\nUn asesor se va a contactar con vos para coordinar una reuni\u00f3n por videollamada con un abogado especializado.\n\nTe mantendremos informado. Cualquier duda, escribinos.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nGracias por confiar en *Legalistas*. Ya estamos procesando tu consulta.\n\nUn asesor se va a contactar con vos para coordinar una reuni\u00f3n por videollamada con un abogado especializado.\n\nTe mantendremos informado. Cualquier duda, escribinos.\n\n_Equipo Legalistas_",
  },
  "2": {
    withMeeting:
      "Hola *{nombre}*,\n\n*{tipoReunion}*\n{fechaReunion} a las {horaReunion} hs\nLugar: Alem 80\n\nSi confirm\u00e1s asistencia, toc\u00e1 el siguiente link:\n{confirmationUrl}\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nNos comunicamos desde *Legalistas* para coordinar una reuni\u00f3n y poder asesorarte mejor sobre tu caso.\n\n\u00bfQu\u00e9 d\u00eda y horario te queda m\u00e1s c\u00f3modo?\n\n_Equipo Legalistas_",
  },
  "3": {
    withMeeting:
      "Hola *{nombre}*,\n\n*{tipoReunion}*\n{fechaReunion} a las {horaReunion} hs\nLugar: Alem 80\n\nSi confirm\u00e1s asistencia, toc\u00e1 el siguiente link:\n{confirmationUrl}\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nTe recordamos que tenemos coordinada una reuni\u00f3n pr\u00f3ximamente. \u00bfNos confirm\u00e1s tu asistencia?\n\n_Equipo Legalistas_",
  },
  "4": {
    withMeeting:
      "Hola *{nombre}*,\n\nEsperamos que te est\u00e9s recuperando bien. En *Legalistas* seguimos atentos a tu caso.\n\nSi durante tu tratamiento surge alg\u00fan inconveniente (falta de asistencia m\u00e9dica, alta prematura, demoras en estudios o cirug\u00edas), avisanos cuanto antes.\n\nEstamos para ayudarte.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nEsperamos que te est\u00e9s recuperando bien. En *Legalistas* seguimos atentos a tu caso.\n\nSi durante tu tratamiento surge alg\u00fan inconveniente (falta de asistencia m\u00e9dica, alta prematura, demoras en estudios o cirug\u00edas), avisanos cuanto antes.\n\nEstamos para ayudarte.\n\n_Equipo Legalistas_",
  },
  "12": {
    withMeeting:
      "Hola *{nombre}*,\n\nTe informamos que hemos enviado el telegrama correspondiente a tu caso. Te mantendremos informado sobre cualquier novedad.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nTe informamos que hemos enviado el telegrama correspondiente a tu caso. Te mantendremos informado sobre cualquier novedad.\n\n_Equipo Legalistas_",
  },
  "5": {
    withMeeting:
      "Hola *{nombre}*,\n\nEstamos esperando tu confirmaci\u00f3n para poder avanzar con tu caso. \u00bfPodemos contar con tu respuesta?\n\nSi ten\u00e9s alguna duda, escribinos.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nEstamos esperando tu confirmaci\u00f3n para poder avanzar con tu caso. \u00bfPodemos contar con tu respuesta?\n\nSi ten\u00e9s alguna duda, escribinos.\n\n_Equipo Legalistas_",
  },
  "6": {
    withMeeting:
      "Hola *{nombre}*,\n\n*{tipoReunion}*\n{fechaReunion} a las {horaReunion} hs\nLugar: Alem 80\n\nSi confirm\u00e1s asistencia, toc\u00e1 el siguiente link:\n{confirmationUrl}\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nNecesitamos coordinar una reuni\u00f3n para firmar el poder. \u00bfQu\u00e9 d\u00eda y horario te vendr\u00eda bien?\n\n_Equipo Legalistas_",
  },
  "8": {
    withMeeting:
      "Hola *{nombre}*,\n\nYa te entregamos el poder para comenzar tu representaci\u00f3n. Quedamos al aguardo de que lo entregues firmado para poder poner en marcha tu gesti\u00f3n.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nYa te entregamos el poder para comenzar tu representaci\u00f3n. Quedamos al aguardo de que lo entregues firmado para poder poner en marcha tu gesti\u00f3n.\n\n_Equipo Legalistas_",
  },
  "9": {
    withMeeting:
      "Hola *{nombre}*,\n\n\u00a1Recibimos tu autorizaci\u00f3n y ya estamos trabajando en tu caso!\n\n\ud83d\udce7 Te enviamos a tu email tu usuario y contrase\u00f1a para acceder a la plataforma de clientes.\n\n\ud83d\udcf1 Descargate la app de Legalistas:\n\u2022 Android: https://play.google.com/store/apps/details?id=com.lexiatechs.legalistas&hl=es_AR\n\u2022 iPhone: https://apps.apple.com/ar/app/legalistas/id6762129942\n\nTambi\u00e9n pod\u00e9s ingresar desde la web:\nhttps://usuarios.legalistas.ar\n\nSi la aseguradora te contacta, es posible que sea por nuestras gestiones. Ante cualquier duda, escribinos.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\n\u00a1Recibimos tu autorizaci\u00f3n y ya estamos trabajando en tu caso!\n\n\ud83d\udce7 Te enviamos a tu email tu usuario y contrase\u00f1a para acceder a la plataforma de clientes.\n\n\ud83d\udcf1 Descargate la app de Legalistas:\n\u2022 Android: https://play.google.com/store/apps/details?id=com.lexiatechs.legalistas&hl=es_AR\n\u2022 iPhone: https://apps.apple.com/ar/app/legalistas/id6762129942\n\nTambi\u00e9n pod\u00e9s ingresar desde la web:\nhttps://usuarios.legalistas.ar\n\nSi la aseguradora te contacta, es posible que sea por nuestras gestiones. Ante cualquier duda, escribinos.\n\n_Equipo Legalistas_",
  },
  "10": {
    withMeeting:
      "Hola *{nombre}*,\n\nLamentamos que no hayamos podido avanzar con tu caso. Si en el futuro necesit\u00e1s nuestros servicios, no dudes en contactarnos.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nLamentamos que no hayamos podido avanzar con tu caso. Si en el futuro necesit\u00e1s nuestros servicios, no dudes en contactarnos.\n\n_Equipo Legalistas_",
  },
  "11": {
    withMeeting:
      "Hola *{nombre}*,\n\nTu caso se encuentra archivado. Si necesit\u00e1s reactivarlo, estamos a tu disposici\u00f3n.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nTu caso se encuentra archivado. Si necesit\u00e1s reactivarlo, estamos a tu disposici\u00f3n.\n\n_Equipo Legalistas_",
  },
};
