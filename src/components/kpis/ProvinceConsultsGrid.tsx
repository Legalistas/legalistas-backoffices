"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	MANUAL_KPIS_ENDPOINT,
	MANUAL_KPI_BY_ID_ENDPOINT,
	SETTINGS_COUNTRIES_ENDPOINT,
} from "@/constant/api-endpoints";
import type { ManualKpiEntry } from "@/types/kpi";
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

// Consultas orgánicas / pagas por provincia — KPIs Ventas v1.1, punto 7.4.
//
// Es el ÚNICO dato manual que queda en el módulo: el nivel de "consultas" es
// superior al de oportunidades y no sale del Back Office. Con esta grilla se
// retira el Excel de "leads de marketing por provincia".
//
// El mismo componente sirve para cargar (editable) y para leer (readOnly),
// así la vista de la planilla y la de carga no se despegan.

const KEY_ORGANICAS = "sales_consultas_organicas";
const KEY_PAGAS = "sales_consultas_pagas";

/** Argentina. */
const DEFAULT_COUNTRY_ID = 1;

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Rango [primer día, último día] del mes. */
function monthRange(year: number, month: number) {
	return {
		start: toISODate(new Date(year, month - 1, 1)),
		end: toISODate(new Date(year, month, 0)),
	};
}

interface Province {
	id: number;
	name: string;
}

interface ProvinceConsultsGridProps {
	year: number;
	/** 1-12 */
	month: number;
	readOnly?: boolean;
}

type CellKey = `${number}-${typeof KEY_ORGANICAS | typeof KEY_PAGAS}`;

