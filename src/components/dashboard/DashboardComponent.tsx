"use client";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, AlertTriangle, CalendarDays, Clock, ListChecks, CheckCircle2, Scale, Users2, ArrowRight, Activity, MapPin } from "lucide-react";
import { Role } from "@/constant/user";
import SalesOverview from "./SalesOverview";
import SalesPerformance from "./SalesPerformance";
import { SalesConversion } from "./SalesConversion";
import { SalesLead } from "./SalesLead";
import { SalesSource } from "./SalesSource";
import { SalesLocation } from "./SalesLocation";
import { SUPERADMIN } from "@/constant/menu";
import { DASHBOARD_LEGAL_STATS_ENDPOINT } from "@/constant/api-endpoints";

// ── Helpers ────────────────────────────────────────────────────────

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
}

function formatDate(): string {
    return new Date()
        .toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        .replace(/^\w/, (c) => c.toUpperCase());
}

function formatTime(): string {
    return new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

function isRecentCase(createdAt: string): boolean {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // últimos 7 días
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

// TODO: Reemplazar con fetch real cuando se creen las alertas
const MOCK_ALERTS: DashboardAlert[] = [
    { id: 1, title: "test", assignedTo: "Jonatan" },
];

// ── Alertas urgentes ────────────────────────────────────────────────

function UrgentAlerts() {
    const alerts = MOCK_ALERTS;

    if (alerts.length === 0) return null;

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4">
            <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {alerts.length} {alerts.length === 1 ? "alerta urgente" : "alertas urgentes"}
                </span>
            </div>
            <ul className="space-y-1">
                {alerts.map((alert) => (
                    <li key={alert.id} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                        <span className="font-medium">{alert.title}</span>
                        <span className="text-red-400 dark:text-red-500">· {alert.assignedTo}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Component ──────────────────────────────────────────────────────

export default function DashboardComponent() {
    const { data: session } = useSession();
    const userRole = session?.user?.roleDetails?.name;

    const dashboardType = useMemo(() => {
        if (!userRole) return "default";
        if (legalRoles.includes(userRole)) return "legal";
        if (salesRoles.includes(userRole)) return "sales";
        return "default";
    }, [userRole]);

    if (dashboardType === "sales") {
        return <SalesDashboard />;
    }

    return <LegalDashboard />;
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
        deadlines: { id: number; title: string; dueDate: string; dueTime?: string; case: { id: number; title: string } }[];
        events: { id: number; title: string; date: string; time?: string; type: number; location?: string; case: { id: number; title: string } }[];
        tasks: { id: number; title: string; status: string; priority: string; dueDate: string }[];
    };
    recentCases: {
        id: number; title: string; number: number; status: string; createdAt: string;
        customer: { id: number; name: string } | null;
        internalLawyer: { id: number; name: string } | null;
        responsibleLawyer: { id: number; name: string } | null;
        files: { id: number; title: string }[];
    }[];
    urgentDeadlines: { id: number; title: string; dueDate: string; dueTime?: string; status: string; case: { id: number; title: string } }[];
    upcomingEvents: { id: number; title: string; date: string; time?: string; type: number; location?: string; case: { id: number; title: string } }[];
    isRepresentative: boolean;
}

// ── Skeleton ──────────────────────────────────────────────────────

function Pulse({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

function LegalDashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <Pulse className="h-7 w-48" />
                    <Pulse className="h-4 w-64" />
                    <Pulse className="h-4 w-56" />
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Pulse className="h-8 w-28 rounded-lg" />
                    <Pulse className="h-3 w-16" />
                </div>
            </div>

            {/* Mi Día + Stats */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Mi Día */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <Pulse className="h-5 w-5 rounded" />
                        <Pulse className="h-5 w-20" />
                    </div>
                    <Pulse className="h-4 w-52 mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Pulse className="h-4 w-4 rounded shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <Pulse className="h-4 w-3/4" />
                                    <Pulse className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-4 gap-2">
                            <Pulse className="h-8 w-8 rounded-full" />
                            <Pulse className="h-7 w-10" />
                            <Pulse className="h-3 w-20" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Casos Recientes + Plazos/Audiencias */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Casos Recientes */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <Pulse className="h-6 w-40" />
                        <Pulse className="h-5 w-20" />
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 divide-y divide-gray-100 dark:divide-gray-800">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="p-4 space-y-2">
                                <Pulse className="h-4 w-2/3" />
                                <Pulse className="h-3 w-1/3" />
                                <div className="flex gap-4">
                                    <Pulse className="h-3 w-24" />
                                    <Pulse className="h-3 w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plazos Urgentes + Próximas Audiencias */}
                <div className="flex flex-col gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Pulse className="h-5 w-5 rounded" />
                                <Pulse className="h-5 w-36" />
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((j) => (
                                    <div key={j} className="flex items-start gap-2">
                                        <Pulse className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                                        <div className="space-y-1.5 flex-1">
                                            <Pulse className="h-4 w-3/4" />
                                            <Pulse className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Legal Dashboard ────────────────────────────────────────────────

function LegalDashboard() {
    const { data: session } = useSession();
    const [lastUpdated, setLastUpdated] = useState(formatTime());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [data, setData] = useState<LegalDashboardData | null>(null);
    const [casesFilter, setCasesFilter] = useState<"all" | "mine">("all");

    const fetchData = useCallback(async (filter?: "all" | "mine") => {
        const activeFilter = filter ?? casesFilter;
        const token = session?.user?.accessToken;
        if (!token) return;

        setIsRefreshing(true);
        try {
            const res = await fetch(`${DASHBOARD_LEGAL_STATS_ENDPOINT}?filter=${activeFilter}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
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
    }, [session?.user?.accessToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const stats = data?.stats ?? { totalCases: 0, pendingDeadlines7Days: 0, pendingTasks: 0, upcomingEvents7Days: 0 };
    const myDay = data?.myDay ?? { clear: true, deadlines: [], events: [], tasks: [] };
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
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {getGreeting()}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Hoy tienes{" "}
                        <span className={stats.pendingDeadlines7Days > 0 ? "text-amber-600 font-medium" : "text-gray-500"}>
                            {stats.pendingDeadlines7Days} plazos próximos
                        </span>{" "}
                        y{" "}
                        <span className={stats.pendingTasks > 0 ? "text-blue-600 font-medium" : "text-gray-500"}>
                            {stats.pendingTasks} tareas pendientes
                        </span>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={() => fetchData()}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                        Actualizar
                    </button>
                    <span className="text-xs text-gray-400">{lastUpdated}</span>
                </div>
            </div>

            <UrgentAlerts />

            {/* Mi Día + Stats */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Mi Día */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarDays className="h-5 w-5 text-gray-500" />
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Mi Día</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Plazos, tareas y audiencias de hoy
                    </p>

                    {myDay.clear ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
                            <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                                ¡Todo despejado hoy!
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                No tienes plazos, tareas ni audiencias pendientes
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {myDay.deadlines.map((d) => (
                                <li key={`d-${d.id}`} className="flex items-center gap-3 text-sm">
                                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{d.title}</p>
                                        <p className="text-xs text-gray-400">{d.case.title}{d.dueTime ? ` · ${d.dueTime}` : ""}</p>
                                    </div>
                                </li>
                            ))}
                            {myDay.events.map((e) => (
                                <li key={`e-${e.id}`} className="flex items-center gap-3 text-sm">
                                    <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{e.title}</p>
                                        <p className="text-xs text-gray-400">
                                            {e.case.title}{e.time ? ` · ${e.time}` : ""}{e.location ? ` · ${e.location}` : ""}
                                        </p>
                                    </div>
                                </li>
                            ))}
                            {myDay.tasks.map((t) => (
                                <li key={`t-${t.id}`} className="flex items-center gap-3 text-sm">
                                    <ListChecks className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                                        <p className="text-xs text-gray-400">{t.priority} · {t.status}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-4">
                        <Scale className="h-8 w-8 text-blue-500 mb-2" />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCases}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total Casos</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-4">
                        <Clock className="h-8 w-8 text-amber-500 mb-2" />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingDeadlines7Days}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Plazos (7 días)</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-4">
                        <ListChecks className="h-8 w-8 text-blue-500 mb-2" />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingTasks}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tareas Pendientes</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-4">
                        <CalendarDays className="h-8 w-8 text-green-500 mb-2" />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.upcomingEvents7Days}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Audiencias (7 días)</span>
                    </div>
                </div>
            </div>

            {/* Casos Recientes + Plazos/Audiencias */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Casos Recientes */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Casos Recientes</h2>
                            {!isRepresentative && (
                                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 text-sm overflow-hidden">
                                    <button
                                        onClick={() => handleFilterChange("all")}
                                        className={`px-3 py-1 ${casesFilter === "all" ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange("mine")}
                                        className={`px-3 py-1 ${casesFilter === "mine" ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                    >
                                        Mis casos
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            Ver todos <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3">
                        {recentCases.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Scale className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                                <p className="text-sm text-gray-400 dark:text-gray-500">No hay casos recientes</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {recentCases.map((c) => (
                                    <li key={c.id} className="flex items-center justify-between p-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                                                {isRecentCase(c.createdAt) && (
                                                    <span className="rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                                                        Nuevo
                                                    </span>
                                                )}
                                            </div>
                                            {c.customer && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {c.customer.name}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 mt-1">
                                                {c.internalLawyer && (
                                                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                                        <Users2 className="h-3.5 w-3.5" /> {c.internalLawyer.name}
                                                    </span>
                                                )}
                                                {c.responsibleLawyer && (
                                                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                                        <Scale className="h-3.5 w-3.5" /> {c.responsibleLawyer.name}
                                                    </span>
                                                )}
                                                {c.files[0] && (
                                                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                                        <Activity className="h-3.5 w-3.5" /> {c.files[0].title}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Plazos Urgentes + Próximas Audiencias */}
                <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="h-5 w-5 text-gray-500" />
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Plazos Urgentes</h3>
                        </div>
                        {urgentDeadlines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sin plazos urgentes</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No hay plazos próximos a vencer</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {urgentDeadlines.map((d) => (
                                    <li key={d.id} className="flex items-start gap-2">
                                        <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.title}</p>
                                            <p className="text-xs text-gray-400">{d.case.title} · {new Date(d.dueDate).toLocaleDateString("es-AR")}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarDays className="h-5 w-5 text-gray-500" />
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Próximas Audiencias</h3>
                        </div>
                        {upcomingEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sin audiencias</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No hay audiencias programadas</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {upcomingEvents.map((e) => (
                                    <li key={e.id} className="flex items-start gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.title}</p>
                                            <p className="text-xs text-gray-400">
                                                {e.case.title} · {new Date(e.date).toLocaleDateString("es-AR")}{e.time ? ` · ${e.time}` : ""}
                                            </p>
                                            {e.location && (
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {e.location}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sales Dashboard ────────────────────────────────────────────────

function SalesDashboard() {
    return (
        <div className="flex flex-col gap-6">
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
