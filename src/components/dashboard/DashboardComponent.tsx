"use client";
import {
	ArrowRight,
	CalendarDays,
	CheckCircle2,
	Clock,
	ListChecks,
	Scale,
	Users2,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageSrc } from "@/components/shared/GroupAvatar";
import MiCajaWidget from "@/components/caja/MiCajaWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DASHBOARD_LEGAL_STATS_ENDPOINT } from "@/constant/api-endpoints";
import { SUPERADMIN } from "@/constant/menu";
import { Role } from "@/constant/user";
import AccountingDashboard from "./AccountingDashboard";
import DashboardGreetingHeader from "./DashboardGreetingHeader";
import EventosPorConfirmar from "./EventosPorConfirmar";
import { SalesConversion } from "./SalesConversion";
import { SalesLead } from "./SalesLead";
import { SalesLocation } from "./SalesLocation";
import SalesOverview from "./SalesOverview";
import SalesPerformance from "./SalesPerformance";
import { SalesSource } from "./SalesSource";

// ── Helpers ────────────────────────────────────────────────────────

function formatTime(): string {
	return new Date().toLocaleTimeString("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

/** "08-oct"; raya si la fecha no se puede leer. */
function fechaCorta(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? "—"
		: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function isRecentCase(createdAt: string): boolean {
	const diff = Date.now() - new Date(createdAt).getTime();
	return diff < 7 * 24 * 60 * 60 * 1000;
}

// ── Roles por dashboard ────────────────────────────────────────────

const legalRoles: string[] = [
	...SUPERADMIN,
	Role.ASISTENTE_LEGAL,
	Role.ABOGADO_REPRESENTANTE,
];

const salesRoles: string[] = [
	Role.DIRECTORA_AREA_VENTAS,
	Role.COORDINADOR_VENTAS,
	Role.GERENTE_VENTAS,
	Role.EJECUTIVO_VENTAS,
	Role.REPRESENTANTE_VENTAS,
	Role.ANALISTA_VENTAS,
];

// ── Component ──────────────────────────────────────────────────────

const accountingPanelRoles: string[] = [
	Role.DIRECTORA_AREA_CONTABLE,
	Role.DIRECTOR_AREA_IT,
];

export default function DashboardComponent() {
	const { data: session } = useSession();
	const userRole = session?.user?.roleDetails?.name;

	const dashboardType = useMemo(() => {
		if (!userRole) return "default";
		if (legalRoles.includes(userRole)) return "legal";
		if (salesRoles.includes(userRole)) return "sales";
		return "default";
	}, [userRole]);

	// Los dos muestran, al final, la caja propia (MiCajaWidget) de quien es dueño
	// de una (Agustín, monotributos); para el resto no renderiza nada.
	const baseDashboard = dashboardType === "sales" ? <SalesDashboard /> : <LegalDashboard />;

	const showAccountingTab =
		userRole !== undefined && accountingPanelRoles.includes(userRole);

	if (showAccountingTab) {
		return (
			<Tabs defaultValue="main" className="w-full">
				<TabsList>
					<TabsTrigger value="main">Mi Dashboard</TabsTrigger>
					<TabsTrigger value="accounting">Panel Contable</TabsTrigger>
				</TabsList>
				<TabsContent value="main" className="mt-4">
					{baseDashboard}
				</TabsContent>
				<TabsContent value="accounting" className="mt-4">
					<AccountingDashboard />
				</TabsContent>
			</Tabs>
		);
	}

	return baseDashboard;
}

// ── Tipos de respuesta API ─────────────────────────────────────────

interface LegalDashboardData {
	stats: {
		totalCases: number;
		pendingDeadlines7Days: number;
		pendingTasks: number;
		upcomingEvents7Days: number;
	};
	myDay: {
		clear: boolean;
		deadlines: {
			id: number;
			title: string;
			dueDate: string;
			dueTime?: string;
			case: { id: number; title: string };
		}[];
		events: {
			id: number;
			title: string;
			date: string;
			time?: string;
			type: number;
			location?: string;
			case: { id: number; title: string };
		}[];
		tasks: {
			id: number;
			title: string;
			status: string;
			priority: string;
			dueDate: string;
		}[];
		calendarEvents: {
			id: number;
			title: string;
			start: string;
			end?: string;
			allDay: boolean;
			description?: string;
			meetLink?: string;
			responsiblePerson?: { id: number; name: string } | null;
		}[];
	};
	recentCases: {
		id: number;
		title: string;
		number: number;
		status: string;
		createdAt: string;
		customer: { id: number; name: string } | null;
		internalLawyer: { id: number; name: string; image?: string | null } | null;
		responsibleLawyer: { id: number; name: string; image?: string | null } | null;
		files: { id: number; title: string }[];
	}[];
	urgentDeadlines: {
		id: number;
		title: string;
		dueDate: string;
		dueTime?: string;
		status: string;
		case: { id: number; title: string };
	}[];
	upcomingEvents: {
		id: number;
		title: string;
		date: string;
		time?: string;
		type: number;
		location?: string;
		case: { id: number; title: string };
	}[];
	isRepresentative: boolean;
}

// ── Skeleton ──────────────────────────────────────────────────────

function LegalDashboardSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-52" />
					<Skeleton className="h-4 w-64" />
					<Skeleton className="h-4 w-56" />
				</div>
				<Skeleton className="h-9 w-28 rounded-lg" />
			</div>

			{/* Indicadores */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<Card key={i} className="py-4">
						<CardContent className="flex items-center gap-3 px-4">
							<Skeleton className="size-10 shrink-0 rounded-xl" />
							<div className="space-y-1.5">
								<Skeleton className="h-6 w-12" />
								<Skeleton className="h-3 w-20" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Columna principal + columna lateral */}
			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
				<div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:col-span-2 xl:grid-cols-2">
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<Skeleton className="size-5 rounded" />
								<Skeleton className="h-5 w-20" />
							</div>
							<Skeleton className="h-4 w-52" />
						</CardHeader>
						<CardContent className="space-y-4">
							{[1, 2, 3].map((i) => (
								<div key={i} className="flex items-center gap-3">
									<Skeleton className="size-4 rounded shrink-0" />
									<div className="space-y-1.5 flex-1">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					<div>
						<div className="flex items-center justify-between mb-4">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-5 w-20" />
						</div>
						<Card>
							<CardContent className="p-0 divide-y divide-border">
								{[1, 2, 3, 4, 5].map((i) => (
									<div key={i} className="p-4 space-y-2">
										<Skeleton className="h-4 w-2/3" />
										<Skeleton className="h-3 w-1/3" />
										<div className="flex gap-4">
											<Skeleton className="h-3 w-24" />
											<Skeleton className="h-3 w-24" />
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					</div>
				</div>

				<div className="flex min-w-0 flex-col gap-6">
					{[1, 2].map((i) => (
						<Card key={i}>
							<CardHeader>
								<div className="flex items-center gap-2">
									<Skeleton className="size-5 rounded" />
									<Skeleton className="h-5 w-36" />
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								{[1, 2, 3].map((j) => (
									<div key={j} className="flex items-start gap-2">
										<Skeleton className="size-2 rounded-full mt-1.5 shrink-0" />
										<div className="space-y-1.5 flex-1">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({
	icon: Icon,
	value,
	label,
	color,
}: {
	icon: React.ComponentType<{ className?: string }>;
	value: number;
	label: string;
	color: string;
}) {
	return (
		<Card className="py-4">
			<CardContent className="flex items-center gap-3 px-4">
				<div className={`shrink-0 rounded-xl p-2.5 ${color}`}>
					<Icon className="size-5 text-white" />
				</div>
				<div className="min-w-0">
					<p className="text-2xl font-bold leading-none tracking-tight tabular-nums">{value}</p>
					<p className="mt-1.5 text-xs leading-tight text-muted-foreground">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}

// ── Renglón de "Mi Día" ────────────────────────────────────────────

// Ícono del tipo, qué es y, abajo, de qué causa, a qué hora o dónde.
function FilaDelDia({
	icon: Icon,
	tono,
	titulo,
	detalle,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	tono: string;
	titulo: string;
	detalle: (string | false | null | undefined)[];
	children?: React.ReactNode;
}) {
	const texto = detalle.filter(Boolean).join(" · ");
	return (
		<li className="flex items-center gap-3 py-2 text-sm">
			<div className={`shrink-0 rounded-lg p-1.5 ${tono}`}>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-medium truncate" title={titulo}>
					{titulo}
				</p>
				{texto && (
					<p className="text-xs text-muted-foreground truncate" title={texto}>
						{texto}
					</p>
				)}
			</div>
			{children}
		</li>
	);
}

// ── Abogado de un caso reciente ────────────────────────────────────

// La foto al lado del nombre; sin foto (o si no carga), el ícono de su rol.
function AbogadoDelCaso({
	persona,
	rol,
	icon: Icon,
}: {
	persona: { name: string; image?: string | null };
	rol: string;
	icon: React.ComponentType<{ className?: string }>;
}) {
	return (
		<span
			className="flex min-w-0 items-center gap-1.5"
			title={`${rol}: ${persona.name}`}
		>
			<Avatar className="size-5">
				{persona.image && (
					<AvatarImage src={resolveImageSrc(persona.image)} alt="" className="object-cover" />
				)}
				<AvatarFallback>
					<Icon className="size-3" />
				</AvatarFallback>
			</Avatar>
			<span className="truncate">{persona.name}</span>
		</span>
	);
}

// ── Legal Dashboard ────────────────────────────────────────────────

function LegalDashboard() {
	const { data: session } = useSession();
	const [lastUpdated, setLastUpdated] = useState(formatTime());
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [data, setData] = useState<LegalDashboardData | null>(null);
	const [casesFilter, setCasesFilter] = useState<"all" | "mine">("all");

	const fetchData = useCallback(
		async (filter?: "all" | "mine") => {
			const activeFilter = filter ?? casesFilter;
			const token = session?.user?.accessToken;
			if (!token) return;

			setIsRefreshing(true);
			try {
				const res = await fetch(
					`${DASHBOARD_LEGAL_STATS_ENDPOINT}?filter=${activeFilter}`,
					{
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					},
				);
				if (res.ok) {
					const json = await res.json();
					setData(json);
				}
			} catch (err) {
				console.error("Error fetching dashboard:", err);
			} finally {
				setIsRefreshing(false);
				setLastUpdated(formatTime());
			}
		},
		[session?.user?.accessToken],
	);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const stats = data?.stats ?? {
		totalCases: 0,
		pendingDeadlines7Days: 0,
		pendingTasks: 0,
		upcomingEvents7Days: 0,
	};
	const myDay = data?.myDay ?? {
		clear: true,
		deadlines: [],
		events: [],
		tasks: [],
		calendarEvents: [],
	};
	const recentCases = data?.recentCases ?? [];
	const urgentDeadlines = data?.urgentDeadlines ?? [];
	const upcomingEvents = data?.upcomingEvents ?? [];
	const isRepresentative = data?.isRepresentative ?? false;

	const handleFilterChange = (filter: "all" | "mine") => {
		setCasesFilter(filter);
		fetchData(filter);
	};

	if (!data) return <LegalDashboardSkeleton />;

	return (
		<div className="flex flex-col gap-6">
			<DashboardGreetingHeader
				subtitle={
					<>
						Hoy tienes{" "}
						<span
							className={
								stats.pendingDeadlines7Days > 0
									? "text-amber-600 font-medium"
									: ""
							}
						>
							{stats.pendingDeadlines7Days} plazos próximos
						</span>{" "}
						y{" "}
						<span
							className={
								stats.pendingTasks > 0 ? "text-primary font-medium" : ""
							}
						>
							{stats.pendingTasks} tareas pendientes
						</span>
					</>
				}
				onRefresh={() => fetchData()}
				isRefreshing={isRefreshing}
				lastUpdated={lastUpdated}
			/>

			{/* Indicadores */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard
					icon={Scale}
					value={stats.totalCases}
					label="Total Casos"
					color="bg-primary"
				/>
				<StatCard
					icon={Clock}
					value={stats.pendingDeadlines7Days}
					label="Plazos (7 días)"
					color="bg-amber-500"
				/>
				<StatCard
					icon={ListChecks}
					value={stats.pendingTasks}
					label="Tareas Pendientes"
					color="bg-blue-500"
				/>
				<StatCard
					icon={CalendarDays}
					value={stats.upcomingEvents7Days}
					label="Audiencias (7 días)"
					color="bg-emerald-500"
				/>
			</div>

			{/* Cada tarjeta crece por su lado: ninguna se estira para igualar a la de
			    al lado. */}
			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
				{/* Mi Día y Casos Recientes: lado a lado en pantallas anchas, para que
				    la home entre casi sin scroll; cada una con su propio alto. */}
				<div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:col-span-2 xl:grid-cols-2">
					<Card className="gap-3">
						<CardHeader>
							<div className="flex items-center gap-2">
								<CalendarDays className="size-5 text-muted-foreground" />
								<CardTitle className="text-base">Mi Día</CardTitle>
							</div>
							<CardDescription>Plazos, tareas y audiencias de hoy</CardDescription>
						</CardHeader>
						<CardContent>
							{myDay.clear ? (
								<div className="flex flex-col items-center justify-center py-4">
									<CheckCircle2 className="size-8 text-emerald-400 mb-2" />
									<p className="text-sm font-medium">¡Todo despejado hoy!</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										No tienes plazos, tareas ni audiencias pendientes
									</p>
								</div>
							) : (
								<ul className="divide-y divide-border/70">
									{myDay.deadlines.map((d) => (
										<FilaDelDia
											key={`d-${d.id}`}
											icon={Clock}
											tono="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
											titulo={d.title}
											detalle={[d.case?.title ?? "Sin causa", d.dueTime]}
										/>
									))}
									{myDay.events.map((e) => (
										<FilaDelDia
											key={`e-${e.id}`}
											icon={CalendarDays}
											tono="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
											titulo={e.title}
											detalle={[e.case?.title ?? "Sin causa", e.time, e.location]}
										/>
									))}
									{myDay.tasks.map((t) => (
										<FilaDelDia
											key={`t-${t.id}`}
											icon={ListChecks}
											tono="bg-primary/10 text-primary"
											titulo={t.title}
											detalle={[t.priority, t.status]}
										/>
									))}
									{myDay.calendarEvents.map((ce) => (
										<FilaDelDia
											key={`ce-${ce.id}`}
											icon={CalendarDays}
											tono="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
											titulo={ce.title}
											detalle={[
												"Evento",
												ce.allDay
													? "todo el día"
													: ce.start &&
														new Date(ce.start).toLocaleTimeString("es-AR", {
															hour: "2-digit",
															minute: "2-digit",
															timeZone: "UTC",
														}),
												ce.responsiblePerson?.name,
											]}
										>
											{ce.meetLink && (
												<a
													href={ce.meetLink}
													target="_blank"
													rel="noopener noreferrer"
													className="shrink-0 text-xs font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 transition-colors"
												>
													Meet
												</a>
											)}
										</FilaDelDia>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					{/* Casos Recientes */}
					<Card className="@container gap-3 overflow-hidden pb-0">
						<CardHeader>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
								<div className="flex items-center gap-2">
									<Scale className="size-5 text-muted-foreground" />
									<CardTitle className="text-base">Casos Recientes</CardTitle>
								</div>
								{!isRepresentative && (
									<div className="flex rounded-lg border text-sm overflow-hidden">
										<button
											type="button"
											onClick={() => handleFilterChange("all")}
											className={`px-2.5 py-0.5 transition-colors ${casesFilter === "all" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
										>
											Todos
										</button>
										<button
											type="button"
											onClick={() => handleFilterChange("mine")}
											className={`px-2.5 py-0.5 transition-colors ${casesFilter === "mine" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
										>
											Mis casos
										</button>
									</div>
								)}
								<Link
									href="/admin/legal-cases"
									className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									Ver todos <ArrowRight className="size-4" />
								</Link>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							{recentCases.length === 0 ? (
								<div className="flex flex-col items-center justify-center pt-2 pb-6">
									<Scale className="size-8 text-muted-foreground/30 mb-2" />
									<p className="text-sm font-medium text-muted-foreground">
										No hay casos recientes
									</p>
									<p className="text-xs text-muted-foreground/60 mt-0.5">
										Los nuevos casos aparecerán aquí
									</p>
								</div>
							) : (
								<ul className="divide-y divide-border border-t">
									{recentCases.map((c) => (
										<li key={c.id}>
											<Link
												href={`/admin/legal-cases/${c.id}`}
												className="flex items-center gap-3 px-6 py-2.5 hover:bg-muted/40 transition-colors"
											>
												{/* Avatar con iniciales */}
												<div className="shrink-0 size-8 rounded-lg bg-primary/10 flex items-center justify-center">
													<span className="text-xs font-bold text-primary">
														{c.title.slice(0, 2).toUpperCase()}
													</span>
												</div>

												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<p className="text-sm font-semibold truncate" title={c.title}>
															{c.title}
														</p>
														{c.number && (
															<span className="hidden @md:inline shrink-0 text-[10px] text-muted-foreground/60 font-mono">
																#{c.number}
															</span>
														)}
														{c.createdAt && isRecentCase(c.createdAt) && (
															<span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
																Nuevo
															</span>
														)}
													</div>
													{/* El cliente solo si el título de la causa no lo nombra ya. */}
													{c.customer && !c.title.includes(c.customer.name) && (
														<p className="truncate text-xs text-muted-foreground">{c.customer.name}</p>
													)}
													<div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
														{c.internalLawyer && (
															<AbogadoDelCaso persona={c.internalLawyer} rol="Abogado interno" icon={Users2} />
														)}
														{c.responsibleLawyer && (
															<AbogadoDelCaso
																persona={c.responsibleLawyer}
																rol="Abogado representante"
																icon={Scale}
															/>
														)}
													</div>
												</div>

												<span className="shrink-0 text-xs text-muted-foreground">
													{fechaCorta(c.createdAt)}
												</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Plazos Urgentes + Próximas Audiencias */}
				<div className="flex min-w-0 flex-col gap-6">
					<Card className="gap-3">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Clock className="size-5 text-muted-foreground" />
								<CardTitle className="text-base">Plazos Urgentes</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							{urgentDeadlines.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-4">
									<CheckCircle2 className="size-8 text-emerald-400 mb-2" />
									<p className="text-sm font-medium">Sin plazos urgentes</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										No hay plazos próximos a vencer
									</p>
								</div>
							) : (
								<ul className="divide-y divide-border/70">
									{urgentDeadlines.map((d) => (
										<FilaDelDia
											key={d.id}
											icon={Clock}
											tono="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
											titulo={d.title}
											detalle={[
												d.dueDate
													? new Date(d.dueDate).toLocaleDateString("es-AR", { timeZone: "UTC" })
													: "Sin fecha",
												d.case?.title ?? "Sin causa",
											]}
										/>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					<Card className="gap-3">
						<CardHeader>
							<div className="flex items-center gap-2">
								<CalendarDays className="size-5 text-muted-foreground" />
								<CardTitle className="text-base">
									Próximas Audiencias
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							{upcomingEvents.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-4">
									<CheckCircle2 className="size-8 text-emerald-400 mb-2" />
									<p className="text-sm font-medium">Sin audiencias</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										No hay audiencias programadas
									</p>
								</div>
							) : (
								<ul className="divide-y divide-border/70">
									{upcomingEvents.map((e) => (
										<FilaDelDia
											key={e.id}
											icon={CalendarDays}
											tono="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
											titulo={e.title}
											detalle={[
												e.date
													? new Date(e.date).toLocaleDateString("es-AR", { timeZone: "UTC" })
													: "Sin fecha",
												e.time,
												e.case?.title ?? "Sin causa",
												e.location,
											]}
										/>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			<MiCajaWidget />
		</div>
	);
}

// ── Sales Dashboard ────────────────────────────────────────────────

function SalesDashboard() {
	return (
		<div className="flex flex-col gap-6">
			<DashboardGreetingHeader />
			<SalesOverview />
			{/* Mismo armado que el panel legal: columna principal (lo que hay que
			    hacer y los gráficos anchos) y columna lateral, cada una con su alto. */}
			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
				<div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
					<EventosPorConfirmar />
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<SalesPerformance />
						<SalesConversion />
					</div>
					<SalesSource />
				</div>
				<div className="flex min-w-0 flex-col gap-6">
					<SalesLead />
					<SalesLocation />
				</div>
			</div>
			<MiCajaWidget />
		</div>
	);
}
