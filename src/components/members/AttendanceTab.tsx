"use client";

import { Clock, Loader2, LogIn, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	ATTENDANCE_BY_ID_ENDPOINT,
	ATTENDANCE_BY_USER_ENDPOINT,
	ATTENDANCE_TOGGLE_ENDPOINT,
} from "@/constant/api-endpoints";

interface AttendanceRecord {
	id: number;
	userId: number;
	checkIn: string;
	checkOut: string | null;
	durationSecs: number | null;
	overtimeSecs: number | null;
	source: "MANUAL" | "LOGIN_DERIVED" | "BIOMETRIC" | "IMPORT";
	notes: string | null;
}

interface FormState {
	date: string;
	checkInTime: string;
	checkOutTime: string;
	notes: string;
}

const EMPTY_FORM: FormState = {
	date: "",
	checkInTime: "",
	checkOutTime: "",
	notes: "",
};

const formatSecs = (secs: number | null | undefined) => {
	if (!secs) return "0m";
	const h = Math.floor(secs / 3600);
	const m = Math.floor((secs % 3600) / 60);
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
};

const formatHour = (iso: string) =>
	new Date(iso).toLocaleTimeString("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
	});

const dayKeyOf = (iso: string) => {
	const d = new Date(iso);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const labelForDay = (iso: string) => {
	const d = new Date(iso);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	const k = dayKeyOf(iso);
	if (k === dayKeyOf(today.toISOString())) return "Hoy";
	if (k === dayKeyOf(yesterday.toISOString())) return "Ayer";
	return d.toLocaleDateString("es-AR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
};

const toDateTimeLocal = (dateStr: string, timeStr: string): string => {
	if (!dateStr || !timeStr) return "";
	return `${dateStr}T${timeStr}:00`;
};

interface AttendanceTabProps {
	userId: number;
}

export default function AttendanceTab({ userId }: AttendanceTabProps) {
	const { data: session } = useSession();
	const [records, setRecords] = useState<AttendanceRecord[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isToggling, setIsToggling] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [isSaving, setIsSaving] = useState(false);

	const token = session?.user?.accessToken;

	const loadRecords = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const res = await fetch(ATTENDANCE_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setRecords(json.data || []);
		} catch {
			toast.error("Error al cargar asistencia");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (userId && token) loadRecords();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, token]);

	const openRecord = useMemo(
		() => records.find((r) => !r.checkOut) || null,
		[records],
	);

	const groupedByDay = useMemo(() => {
		const byDay = new Map<string, AttendanceRecord[]>();
		for (const r of records) {
			const key = dayKeyOf(r.checkIn);
			const bucket = byDay.get(key) ?? [];
			bucket.push(r);
			byDay.set(key, bucket);
		}
		const groups = Array.from(byDay.entries()).map(([dayKey, sessions]) => {
			const asc = [...sessions].sort(
				(a, b) =>
					new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
			);
			const totalSecs = asc.reduce((acc, r) => acc + (r.durationSecs || 0), 0);
			const overtimeSecs = asc.reduce(
				(acc, r) => acc + (r.overtimeSecs || 0),
				0,
			);
			return {
				dayKey,
				label: labelForDay(asc[0].checkIn),
				totalSecs,
				overtimeSecs,
				sessions: asc,
			};
		});
		groups.sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
		return groups;
	}, [records]);

	const handleToggle = async () => {
		if (!token) return;
		setIsToggling(true);
		try {
			const res = await fetch(ATTENDANCE_TOGGLE_ENDPOINT(userId), {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			toast.success(
				json.action === "checked-in"
					? "Entrada registrada"
					: "Salida registrada",
			);
			loadRecords();
		} catch {
			toast.error("Error al registrar asistencia");
		} finally {
			setIsToggling(false);
		}
	};

	const openCreateForm = () => {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setFormOpen(true);
	};

	const openEditForm = (r: AttendanceRecord) => {
		const d = new Date(r.checkIn);
		const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		const checkInTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		let checkOutTime = "";
		if (r.checkOut) {
			const o = new Date(r.checkOut);
			checkOutTime = `${String(o.getHours()).padStart(2, "0")}:${String(o.getMinutes()).padStart(2, "0")}`;
		}
		setEditingId(r.id);
		setForm({
			date,
			checkInTime,
			checkOutTime,
			notes: r.notes || "",
		});
		setFormOpen(true);
	};

	const closeForm = () => {
		setFormOpen(false);
		setEditingId(null);
		setForm(EMPTY_FORM);
	};

	const handleSave = async () => {
		if (!token) return;
		if (!form.date || !form.checkInTime) {
			toast.error("Fecha y hora de entrada son obligatorios");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				checkIn: toDateTimeLocal(form.date, form.checkInTime),
				checkOut: form.checkOutTime
					? toDateTimeLocal(form.date, form.checkOutTime)
					: null,
				notes: form.notes || null,
			};
			const url = editingId
				? ATTENDANCE_BY_ID_ENDPOINT(editingId)
				: ATTENDANCE_BY_USER_ENDPOINT(userId);
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error();
			toast.success(editingId ? "Registro actualizado" : "Registro creado");
			closeForm();
			loadRecords();
		} catch {
			toast.error("Error al guardar");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (r: AttendanceRecord) => {
		if (!token) return;
		if (
			!confirm(
				`¿Eliminar el registro del ${new Date(r.checkIn).toLocaleString("es-AR")}?`,
			)
		)
			return;
		try {
			const res = await fetch(ATTENDANCE_BY_ID_ENDPOINT(r.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Registro eliminado");
			loadRecords();
		} catch {
			toast.error("Error al eliminar");
		}
	};

	const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
		setForm((s) => ({ ...s, [k]: v }));

	return (
		<div className="space-y-4 py-2">
			{/* Clock in/out big button */}
			<div
				className={`flex items-center justify-between gap-3 p-4 rounded-lg border-2 ${openRecord ? "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20" : "border-border bg-muted/20"}`}
			>
				<div className="flex items-center gap-3">
					<div
						className={`flex h-10 w-10 items-center justify-center rounded-full ${openRecord ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}
					>
						<Clock className="h-5 w-5" />
					</div>
					<div>
						{openRecord ? (
							<>
								<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
									En jornada
								</p>
								<p className="text-xs text-muted-foreground">
									Desde {formatHour(openRecord.checkIn)}
								</p>
							</>
						) : (
							<>
								<p className="text-sm font-semibold text-foreground">
									Fuera de jornada
								</p>
								<p className="text-xs text-muted-foreground">
									No hay sesión abierta
								</p>
							</>
						)}
					</div>
				</div>
				<Button
					onClick={handleToggle}
					disabled={isToggling}
					variant={openRecord ? "destructive" : "default"}
				>
					{isToggling ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : openRecord ? (
						<LogOut className="h-4 w-4 mr-2" />
					) : (
						<LogIn className="h-4 w-4 mr-2" />
					)}
					{openRecord ? "Registrar salida" : "Registrar entrada"}
				</Button>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Historial</p>
					<p className="text-xs text-muted-foreground">
						Agrupado por día · 8h estándar, excedente cuenta como extra
					</p>
				</div>
				{!formOpen && (
					<Button size="sm" variant="outline" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Cargar entrada manual
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							{editingId ? "Editar registro" : "Nuevo registro manual"}
						</p>
						<Button
							size="icon"
							variant="ghost"
							onClick={closeForm}
							className="h-7 w-7"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">Fecha *</Label>
							<Input
								type="date"
								value={form.date}
								onChange={(e) => setF("date", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Entrada *</Label>
							<Input
								type="time"
								value={form.checkInTime}
								onChange={(e) => setF("checkInTime", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Salida</Label>
							<Input
								type="time"
								value={form.checkOutTime}
								onChange={(e) => setF("checkOutTime", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5 md:col-span-3">
							<Label className="text-xs">Notas</Label>
							<Input
								value={form.notes}
								onChange={(e) => setF("notes", e.target.value)}
								placeholder="Observaciones..."
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={closeForm} disabled={isSaving}>
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{editingId ? "Guardar" : "Crear"}
						</Button>
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : groupedByDay.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
						<Clock className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">Sin registros todavía</p>
				</div>
			) : (
				<div className="space-y-4 max-h-[45vh] overflow-y-auto">
					{groupedByDay.map((g) => (
						<div key={g.dayKey} className="space-y-2">
							<div className="flex flex-wrap items-center justify-between gap-2 px-1">
								<span className="text-xs font-semibold text-foreground capitalize">
									{g.label}
								</span>
								<div className="flex items-center gap-2">
									<span className="text-[11px] text-muted-foreground">
										Total: <span className="font-medium text-foreground">{formatSecs(g.totalSecs)}</span>
									</span>
									{g.overtimeSecs > 0 && (
										<Badge
											variant="outline"
											className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
										>
											+{formatSecs(g.overtimeSecs)} extra
										</Badge>
									)}
								</div>
							</div>
							<div className="space-y-1.5">
								{g.sessions.map((r) => {
									const isOpen = !r.checkOut;
									return (
										<div
											key={r.id}
											className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm ${isOpen ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-border hover:bg-muted/30"} transition-colors`}
										>
											<div className="flex items-center gap-2 min-w-0 flex-1">
												<Clock
													className={`h-3.5 w-3.5 shrink-0 ${isOpen ? "text-emerald-600" : "text-muted-foreground"}`}
												/>
												<span className="font-mono">
													{formatHour(r.checkIn)} →{" "}
													{r.checkOut ? formatHour(r.checkOut) : "en curso"}
												</span>
												{r.durationSecs !== null && (
													<span className="text-xs text-muted-foreground">
														· {formatSecs(r.durationSecs)}
													</span>
												)}
												{r.notes && (
													<span className="text-xs text-muted-foreground italic truncate">
														· {r.notes}
													</span>
												)}
											</div>
											<div className="flex items-center gap-0.5 shrink-0">
												<Button
													size="icon"
													variant="ghost"
													onClick={() => openEditForm(r)}
													title="Editar"
													className="h-7 w-7"
												>
													<Pencil className="h-3 w-3" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleDelete(r)}
													title="Eliminar"
													className="h-7 w-7 text-destructive hover:text-destructive"
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
