"use client";

import {
	ArrowDownRight,
	ArrowUpRight,
	Briefcase,
	Calendar,
	DollarSign,
	FileText,
	Scale,
	User,
	X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@/components/ui/sheet";
import {
	closingType,
	closingTypeColors,
	statusCapital,
	statusCapitalColor,
	statusColors,
	statusData,
} from "@/constant/closing-manager";
import { cn } from "@/lib/utils";
import type { ClosingManagerEntry } from "@/types/closing-manager";

interface ViewClosingModalProps {
	closing: ClosingManagerEntry | null;
	isOpen: boolean;
	onClose: () => void;
}

const formatCurrency = (amount: number | null | undefined) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 2,
	}).format(amount ?? 0);

const formatDate = (dateString: string) => {
	const d = new Date(dateString);
	return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatPercent = (value: number | null | undefined) => {
	if (value === null || value === undefined) return "-";
	return `${Number(value) % 1 === 0 ? Number(value).toFixed(0) : Number(value).toFixed(2)}%`;
};

export default function ViewClosingModal({
	closing,
	isOpen,
	onClose,
}: ViewClosingModalProps) {
	if (!closing) return null;

	const montoPositivo = closing.montoTransferir >= 0;

	// hpLegalistas viene del backend ya neto de aportes Legalistas.
	const aportesAplicados = closing.applyContributions
		? Number(closing.aportesLegalistas || 0)
		: 0;
	const hpLegalistasNeto = Number(closing.hpLegalistas || 0);
	const hpLegalistasBruto = hpLegalistasNeto + aportesAplicados;

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0" showCloseButton={false}>
				{/* Header con gradiente */}
				<div className="bg-linear-to-br from-primary to-primary/90 px-6 pt-5 pb-5">
					<SheetHeader className="text-left">
						<div className="flex items-start gap-3 pr-10">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
								<Scale className="h-5 w-5 text-white" />
							</div>
							<div className="min-w-0 flex-1">
								<SheetTitle className="text-lg font-bold text-white leading-tight">
									{closing.case?.title || "Cierre"}
								</SheetTitle>
								<SheetDescription className="text-white/70 text-sm mt-0" asChild>
									<span className="flex flex-wrap items-center gap-2 mt-1">
										<Badge
											className={cn(
												"text-xs",
												closingTypeColors[closing.type] || "bg-white/20 text-white",
											)}
										>
											{closingType[closing.type] || closing.type}
										</Badge>
										<span className="flex items-center gap-1">
											<Calendar className="h-3.5 w-3.5" />
											{formatDate(closing.date)}
										</span>
										{closing.case?.number && (
											<span>Exp. {closing.case.number}</span>
										)}
									</span>
								</SheetDescription>
							</div>
						</div>
					</SheetHeader>

					{/* Botón cerrar con borde */}
					<SheetClose className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/25 hover:text-white focus:outline-none">
						<X className="h-4 w-4" />
						<span className="sr-only">Cerrar</span>
					</SheetClose>

					{/* Monto destacado */}
					<div
						className={cn(
							"mt-4 rounded-xl px-4 py-3 backdrop-blur-sm",
							montoPositivo ? "bg-white/15" : "bg-red-500/30",
						)}
					>
						<p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
							Monto a Transferir a Legalistas
						</p>
						<div className="flex items-center gap-2">
							{montoPositivo ? (
								<ArrowUpRight className="h-5 w-5 text-green-300" />
							) : (
								<ArrowDownRight className="h-5 w-5 text-red-300" />
							)}
							<span
								className={cn(
									"text-2xl font-bold",
									montoPositivo ? "text-white" : "text-red-200",
								)}
							>
								{formatCurrency(closing.montoTransferir)}
							</span>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="px-6 py-5 space-y-5">
					{/* Abogados — 2 columnas */}
					<div className="grid grid-cols-2 gap-3">
						<InfoCard
							icon={<User className="h-4 w-4" />}
							label="Representante"
							value={closing.case?.responsibleLawyer?.name || "-"}
						/>
						<InfoCard
							icon={<Briefcase className="h-4 w-4" />}
							label="Abogado Interno"
							value={closing.case?.internalLawyer?.name || "-"}
						/>
					</div>

					{/* Capital — full width */}
					<div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
						<div className="flex items-center gap-2.5">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border text-muted-foreground">
								<DollarSign className="h-4 w-4" />
							</div>
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Capital
							</p>
						</div>
						<p className="text-base font-bold text-foreground">
							{formatCurrency(closing.capitalAmount)}
						</p>
					</div>

					{/* Estados */}
					<div className="grid grid-cols-3 gap-2">
						<div className="bg-muted rounded-xl p-3 space-y-1.5">
							<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
								Estado Capital
							</p>
							<Badge
								className={cn("text-xs", statusCapitalColor[closing.capitalState] || "")}
							>
								{statusCapital[closing.capitalState] || "-"}
							</Badge>
						</div>
						<div className="bg-muted rounded-xl p-3 space-y-1.5">
							<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
								Estado Honorarios
							</p>
							<Badge className={cn("text-xs", statusColors[closing.feeStatus] || "")}>
								{statusData[closing.feeStatus] || "-"}
							</Badge>
						</div>
						<div className="bg-muted rounded-xl p-3 space-y-1.5">
							<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
								Estado PCL
							</p>
							{closing.pclStatus ? (
								<Badge className={cn("text-xs", statusColors[closing.pclStatus] || "")}>
									{statusData[closing.pclStatus] || "-"}
								</Badge>
							) : (
								<span className="text-sm text-muted-foreground">-</span>
							)}
						</div>
					</div>

					{/* Gestión de cobros — solo si hay algún registro */}
					{(closing.hpChargedAt ||
						closing.hpChargedBy ||
						closing.pclChargedAt ||
						closing.pclChargedBy) && (
						<div className="rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50/40 dark:bg-green-900/10 p-4 space-y-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-green-800 dark:text-green-300">
								Gestión de cobros
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{(closing.hpChargedAt || closing.hpChargedBy) && (
									<div className="space-y-1">
										<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
											HP cobrado
										</p>
										<p className="text-sm text-foreground">
											{closing.hpChargedAt
												? new Date(closing.hpChargedAt).toLocaleDateString(
														"es-AR",
														{ day: "2-digit", month: "long", year: "numeric" },
													)
												: "Sin fecha"}
										</p>
										<p className="text-xs text-muted-foreground">
											{closing.hpChargedBy
												? `Por ${closing.hpChargedBy.name}`
												: "Sin responsable registrado"}
										</p>
									</div>
								)}
								{(closing.pclChargedAt || closing.pclChargedBy) && (
									<div className="space-y-1">
										<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
											PCL cobrado
										</p>
										<p className="text-sm text-foreground">
											{closing.pclChargedAt
												? new Date(closing.pclChargedAt).toLocaleDateString(
														"es-AR",
														{ day: "2-digit", month: "long", year: "numeric" },
													)
												: "Sin fecha"}
										</p>
										<p className="text-xs text-muted-foreground">
											{closing.pclChargedBy
												? `Por ${closing.pclChargedBy.name}`
												: "Sin responsable registrado"}
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* HP Section */}
					<SectionCard
						title="Honorarios Pactados (HP)"
						color={closing.feeStatus === "CHARGED" ? "green" : "blue"}
						distribution={closing.hpDistribution}
						items={[
							{ label: "Convenido", value: formatPercent(closing.hpAgreed) },
							{ label: "Total", value: formatCurrency(closing.hpTotal), highlight: true },
							{ label: "Representante", value: formatCurrency(closing.hpRepresentante) },
							{
								label:
									aportesAplicados > 0 ? "Legalistas (neto)" : "Legalistas",
								value: formatCurrency(hpLegalistasNeto),
								bold: true,
							},
						]}
					/>
					{aportesAplicados > 0 && (
						<p className="text-[11px] text-muted-foreground -mt-3 px-1">
							HP Legalistas neto = {formatCurrency(hpLegalistasBruto)} −
							aportes {formatCurrency(aportesAplicados)}
						</p>
					)}

					{/* PCL Section */}
					<SectionCard
						title="Pacto de Cuota Litis (PCL)"
						color={closing.pclStatus === "CHARGED" ? "green" : "violet"}
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
						distributionLabel={
							!closing.applyContributions
								? "No aplicados"
								: closing.hpDistribution
									? `${closing.aportesRepresentantePercent ?? 25}% Rep.`
									: "100% Leg."
						}
						items={[
							{ label: "Totales", value: formatCurrency(closing.contributionsAmount), highlight: true },
							{ label: "Representante", value: formatCurrency(closing.aportesRepresentante) },
							{ label: "Legalistas", value: formatCurrency(closing.aportesLegalistas), bold: true },
						]}
					/>

					{/* Gastos + Detalle */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
							<p className="text-[11px] font-medium text-amber-500 uppercase tracking-wider mb-1">
								Gastos de la Causa
							</p>
							<span className="text-xl font-bold text-amber-700 dark:text-amber-400">
								{closing.totalCaseExpenses ? formatCurrency(closing.totalCaseExpenses) : "-"}
							</span>
						</div>
						<div className="bg-muted border border-border rounded-xl p-4">
							<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
								<FileText className="h-3 w-3" /> Detalle
							</p>
							<p className="text-sm text-foreground leading-relaxed">
								{closing.detail || (
									<span className="text-muted-foreground italic">Sin detalle</span>
								)}
							</p>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

// ─── Sub-components ──────────────────────────────────────────────────

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return (
		<div className="bg-muted rounded-xl p-3 flex items-center gap-3">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border text-muted-foreground">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
					{label}
				</p>
				<p className="text-sm font-semibold text-foreground truncate" title={value}>
					{value}
				</p>
			</div>
		</div>
	);
}

interface SectionItem {
	label: string;
	value: string;
	highlight?: boolean;
	bold?: boolean;
}

const sectionColors = {
	blue: {
		bg: "bg-blue-50 dark:bg-blue-900/20",
		border: "border-blue-200 dark:border-blue-800",
		title: "text-blue-700 dark:text-blue-400",
		badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
		highlight: "text-blue-700 dark:text-blue-400",
	},
	violet: {
		bg: "bg-violet-50 dark:bg-violet-900/20",
		border: "border-violet-200 dark:border-violet-800",
		title: "text-violet-700 dark:text-violet-400",
		badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
		highlight: "text-violet-700 dark:text-violet-400",
	},
	amber: {
		bg: "bg-amber-50 dark:bg-amber-900/20",
		border: "border-amber-200 dark:border-amber-800",
		title: "text-amber-700 dark:text-amber-400",
		badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
		highlight: "text-amber-700 dark:text-amber-400",
	},
	// Se usa para HP/PCL cuando el concepto ya está cobrado (CHARGED).
	green: {
		bg: "bg-green-50 dark:bg-green-900/20",
		border: "border-green-200 dark:border-green-800",
		title: "text-green-700 dark:text-green-400",
		badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
		highlight: "text-green-700 dark:text-green-400",
	},
};

function SectionCard({
	title,
	color,
	distribution,
	distributionLabel,
	items,
}: {
	title: string;
	color: "blue" | "violet" | "amber" | "green";
	distribution: boolean;
	distributionLabel?: string;
	items: SectionItem[];
}) {
	const c = sectionColors[color];

	return (
		<div className={cn("rounded-xl border p-4", c.bg, c.border)}>
			<div className="flex items-center justify-between mb-3">
				<h4 className={cn("text-sm font-semibold", c.title)}>{title}</h4>
				<span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", c.badge)}>
					{distributionLabel || (distribution ? "Dist. 25% Rep." : "Sin distribución")}
				</span>
			</div>
			<div className={cn("grid gap-2", items.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
				{items.map((item) => (
					<div key={item.label} className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
						<p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
							{item.label}
						</p>
						<p
							className={cn(
								"text-xs",
								item.bold && "font-bold text-foreground",
								item.highlight && cn("font-semibold", c.highlight),
								!item.bold && !item.highlight && "font-medium text-foreground",
							)}
						>
							{item.value}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
