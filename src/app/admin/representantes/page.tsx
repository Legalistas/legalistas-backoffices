"use client";

import { Terminal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	REPRESENTATIVES_KPIS_ENDPOINT,
	REPRESENTATIVE_LEVEL_ENDPOINT,
} from "@/constant/api-endpoints";
import { Role } from "@/constant/user";
import type {
	RepresentativeKpi,
	RepresentativeLevel,
	RepresentativesGlobalStats as GlobalStats,
	RepresentativesKpisResponse,
} from "@/types/representatives";
import RepresentativesFilters from "./components/RepresentativesFilters";
import RepresentativesGlobalStats from "./components/RepresentativesGlobalStats";
import RepresentativesTable from "./components/RepresentativesTable";

const LEVEL_EDIT_ROLES: string[] = [
	Role.ADMINISTRATOR,
	Role.DIRECTOR_GENERAL_CEO,
	Role.GERENTE_GENERAL_COO,
	Role.DIRECTORA_AREA_LEGAL,
	Role.COORDINADOR_LEGAL,
];

export default function RepresentantesPage() {
	const { data: session } = useSession();

	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const [search, setSearch] = useState("");

	const [global, setGlobal] = useState<GlobalStats | null>(null);
	const [representatives, setRepresentatives] = useState<RepresentativeKpi[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const canEditLevel = LEVEL_EDIT_ROLES.includes(
		(session?.user?.role as string) ?? "",
	);

	const fetchKpis = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		setLoading(true);
		setError(null);
		try {
			const url = `${REPRESENTATIVES_KPIS_ENDPOINT}?month=${month}&year=${year}`;
			const response = await fetch(url, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
				cache: "no-store",
			});

			if (!response.ok) {
				throw new Error(`Error ${response.status}: ${response.statusText}`);
			}

			const json: RepresentativesKpisResponse = await response.json();
			setGlobal(json.data.global);
			setRepresentatives(json.data.representatives);
		} catch (err) {
			console.error("Error fetching representatives KPIs:", err);
			setError(
				err instanceof Error
					? err.message
					: "No se pudieron cargar los datos de representantes.",
			);
			setGlobal(null);
			setRepresentatives([]);
		} finally {
			setLoading(false);
		}
	}, [month, year, session?.user?.accessToken]);

	useEffect(() => {
		fetchKpis();
	}, [fetchKpis]);

	const handleLevelChange = async (
		userId: number,
		newLevel: RepresentativeLevel | null,
	) => {
		const previous = representatives.find((r) => r.userId === userId)?.level;

		// Optimistic update
		setRepresentatives((prev) =>
			prev.map((r) => (r.userId === userId ? { ...r, level: newLevel } : r)),
		);

		try {
			const response = await fetch(REPRESENTATIVE_LEVEL_ENDPOINT(userId), {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ level: newLevel, month, year }),
			});
			if (!response.ok) throw new Error(response.statusText);
			toast.success("Nivel actualizado");
		} catch (err) {
			console.error("Error updating level:", err);
			// Revertir
			setRepresentatives((prev) =>
				prev.map((r) =>
					r.userId === userId ? { ...r, level: previous ?? null } : r,
				),
			);
			toast.error("No se pudo actualizar el nivel");
		}
	};

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		const base = q
			? representatives.filter(
					(r) =>
						r.fullName.toLowerCase().includes(q) ||
						r.email.toLowerCase().includes(q),
				)
			: representatives;

		const levelOrder: Record<string, number> = {
			GOLD: 0,
			SILVER: 1,
			BRONZE: 2,
		};
		const orderOf = (lvl: RepresentativeLevel | null) =>
			lvl ? (levelOrder[lvl] ?? 3) : 3;

		return [...base].sort((a, b) => {
			const diff = orderOf(a.level) - orderOf(b.level);
			if (diff !== 0) return diff;
			return b.capitalClosed - a.capitalClosed || b.closingsCount - a.closingsCount;
		});
	}, [representatives, search]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
						Representantes
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
						Seguimiento de desempeño de la red de representantes
					</p>
				</div>
			</div>

			{error && (
				<Alert variant="destructive">
					<Terminal className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Vista global */}
			<section className="space-y-3">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
					Vista global
				</h2>
				<RepresentativesGlobalStats data={global} loading={loading} />
			</section>

			{/* Filtros + tabla individual */}
			<section className="space-y-3">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
					Ranking individual
				</h2>
				<RepresentativesFilters
					month={month}
					year={year}
					search={search}
					onMonthChange={setMonth}
					onYearChange={setYear}
					onSearchChange={setSearch}
				/>
				<RepresentativesTable
					rows={filteredRows}
					loading={loading}
					canEditLevel={canEditLevel}
					onLevelChange={handleLevelChange}
				/>
			</section>
		</div>
	);
}
