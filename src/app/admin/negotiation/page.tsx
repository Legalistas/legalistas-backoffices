"use client";

import {
	Activity,
	CheckCircle2,
	Download,
	PauseCircle,
	PlayCircle,
	Plus,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnSelector } from "@/components/negotiations/ColumnSelector";
import type { ColumnConfig } from "@/components/negotiations/ColumnSelector";
import {
	NegotiationFilters,
	EMPTY_FILTERS,
	type FilterState,
} from "@/components/negotiations/NegotiationFilters";
import { NegotiationsTable } from "@/components/negotiations/NegotiationsTable";
import { RoleIndicator } from "@/components/negotiations/RoleIndicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NEGOTIATIONS_COUNT_ENDPOINT } from "@/constant/api-endpoints";
import { useRolePermissions } from "@/hooks/useRolePermissions";

const EMPTY_UNIQUE_VALUES = {
	abogadosRepresentantes: [] as string[],
	abogadosInternos: [] as string[],
	abogadosContraparte: [] as string[],
	lesiones: [] as string[],
};

export default function NegotiationPage() {
	const { data: session, status } = useSession();
	const searchParams = useSearchParams();
	const permissions = useRolePermissions();
	const [openNegotiationId, setOpenNegotiationId] = useState<number | null>(
		() => {
			const id = searchParams.get("openId");
			return id ? parseInt(id, 10) : null;
		},
	);
	const [counts, setCounts] = useState({
		iniciar: 0,
		curso: 0,
		suspenso: 0,
		finalizadas: 0,
		perdidas: 0,
	});
	const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);

	const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
	const [uniqueValues, setUniqueValues] = useState(EMPTY_UNIQUE_VALUES);
	const [results, setResults] = useState({ total: 0, filtered: 0 });
	// Contadores por estado ya recalculados según los filtros activos (representante,
	// contraparte, lesión, búsqueda, monto) — alimentan las tarjetas/tabs de arriba.
	const [filteredCounts, setFilteredCounts] = useState({
		iniciar: 0,
		curso: 0,
		suspenso: 0,
		finalizadas: 0,
	});

	const initialColumnConfig = useMemo(
		() => [
			{ id: "causa", label: "Causa", visible: true, required: true },
			{ id: "estado", label: "Estado", visible: true },
			{ id: "abogadoRepresentante", label: "Abogado Representante", visible: true },
			{ id: "abogadoInterno", label: "Abogado Interno", visible: false },
			{ id: "abogadoContraparte", label: "Abogado Contraparte", visible: true },
			{ id: "lesion", label: "Lesión", visible: false },
			{ id: "servicio", label: "Servicio", visible: false },
			{ id: "incLegalistas", label: "% Legalistas", visible: false },
			{ id: "deArt", label: "% PMO", visible: true },
			{ id: "liquidacion100", label: "Liquidación 100%", visible: false },
			{ id: "liquidacion80", label: "Liquidación 80%", visible: true },
			{ id: "ultimaOferta", label: "Última Oferta", visible: true },
		],
		[],
	);

	useEffect(() => {
		if (columnConfig.length === 0) {
			setColumnConfig(initialColumnConfig);
		}
	}, [initialColumnConfig, columnConfig.length]);

	const fetchCounts = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		try {
			const params = new URLSearchParams();
			if (permissions.isLawyer) {
				const userId = permissions.getUserId();
				if (userId) params.append("lawyerId", userId.toString());
			}
			const url = params.toString()
				? `${NEGOTIATIONS_COUNT_ENDPOINT}?${params.toString()}`
				: NEGOTIATIONS_COUNT_ENDPOINT;
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});
			if (response.ok) {
				const data = await response.json();
				setCounts(data.data);
			}
		} catch (err) {
			console.error("Error fetching counts:", err);
		}
	}, [session?.user?.accessToken, permissions.isLawyer]);

	useEffect(() => {
		fetchCounts();
	}, [fetchCounts]);

	const handleColumnChange = useCallback((newColumns: ColumnConfig[]) => {
		setColumnConfig(newColumns);
	}, []);

	const handleClearFilters = useCallback(() => {
		setFilters(EMPTY_FILTERS);
	}, []);

	const handleUniqueValuesChange = useCallback(
		(values: typeof EMPTY_UNIQUE_VALUES) => {
			setUniqueValues((prev) => {
				const same =
					prev.abogadosRepresentantes.length ===
						values.abogadosRepresentantes.length &&
					prev.abogadosInternos.length === values.abogadosInternos.length &&
					prev.abogadosContraparte.length ===
						values.abogadosContraparte.length &&
					prev.lesiones.length === values.lesiones.length &&
					prev.abogadosRepresentantes.every(
						(v, i) => v === values.abogadosRepresentantes[i],
					) &&
					prev.abogadosInternos.every(
						(v, i) => v === values.abogadosInternos[i],
					) &&
					prev.abogadosContraparte.every(
						(v, i) => v === values.abogadosContraparte[i],
					) &&
					prev.lesiones.every((v, i) => v === values.lesiones[i]);
				return same ? prev : values;
			});
		},
		[],
	);

	const handleResultsChange = useCallback(
		(next: { total: number; filtered: number }) => {
			setResults((prev) =>
				prev.total === next.total && prev.filtered === next.filtered
					? prev
					: next,
			);
		},
		[],
	);

	const handleStatusCountsChange = useCallback(
		(next: {
			iniciar: number;
			curso: number;
			suspenso: number;
			finalizadas: number;
		}) => {
			setFilteredCounts((prev) =>
				prev.iniciar === next.iniciar &&
				prev.curso === next.curso &&
				prev.suspenso === next.suspenso &&
				prev.finalizadas === next.finalizadas
					? prev
					: next,
			);
		},
		[],
	);

	// Total global (sin filtros) para el texto del encabezado
	const totalNegociaciones =
		counts.iniciar + counts.curso + counts.suspenso + counts.finalizadas + counts.perdidas;

	const totalActivas =
		filteredCounts.iniciar + filteredCounts.curso + filteredCounts.suspenso;

	const statusTabs = [
		{ estado: "", label: "Total activas", value: totalActivas, activeBg: "bg-primary", dotColor: "bg-primary" },
		{ estado: "INICIAR", label: "Iniciar", value: filteredCounts.iniciar, activeBg: "bg-blue-600", dotColor: "bg-blue-500" },
		{ estado: "CURSO", label: "En curso", value: filteredCounts.curso, activeBg: "bg-emerald-600", dotColor: "bg-emerald-500" },
		{ estado: "SUSPENSO", label: "Suspenso", value: filteredCounts.suspenso, activeBg: "bg-amber-600", dotColor: "bg-amber-500" },
		{ estado: "FINALIZADAS", label: "Finalizadas", value: filteredCounts.finalizadas, activeBg: "bg-green-600", dotColor: "bg-green-500" },
	];

	const statCards = [
		{
			label: "Total activas",
			value: totalActivas,
			icon: Activity,
			iconBg: "bg-primary/10 dark:bg-primary/20",
			iconColor: "text-primary",
			valueColor: "text-gray-900 dark:text-white",
		},
		{
			label: "Iniciar",
			value: filteredCounts.iniciar,
			icon: PlayCircle,
			iconBg: "bg-blue-100 dark:bg-blue-900/30",
			iconColor: "text-blue-600",
			valueColor: "text-blue-600",
		},
		{
			label: "En curso",
			value: filteredCounts.curso,
			icon: TrendingUp,
			iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
			iconColor: "text-emerald-600",
			valueColor: "text-emerald-600",
		},
		{
			label: "Suspenso",
			value: filteredCounts.suspenso,
			icon: PauseCircle,
			iconBg: "bg-amber-100 dark:bg-amber-900/30",
			iconColor: "text-amber-600",
			valueColor: "text-amber-600",
		},
		{
			label: "Finalizadas",
			value: filteredCounts.finalizadas,
			icon: CheckCircle2,
			iconBg: "bg-green-100 dark:bg-green-900/30",
			iconColor: "text-green-600",
			valueColor: "text-green-600",
		},
	];

	if (status === "loading") {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-48" />
					</div>
					<div className="flex items-center gap-3">
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-9 w-40" />
					</div>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
				<Skeleton className="h-24 w-full rounded-lg" />
				<div className="flex flex-wrap gap-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-9 w-28 rounded-full" />
					))}
				</div>
				<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
					<div className="bg-gray-50 dark:bg-white/5 px-4 py-3 flex gap-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-4 w-24" />
						))}
					</div>
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-gray-100 dark:border-gray-800">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-24" />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
							Sistema de Negociaciones
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
							Gestión de pujas entre Legalistas y ART
							{totalNegociaciones > 0 && (
								<span className="ml-2 text-xs text-primary font-medium">
									{totalNegociaciones} total
								</span>
							)}
						</p>
					</div>
					<RoleIndicator />
				</div>
				<div className="flex items-center gap-3">
					{columnConfig.length > 0 && (
						<ColumnSelector
							columns={columnConfig}
							onColumnsChange={handleColumnChange}
							storageKey="negotiations-columns-v2"
						/>
					)}
					{/* Exportar */}
					<div className="relative group">
						<Button variant="outline" className="flex items-center gap-2">
							<Download className="h-4 w-4" />
							Exportar
						</Button>
						<div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 hidden group-hover:block">
							<button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
								Excel (.xlsx)
							</button>
							<button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
								CSV (.csv)
							</button>
						</div>
					</div>
					{/* Nueva negociación */}
					<Link href="/admin/negotiation/new">
						<Button
							variant="default"
							className="flex items-center gap-2 bg-primary text-white hover:bg-primary/85 px-4 py-2.5 rounded-lg shadow-sm"
						>
							<Plus className="h-4 w-4" />
							Nueva negociación
						</Button>
					</Link>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				{statCards.map((card) => (
					<div
						key={card.label}
						className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm"
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{card.label}
								</p>
								<p className={`text-xl font-bold mt-1 ${card.valueColor}`}>
									{card.value}
								</p>
							</div>
							<div className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
								<card.icon className={`h-5 w-5 ${card.iconColor}`} />
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Filtros globales */}
			<NegotiationFilters
				filters={filters}
				onFiltersChange={setFilters}
				onClearFilters={handleClearFilters}
				totalResults={results.total}
				filteredResults={results.filtered}
				uniqueValues={uniqueValues}
			/>

			{/* Tabs de estado */}
			<div className="flex flex-wrap items-center gap-2">
				{statusTabs.map((tab) => {
					const isActive = filters.estado === tab.estado;
					return (
						<button
							key={tab.label}
							type="button"
							onClick={() =>
								setFilters((prev) => ({ ...prev, estado: tab.estado }))
							}
							className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
								isActive
									? `${tab.activeBg} text-white border-transparent`
									: "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
							}`}
						>
							<span
								className={`h-2 w-2 rounded-full ${isActive ? "bg-white" : tab.dotColor}`}
							/>
							{tab.label}
							<span className={isActive ? "text-white/80" : "text-gray-400"}>
								{tab.value}
							</span>
						</button>
					);
				})}
			</div>

			{/* Table */}
			<NegotiationsTable
				columnConfig={columnConfig}
				onColumnChange={handleColumnChange}
				onDataChange={fetchCounts}
				openNegotiationId={openNegotiationId}
				onOpenNegotiationHandled={() => setOpenNegotiationId(null)}
				filters={filters}
				onUniqueValuesChange={handleUniqueValuesChange}
				onResultsChange={handleResultsChange}
				onStatusCountsChange={handleStatusCountsChange}
			/>
		</div>
	);
}
