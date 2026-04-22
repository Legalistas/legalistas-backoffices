"use client";

import {
	AlertTriangle,
	Check,
	FileWarning,
	Loader2,
	Pencil,
	Plus,
	ShieldAlert,
	Trash2,
	X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	DISCIPLINARY_ACKNOWLEDGE_ENDPOINT,
	DISCIPLINARY_BY_ID_ENDPOINT,
	DISCIPLINARY_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";

type DisciplinaryType =
	| "VERBAL_WARNING"
	| "WRITTEN_WARNING"
	| "SUSPENSION"
	| "NOTE"
	| "TERMINATION";

type DisciplinarySeverity = "LOW" | "MEDIUM" | "HIGH";

interface DisciplinaryRecord {
	id: number;
	userId: number;
	type: DisciplinaryType;
	severity: DisciplinarySeverity;
	issuedAt: string;
	description: string;
	documentUrl: string | null;
	issuedById: number | null;
	acknowledged: boolean;
	createdAt: string;
	issuedBy?: { id: number; name: string; image: string | null } | null;
}

interface Stats {
	totalYear: number;
	openCount: number;
}

interface FormState {
	type: DisciplinaryType;
	severity: DisciplinarySeverity;
	issuedAt: string;
	description: string;
	documentUrl: string;
}

const EMPTY_FORM: FormState = {
	type: "VERBAL_WARNING",
	severity: "LOW",
	issuedAt: "",
	description: "",
	documentUrl: "",
};

const typeLabel: Record<DisciplinaryType, string> = {
	VERBAL_WARNING: "Llamado verbal",
	WRITTEN_WARNING: "Apercibimiento",
	SUSPENSION: "Suspensión",
	NOTE: "Nota al legajo",
	TERMINATION: "Desvinculación con causa",
};

const severityStyle: Record<
	DisciplinarySeverity,
	{ label: string; className: string }
> = {
	LOW: {
		label: "Baja",
		className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
	},
	MEDIUM: {
		label: "Media",
		className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
	},
	HIGH: {
		label: "Alta",
		className: "bg-destructive/10 text-destructive border-destructive/20",
	},
};

const typeIcon: Record<DisciplinaryType, typeof AlertTriangle> = {
	VERBAL_WARNING: AlertTriangle,
	WRITTEN_WARNING: FileWarning,
	SUSPENSION: ShieldAlert,
	NOTE: FileWarning,
	TERMINATION: ShieldAlert,
};

const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

const toInputDate = (iso: string) => iso.slice(0, 10);

interface DisciplinaryTabProps {
	userId: number;
}

export default function DisciplinaryTab({ userId }: DisciplinaryTabProps) {
	const { data: session } = useSession();
	const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
	const [stats, setStats] = useState<Stats>({ totalYear: 0, openCount: 0 });
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);

	const token = session?.user?.accessToken;

	const loadRecords = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const res = await fetch(DISCIPLINARY_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setRecords(json.data || []);
			setStats(json.stats || { totalYear: 0, openCount: 0 });
		} catch {
			toast.error("Error al cargar el legajo");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (userId && token) loadRecords();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, token]);

	const openCreateForm = () => {
		const today = new Date();
		setEditingId(null);
		setForm({
			...EMPTY_FORM,
			issuedAt: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
		});
		setFormOpen(true);
	};

	const openEditForm = (r: DisciplinaryRecord) => {
		setEditingId(r.id);
		setForm({
			type: r.type,
			severity: r.severity,
			issuedAt: toInputDate(r.issuedAt),
			description: r.description,
			documentUrl: r.documentUrl || "",
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
		if (!form.issuedAt || !form.description.trim()) {
			toast.error("Fecha y descripción son obligatorias");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				...form,
				documentUrl: form.documentUrl || null,
			};
			const url = editingId
				? DISCIPLINARY_BY_ID_ENDPOINT(editingId)
				: DISCIPLINARY_BY_USER_ENDPOINT(userId);
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

	const handleAcknowledge = async (r: DisciplinaryRecord) => {
		if (!token) return;
		if (!confirm("¿Marcar como notificado / firmado por el empleado?")) return;
		try {
			const res = await fetch(DISCIPLINARY_ACKNOWLEDGE_ENDPOINT(r.id), {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Notificación firmada");
			loadRecords();
		} catch {
			toast.error("Error al actualizar");
		}
	};

	const handleDelete = async (r: DisciplinaryRecord) => {
		if (!token) return;
		if (!confirm(`¿Eliminar el registro de ${typeLabel[r.type]}?`)) return;
		try {
			const res = await fetch(DISCIPLINARY_BY_ID_ENDPOINT(r.id), {
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
			{/* Stats */}
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
					<div className="flex items-center gap-2">
						<FileWarning className="h-4 w-4 text-amber-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Sanciones del año
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.totalYear}
					</p>
				</div>
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 text-destructive" />
						<span className="text-xs font-medium text-muted-foreground">
							Sin firmar
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.openCount}
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Historial</p>
					<p className="text-xs text-muted-foreground">
						Sanciones, apercibimientos y notas al legajo
					</p>
				</div>
				{!formOpen && (
					<Button size="sm" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Nuevo registro
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							{editingId ? "Editar registro" : "Nuevo registro"}
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
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">Tipo *</Label>
							<Select
								value={form.type}
								onValueChange={(v) => setF("type", v as DisciplinaryType)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="VERBAL_WARNING">Llamado verbal</SelectItem>
									<SelectItem value="WRITTEN_WARNING">Apercibimiento escrito</SelectItem>
									<SelectItem value="SUSPENSION">Suspensión</SelectItem>
									<SelectItem value="NOTE">Nota al legajo</SelectItem>
									<SelectItem value="TERMINATION">Desvinculación con causa</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Gravedad</Label>
							<Select
								value={form.severity}
								onValueChange={(v) => setF("severity", v as DisciplinarySeverity)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="LOW">Baja</SelectItem>
									<SelectItem value="MEDIUM">Media</SelectItem>
									<SelectItem value="HIGH">Alta</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Fecha *</Label>
							<Input
								type="date"
								value={form.issuedAt}
								onChange={(e) => setF("issuedAt", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">URL del documento</Label>
							<Input
								value={form.documentUrl}
								onChange={(e) => setF("documentUrl", e.target.value)}
								placeholder="https://..."
							/>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">Descripción / motivo *</Label>
							<Textarea
								rows={3}
								value={form.description}
								onChange={(e) => setF("description", e.target.value)}
								placeholder="Detalle del hecho, fecha, contexto, testigos..."
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
			) : records.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
						<FileWarning className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">Sin registros en el legajo</p>
				</div>
			) : (
				<div className="space-y-2 max-h-[45vh] overflow-y-auto">
					{records.map((r) => {
						const sev = severityStyle[r.severity];
						const Icon = typeIcon[r.type];
						return (
							<div
								key={r.id}
								className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
							>
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
										<Icon className="h-4 w-4 text-amber-600" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<p className="text-sm font-medium text-foreground">
												{typeLabel[r.type]}
											</p>
											<Badge
												variant="outline"
												className={`text-[10px] ${sev.className}`}
											>
												{sev.label}
											</Badge>
											{r.acknowledged ? (
												<Badge
													variant="outline"
													className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
												>
													<Check className="h-2.5 w-2.5 mr-0.5" />
													Firmado
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="text-[10px] bg-destructive/10 text-destructive border-destructive/20"
												>
													Sin firmar
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground mt-0.5">
											{formatDate(r.issuedAt)}
											{r.issuedBy && ` · emitido por ${r.issuedBy.name}`}
										</p>
										<p className="text-xs text-foreground mt-1.5 whitespace-pre-wrap">
											{r.description}
										</p>
										{r.documentUrl && (
											<a
												href={r.documentUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-primary hover:underline mt-1 inline-block"
											>
												Ver documento →
											</a>
										)}
									</div>
								</div>
								<div className="flex items-center gap-0.5 shrink-0">
									{!r.acknowledged && (
										<Button
											size="icon"
											variant="ghost"
											onClick={() => handleAcknowledge(r)}
											title="Marcar firmado"
											className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
										>
											<Check className="h-3.5 w-3.5" />
										</Button>
									)}
									<Button
										size="icon"
										variant="ghost"
										onClick={() => openEditForm(r)}
										title="Editar"
										className="h-8 w-8"
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => handleDelete(r)}
										title="Eliminar"
										className="h-8 w-8 text-destructive hover:text-destructive"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
