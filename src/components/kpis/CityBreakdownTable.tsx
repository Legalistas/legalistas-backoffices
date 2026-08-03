"use client";

import { MapPin, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/constant/api-endpoints";
import type { KpiResponse } from "@/types/kpi";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { buildPeriodAxis, type PeriodMode } from "./periodMode";
import type { SalesProvinceData } from "./useSalesKpiMatrix";

// Tabla buscable de oportunidades / ventas por ciudad.
//
// KPIs Ventas v1.1, punto 7.3: "El detalle por ciudad no se muestra en las
// métricas principales de KPIs, pero debe existir una tabla buscable donde
// consultar cuántas ventas / oportunidades hay por cada ciudad".
//
// Acumula todos los períodos del eje (el año completo, o los meses del
// rango elegido) — no es una vista mes a mes.

interface CityRow {
	cityId: number;
	name: string;
	provincia: string;
	oportunidades: number;
	ventas: number;
}

interface CityBreakdownTableProps {
	year: number;
	mode: PeriodMode;
}

export default function CityBreakdownTable({
	year,
	mode,
}: CityBreakdownTableProps) {
	const { data: session } = useSession();
	const [rows, setRows] = useState<CityRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [query, setQuery] = useState("");

	const axis = useMemo(() => buildPeriodAxis(year, mode), [year, mode]);

	useEffect(() => {
		const token = session?.user?.accessToken;
		if (!token) return;
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			try {
				const results = await Promise.all(
					axis.queries.map(async (qs) => {
						try {
							const res = await fetch(
								`${API_BASE_URL}/kpis/sales/by-province?${qs}`,
								{ headers: { Authorization: `Bearer ${token}` } },
							);
							if (!res.ok) return null;
							return (await res.json()) as KpiResponse<SalesProvinceData>;
						} catch {
							return null;
						}
					}),
				);

				// Acumular por ciudad a lo largo de todo el eje.
				const acc = new Map<number, CityRow>();
				for (const result of results) {
					for (const c of result?.data?.porCiudad ?? []) {
						const existing = acc.get(c.cityId);
						if (existing) {
							existing.oportunidades += c.oportunidades;
							existing.ventas += c.ventas;
						} else {
							acc.set(c.cityId, {
								cityId: c.cityId,
								name: c.name,
								provincia: c.provincia,
								oportunidades: c.oportunidades,
								ventas: c.ventas,
							});
						}
					}
				}

				if (!cancelled) {
					setRows(
						Array.from(acc.values()).sort(
							(a, b) =>
								b.oportunidades - a.oportunidades ||
								a.name.localeCompare(b.name),
						),
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [session?.user?.accessToken, axis]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter(
			(r) =>
				r.name.toLowerCase().includes(q) ||
				r.provincia.toLowerCase().includes(q),
		);
	}, [rows, query]);

	const totals = useMemo(
		() =>
			filtered.reduce(
				(acc, r) => ({
					oportunidades: acc.oportunidades + r.oportunidades,
					ventas: acc.ventas + r.ventas,
				}),
				{ oportunidades: 0, ventas: 0 },
			),
		[filtered],
	);

	return (
		<div className="rounded-lg border border-border">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
				<div>
					<h3 className="flex items-center gap-2 text-sm font-semibold">
						<MapPin className="h-4 w-4" />
						Detalle por ciudad
					</h3>
					<p className="text-xs text-muted-foreground">
						Acumulado del período mostrado en la planilla. Solo aparecen las
						oportunidades con localidad cargada.
					</p>
				</div>
				<div className="relative w-full sm:w-64">
					<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="h-9 pl-8"
						placeholder="Buscar ciudad o provincia…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>

			{loading ? (
				<div className="space-y-2 p-4">
					{Array.from({ length: 5 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
						<Skeleton key={i} className="h-8 w-full" />
					))}
				</div>
			) : rows.length === 0 ? (
				<p className="p-6 text-center text-sm text-muted-foreground">
					Todavía no hay oportunidades con localidad cargada. Se completa a
					medida que las vendedoras usen el desplegable de ciudad.
				</p>
			) : (
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Ciudad</TableHead>
								<TableHead>Provincia</TableHead>
								<TableHead className="text-right">Oportunidades</TableHead>
								<TableHead className="text-right">Ventas</TableHead>
								<TableHead className="text-right">Conversión</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map((r) => (
								<TableRow key={r.cityId}>
									<TableCell className="font-medium">{r.name}</TableCell>
									<TableCell className="text-muted-foreground">
										{r.provincia}
									</TableCell>
									<TableCell className="text-right">{r.oportunidades}</TableCell>
									<TableCell className="text-right">{r.ventas}</TableCell>
									<TableCell className="text-right">
										{r.oportunidades > 0
											? `${Math.round((r.ventas / r.oportunidades) * 1000) / 10}%`
											: "—"}
									</TableCell>
								</TableRow>
							))}
							{filtered.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={5}
										className="text-center text-sm text-muted-foreground"
									>
										Sin resultados para "{query}".
									</TableCell>
								</TableRow>
							)}
						</TableBody>
						{filtered.length > 0 && (
							<TableBody>
								<TableRow className="border-t-2 font-semibold">
									<TableCell colSpan={2}>
										Total{query ? " (filtrado)" : ""}
									</TableCell>
									<TableCell className="text-right">
										{totals.oportunidades}
									</TableCell>
									<TableCell className="text-right">{totals.ventas}</TableCell>
									<TableCell className="text-right">
										{totals.oportunidades > 0
											? `${Math.round((totals.ventas / totals.oportunidades) * 1000) / 10}%`
											: "—"}
									</TableCell>
								</TableRow>
							</TableBody>
						)}
					</Table>
				</div>
			)}
		</div>
	);
}
