// Auditoría: un movimiento grabado (método + ruta de la API) en palabras.
// La ruta exacta se muestra igual al lado, para quien necesite el detalle.

const AREAS: Record<string, string> = {
	cases: "Causas",
	"cases-files": "Expedientes",
	crm: "CRM",
	leads: "CRM",
	closings: "Cierres",
	negotiations: "Negociaciones",
	caja: "Caja",
	cash: "Caja",
	finance: "Finanzas",
	tarjetas: "Tarjetas",
	aportes: "Aportes",
	kpis: "KPIs",
	"manual-kpis": "KPIs",
	users: "Equipo",
	rrhh: "RR.HH.",
	whatsapp: "WhatsApp",
	escritos: "Escritos",
	plantillas: "Escritos",
	documents: "Documentos",
	files: "Archivos",
	upload: "Archivos",
	calendar: "Calendario",
	"google-calendar": "Calendario",
	events: "Calendario",
	tasks: "Tareas",
	projects: "Tareas",
	teams: "Tareas",
	orgs: "Tareas",
	todolists: "Tareas",
	mailer: "Mails",
	notifications: "Notificaciones",
	configuracion: "Configuración",
	settings: "Configuración",
	potenciales: "Potenciales",
	parties: "Partes",
	customer: "Clientes",
	clients: "Clientes",
	consultations: "Consultas",
	auth: "Sesión",
};

const VERBO: Record<string, string> = {
	POST: "Creó / envió",
	PUT: "Editó",
	PATCH: "Editó",
	DELETE: "Eliminó",
};

/** "PUT /api/v1/cases/123/notes" → { area: "Causas", accion: "Editó #123" }. */
export function describirMovimiento(
	metodo: string | null,
	ruta: string | null,
): { area: string; accion: string } {
	const partes = (ruta ?? "")
		.replace(/^\/api\/v1\//, "")
		.split("/")
		.filter(Boolean);
	if (partes[0] === "auth" && partes[1] === "logout") {
		return { area: "Sesión", accion: "Cerró sesión" };
	}
	const clave = partes.find((p) => !/^\d+$/.test(p)) ?? "";
	const area =
		AREAS[clave] ??
		(clave ? clave.charAt(0).toUpperCase() + clave.slice(1).replace(/-/g, " ") : "Sistema");
	const id = partes.find((p) => /^\d+$/.test(p));
	const verbo = VERBO[metodo ?? ""] ?? metodo ?? "";
	return { area, accion: id ? `${verbo} #${id}` : verbo };
}
