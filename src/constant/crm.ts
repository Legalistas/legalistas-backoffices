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

export const WHATSAPP_MESSAGES: Record<string, string> = {
  "1": "Hola {nombre}, gracias por contactarnos. Queremos conocer más sobre tu consulta. ¿Podrías contarnos un poco más sobre tu situación?",
  "2": "Hola {nombre}, nos comunicamos desde el estudio para coordinar una reunión y poder asesorarte mejor sobre tu caso. ¿Qué día y horario te queda más cómodo?",
  "3": "Hola {nombre}, te recordamos que tenemos coordinada una reunión próximamente. ¿Nos confirmas tu asistencia?",
  "4": "Hola {nombre}, te escribimos para darte una actualización sobre el estado de tu caso. ¿Tienes un momento para conversar?",
  "12": "Hola {nombre}, te informamos que hemos enviado el telegrama correspondiente a tu caso. Te mantendremos informado sobre cualquier novedad.",
  "5": "Hola {nombre}, estamos esperando tu confirmación para continuar con el proceso. ¿Podemos contar con tu respuesta?",
  "6": "Hola {nombre}, necesitamos coordinar una reunión para firmar el poder. ¿Qué día te vendría bien?",
  "7": "Hola {nombre}, te recordamos nuestra reunión para la firma del poder. ¿Nos confirmas tu asistencia?",
  "8": "Hola {nombre}, quedamos a la espera de que nos entregues el poder firmado para continuar con tu caso.",
  "9": "Hola {nombre}, ¡excelentes noticias! Ya contamos con tu poder y estamos avanzando con tu caso. Te mantendremos informado.",
  "10": "Hola {nombre}, lamentamos que no hayamos podido avanzar con tu caso. Si en el futuro necesitas nuestros servicios, no dudes en contactarnos.",
  "11": "Hola {nombre}, te escribimos del estudio jurídico. Tu caso se encuentra archivado, pero si necesitas reactivarlo, estamos a tu disposición.",
};
