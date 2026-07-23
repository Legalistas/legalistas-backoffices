"use client";

import {
	CalendarDays,
	Check,
	CheckCircle2,
	CircleAlert,
	Loader2,
	Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	MANUAL_KPI_BY_ID_ENDPOINT,
	MANUAL_KPIS_CATALOG_ENDPOINT,
	MANUAL_KPIS_ENDPOINT,
	LAWYERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import type {
	ManualKpiArea,
	ManualKpiDef,
	ManualKpiEntry,
} from "@/types/kpi";

// ── Helpers de período ─────────────────────────────────────────────────────

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Devuelve el rango [start, end] del mes que contiene `date`. */
function monthRange(date: Date): { start: string; end: string } {
	const start = new Date(date.getFullYear(), date.getMonth(), 1);
	const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
	return { start: toISODate(start), end: toISODate(end) };
}

/** Devuelve el rango [lunes, domingo] de la semana ISO que contiene `date`. */
function weekRange(date: Date): { start: string; end: string } {
	const d = new Date(date);
	const day = (d.getDay() + 6) % 7; // 0 = lunes … 6 = domingo
	const monday = new Date(d);
	monday.setDate(d.getDate() - day);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	return { start: toISODate(monday), end: toISODate(sunday) };
}

function formatRange(start: string, end: string): string {
	const s = new Date(start);
	const e = new Date(end);
	return `${pad(s.getDate())}/${pad(s.getMonth() + 1)} — ${pad(e.getDate())}/${pad(e.getMonth() + 1)}/${e.getFullYear()}`;
}

// ── Componente ────────────────────────────────────────────────────────────

const AREA_LABELS: Record<ManualKpiArea, string> = {
	sales: "Ventas",
	legal: "Legales",
	cx: "Experiencia de cliente",
};

interface LawyerOption {
	id: number;
	name: string;
}

export default function ManualKpiPanel() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const { confirm, ConfirmationDialog } = useConfirm();

	const [catalog, setCatalog] = useState<ManualKpiDef[]>([]);
	const [entries, setEntries] = useState<ManualKpiEntry[]>([]);
	const [users, setUsers] = useState<LawyerOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [area, setArea] = useState<ManualKpiArea>("sales");
	const [referenceDate, setReferenceDate] = useState<string>(
		toISODate(new Date()),
	);

	// Carga inicial: catálogo + users del staff (para el dropdown de perUser).
	const bootstrap = useCallback(async () => {
		if (!token) return;
		try {
			const [catRes, usersRes] = await Promise.all([
				fetch(MANUAL_KPIS_CATALOG_ENDPOINT, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(`${LAWYERS_ENDPOINT}?limit=100`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);
			if (!catRes.ok) throw new Error("Error al cargar catálogo");
			const catData = await catRes.json();
			setCatalog(catData.catalog || []);

			if (usersRes.ok) {
				const usersData = await usersRes.json();
				// `LAWYERS_ENDPOINT` = /users/lawyers → payload { data: users[] } (paginado)
				const raw = usersData.data || usersData.users || [];
				setUsers(
					raw.map((u: { id: number; name: string }) => ({
						id: u.id,
						name: u.name,
					})),
				);
			}
		} catch (err) {
			toast.error((err as Error).message);
		}
	}, [token]);

	useEffect(() => {
		bootstrap();
	}, [bootstrap]);

	// Recargar entries cuando cambia el área o el período de referencia.
	const fetchEntries = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			// Rango amplio: desde el inicio del mes hasta el fin del mes actual.
			// Cubre semanas y meses que caen dentro. El backend filtra por metric via area.
			const { start, end } = monthRange(new Date(referenceDate));
			const url = `${MANUAL_KPIS_ENDPOINT}?area=${area}&from=${start}&to=${end}`;
			const res = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Error al cargar entries");
			const data = await res.json();
			setEntries(data.entries || []);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [token, area, referenceDate]);

	useEffect(() => {
		fetchEntries();
	}, [fetchEntries]);

	const kpisOfArea = useMemo(
		() => catalog.filter((k) => k.area === area),
		[catalog, area],
	);

	const handleDelete = async (entry: ManualKpiEntry) => {
		const ok = await confirm({
			title: "Eliminar registro?",
			description: `Vas a borrar el valor cargado para "${
				catalog.find((k) => k.key === entry.metricKey)?.label ?? entry.metricKey
			}" del período ${formatRange(entry.periodStart, entry.periodEnd)}.`,
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			const res = await fetch(MANUAL_KPI_BY_ID_ENDPOINT(entry.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Error al eliminar");
			toast.success("Eliminado");
			fetchEntries();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			{/* Selector de área */}
			<Tabs value={area} onValueChange={(v) => setArea(v as ManualKpiArea)}>
				<TabsList>
					<TabsTrigger value="sales">Ventas</TabsTrigger>
					<TabsTrigger value="legal">Legales</TabsTrigger>
					<TabsTrigger value="cx">CX</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Selector de fecha de referencia */}
			<div className="flex items-center gap-3">
				<CalendarDays className="h-4 w-4 text-muted-foreground" />
				<Label className="text-sm">Fecha de referencia:</Label>
				<Input
					type="date"
					className="max-w-[180px]"
					value={referenceDate}
					onChange={(e) => setReferenceDate(e.target.value)}
				/>
				<p className="text-xs text-muted-foreground">
					El período (semana o mes) se calcula automáticamente según el KPI.
				</p>
			</div>

			{/* Formularios por KPI */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{kpisOfArea.map((def) => (
					<KpiForm
						key={def.key}
						def={def}
						referenceDate={referenceDate}
						users={users}
						token={token}
						entries={entries}
						onSaved={fetchEntries}
					/>
				))}
			</div>

			{/* Historial reciente */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						Cargas del mes — {AREA_LABELS[area]}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex justify-center py-6">
							<Loader2 className="animate-spin h-5 w-5" />
						</div>
					) : entries.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							No hay cargas en el período seleccionado.
						</p>
					) : (
						<div className="divide-y">
							{entries.map((e) => {
								const def = catalog.find((k) => k.key === e.metricKey);
								return (
									<div
										key={e.id}
										className="flex items-center justify-between py-2 gap-3"
									>
										<div className="flex-1 min-w-0">
											<div className="font-medium truncate">
												{def?.label ?? e.metricKey}
											</div>
											<div className="text-xs text-muted-foreground">
												{formatRange(e.periodStart, e.periodEnd)}
												{e.user ? ` · ${e.user.name}` : ""}
												{e.createdBy ? ` · cargó ${e.createdBy.name}` : ""}
											</div>
										</div>
										<div className="text-lg font-semibold tabular-nums">
											{Number(e.value).toLocaleString("es-AR")}
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDelete(e)}
										>
											<Trash2 className="h-4 w-4 text-destructive" />
										</Button>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{ConfirmationDialog}
		</div>
	);
}

// ── Formulario individual por KPI (autoguardado) ──────────────────────────

interface KpiFormProps {
	def: ManualKpiDef;
	referenceDate: string;
	users: LawyerOption[];
	token: string | undefined;
	entries: ManualKpiEntry[];
	onSaved: () => void;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_DEBOUNCE_MS = 1000;

function KpiForm({
	def,
	referenceDate,
	users,
	token,
	entries,
	onSaved,
}: KpiFormProps) {
	const [value, setValue] = useState("");
	const [notes, setNotes] = useState("");
	const [userId, setUserId] = useState<string>("");
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const { start, end } = useMemo(() => {
		const d = new Date(referenceDate);
		return def.periodType === "WEEKLY" ? weekRange(d) : monthRange(d);
	}, [def.periodType, referenceDate]);

	// Buscar el entry existente para (metricKey, periodStart, userId) y
	// prellenar el form. Se recalcula cuando cambian entries / start / userId.
	const existing = useMemo(() => {
		return entries.find(
			(e) =>
				e.metricKey === def.key &&
				e.periodStart.slice(0, 10) === start &&
				(def.perUser
					? String(e.userId ?? "") === userId
					: e.userId == null),
		);
	}, [entries, def.key, def.perUser, start, userId]);

	// Hidrata el form desde el entry existente. Solo dispara cuando cambia el
	// entry match (o al montar). Marca `idle` — no `dirty` — porque no es una
	// edición del usuario.
	useEffect(() => {
		if (existing) {
			setValue(String(existing.value));
			setNotes(existing.notes ?? "");
		} else {
			setValue("");
			setNotes("");
		}
		setSaveState("idle");
		setErrorMsg(null);
	}, [existing]);

	// Marca dirty cuando el usuario cambia algo respecto al existing.
	const markDirty = () => {
		setSaveState("dirty");
		setErrorMsg(null);
	};

	// Autosave debounced. Se dispara SOLO cuando saveState === "dirty".
	useEffect(() => {
		if (saveState !== "dirty" || !token) return;

		// Validaciones locales: si no cumple, no guardar (mantener dirty).
		if (value === "" || Number.isNaN(Number(value))) return;
		if (def.perUser && !userId) return;

		const timer = setTimeout(async () => {
			setSaveState("saving");
			try {
				// Regla UX: value=0 (y sin notas) sobre un entry existente = borrar.
				// Así el usuario limpia sin ir al botón de basura. Si no existía y
				// pone 0, no hacemos nada — no crear un entry vacío.
				const isZero = Number(value) === 0 && !notes;
				if (isZero) {
					if (existing) {
						const res = await fetch(MANUAL_KPI_BY_ID_ENDPOINT(existing.id), {
							method: "DELETE",
							headers: { Authorization: `Bearer ${token}` },
						});
						if (!res.ok) {
							const e = await res.json().catch(() => ({}));
							throw new Error(e.error || "Error al eliminar");
						}
					}
					// existing == null y value=0: no-op (no crear registro vacío).
					setSaveState("saved");
					onSaved();
					setTimeout(() => {
						setSaveState((s) => (s === "saved" ? "idle" : s));
					}, 2000);
					return;
				}

				const res = await fetch(MANUAL_KPIS_ENDPOINT, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						metricKey: def.key,
						periodStart: start,
						periodEnd: end,
						userId: def.perUser ? Number(userId) : null,
						value: Number(value),
						notes: notes || null,
					}),
				});
				if (!res.ok) {
					const e = await res.json().catch(() => ({}));
					throw new Error(e.error || "Error al guardar");
				}
				setSaveState("saved");
				onSaved();
				// Después de 2s vuelve a idle (limpia el "Guardado ✓").
				setTimeout(() => {
					setSaveState((s) => (s === "saved" ? "idle" : s));
				}, 2000);
			} catch (err) {
				setSaveState("error");
				setErrorMsg((err as Error).message);
			}
		}, AUTOSAVE_DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [saveState, value, notes, userId, def, start, end, token, onSaved, existing]);

	const statusPill = () => {
		switch (saveState) {
			case "saving":
				return (
					<span className="text-xs text-muted-foreground flex items-center gap-1">
						<Loader2 className="h-3 w-3 animate-spin" /> Guardando…
					</span>
				);
			case "saved":
				return (
					<span className="text-xs text-green-600 flex items-center gap-1">
						<Check className="h-3 w-3" /> Guardado
					</span>
				);
			case "dirty":
				return (
					<span className="text-xs text-amber-600 flex items-center gap-1">
						<CircleAlert className="h-3 w-3" /> Sin guardar
					</span>
				);
			case "error":
				return (
					<span className="text-xs text-destructive flex items-center gap-1">
						<CircleAlert className="h-3 w-3" /> {errorMsg}
					</span>
				);
			default:
				return existing ? (
					<span className="text-xs text-muted-foreground flex items-center gap-1">
						<Check className="h-3 w-3" /> Ya cargado
					</span>
				) : null;
		}
	};

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="text-sm">{def.label}</CardTitle>
						<p className="text-xs text-muted-foreground">
							{def.periodType === "WEEKLY" ? "Semana " : "Mes "}
							{formatRange(start, end)}
							{def.perUser ? " · por vendedora/abogado" : " · global"}
						</p>
					</div>
					{statusPill()}
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				{def.perUser && (
					<div>
						<Label className="text-xs text-muted-foreground">Usuario</Label>
						<Select
							value={userId}
							onValueChange={(v) => {
								setUserId(v);
								// El useEffect de hidratación va a resetear el form si hay
								// entry para ese usuario. No marcamos dirty acá.
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Seleccionar…" />
							</SelectTrigger>
							<SelectContent>
								{users.map((u) => (
									<SelectItem key={u.id} value={String(u.id)}>
										{u.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
				<div>
					<Label className="text-xs text-muted-foreground">Valor</Label>
					<Input
						type="number"
						min={0}
						value={value}
						onChange={(e) => {
							setValue(e.target.value);
							markDirty();
						}}
						placeholder="0"
					/>
				</div>
				<div>
					<Label className="text-xs text-muted-foreground">
						Notas (opcional)
					</Label>
					<Textarea
						rows={2}
						value={notes}
						onChange={(e) => {
							setNotes(e.target.value);
							markDirty();
						}}
					/>
				</div>
				{def.description && (
					<p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
						<CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
						{def.description}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
