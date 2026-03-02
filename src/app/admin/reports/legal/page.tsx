"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { ApexOptions } from "apexcharts"
import { useSession } from "next-auth/react"
import { STATISTICS_LEGAL_OVERVIEW_ENDPOINT } from "@/constant/api-endpoints"
import {
    Briefcase,
    FileText,
    Archive,
    Scale,
    UserX,
    TrendingUp,
    Trophy,
    Medal,
    Award,
} from "lucide-react"

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface StatsCards {
    totalCases: number
    activeCases: number
    closingCases: number
    archivedCases: number
    totalFiles: number
    unassignedCases: number
}

interface FileByProcessType {
    typeProcessId: number
    label: string
    count: number
}

interface LawyerStat {
    id: number
    name: string
    email: string
    count: number
}

interface CaseByStatus {
    status: string
    count: number
}

interface MonthlyItem {
    month: string
    label: string
    count: number
}

interface FileByType {
    filetype: string
    count: number
}

interface LegalData {
    statsCards: StatsCards
    filesByProcessType: FileByProcessType[]
    casesByLawyer: LawyerStat[]
    casesByStatus: CaseByStatus[]
    monthlyTrend: MonthlyItem[]
    filesByType: FileByType[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
    IN_PROGRESS: "En Curso",
    CLOSED: "Cerrada",
    ARCHIVED: "Archivada",
    PENDING: "Pendiente",
    ACTIVE: "Activa",
    SUSPENDED: "Suspendida",
    FINISHED: "Finalizada",
}

const STATUS_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
]

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"]

// ── Componente ─────────────────────────────────────────────────────────────────