export default function ProvinceConsultsGrid({
	year,
	month,
	readOnly = false,
}: ProvinceConsultsGridProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [provinces, setProvinces] = useState<Province[]>([]);
	const [entries, setEntries] = useState<ManualKpiEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [savingCell, setSavingCell] = useState<CellKey | null>(null);
	const [error, setError] = useState<string | null>(null);
	// Valores tipeados que todavía no se guardaron.
	const [drafts, setDrafts] = useState<Record<string, string>>({});

	const { start, end } = useMemo(() => monthRange(year, month), [year, month]);

	// ── Provincias ────────────────────────────────────────────────────
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(
					`${SETTINGS_COUNTRIES_ENDPOINT}/${DEFAULT_COUNTRY_ID}/states?limit=200`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				if (!res.ok) throw new Error(String(res.status));
				const json = await res.json();
				if (!cancelled) setProvinces(json.data ?? []);
			} catch {
				if (!cancelled) setProvinces([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [token]);

	// ── Valores cargados del mes ──────────────────────────────────────
	const loadEntries = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const res = await fetch(
				`${MANUAL_KPIS_ENDPOINT}?area=sales&from=${start}&to=${start}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (!res.ok) throw new Error(String(res.status));
			const json = await res.json();
			const all: ManualKpiEntry[] = json.entries ?? [];
			setEntries(
				all.filter(
					(e) => e.metricKey === KEY_ORGANICAS || e.metricKey === KEY_PAGAS,
				),
			);
			setDrafts({});
		} catch {
			setEntries([]);
		} finally {
			setLoading(false);
		}
	}, [token, start]);

	useEffect(() => {
		loadEntries();
	}, [loadEntries]);

	// ── Lectura de una celda ──────────────────────────────────────────
	const findEntry = useCallback(
		(stateId: number, metricKey: string) =>
			entries.find(
				(e) => e.stateId === stateId && e.metricKey === metricKey,
			),
		[entries],
	);

	const cellValue = useCallback(
		(stateId: number, metricKey: string): string => {
			const draftKey = `${stateId}-${metricKey}`;
			if (draftKey in drafts) return drafts[draftKey] ?? "";
			const entry = findEntry(stateId, metricKey);
			return entry ? String(Number(entry.value)) : "";
		},
		[drafts, findEntry],
	);

	const numericValue = useCallback(
		(stateId: number, metricKey: string): number => {
			const raw = cellValue(stateId, metricKey);
			const n = Number(raw);
			return raw === "" || Number.isNaN(n) ? 0 : n;
		},
		[cellValue],
	);

	// ── Guardado ──────────────────────────────────────────────────────
	// Se dispara al salir del campo (no con debounce): son 48 inputs y un
	// autosave por tecla haría 48 requests por fila.
	const saveCell = useCallback(
		async (stateId: number, metricKey: string) => {
			if (!token || readOnly) return;
			const draftKey = `${stateId}-${metricKey}`;
			if (!(draftKey in drafts)) return; // nada tipeado

			const raw = drafts[draftKey] ?? "";
			const existing = findEntry(stateId, metricKey);
			const parsed = Number(raw);

			if (raw !== "" && Number.isNaN(parsed)) {
				setError("Solo números");
				return;
			}

			setSavingCell(draftKey as CellKey);
			setError(null);
			try {
				// Vacío o 0 sobre un valor existente = borrar. Mismo criterio que
				// el resto del panel de carga.
				if ((raw === "" || parsed === 0) && existing) {
					const res = await fetch(MANUAL_KPI_BY_ID_ENDPOINT(existing.id), {
						method: "DELETE",
						headers: { Authorization: `Bearer ${token}` },
					});
					if (!res.ok) throw new Error("No se pudo borrar");
				} else if (raw !== "" && parsed > 0) {
					const res = await fetch(MANUAL_KPIS_ENDPOINT, {
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							metricKey,
							periodStart: start,
							periodEnd: end,
							userId: null,
							stateId,
							value: parsed,
						}),
					});
					if (!res.ok) {
						const e = await res.json().catch(() => ({}));
						throw new Error(e.error || "No se pudo guardar");
					}
				}
				await loadEntries();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error al guardar");
			} finally {
				setSavingCell(null);
			}
		},
		[token, readOnly, drafts, findEntry, start, end, loadEntries],
	);

	// ── Totales ───────────────────────────────────────────────────────
	// "Totales generales" del punto 7.4: sirven de contralor de la gestión
	// de Marketing.
	const totals = useMemo(() => {
		let organicas = 0;
		let pagas = 0;
		for (const p of provinces) {
			organicas += numericValue(p.id, KEY_ORGANICAS);
			pagas += numericValue(p.id, KEY_PAGAS);
		}
		return { organicas, pagas, total: organicas + pagas };
	}, [provinces, numericValue]);

	// Con muchas provincias en cero la tabla se vuelve ilegible: en modo
	// lectura se muestran solo las que tienen algo cargado.
	const visibleProvinces = useMemo(() => {
		if (!readOnly) return provinces;
		return provinces.filter(
			(p) =>
				numericValue(p.id, KEY_ORGANICAS) > 0 ||
				numericValue(p.id, KEY_PAGAS) > 0,
		);
	}, [provinces, readOnly, numericValue]);

	const renderCell = (province: Province, metricKey: string) => {
		const draftKey = `${province.id}-${metricKey}`;
		const isSaving = savingCell === draftKey;

		if (readOnly) {
			return (
				<TableCell className="text-right tabular-nums">
					{numericValue(province.id, metricKey) || "—"}
				</TableCell>
			);
		}

		return (
			<TableCell className="text-right">
				<div className="relative">
					<Input
						type="number"
						min={0}
						inputMode="numeric"
						className="h-8 text-right tabular-nums"
						value={cellValue(province.id, metricKey)}
						onChange={(e) =>
							setDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }))
						}
						onBlur={() => saveCell(province.id, metricKey)}
						disabled={isSaving}
					/>
					{isSaving && (
						<Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
					)}
				</div>
			</TableCell>
		);
	};

	return (
		<div className="rounded-lg border border-border">
			<div className="border-b border-border p-4">
				<h3 className="text-sm font-semibold">
					Consultas por provincia — {pad(month)}/{year}
				</h3>
				<p className="text-xs text-muted-foreground">
					{readOnly
						? "Único dato manual del módulo. Se carga desde “Cargar valores”."
						: "Único dato manual del módulo: el nivel de “consultas” no sale del Back Office. Se guarda al salir de cada campo."}
				</p>
			</div>

			{error && (
				<p className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
					{error}
				</p>
			)}

			{loading ? (
				<div className="space-y-2 p-4">
					{Array.from({ length: 6 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
						<Skeleton key={i} className="h-8 w-full" />
					))}
				</div>
			) : visibleProvinces.length === 0 ? (
				<p className="p-6 text-center text-sm text-muted-foreground">
					{readOnly
						? "Todavía no se cargaron consultas para este mes."
						: "No hay provincias cargadas en el sistema."}
				</p>
			) : (
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Provincia</TableHead>
								<TableHead className="text-right">Orgánicas</TableHead>
								<TableHead className="text-right">Pagas</TableHead>
								<TableHead className="text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{visibleProvinces.map((p) => {
								const total =
									numericValue(p.id, KEY_ORGANICAS) +
									numericValue(p.id, KEY_PAGAS);
								return (
									<TableRow key={p.id}>
										<TableCell className="font-medium">{p.name}</TableCell>
										{renderCell(p, KEY_ORGANICAS)}
										{renderCell(p, KEY_PAGAS)}
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{total || "—"}
										</TableCell>
									</TableRow>
								);
							})}
							<TableRow className="border-t-2 font-semibold">
								<TableCell>Totales generales</TableCell>
								<TableCell className="text-right tabular-nums">
									{totals.organicas}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{totals.pagas}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{totals.total}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
