"use client"

import { Modal } from "@/components/ui/modal/Modal"
import Badge from "@/components/ui/badge/Badge"
import { X, Calendar, Briefcase, User, Scale, DollarSign, FileText, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { ClosingManagerEntry } from "@/types/closing-manager"
import { closingType, closingTypeColors, statusCapital, statusCapitalColor, statusData, statusColors } from "@/constant/closing-manager"
import { cn } from "@/lib/utils"

interface ViewClosingModalProps {
    closing: ClosingManagerEntry | null
    isOpen: boolean
    onClose: () => void
}

const formatCurrency = (amount: number | null | undefined) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(amount ?? 0)

const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-"
    return `${Number(value) % 1 === 0 ? Number(value).toFixed(0) : Number(value).toFixed(2)}%`
}

export default function ViewClosingModal({ closing, isOpen, onClose }: ViewClosingModalProps) {
    if (!closing) return null

    const montoPositivo = closing.montoTransferir >= 0

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl mx-4" showCloseButton={false}>
            <div className="max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-brand-500 to-brand-600 rounded-t-3xl px-6 pt-6 pb-5">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                            <Scale className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-white truncate">{closing.case?.title || "Cierre"}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge size="sm" className={cn("text-xs", closingTypeColors[closing.type] || "bg-white/20 text-white")}>
                                    {closingType[closing.type] || closing.type}
                                </Badge>
                                <span className="text-white/70 text-sm flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(closing.date)}
                                </span>
                                {closing.case?.number && (
                                    <span className="text-white/70 text-sm">Exp. {closing.case.number}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Monto a Transferir destacado */}
                    <div className={cn(
                        "mt-5 rounded-xl px-5 py-4 backdrop-blur-sm",
                        montoPositivo ? "bg-white/15" : "bg-red-500/30"
                    )}>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Monto a Transferir a Legalistas</p>
                        <div className="flex items-center gap-2">
                            {montoPositivo
                                ? <ArrowUpRight className="h-6 w-6 text-green-300" />
                                : <ArrowDownRight className="h-6 w-6 text-red-300" />
                            }
                            <span className={cn("text-3xl font-bold", montoPositivo ? "text-white" : "text-red-200")}>
                                {formatCurrency(closing.montoTransferir)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5 bg-white rounded-b-3xl">

                    {/* Info general */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <InfoCard icon={<User className="h-4 w-4" />} label="Representante" value={closing.case?.responsibleLawyer?.name || "-"} />
                        <InfoCard icon={<Briefcase className="h-4 w-4" />} label="Abogado Interno" value={closing.case?.internalLawyer?.name || "-"} />
                        <InfoCard icon={<DollarSign className="h-4 w-4" />} label="Capital" value={formatCurrency(closing.capitalAmount)} />
                    </div>

                    {/* Estados */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Estado Capital</p>
                            <Badge size="sm" className={cn("text-xs", statusCapitalColor[closing.capitalState] || "")}>
                                {statusCapital[closing.capitalState] || "-"}
                            </Badge>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Estado Honorarios</p>
                            <Badge size="sm" className={cn("text-xs", statusColors[closing.feeStatus] || "")}>
                                {statusData[closing.feeStatus] || "-"}
                            </Badge>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Estado PCL</p>
                            {closing.pclStatus ? (
                                <Badge size="sm" className={cn("text-xs", statusColors[closing.pclStatus] || "")}>
                                    {statusData[closing.pclStatus] || "-"}
                                </Badge>
                            ) : <span className="text-sm text-gray-400">-</span>}
                        </div>
                    </div>

                    {/* HP Section */}
                    <SectionCard
                        title="Honorarios Pactados (HP)"
                        color="blue"
                        distribution={closing.hpDistribution}
                        items={[
                            { label: "Convenido", value: formatPercent(closing.hpAgreed) },
                            { label: "Total", value: formatCurrency(closing.hpTotal), highlight: true },
                            { label: "Representante", value: formatCurrency(closing.hpRepresentante) },
                            { label: "Legalistas", value: formatCurrency(closing.hpLegalistas), bold: true },
                        ]}
                    />

                    {/* PCL Section */}
                    <SectionCard
                        title="Pacto de Cuota Litis (PCL)"
                        color="violet"
                        distribution={closing.pclDistribution}
                        items={[
                            { label: "Convenido", value: formatPercent(closing.pclAgreed) },
                            { label: "Total", value: formatCurrency(closing.pclTotal), highlight: true },
                            { label: "Representante", value: formatCurrency(closing.pclRepresentante) },
                            { label: "Legalistas", value: formatCurrency(closing.pclLegalistas), bold: true },
                        ]}
                    />

                    {/* Aportes Section */}
                    <SectionCard
                        title="Aportes"
                        color="amber"
                        distribution={closing.applyContributions}
                        distributionLabel={closing.applyContributions ? "Aplicados" : "No aplicados"}
                        items={[
                            { label: "Totales", value: formatCurrency(closing.contributionsAmount), highlight: true },
                            { label: "Representante", value: formatCurrency(closing.aportesRepresentante) },
                            { label: "Legalistas", value: formatCurrency(closing.aportesLegalistas), bold: true },
                        ]}
                    />

                    {/* Gastos + Detalle */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-[11px] font-medium text-amber-500 uppercase tracking-wider mb-1">Gastos de la Causa</p>
                            <span className="text-xl font-bold text-amber-700">
                                {closing.totalCaseExpenses ? formatCurrency(closing.totalCaseExpenses) : "-"}
                            </span>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Detalle
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {closing.detail || <span className="text-gray-400 italic">Sin detalle</span>}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-100 text-gray-400">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
            </div>
        </div>
    )
}

interface SectionItem {
    label: string
    value: string
    highlight?: boolean
    bold?: boolean
}

const sectionColors = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", title: "text-blue-700", badge: "bg-blue-100 text-blue-700", highlight: "text-blue-700" },
    violet: { bg: "bg-violet-50", border: "border-violet-200", title: "text-violet-700", badge: "bg-violet-100 text-violet-700", highlight: "text-violet-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", title: "text-amber-700", badge: "bg-amber-100 text-amber-700", highlight: "text-amber-700" },
}

function SectionCard({ title, color, distribution, distributionLabel, items }: {
    title: string
    color: "blue" | "violet" | "amber"
    distribution: boolean
    distributionLabel?: string
    items: SectionItem[]
}) {
    const c = sectionColors[color]

    return (
        <div className={cn("rounded-xl border p-4", c.bg, c.border)}>
            <div className="flex items-center justify-between mb-3">
                <h4 className={cn("text-sm font-semibold", c.title)}>{title}</h4>
                <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", c.badge)}>
                    {distributionLabel || (distribution ? "Dist. 25% Rep." : "Sin distribución")}
                </span>
            </div>
            <div className={cn("grid gap-3", items.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                {items.map((item) => (
                    <div key={item.label} className="bg-white/60 rounded-lg p-2.5">
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">{item.label}</p>
                        <p className={cn(
                            "text-sm",
                            item.bold && "font-bold text-gray-900",
                            item.highlight && cn("font-semibold", c.highlight),
                            !item.bold && !item.highlight && "font-medium text-gray-700"
                        )}>
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
