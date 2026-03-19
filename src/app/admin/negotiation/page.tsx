"use client";

import {
	Activity,
	CheckCircle2,
	Download,
	PauseCircle,
	Plus,
	TrendingUp,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnSelector } from "@/components/negotiations/ColumnSelector";
import type { ColumnConfig } from "@/components/negotiations/ColumnSelector";
import { NegotiationsTable } from "@/components/negotiations/NegotiationsTable";
import { NegotiationTabs } from "@/components/negotiations/NegotiationTabs";
import { RoleIndicator } from "@/components/negotiations/RoleIndicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NEGOTIATIONS_COUNT_ENDPOINT } from "@/constant/api-endpoints";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import type { ViewMode } from "@/types/negotiations";

export default function NegotiationPage() {
	const { data: session, status } = useSession();
	const permissions = useRolePermissions();
	const [viewMode, setViewMode] = useState<ViewMode>("curso");
	const [counts, setCounts] = useState({
		iniciar: 0,
		curso: 0,
		suspenso: 0,
		finalizadas: 0,
		perdidas: 0,
	});
	const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);

	const initialColumnConfig = useMemo(
		() => [
			{ id: "causa", label: "Causa", visible: true, required: true },
			{ id: "abogadoRepresentante", label: "Abogado Representante", visible: true },
			{ id: "abogadoInterno", label: "Abogado Interno", visible: true },
			{ id: "abogadoContraparte", label: "Abogado Contraparte", visible: true },
			{ id: "lesion", label: "Lesión", visible: true },
			{ id: "servicio", label: "Servicio", visible: true },
			{ id: "incLegalistas", label: "% Legalistas", visible: true },
			{ id: "deArt", label: "% PMO", visible: true },
			{ id: "liquidacion100", label: "Liquidación 100%", visible: true },
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

	const totalActivas = counts.iniciar + counts.curso + counts.suspenso;
	const totalNegociaciones = totalActivas + counts.finalizadas + counts.perdidas;
	const tasaExito =
		counts.finalizadas + counts.perdidas > 0
			? Math.round((counts.finalizadas / (counts.finalizadas + counts.perdidas)) * 100)
			: null;

	const kpiCards = [
		{
			label: "Total activas",
			value: totalActivas,
			icon: Activity,
			iconBg: "bg-primary/10 dark:bg-primary/20",
			iconColor: "text-primary",
			valueColor: "text-gray-900 dark:text-white",
		},
		{
			label: "En curso",
			value: counts.curso,
			icon: TrendingUp,
			iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
			iconColor: "text-emerald-600",
			valueColor: "text-emerald-600",
		},
		{
			label: "Suspensas",
			value: counts.suspenso,
			icon: PauseCircle,
			iconBg: "bg-amber-100 dark:bg-amber-900/30",
			iconColor: "text-amber-600",
			valueColor: "text-amber-600",
		},
		{
			label: "Finalizadas",
			value: counts.finalizadas,
			icon: CheckCircle2,
			iconBg: "bg-green-100 dark:bg-green-900/30",
			iconColor: "text-green-600",
			valueColor: "text-green-600",
		},
		{
			label: tasaExito !== null ? `Tasa de éxito` : "Perdidas",
			value: tasaExito !== null ? `${tasaExito}%` : counts.perdidas,
			icon: tasaExito !== null ? CheckCircle2 : XCircle,
			iconBg: tasaExito !== null
				? "bg-blue-100 dark:bg-blue-900/30"
				: "bg-red-100 dark:bg-red-900/30",
			iconColor: tasaExito !== null ? "text-blue-600" : "text-red-600",
			valueColor: tasaExito !== null ? "text-blue-600" : "text-red-600",
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
				<div className="flex gap-2 border-b border-border pb-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-9 w-28" />
					))}
				</div>
				<Skeleton className="h-10 w-full" />
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
							storageKey="negotiations-columns"
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
				{kpiCards.map((kpi) => (
					<div
						key={kpi.label}
						className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm"
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{kpi.label}
								</p>
								<p className={`text-xl font-bold mt-1 ${kpi.valueColor}`}>
									{kpi.value}
								</p>
							</div>
							<div className={`h-10 w-10 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
								<kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Tabs */}
			<NegotiationTabs
				viewMode={viewMode}
				onViewModeChange={setViewMode}
				counts={counts}
			/>

			{/* Table */}
			<NegotiationsTable
				viewMode={viewMode}
				columnConfig={columnConfig}
				onColumnChange={handleColumnChange}
				onDataChange={fetchCounts}
			/>
		</div>
	);
}
