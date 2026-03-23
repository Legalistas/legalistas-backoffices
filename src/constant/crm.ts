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

export const WHATSAPP_MESSAGES: Record<string, { withMeeting: string; withoutMeeting: string }> = {
  "1": {
    withMeeting: "Hola *{nombre}* 👋\n\nGracias por confiar en *Legalistas*. Ya estamos procesando tu consulta.\n\nUn asesor se va a contactar con vos para coordinar una reunión por videollamada con un abogado especializado.\n\nTe mantendremos informado. Cualquier duda, escribinos.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nGracias por confiar en *Legalistas*. Ya estamos procesando tu consulta.\n\nUn asesor se va a contactar con vos para coordinar una reunión por videollamada con un abogado especializado.\n\nTe mantendremos informado. Cualquier duda, escribinos.\n\n_Equipo Legalistas_ ⚖️",
  },
  "2": {
    withMeeting: "Hola *{nombre}* 👋\n\n📅 *{tipoReunion}*\n🗓 {fechaReunion} a las {horaReunion} hs\n📍 Lugar: Alem 80\n\nSi confirmás asistencia, tocá el siguiente link:\n🔗 {confirmationUrl}\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nNos comunicamos desde *Legalistas* para coordinar una reunión y poder asesorarte mejor sobre tu caso.\n\n¿Qué día y horario te queda más cómodo?\n\n_Equipo Legalistas_ ⚖️",
  },
  "3": {
    withMeeting: "Hola *{nombre}* 👋\n\n📅 *{tipoReunion}*\n🗓 {fechaReunion} a las {horaReunion} hs\n📍 Lugar: Alem 80\n\nSi confirmás asistencia, tocá el siguiente link:\n🔗 {confirmationUrl}\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nTe recordamos que tenemos coordinada una reunión próximamente. ¿Nos confirmás tu asistencia?\n\n_Equipo Legalistas_ ⚖️",
  },
  "4": {
    withMeeting: "Hola *{nombre}* 👋\n\nEsperamos que te estés recuperando bien. En *Legalistas* seguimos atentos a tu caso.\n\n⚠️ Si durante tu tratamiento surge algún inconveniente (falta de asistencia médica, alta prematura, demoras en estudios o cirugías), avisanos cuanto antes.\n\nEstamos para ayudarte.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nEsperamos que te estés recuperando bien. En *Legalistas* seguimos atentos a tu caso.\n\n⚠️ Si durante tu tratamiento surge algún inconveniente (falta de asistencia médica, alta prematura, demoras en estudios o cirugías), avisanos cuanto antes.\n\nEstamos para ayudarte.\n\n_Equipo Legalistas_ ⚖️",
  },
  "12": {
    withMeeting: "Hola *{nombre}* 👋\n\n📄 Te informamos que hemos enviado el telegrama correspondiente a tu caso. Te mantendremos informado sobre cualquier novedad.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\n📄 Te informamos que hemos enviado el telegrama correspondiente a tu caso. Te mantendremos informado sobre cualquier novedad.\n\n_Equipo Legalistas_ ⚖️",
  },
  "5": {
    withMeeting: "Hola *{nombre}* 👋\n\nEstamos esperando tu confirmación para poder avanzar con tu caso. ¿Podemos contar con tu respuesta?\n\nSi tenés alguna duda, escribinos.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nEstamos esperando tu confirmación para poder avanzar con tu caso. ¿Podemos contar con tu respuesta?\n\nSi tenés alguna duda, escribinos.\n\n_Equipo Legalistas_ ⚖️",
  },
  "6": {
    withMeeting: "Hola *{nombre}* 👋\n\n📅 *{tipoReunion}*\n🗓 {fechaReunion} a las {horaReunion} hs\n📍 Lugar: Alem 80\n\nSi confirmás asistencia, tocá el siguiente link:\n🔗 {confirmationUrl}\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nNecesitamos coordinar una reunión para firmar el poder. ¿Qué día y horario te vendría bien?\n\n_Equipo Legalistas_ ⚖️",
  },
  "7": {
    withMeeting: "Hola *{nombre}* 👋\n\n📅 *{tipoReunion}*\n🗓 {fechaReunion} a las {horaReunion} hs\n📍 Lugar: Alem 80\n\nSi confirmás asistencia, tocá el siguiente link:\n🔗 {confirmationUrl}\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nTe recordamos nuestra reunión para la firma del poder. ¿Nos confirmás tu asistencia?\n\n_Equipo Legalistas_ ⚖️",
  },
  "8": {
    withMeeting: "Hola *{nombre}* 👋\n\n📝 Te recordamos que tu autorización sigue pendiente de firma. Este documento es indispensable para que podamos representarte legalmente.\n\nSi todavía no pudiste coordinar la firma, escribinos para agendar.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\n📝 Te recordamos que tu autorización sigue pendiente de firma. Este documento es indispensable para que podamos representarte legalmente.\n\nSi todavía no pudiste coordinar la firma, escribinos para agendar.\n\n_Equipo Legalistas_ ⚖️",
  },
  "9": {
    withMeeting: "Hola *{nombre}* 👋\n\n✅ Recibimos tu autorización y ya estamos trabajando en tu caso.\n\nPodés seguir el estado de tu trámite desde la plataforma de clientes:\n🔗 https://usuarios.legalistas.ar\n\nSi la aseguradora te contacta, es posible que sea por nuestras gestiones. Ante cualquier duda, escribinos.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\n✅ Recibimos tu autorización y ya estamos trabajando en tu caso.\n\nPodés seguir el estado de tu trámite desde la plataforma de clientes:\n🔗 https://usuarios.legalistas.ar\n\nSi la aseguradora te contacta, es posible que sea por nuestras gestiones. Ante cualquier duda, escribinos.\n\n_Equipo Legalistas_ ⚖️",
  },
  "10": {
    withMeeting: "Hola *{nombre}* 👋\n\nLamentamos que no hayamos podido avanzar con tu caso. Si en el futuro necesitás nuestros servicios, no dudes en contactarnos.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nLamentamos que no hayamos podido avanzar con tu caso. Si en el futuro necesitás nuestros servicios, no dudes en contactarnos.\n\n_Equipo Legalistas_ ⚖️",
  },
  "11": {
    withMeeting: "Hola *{nombre}* 👋\n\nTu caso se encuentra archivado. Si necesitás reactivarlo, estamos a tu disposición.\n\n_Equipo Legalistas_ ⚖️",
    withoutMeeting: "Hola *{nombre}* 👋\n\nTu caso se encuentra archivado. Si necesitás reactivarlo, estamos a tu disposición.\n\n_Equipo Legalistas_ ⚖️",
  },
};
