"use client";

import {
	ArrowLeft,
	BarChart3,
	ChevronDown,
	ChevronRight,
	Crown,
	Landmark,
	Loader2,
	Megaphone,
	Monitor,
	Scale,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/Can";
import { Role } from "@/constant/user";
import { SUPERADMIN } from "@/constant/menu";
import { USERS_ENDPOINT } from "@/constant/api-endpoints";
import type { User } from "@/types/users";

const EMPLOYMENT_ALLOWED_ROLES = [
	...SUPERADMIN,
	Role.COORDINADOR_FINANCIERO,
	Role.DIRECTOR_FINANCIERO,
	Role.CONTADOR_SENIOR,
	Role.ANALISTA_FINANCIERO,
	Role.TESORERO,
	Role.AUDITOR_INTERNO,
];

type AreaKey = "direccion" | "legal" | "ventas" | "contable" | "marketing" | "it";

const AREAS: {
	key: AreaKey;
	label: string;
	icon: typeof Scale;
	colorClass: string;
	ringClass: string;
	bgClass: string;
}[] = [
	{
		key: "direccion",
		label: "Dirección",
		icon: Crown,
		colorClass: "text-amber-600",
		ringClass: "border-amber-500/40",
		bgClass: "bg-amber-50 dark:bg-amber-900/10",
	},
	{
		key: "legal",
		label: "Legal",
		icon: Scale,
		colorClass: "text-purple-600",
		ringClass: "border-purple-500/40",
		bgClass: "bg-purple-50 dark:bg-purple-900/10",
	},
	{
		key: "ventas",
		label: "Ventas",
		icon: BarChart3,
		colorClass: "text-blue-600",
		ringClass: "border-blue-500/40",
		bgClass: "bg-blue-50 dark:bg-blue-900/10",
	},
	{
		key: "contable",
		label: "Contable",
		icon: Landmark,
		colorClass: "text-emerald-600",
		ringClass: "border-emerald-500/40",
		bgClass: "bg-emerald-50 dark:bg-emerald-900/10",
	},
	{
		key: "marketing",
		label: "Marketing",
		icon: Megaphone,
		colorClass: "text-pink-600",
		ringClass: "border-pink-500/40",
		bgClass: "bg-pink-50 dark:bg-pink-900/10",
	},
	{
		key: "it",
		label: "IT",
		icon: Monitor,
		colorClass: "text-cyan-600",
		ringClass: "border-cyan-500/40",
		bgClass: "bg-cyan-50 dark:bg-cyan-900/10",
	},
];

const areaKeyFromRoleName = (roleName?: string | null): AreaKey | null => {
	if (!roleName) return null;
	const n = roleName.toLowerCase();
	if (/(^admin$|ceo|coo|director_general|gerente_general)/.test(n)) return "direccion";
	if (/(legal|abogad|asistente_legal|coordinador_legal)/.test(n)) return "legal";
	if (/(ventas|ejecutiv|representante_vent|analista_vent|gerente_vent)/.test(n)) return "ventas";
	if (/(contable|financier|contador|tesorer|auditor)/.test(n)) return "contable";
	if (/(marketing|contenid|disenador|investigador_merc)/.test(n)) return "marketing";
	if (/(it|sistemas|desarrollador|soporte_tecnico)/.test(n)) return "it";
	return null;
};

// Niveles: más alto = menor número. 1 = Dirección, 5 = Asistente
// 3.5 = nivel intermedio para Abogado Interno (va por encima de Abogado Representante)
const levelFromRoleName = (roleName?: string | null): number => {
	if (!roleName) return 99;
	const n = roleName.toLowerCase();
	if (/(^admin$|director_general_ceo|gerente_general_coo)/.test(n)) return 1;
	if (/^directora_area_|^director_area_/.test(n)) return 2;
	if (/^coordinador_|^gerente_|^director_financiero|^director_marketing|^administrador_sistemas/.test(n))
		return 3;
	if (n === "abogado_interno") return 3.5;
	if (/(abogado_representante|ejecutivo_ventas|representante_ventas|desarrollador_software|contador_senior|especialista_marketing_digital|investigador_mercado|disenador_grafico|tesorero|auditor_interno)/.test(n))
		return 4;
	if (/(asistente|analista|soporte_tecnico|gestor_contenidos)/.test(n)) return 5;
	return 99;
};

const getInitials = (name: string | null | undefined) => {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface PersonCard {
	id: number;
	name: string;
	email: string | null;
	image: string | null;
	roleName: string;
	roleDisplayName: string;
	level: number;
}

const PersonCardView = ({
	p,
	onClick,
	compact = false,
}: {
	p: PersonCard;
	onClick: () => void;
	compact?: boolean;
}) => (
	<button
		type="button"
		onClick={onClick}
		className={`flex items-center gap-2 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all text-left w-full ${compact ? "p-2" : "p-2.5"}`}
	>
		<Avatar size={compact ? "sm" : "default"}>
			{p.image && <AvatarImage src={p.image} alt={p.name} />}
			<AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary text-xs font-medium">
				{getInitials(p.name)}
			</AvatarFallback>
		</Avatar>
		<div className="min-w-0 flex-1">
			<p className={`truncate font-medium text-foreground ${compact ? "text-xs" : "text-sm"}`}>
				{p.name}
			</p>
			<p className="text-[10px] text-muted-foreground truncate">
				{p.roleDisplayName}
			</p>
		</div>
	</button>
);

export default function OrganigramaContent() {
	const { data: session } = useSession();
	const router = useRouter();
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	// Control de qué áreas tienen los representantes expandidos (por default colapsados)
	const [expandedReps, setExpandedReps] = useState<Set<AreaKey>>(new Set());

	const toggleReps = (area: AreaKey) =>
		setExpandedReps((s) => {
			const next = new Set(s);
			if (next.has(area)) next.delete(area);
			else next.add(area);
			return next;
		});

	const token = session?.user?.accessToken;

	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		setIsLoading(true);
		fetch(`${USERS_ENDPOINT}?limit=500`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled || !json) return;
				setUsers(json.data || []);
			})
			.catch(() => toast.error("Error al cargar el organigrama"))
			.finally(() => !cancelled && setIsLoading(false));
		return () => {
			cancelled = true;
		};
	}, [token]);

	const grouped = useMemo(() => {
		const map = new Map<AreaKey, Map<number, PersonCard[]>>();
		for (const a of AREAS) map.set(a.key, new Map());

		// Emails de cuentas de sistema que no deben aparecer en el organigrama
		const SYSTEM_EMAILS = new Set(["sistemas@legalistas.ar"]);

		for (const u of users) {
			if (u.email && SYSTEM_EMAILS.has(u.email.toLowerCase())) continue;
			const role = u.roleUser?.[0]?.role;
			if (!role?.name) continue;
			const area = areaKeyFromRoleName(role.name);
			if (!area) continue;
			const level = levelFromRoleName(role.name);
			const card: PersonCard = {
				id: u.id,
				name: u.name,
				email: u.email,
				image: u.image,
				roleName: role.name,
				roleDisplayName: role.displayName || role.name,
				level,
			};
			const areaMap = map.get(area);
			if (!areaMap) continue;
			const bucket = areaMap.get(level) ?? [];
			bucket.push(card);
			areaMap.set(level, bucket);
		}

		for (const areaMap of map.values()) {
			for (const bucket of areaMap.values()) {
				bucket.sort((a, b) => a.name.localeCompare(b.name));
			}
		}

		return map;
	}, [users]);

	const totalEmployees = useMemo(
		() =>
			Array.from(grouped.values()).reduce(
				(acc, areaMap) =>
					acc +
					Array.from(areaMap.values()).reduce(
						(sum, bucket) => sum + bucket.length,
						0,
					),
				0,
			),
		[grouped],
	);

	const direccionMap = grouped.get("direccion");
	const direccionCards: PersonCard[] = direccionMap
		? Array.from(direccionMap.values()).flat()
		: [];

	const AREA_COLUMNS = AREAS.filter((a) => a.key !== "direccion");

	const openUser = (id: number) => router.push(`/admin/rrhh/${id}`);

	return (
		<Can
			role={EMPLOYMENT_ALLOWED_ROLES}
			fallback={
				<div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-2">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="text-xs text-muted-foreground max-w-md">
						Solo el personal de SUPERADMIN y área contable puede acceder al organigrama.
					</p>
					<Button asChild variant="outline" size="sm" className="mt-2">
						<Link href="/admin/teams">Volver al equipo</Link>
					</Button>
				</div>
			}
		>
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Button asChild size="icon" variant="ghost" title="Volver">
						<Link href="/admin/teams">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Organigrama
						</h1>
						<p className="text-xs text-muted-foreground">
							{totalEmployees} miembros · agrupados por área y nivel jerárquico
						</p>
					</div>
				</div>
				<div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
					<Users className="h-3.5 w-3.5" />
					<span>Clic en cualquier persona para abrir su ficha RRHH</span>
				</div>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="space-y-8">
					{/* Nivel 1: Dirección */}
					{direccionCards.length > 0 && (
						<div className="flex flex-col items-center gap-3">
							<div className="flex items-center gap-2">
								<Crown className="h-4 w-4 text-amber-600" />
								<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Dirección general
								</span>
							</div>
							<div className="flex flex-wrap justify-center gap-3 max-w-3xl">
								{direccionCards.map((p) => (
									<div key={p.id} className="w-64">
										<PersonCardView p={p} onClick={() => openUser(p.id)} />
									</div>
								))}
							</div>
							<div className="h-6 w-px bg-border" />
						</div>
					)}

					{/* Áreas en columnas */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
						{AREA_COLUMNS.map((area) => {
							const Icon = area.icon;
							const areaMap = grouped.get(area.key);
							const people = areaMap
								? Array.from(areaMap.entries()).sort((a, b) => a[0] - b[0])
								: [];
							const count = people.reduce(
								(sum, [, bucket]) => sum + bucket.length,
								0,
							);

							return (
								<div
									key={area.key}
									className={`rounded-lg border ${area.ringClass} ${area.bgClass} p-3 space-y-3 flex flex-col`}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<Icon className={`h-4 w-4 ${area.colorClass}`} />
											<h3 className="text-sm font-semibold text-foreground">
												{area.label}
											</h3>
										</div>
										<Badge variant="secondary" className="text-[10px]">
											{count}
										</Badge>
									</div>

									{count === 0 ? (
										<div className="flex items-center justify-center py-6 text-[11px] text-muted-foreground italic">
											Sin miembros
										</div>
									) : (
										<div className="space-y-3 flex-1">
											{people.map(([level, bucket]) => {
												// Separar abogado_representante del resto para colapsarlos
												const reps = bucket.filter(
													(p) => p.roleName === "abogado_representante",
												);
												const rest = bucket.filter(
													(p) => p.roleName !== "abogado_representante",
												);
												const isExpanded = expandedReps.has(area.key);
												return (
													<div key={level} className="space-y-1.5">
														<p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
															{levelLabel(level)}
														</p>
														<div className="space-y-1.5">
															{rest.map((p) => (
																<PersonCardView
																	key={p.id}
																	p={p}
																	compact={level >= 4}
																	onClick={() => openUser(p.id)}
																/>
															))}
															{reps.length > 0 && (
																<>
																	<button
																		type="button"
																		onClick={() => toggleReps(area.key)}
																		className="flex items-center gap-2 w-full p-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
																	>
																		{isExpanded ? (
																			<ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
																		) : (
																			<ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
																		)}
																		<span className="text-xs font-medium text-foreground flex-1 text-left">
																			Representantes
																		</span>
																		<Badge
																			variant="secondary"
																			className="text-[10px]"
																		>
																			+{reps.length}
																		</Badge>
																	</button>
																	{isExpanded && (
																		<div className="space-y-1.5 pl-2 border-l-2 border-primary/20 ml-1">
																			{reps.map((p) => (
																				<PersonCardView
																					key={p.id}
																					p={p}
																					compact
																					onClick={() => openUser(p.id)}
																				/>
																			))}
																		</div>
																	)}
																</>
															)}
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
		</Can>
	);
}

function levelLabel(level: number): string {
	switch (level) {
		case 2:
			return "Dirección de área";
		case 3:
			return "Coordinación / Gerencia";
		case 3.5:
			return "Abogados internos";
		case 4:
			return "Operativos";
		case 5:
			return "Asistentes / Juniors";
		default:
			return "Equipo legal interno total";
	}
}
