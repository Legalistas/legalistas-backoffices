"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnConfig } from "@/components/negotiations/ColumnSelector";
import { NegotiationHeader } from "@/components/negotiations/NegotiationHeader";
import { NegotiationsTable } from "@/components/negotiations/NegotiationsTable";
import { NegotiationTabs } from "@/components/negotiations/NegotiationTabs";
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
			{
				id: "abogadoRepresentante",
				label: "Abogado Representante",
				visible: true,
			},
			{ id: "abogadoInterno", label: "Abogado Interno", visible: true },
			{ id: "abogadoContraparte", label: "Abogado Contraparte", visible: true },
			{ id: "lesion", label: "Lesión", visible: true },
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

	// Fetch counts
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

	if (status === "loading") {
		return (
			<div className="flex flex-col gap-6 mb-2">
				<div className="flex items-center justify-between mb-4">
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-48" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-9 w-40" />
					</div>
				</div>
				<div className="flex gap-2 border-b border-border pb-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-9 w-28" />
					))}
				</div>
				<Skeleton className="h-10 w-full" />
				<div className="overflow-hidden rounded-xl border">
					<div className="px-4 py-3 flex gap-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-4 w-24" />
						))}
					</div>
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t">
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
		<div>
			<div className="flex flex-col gap-6 mb-2">
				<NegotiationHeader
					columnConfig={initialColumnConfig}
					onColumnChange={handleColumnChange}
				/>
				<NegotiationTabs
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					counts={counts}
				/>

				<NegotiationsTable
					viewMode={viewMode}
					columnConfig={columnConfig}
					onColumnChange={handleColumnChange}
					onDataChange={fetchCounts}
				/>
			</div>
		</div>
	);
}