export default function LegalReportsPage() {
    const { data: session } = useSession()
    const [data, setData] = useState<LegalData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!session?.user?.accessToken) return
        setLoading(true)
        fetch(STATISTICS_LEGAL_OVERVIEW_ENDPOINT, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.user.accessToken}`,
            },
            cache: "no-store",
        })
            .then((r) => {
                if (!r.ok) throw new Error(`Error ${r.status}`)
                return r.json()
            })
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false))
    }, [session?.user?.accessToken])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center h-64 text-red-500 text-sm">
                Error al cargar estadísticas: {error}
            </div>
        )
    }

    const { statsCards, filesByProcessType, casesByLawyer, casesByStatus, monthlyTrend, filesByType } = data

    // ── Series de gráficos ──────────────────────────────────────────────────────

    const trendOptions: ApexOptions = {
        chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false } },
        stroke: { curve: "smooth", width: 2 },
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
        colors: ["#3b82f6"],
        xaxis: {
            categories: monthlyTrend.map((m) => m.label),
            labels: { style: { fontSize: "11px" } },
        },
        yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
        tooltip: { y: { formatter: (v) => `${v} causas` } },
        grid: { strokeDashArray: 4, borderColor: "#e5e7eb" },
        dataLabels: { enabled: false },
    }
    const trendSeries = [{ name: "Causas creadas", data: monthlyTrend.map((m) => m.count) }]

    const fileTypeOptions: ApexOptions = {
        chart: { type: "donut" },
        labels: filesByType.map((f) => f.filetype),
        colors: ["#3b82f6", "#10b981", "#f59e0b"],
        legend: { position: "bottom", fontSize: "12px" },
        dataLabels: { formatter: (v: number) => `${v.toFixed(1)}%` },
        plotOptions: { pie: { donut: { size: "65%" } } },
        tooltip: { y: { formatter: (v) => `${v} expedientes` } },
    }
    const fileTypeSeries = filesByType.map((f) => f.count)

    const processTypeOptions: ApexOptions = {
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "70%" } },
        colors: ["#3b82f6"],
        xaxis: { labels: { style: { fontSize: "11px" } } },
        yaxis: {
            labels: {
                style: { fontSize: "10px" },
                formatter: (v: any) => {
                    const s = String(v)
                    return s.length > 32 ? s.substring(0, 30) + "…" : s
                },
            },
        },
        grid: { strokeDashArray: 4, borderColor: "#e5e7eb" },
        dataLabels: { enabled: true, style: { fontSize: "11px" } },
        tooltip: { y: { formatter: (v) => `${v} expedientes` } },
    }
    const processTypeSeries = [{
        name: "Expedientes",
        data: filesByProcessType.map((f) => ({ x: f.label, y: f.count })),
    }]

    const lawyerOptions: ApexOptions = {
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", distributed: true } },
        colors: CHART_COLORS,
        xaxis: {
            categories: casesByLawyer.map((l) => l.name.split(" ")[0]),
            labels: { style: { fontSize: "11px" } },
        },
        yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
        legend: { show: false },
        dataLabels: { enabled: true, style: { fontSize: "11px" } },
        grid: { strokeDashArray: 4, borderColor: "#e5e7eb" },
        tooltip: {
            custom: ({ dataPointIndex }: any) => {
                const l = casesByLawyer[dataPointIndex]
                return `<div class="px-3 py-2 text-sm"><b>${l.name}</b><br/>${l.count} causas</div>`
            },
        },
    }
    const lawyerSeries = [{ name: "Causas", data: casesByLawyer.map((l) => l.count) }]

    const statusOptions: ApexOptions = {
        chart: { type: "donut" },
        labels: casesByStatus.map((s) => STATUS_LABELS[s.status] ?? s.status),
        colors: STATUS_COLORS,
        legend: { position: "bottom", fontSize: "12px" },
        dataLabels: { formatter: (v: number) => `${v.toFixed(1)}%` },
        plotOptions: { pie: { donut: { size: "65%" } } },
        tooltip: { y: { formatter: (v) => `${v} causas` } },
    }
    const statusSeries = casesByStatus.map((s) => s.count)

    // ── Podio top 3 abogados ────────────────────────────────────────────────────
    const top3 = casesByLawyer.slice(0, 3)
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3
    const podiumIcons = [
        <Medal className="h-6 w-6 text-gray-400" />,
        <Trophy className="h-7 w-7 text-yellow-400" />,
        <Award className="h-6 w-6 text-amber-600" />,
    ]
    const podiumHeights = ["h-20", "h-28", "h-16"]
    const podiumColors = ["bg-gray-100", "bg-yellow-50 ring-2 ring-yellow-300", "bg-amber-50"]

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Reporte de Causas Legales
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Estadísticas generales del área legal
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    icon={<Scale className="h-5 w-5 text-blue-600" />}
                    bg="bg-blue-50"
                    label="Causas Totales"
                    value={statsCards.totalCases}
                />
                <StatCard
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    bg="bg-green-50"
                    label="Causas Activas"
                    value={statsCards.activeCases}
                />
                <StatCard
                    icon={<Briefcase className="h-5 w-5 text-amber-600" />}
                    bg="bg-amber-50"
                    label="En Cierre"
                    value={statsCards.closingCases}
                />
                <StatCard
                    icon={<Archive className="h-5 w-5 text-gray-500" />}
                    bg="bg-gray-100"
                    label="Archivadas"
                    value={statsCards.archivedCases}
                />
                <StatCard
                    icon={<FileText className="h-5 w-5 text-purple-600" />}
                    bg="bg-purple-50"
                    label="Expedientes"
                    value={statsCards.totalFiles}
                />
                <StatCard
                    icon={<UserX className="h-5 w-5 text-red-500" />}
                    bg="bg-red-50"
                    label="Sin Abogado"
                    value={statsCards.unassignedCases}
                />
            </div>

            {/* Tendencia mensual + Tipo de expediente */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                        Tendencia de Causas — Últimos 12 meses
                    </h3>
                    <ApexChart
                        type="area"
                        options={trendOptions}
                        series={trendSeries}
                        height={220}
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                        Expedientes por Tipo
                    </h3>
                    {filesByType.length > 0 ? (
                        <ApexChart
                            type="donut"
                            options={fileTypeOptions}
                            series={fileTypeSeries}
                            height={220}
                        />
                    ) : (
                        <EmptyState />
                    )}
                </div>
            </div>

            {/* Expedientes por Tipo de Proceso */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Expedientes por Tipo de Proceso
                </h3>
                {filesByProcessType.length > 0 ? (
                    <ApexChart
                        type="bar"
                        options={processTypeOptions}
                        series={processTypeSeries}
                        height={Math.max(280, filesByProcessType.length * 36)}
                    />
                ) : (
                    <EmptyState />
                )}
            </div>

            {/* Ranking de Abogados + Estado de Causas */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Ranking */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-5">
                        Ranking de Abogados por Causas Asignadas
                    </h3>

                    {/* Podio top 3 */}
                    {top3.length >= 2 && (
                        <div className="flex items-end justify-center gap-3 mb-6">
                            {podiumOrder.map((lawyer, idx) => {
                                const rank = podiumOrder.indexOf(lawyer) === 1 ? 1 : podiumOrder.indexOf(lawyer) === 0 ? 2 : 3
                                return (
                                    <div key={lawyer.id} className="flex flex-col items-center gap-1 flex-1 max-w-[120px]">
                                        {podiumIcons[rank - 1]}
                                        <div className={`w-full rounded-t-lg ${podiumHeights[rank - 1]} ${podiumColors[rank - 1]} flex items-center justify-center flex-col`}>
                                            <span className="text-lg font-bold text-gray-800">
                                                {lawyer.count}
                                            </span>
                                        </div>
                                        <span className="text-xs text-center font-medium text-gray-600 leading-tight">
                                            {lawyer.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400">#{rank}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Tabla completa */}
                    {casesByLawyer.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left pb-2 text-xs font-semibold text-gray-400 w-8">#</th>
                                        <th className="text-left pb-2 text-xs font-semibold text-gray-400">Abogado</th>
                                        <th className="text-right pb-2 text-xs font-semibold text-gray-400">Causas</th>
                                        <th className="text-right pb-2 text-xs font-semibold text-gray-400 pr-1">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {casesByLawyer.map((lawyer, idx) => (
                                        <tr key={lawyer.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-2 text-xs text-gray-400">{idx + 1}</td>
                                            <td className="py-2">
                                                <span className="font-medium text-gray-700">{lawyer.name}</span>
                                                {lawyer.email && (
                                                    <span className="block text-xs text-gray-400">{lawyer.email}</span>
                                                )}
                                            </td>
                                            <td className="py-2 text-right font-semibold text-gray-800">
                                                {lawyer.count}
                                            </td>
                                            <td className="py-2 text-right text-xs text-gray-500 pr-1">
                                                {statsCards.totalCases > 0
                                                    ? ((lawyer.count / statsCards.totalCases) * 100).toFixed(1)
                                                    : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState />
                    )}
                </div>

                {/* Estado de causas */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                        Distribución por Estado
                    </h3>
                    {casesByStatus.length > 0 ? (
                        <>
                            <ApexChart
                                type="donut"
                                options={statusOptions}
                                series={statusSeries}
                                height={260}
                            />
                            <div className="mt-4 space-y-2">
                                {casesByStatus.map((s, idx) => (
                                    <div key={s.status} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }}
                                            />
                                            <span className="text-gray-600">
                                                {STATUS_LABELS[s.status] ?? s.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-gray-800">{s.count}</span>
                                            <span className="text-xs text-gray-400 w-12 text-right">
                                                {statsCards.totalCases > 0
                                                    ? ((s.count / statsCards.totalCases) * 100).toFixed(1)
                                                    : 0}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState />
                    )}
                </div>
            </div>

            {/* Gráfico de barras abogados */}
            {casesByLawyer.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                        Causas por Abogado
                    </h3>
                    <ApexChart
                        type="bar"
                        options={lawyerOptions}
                        series={lawyerSeries}
                        height={260}
                    />
                </div>
            )}
        </div>
    )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function StatCard({
    icon,
    bg,
    label,
    value,
}: {
    icon: React.ReactNode
    bg: string
    label: string
    value: number
}) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
            <div className={`${bg} rounded-lg p-2.5 shrink-0`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{label}</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{value.toLocaleString("es-AR")}</p>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            Sin datos disponibles
        </div>
    )
}
