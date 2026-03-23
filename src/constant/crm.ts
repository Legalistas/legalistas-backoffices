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
  { id: "7", title: "Reunión De Poder" },
  { id: "8", title: "Pendiente Poder" },
  { id: "9", title: "Ganado - Trajo Poder" },
  { id: "10", title: "Perdida" },
  { id: "11", title: "Archivados" },
];

export const SOURCE_CHANNEL = [
  {
    id: 1,
    name: "Website",
  },
  {
    id: 2,
    name: "Telemarketing",
  },
  {
    id: 3,
    name: "Facebook",
  },
  {
    id: 4,
    name: "Instagram",
  },
  {
    id: 5,
    name: "Google",
  },
  {
    id: 6,
    name: "Whatsapp",
  },
  {
    id: 7,
    name: "Radio",
  },
  {
    id: 8,
    name: "Referido",
  },
  {
    id: 9,
    name: "Correo Electrónico",
  },
  {
    id: 10,
    name: "Otros",
  },
  {
    id: 11,
    name: "TikTok",
  },
  {
    id: 12,
    name: "Bot Precalificación",
  },
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
  "7": {
    withMeeting:
      "Hola *{nombre}*,\n\n*{tipoReunion}*\n{fechaReunion} a las {horaReunion} hs\nLugar: Alem 80\n\nSi confirm\u00e1s asistencia, toc\u00e1 el siguiente link:\n{confirmationUrl}\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nTe recordamos nuestra reuni\u00f3n para la firma del poder. \u00bfNos confirm\u00e1s tu asistencia?\n\n_Equipo Legalistas_",
  },
  "8": {
    withMeeting:
      "Hola *{nombre}*,\n\nTe recordamos que tu autorizaci\u00f3n sigue pendiente de firma. Este documento es indispensable para que podamos representarte legalmente.\n\nSi todav\u00eda no pudiste coordinar la firma, escribinos para agendar.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nTe recordamos que tu autorizaci\u00f3n sigue pendiente de firma. Este documento es indispensable para que podamos representarte legalmente.\n\nSi todav\u00eda no pudiste coordinar la firma, escribinos para agendar.\n\n_Equipo Legalistas_",
  },
  "9": {
    withMeeting:
      "Hola *{nombre}*,\n\nRecibimos tu autorizaci\u00f3n y ya estamos trabajando en tu caso.\n\nPod\u00e9s seguir el estado de tu tr\u00e1mite desde la plataforma de clientes:\nhttps://usuarios.legalistas.ar\n\nSi la aseguradora te contacta, es posible que sea por nuestras gestiones. Ante cualquier duda, escribinos.\n\n_Equipo Legalistas_",
    withoutMeeting:
      "Hola *{nombre}*,\n\nRecibimos tu autorizaci\u00f3n y ya estamos trabajando en tu caso.\n\nPod\u00e9s seguir el estado de tu tr\u00e1mite desde la plataforma de clientes:\nhttps://usuarios.legalistas.ar\n\nSi la aseguradora te contacta, es posible que sea por nuestras gestiones. Ante cualquier duda, escribinos.\n\n_Equipo Legalistas_",
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
