// Quién es "del equipo" (usuarios internos). Lo usan la página Equipo y la
// Caja (para elegir el dueño de una caja de monotributo).

/** Roles internos del equipo. */
export const INTERNAL_TEAM_ROLES = [
	"admin",
	"director_general_ceo",
	"gerente_general_coo",
	"directora_area_legal",
	"coordinador_legal",
	"abogado_representante",
	"abogado_interno",
	"asistente_legal",
	"director_area_it",
	"coordinador_it",
	"administrador_sistemas",
	"desarrollador_software",
	"soporte_tecnico",
	"directora_area_ventas",
	"coordinador_ventas",
	"gerente_ventas",
	"ejecutivo_ventas",
	"representante_ventas",
	"analista_ventas",
	"directora_area_marketing",
	"coordinador_marketing",
	"director_marketing",
	"especialista_marketing_digital",
	"disenador_grafico",
	"investigador_mercado",
	"gestor_contenidos",
	"directora_area_contable",
	"coordinador_financiero",
	"director_financiero",
	"contador_senior",
	"analista_financiero",
	"tesorero",
	"auditor_interno",
];

// biome-ignore lint/suspicious/noExplicitAny: los usuarios de /users vienen sin tipar en toda la app
export function getRoleIdentifier(member: any): string {
	return (
		member.roleUser?.[0]?.role?.slug?.toLowerCase() ||
		member.roleUser?.[0]?.role?.name?.toLowerCase() ||
		""
	);
}

// biome-ignore lint/suspicious/noExplicitAny: ídem
export function isInternalTeamMember(member: any): boolean {
	return INTERNAL_TEAM_ROLES.includes(getRoleIdentifier(member));
}
