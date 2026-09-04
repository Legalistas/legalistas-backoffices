"use client";

import { Layers, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SETTINGS_COUNTRIES_ENDPOINT } from "@/constant/api-endpoints";
import { CRM_COLUMNS, SOURCE_CHANNEL } from "@/constant/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useActiveOpportunities } from "./useActiveOpportunities";

// Doc "KPIs y Reportes de Ventas", puntos 1-3:
//   1. Total de oportunidades activas (fuera de columnas finales) en vivo.
//   2. Leads activos al cierre de cada mes, para detectar acumulación sin
//      gestión (se relevó un caso de ~600 oportunidades sin depurar).
//   3. Mismos filtros por Etapa/Canal/Provincia que la Sección 1.2.
//
// El histórico mensual solo tiene datos desde que se activó el cron de
// snapshot (backend/src/services/crm-active-leads-snapshot-cron.service.ts)
// — no es reconstruible hacia atrás, así que los meses previos a esa fecha
// simplemente no aparecen en la tabla.

const ACTIVE_COLUMNS = CRM_COLUMNS.filter(
	(c) => !["9", "10", "11"].includes(c.id),
);

function formatMonth(monthOf: string): string {
	const [year, month] = monthOf.split("-");
	const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
	return date.toLocaleDateString("es-AR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

export default function ActiveOpportunitiesPanel() {
	const { data: session } = useSession();
	const [columnId, setColumnId] = useState<string>("all");
	const [channelId, setChannelId] = useState<string>("all");
	const [stateId, setStateId] = useState<string>("all");
	const [provinces, setProvinces] = useState<{ id: string; name: string }[]>(
		[],
	);

	useEffect(() => {
		const token = session?.user?.accessToken;
		if (!token) return;
		fetch(`${SETTINGS_COUNTRIES_ENDPOINT}/1/states?limit=200`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => res.json())
			.then((json) => {
				const list = (json.data ?? []) as { id: number; name: string }[];
				const sorted = [...list].sort((a, b) =>
					a.name.localeCompare(b.name, "es"),
				);
				setProvinces(sorted.map((s) => ({ id: String(s.id), name: s.name })));
			})
			.catch(() => setProvinces([]));
	}, [session?.user?.accessToken]);

	const { total, byColumn, history, loading } = useActiveOpportunities(
		columnId === "all" ? undefined : Number(columnId),
		channelId === "all" ? undefined : Number(channelId),
		stateId === "all" ? undefined : Number(stateId),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Layers className="h-4 w-4 text-primary" />
					Oportunidades activas
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Filtros — mismos criterios que el Kanban (Sección 1.2) */}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Select value={columnId} onValueChange={setColumnId}>
						<SelectTrigger className="h-9">
							<SelectValue placeholder="Etapa" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todas las etapas</SelectItem>
							{ACTIVE_COLUMNS.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.title}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={channelId} onValueChange={setChannelId}>
						<SelectTrigger className="h-9">
							<SelectValue placeholder="Canal de ingreso" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos los canales</SelectItem>
							{SOURCE_CHANNEL.filter((c) => c.active).map((c) => (
								<SelectItem key={c.id} value={String(c.id)}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={stateId} onValueChange={setStateId}>
						<SelectTrigger className="h-9">
							<SelectValue placeholder="Provincia" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todas las provincias</SelectItem>
							{provinces.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Total en vivo */}
				<div className="flex flex-wrap items-end gap-6">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Total activas ahora
						</p>
						{loading ? (
							<Skeleton className="mt-1 h-10 w-24" />
						) : (
							<p className="text-4xl font-bold tracking-tight">{total}</p>
						)}
					</div>

					{!loading && byColumn.length > 0 && (
						<div className="flex flex-1 flex-wrap gap-2">
							{byColumn.map((c) => (
								<span
									key={c.columnId ?? "sin-columna"}
									className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
								>
									{c.title}: <span className="font-semibold text-foreground">{c.count}</span>
								</span>
							))}
						</div>
					)}
				</div>

				{/* Histórico mensual */}
				<div>
					<p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						<TrendingUp className="h-3.5 w-3.5" />
						Activas al cierre de cada mes
					</p>
					{loading ? (
						<Skeleton className="h-24 w-full" />
					) : history.length === 0 ? (
						<p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
							Todavía no hay ningún mes cerrado capturado — el histórico
							empieza a acumularse desde que se activó esta métrica.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mes</TableHead>
									<TableHead className="text-right">
										Oportunidades activas
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.map((h) => (
									<TableRow key={h.monthOf}>
										<TableCell className="capitalize">
											{formatMonth(h.monthOf)}
										</TableCell>
										<TableCell className="text-right font-medium">
											{h.count}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
