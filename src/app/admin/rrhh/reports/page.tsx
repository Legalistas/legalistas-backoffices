"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AbsenteeismChart,
	computeAbsenteeism,
	computeCostByArea,
	computeStats,
	computeTenure,
	computeTurnover,
	type EmployeeWithEmployment,
	getInitialRrhhFilters,
	LaborCostsChart,
	type LeaveSummary,
	RrhhFilters,
	type RrhhFiltersState,
	RrhhStatsCards,
	TenureChart,
	TurnoverChart,
} from "@/components/reports/rrhh";
import {
	LEAVES_BY_USER_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";

export default function RrhhReportsPage() {
	const { data: session } = useSession();
	const [filters, setFilters] = useState<RrhhFiltersState>(getInitialRrhhFilters);
	const [employees, setEmployees] = useState<EmployeeWithEmployment[]>([]);
	const [leaves, setLeaves] = useState<LeaveSummary[]>([]);
	const [loading, setLoading] = useState(false);

	const token = session?.user?.accessToken;

	const fetchData = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const usersRes = await fetch(`${USERS_ENDPOINT}?limit=500`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!usersRes.ok) throw new Error("Error al cargar empleados");
			const usersJson = await usersRes.json();
			const rawUsers = usersJson.data ?? usersJson ?? [];

			const mapped: EmployeeWithEmployment[] = rawUsers.map((u: any) => ({
				id: u.id,
				name: u.name,
				email: u.email,
				employment: u.employment ?? null,
			}));

			setEmployees(mapped);

			const withEmployment = mapped.filter((e) => e.employment);
			const leavesResults = await Promise.all(
				withEmployment.map(async (e) => {
					try {
						const res = await fetch(LEAVES_BY_USER_ENDPOINT(e.id), {
							headers: { Authorization: `Bearer ${token}` },
						});
						if (!res.ok) return [] as LeaveSummary[];
						const json = await res.json();
						return (json.data ?? []) as LeaveSummary[];
					} catch {
						return [] as LeaveSummary[];
					}
				}),
			);

			setLeaves(leavesResults.flat());
		} catch (err) {
			console.error("Error fetching RRHH reports:", err);
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const filteredEmployees = useMemo(() => {
		if (!filters.area) return employees;
		return employees.filter((e) => e.employment?.area === filters.area);
	}, [employees, filters.area]);

	const filteredLeaves = useMemo(() => {
		if (!filters.area) return leaves;
		const ids = new Set(filteredEmployees.map((e) => e.id));
		return leaves.filter((l) => ids.has(l.userId));
	}, [leaves, filters.area, filteredEmployees]);

	const stats = useMemo(
		() => computeStats(filteredEmployees, filters.startDate, filters.endDate),
		[filteredEmployees, filters.startDate, filters.endDate],
	);

	const turnoverData = useMemo(
		() => computeTurnover(filteredEmployees, filters.startDate, filters.endDate),
		[filteredEmployees, filters.startDate, filters.endDate],
	);

	const absenteeismData = useMemo(
		() => computeAbsenteeism(filteredLeaves, filters.startDate, filters.endDate),
		[filteredLeaves, filters.startDate, filters.endDate],
	);

	const costByArea = useMemo(
		() => computeCostByArea(filteredEmployees),
		[filteredEmployees],
	);

	const tenureData = useMemo(
		() => computeTenure(filteredEmployees),
		[filteredEmployees],
	);

	const areas = useMemo(() => {
		const set = new Set<string>();
		for (const e of employees) {
			const area = e.employment?.area?.trim();
			if (area) set.add(area);
		}
		return Array.from(set).sort();
	}, [employees]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Reportes RRHH</h1>
					<p className="text-muted-foreground">
						Rotación, ausentismo, costos laborales y antigüedad
					</p>
				</div>
			</div>

			<RrhhFilters filters={filters} onChange={setFilters} areas={areas} />

			{loading && (
				<div className="py-2 text-center">
					<div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
				</div>
			)}

			<RrhhStatsCards data={stats} />

			<div className="grid gap-6 lg:grid-cols-2">
				<TurnoverChart data={turnoverData} />
				<AbsenteeismChart data={absenteeismData} />
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<LaborCostsChart data={costByArea} />
				<TenureChart data={tenureData} />
			</div>
		</div>
	);
}
