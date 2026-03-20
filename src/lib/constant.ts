import { Role } from "@/constant/user";

export const STUDIO_NAME = "Legalistas";
export const STUDIO_PHONE = "+54 9 11 0000-0000";

type ServiceType = {
  id: number;
  value: number;
  label: string;
};

type StageType = {
  id: number;
  value: number;
  label: string;
};

// services
export const servicesType: ServiceType[] = [
  { id: 1, value: 1, label: "Acc. de trabajo" },
  { id: 2, value: 2, label: "Acc. de transito" },
  { id: 3, value: 3, label: "Jubilaciones" },
  { id: 4, value: 4, label: "Sucesiones" },
  { id: 5, value: 5, label: "Daños y materiales" },
  { id: 6, value: 6, label: "Despidos" },
  { id: 7, value: 7, label: "Civil" },
  { id: 8, value: 8, label: "Ejecutivos" },
  { id: 9, value: 9, label: "Accidente in Itinere" },
  { id: 10, value: 10, label: "Enfermedad Profesional" },
];

export const stageCases: StageType[] = [
  { id: 1, value: 1, label: "Documentación" },
  { id: 2, value: 2, label: "Administrativo" },
  { id: 3, value: 3, label: "Judicial" },
  { id: 4, value: 4, label: "Incapacidad" },
  { id: 5, value: 5, label: "Cierre" },
  { id: 6, value: 6, label: "Experiencia" },
  { id: 7, value: 7, label: "Archivado" },
];

export const stageDefaultMessages: Record<number, string> = {
  1: `Hola {{nombre}} 👋

Queríamos contarte que ya comenzamos a trabajar en tu caso (Expediente Nº {{numero_causa}}).

En este momento estamos recopilando toda la documentación necesaria para avanzar correctamente.

Si llegamos a necesitar algún dato o documento adicional, te lo vamos a pedir por este medio.

Cualquier duda podés escribirnos cuando quieras.
Equipo {{estudio}}`,

  2: `Hola {{nombre}} 👋

Te actualizamos sobre tu caso (Expediente Nº {{numero_causa}}).

Actualmente se encuentra en etapa *administrativa*. Estamos realizando las gestiones correspondientes ante el organismo competente para que el trámite avance.

Seguimos trabajando en esto y te avisaremos ante cualquier novedad.

Equipo {{estudio}}`,

  3: `Hola {{nombre}} 👋

Queríamos informarte que tu caso (Expediente Nº {{numero_causa}}) *ya ingresó a etapa judicial*.

Esto significa que el proceso fue iniciado ante el juzgado correspondiente y comenzará el trámite judicial.

Te iremos informando cada avance importante.

Equipo {{estudio}}`,

  4: `Hola {{nombre}} 👋

Tu caso (Expediente Nº {{numero_causa}}) se encuentra en la etapa de *determinación de incapacidad*.

En los próximos pasos se realizarán las pericias médicas correspondientes.

Cuando tengamos información sobre turnos o fechas te lo comunicaremos inmediatamente.

Equipo {{estudio}}`,

  5: `Hola {{nombre}} 👋

Te contamos que tu caso (Expediente Nº {{numero_causa}}) se encuentra en su etapa final.

Estamos realizando las últimas gestiones necesarias para llegar a la resolución definitiva.

Apenas tengamos novedades importantes te vamos a avisar.

Equipo {{estudio}}`,

  6: `Hola {{nombre}} 👋

Nos alegra informarte que tu caso (Expediente Nº {{numero_causa}}) *ha sido resuelto*.

Agradecemos mucho la confianza que depositaste en nosotros para acompañarte durante todo el proceso.

Si querés, podés compartir tu experiencia con nuestro estudio. Nos ayuda muchísimo.

Muchas gracias 🙌
Equipo {{estudio}}`,

  7: `Hola {{nombre}} 👋

Te informamos que tu caso (Expediente Nº {{numero_causa}}) ha sido archivado.

Si en algún momento necesitás realizar una consulta o retomar el tema, podés comunicarte con nosotros sin problema.

Estamos para ayudarte.

Equipo {{estudio}}`,
};

export const filesType = [
  { id: 1, value: 1, label: "Administrativo" },
  { id: 2, value: 2, label: "Judicial" },
];

// You can also add a helper constant for the "todos" option if needed
export const fileFilterOptions = [
  { id: 0, value: 0, label: "Todos" },
  ...filesType.map((type) => ({
    id: type.id,
    value: type.value,
    label: type.value === 1 ? "Administrativo" : "Judicial",
  })),
];

export const protectedRoutes = {
  "/admin": [Role.ADMINISTRATOR],
  "/welcome": [Role.ADMINISTRATOR, Role.CUSTOMER],
};

export const docsType = [
  { id: 1, value: 1, label: "DNI" },
  { id: 2, value: 2, label: "Cuil/Cuit" },
  { id: 3, value: 3, label: "LC" },
  { id: 4, value: 4, label: "LE" },
  { id: 5, value: 5, label: "Pasaporte" },
];

export const genderType = [
  { id: 1, value: 1, label: "Masculino" },
  { id: 2, value: 2, label: "Femenino" },
  { id: 3, value: 3, label: "X" },
];

export const statusType = [
  { id: 1, value: "IN_PROGRESS", label: "En Progreso" },
  { id: 2, value: "WON", label: "Ganado" },
  { id: 3, value: "LOST", label: "Perdido" },
];

export const COLORS = [
  { name: "Default", value: "#000000" },
  { name: "Purple", value: "#958DF1" },
  { name: "Red", value: "#E63946" },
  { name: "Green", value: "#2A9D8F" },
  { name: "Blue", value: "#457B9D" },
  { name: "Yellow", value: "#E9C46A" },
];

export const FONT_SIZES = [
  { value: "12px", label: "12px" },
  { value: "14px", label: "14px" },
  { value: "16px", label: "16px" },
  { value: "18px", label: "18px" },
  { value: "20px", label: "20px" },
  { value: "24px", label: "24px" },
  { value: "30px", label: "30px" },
  { value: "36px", label: "36px" },
];
