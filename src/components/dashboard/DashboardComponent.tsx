"use client";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	CalendarDays,
	CheckCircle2,
	ChevronRight,
	Clock,
	ListChecks,
	MapPin,
	Scale,
	Users2,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DASHBOARD_LEGAL_STATS_ENDPOINT } from "@/constant/api-endpoints";
import { SUPERADMIN } from "@/constant/menu";
import { Role } from "@/constant/user";
import AccountingDashboard from "./AccountingDashboard";
import DashboardGreetingHeader from "./DashboardGreetingHeader";
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

// ── Tipos de alerta ─────────────────────────────────────────────────

interface DashboardAlert {
	id: number;
	title: string;
	assignedTo: string;
}

const MOCK_ALERTS: DashboardAlert[] = [
	{ id: 1, title: "test", assignedTo: "Jonatan" },
];

// ── Alertas urgentes ────────────────────────────────────────────────

function UrgentAlerts() {
	const alerts = MOCK_ALERTS;
	if (alerts.length === 0) return null;

	return (
		<Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
			<CardContent className="p-4">
				<div className="flex items-center gap-2 mb-2">
					<AlertTriangle className="size-4 text-red-500" />
					<span className="text-sm font-semibold text-red-600 dark:text-red-400">
						{alerts.length}{" "}
						{alerts.length === 1 ? "alerta urgente" : "alertas urgentes"}
					</span>
				</div>
				<ul className="space-y-1">
					{alerts.map((alert) => (
						<li
							key={alert.id}
							className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300"
						>
							<span className="font-medium">{alert.title}</span>
							<span className="text-red-400 dark:text-red-500">
								· {alert.assignedTo}
							</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

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

	const baseDashboard =
		dashboardType === "sales" ? <SalesDashboard /> : <LegalDashboard />;

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
		internalLawyer: { id: number; name: string } | null;
		responsibleLawyer: { id: number; name: string } | null;
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

			{/* Mi Día + Stats */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
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

				<div className="grid grid-cols-2 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Card key={i}>
							<CardContent className="flex flex-col items-center justify-center p-5 gap-2">
								<Skeleton className="size-10 rounded-full" />
								<Skeleton className="h-7 w-12" />
								<Skeleton className="h-3 w-20" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			{/* Casos Recientes + Plazos/Audiencias */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
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

				<div className="flex flex-col gap-4">
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
		<Card className="hover:shadow-md transition-shadow">
			<CardContent className="flex flex-col items-center justify-center p-5 gap-1">
				<div className={`rounded-xl p-2.5 ${color} mb-1`}>
					<Icon className="size-5 text-white" />
				</div>
				<span className="text-2xl font-bold tracking-tight">{value}</span>
				<span className="text-xs text-muted-foreground">{label}</span>
			</CardContent>
		</Card>
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

			<UrgentAlerts />

			{/* Mi Día + Stats */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<div className="flex items-center gap-2">
							<CalendarDays className="size-5 text-muted-foreground" />
							<CardTitle className="text-base">Mi Día</CardTitle>
						</div>
						<CardDescription>
							Plazos, tareas y audiencias de hoy
						</CardDescription>
					</CardHeader>
					<CardContent>
						{myDay.clear ? (
							<div className="flex flex-col items-center justify-center py-8">
								<CheckCircle2 className="size-12 text-emerald-400 mb-3" />
								<p className="text-base font-medium">
									¡Todo despejado hoy!
								</p>
								<p className="text-sm text-muted-foreground">
									No tienes plazos, tareas ni audiencias pendientes
								</p>
							</div>
						) : (
							<ul className="space-y-3">
								{myDay.deadlines.map((d) => (
									<li
										key={`d-${d.id}`}
										className="flex items-center gap-3 text-sm rounded-lg p-2 hover:bg-muted/50 transition-colors"
									>
										<div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-1.5">
											<Clock className="size-4 text-amber-600 dark:text-amber-400" />
										</div>
										<div className="min-w-0">
											<p className="font-medium truncate">{d.title}</p>
											<p className="text-xs text-muted-foreground">
												{d.case?.title ?? "Sin causa"}
												{d.dueTime ? ` · ${d.dueTime}` : ""}
											</p>
										</div>
									</li>
								))}
								{myDay.events.map((e) => (
									<li
										key={`e-${e.id}`}
										className="flex items-center gap-3 text-sm rounded-lg p-2 hover:bg-muted/50 transition-colors"
									>
										<div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-1.5">
											<CalendarDays className="size-4 text-blue-600 dark:text-blue-400" />
										</div>
										<div className="min-w-0">
											<p className="font-medium truncate">{e.title}</p>
											<p className="text-xs text-muted-foreground">
												{e.case?.title ?? "Sin causa"}
												{e.time ? ` · ${e.time}` : ""}
												{e.location ? ` · ${e.location}` : ""}
											</p>
										</div>
									</li>
								))}
								{myDay.tasks.map((t) => (
									<li
										key={`t-${t.id}`}
										className="flex items-center gap-3 text-sm rounded-lg p-2 hover:bg-muted/50 transition-colors"
									>
										<div className="rounded-lg bg-primary/10 p-1.5">
											<ListChecks className="size-4 text-primary" />
										</div>
										<div className="min-w-0">
											<p className="font-medium truncate">{t.title}</p>
											<p className="text-xs text-muted-foreground">
												{t.priority} · {t.status}
											</p>
										</div>
									</li>
								))}
								{myDay.calendarEvents.map((ce) => (
									<li
										key={`ce-${ce.id}`}
										className="flex items-center gap-3 text-sm rounded-xl border p-3 hover:bg-muted/40 transition-colors group"
									>
										<div className="shrink-0 size-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
											<CalendarDays className="size-5 text-purple-600 dark:text-purple-400" />
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 mb-0.5">
												<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">
													EVENTO
												</Badge>
												{ce.allDay && (
													<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
														todo el día
													</Badge>
												)}
											</div>
											<p className="font-medium truncate">{ce.title}</p>
											<p className="text-xs text-muted-foreground">
												{!ce.allDay && ce.start
													? new Date(ce.start).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
													: ""}
												{ce.responsiblePerson ? `${!ce.allDay ? " · " : ""}${ce.responsiblePerson.name}` : ""}
											</p>
										</div>
										{ce.meetLink ? (
											<a
												href={ce.meetLink}
												target="_blank"
												rel="noopener noreferrer"
												className="shrink-0 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
											>
												Meet
											</a>
										) : (
											<ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
										)}
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				{/* Stats cards */}
				<div className="grid grid-cols-2 gap-4">
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
			</div>

			{/* Casos Recientes + Plazos/Audiencias */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Casos Recientes */}
				<div className="lg:col-span-2">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-4">
							<h2 className="text-lg font-semibold tracking-tight">
								Casos Recientes
							</h2>
							{!isRepresentative && (
								<div className="flex rounded-lg border text-sm overflow-hidden">
									<button
										type="button"
										onClick={() => handleFilterChange("all")}
										className={`px-3 py-1 transition-colors ${casesFilter === "all" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
									>
										Todos
									</button>
									<button
										type="button"
										onClick={() => handleFilterChange("mine")}
										className={`px-3 py-1 transition-colors ${casesFilter === "mine" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
									>
										Mis casos
									</button>
								</div>
							)}
						</div>
						<Link
							href="/admin/legal-cases"
							className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Ver todos <ArrowRight className="size-4" />
						</Link>
					</div>
					<Card>
						<CardContent className="p-0">
							{recentCases.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10">
									<Scale className="size-9 text-muted-foreground/30 mb-3" />
									<p className="text-sm font-medium text-muted-foreground">
										No hay casos recientes
									</p>
									<p className="text-xs text-muted-foreground/60 mt-0.5">
										Los nuevos casos aparecerán aquí
									</p>
								</div>
							) : (
								<ul className="divide-y divide-border">
									{recentCases.map((c) => (
										<li key={c.id}>
											<Link
												href={`/admin/legal-cases/${c.id}`}
												className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 transition-colors group"
											>
												{/* Avatar con iniciales */}
												<div className="shrink-0 size-9 rounded-lg bg-primary/10 flex items-center justify-center">
													<span className="text-xs font-bold text-primary">
														{c.title.slice(0, 2).toUpperCase()}
													</span>
												</div>

												{/* Contenido */}
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-0.5">
														<p className="text-sm font-semibold truncate">
															{c.title}
														</p>
														{c.number && (
															<span className="shrink-0 text-[10px] text-muted-foreground/60 font-mono">
																#{c.number}
															</span>
														)}
														{c.createdAt && isRecentCase(c.createdAt) && (
															<span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
																Nuevo
															</span>
														)}
													</div>
													{c.customer && (
														<p className="text-xs text-muted-foreground truncate mb-1.5">
															{c.customer.name}
														</p>
													)}
													<div className="flex items-center gap-3 flex-wrap">
														{c.internalLawyer && (
															<span className="flex items-center gap-1 text-xs text-muted-foreground">
																<Users2 className="size-3 shrink-0" />
																{c.internalLawyer.name}
															</span>
														)}
														{c.responsibleLawyer && (
															<span className="flex items-center gap-1 text-xs text-muted-foreground">
																<Scale className="size-3 shrink-0" />
																{c.responsibleLawyer.name}
															</span>
														)}
														{c.files[0] && (
															<span className="flex items-center gap-1 text-xs text-muted-foreground">
																<Activity className="size-3 shrink-0" />
																{c.files[0].title}
															</span>
														)}
													</div>
												</div>

												{/* Fecha + flecha */}
												<div className="flex flex-col items-end gap-1.5 shrink-0">
													<span className="text-xs text-muted-foreground">
														{(() => {
														try {
															const d = new Date(c.createdAt);
															return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
														} catch { return "—"; }
													})()}
													</span>
													<ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
												</div>
											</Link>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Plazos Urgentes + Próximas Audiencias */}
				<div className="flex flex-col gap-4">
					<Card>
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
								<ul className="space-y-3">
									{urgentDeadlines.map((d) => (
										<li
											key={d.id}
											className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-muted/50 transition-colors"
										>
											<div className="size-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">
													{d.title}
												</p>
												<p className="text-xs text-muted-foreground">
													{d.case?.title ?? "Sin causa"} ·{" "}
													{d.dueDate ? new Date(d.dueDate).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "Sin fecha"}
												</p>
											</div>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					<Card>
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
								<ul className="space-y-3">
									{upcomingEvents.map((e) => (
										<li
											key={e.id}
											className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-muted/50 transition-colors"
										>
											<div className="size-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">
													{e.title}
												</p>
												<p className="text-xs text-muted-foreground">
													{e.case?.title ?? "Sin causa"} ·{" "}
													{e.date ? new Date(e.date).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "Sin fecha"}
													{e.time ? ` · ${e.time}` : ""}
												</p>
												{e.location && (
													<p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
														<MapPin className="size-3" /> {e.location}
													</p>
												)}
											</div>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

// ── Sales Dashboard ────────────────────────────────────────────────

function SalesDashboard() {
	return (
		<div className="flex flex-col gap-6">
			<DashboardGreetingHeader />
			<UrgentAlerts />
			<SalesOverview />
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SalesPerformance />
				<SalesConversion />
			</div>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<SalesLead />
				<SalesSource />
				<SalesLocation />
			</div>
		</div>
	);
}
