"use client";

import {
	Award,
	BookOpen,
	Clock3,
	GraduationCap,
	Loader2,
	Pencil,
	Plus,
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
	TRAINING_BY_ID_ENDPOINT,
	TRAININGS_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";

type TrainingCategory =
	| "COURSE"
	| "CERTIFICATION"
	| "WORKSHOP"
	| "SEMINAR"
	| "OTHER";

type TrainingStatus =
	| "PLANNED"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "EXPIRED"
	| "CANCELLED";

interface Training {
	id: number;
	userId: number;
	title: string;
	provider: string | null;
	category: TrainingCategory;
	status: TrainingStatus;
	startDate: string | null;
	endDate: string | null;
	expirationDate: string | null;
	durationHours: number | null;
	cost: string | null;
	documentUrl: string | null;
	notes: string | null;
	createdAt: string;
}

interface Stats {
	completedYear: number;
	inProgressCount: number;
	expiringSoonCount: number;
}

interface FormState {
	title: string;
	provider: string;
	category: TrainingCategory;
	status: TrainingStatus;
	startDate: string;
	endDate: string;
	expirationDate: string;
	durationHours: string;
	cost: string;
	documentUrl: string;
	notes: string;
}

const EMPTY_FORM: FormState = {
	title: "",
	provider: "",
	category: "COURSE",
	status: "PLANNED",
	startDate: "",
	endDate: "",
	expirationDate: "",
	durationHours: "",
	cost: "",
	documentUrl: "",
	notes: "",
};

const categoryLabel: Record<TrainingCategory, string> = {
	COURSE: "Curso",
	CERTIFICATION: "Certificación",
	WORKSHOP: "Taller",
	SEMINAR: "Seminario",
	OTHER: "Otro",
};

const categoryIcon: Record<TrainingCategory, typeof BookOpen> = {
	COURSE: BookOpen,
	CERTIFICATION: Award,
	WORKSHOP: GraduationCap,
	SEMINAR: GraduationCap,
	OTHER: BookOpen,
};

const statusStyle: Record<
	TrainingStatus,
	{ label: string; className: string }
> = {
	PLANNED: {
		label: "Planificado",
		className: "bg-muted text-muted-foreground border-border",
	},
	IN_PROGRESS: {
		label: "En curso",
		className:
			"bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
	},
	COMPLETED: {
		label: "Completado",
		className:
			"bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
	},
	EXPIRED: {
		label: "Vencido",
		className: "bg-destructive/10 text-destructive border-destructive/20",
	},
	CANCELLED: {
		label: "Cancelado",
		className: "bg-muted text-muted-foreground border-border line-through",
	},
};

const formatDate = (iso: string | null) =>
	iso
		? new Date(iso).toLocaleDateString("es-AR", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			})
		: "—";

const toInputDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

const daysUntil = (iso: string | null): number | null => {
	if (!iso) return null;
	const diff = new Date(iso).getTime() - Date.now();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

interface TrainingsTabProps {
	userId: number;
}

export default function TrainingsTab({ userId }: TrainingsTabProps) {
	const { data: session } = useSession();
	const [trainings, setTrainings] = useState<Training[]>([]);
	const [stats, setStats] = useState<Stats>({
		completedYear: 0,
		inProgressCount: 0,
		expiringSoonCount: 0,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);

	const token = session?.user?.accessToken;

	const loadTrainings = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const res = await fetch(TRAININGS_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setTrainings(json.data || []);
			setStats(
				json.stats || {
					completedYear: 0,
					inProgressCount: 0,
					expiringSoonCount: 0,
				},
			);
		} catch {
			toast.error("Error al cargar capacitaciones");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (userId && token) loadTrainings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, token]);

	const openCreateForm = () => {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setFormOpen(true);
	};

	const openEditForm = (t: Training) => {
		setEditingId(t.id);
		setForm({
			title: t.title,
			provider: t.provider || "",
			category: t.category,
			status: t.status,
			startDate: toInputDate(t.startDate),
			endDate: toInputDate(t.endDate),
			expirationDate: toInputDate(t.expirationDate),
			durationHours: t.durationHours?.toString() || "",
			cost: t.cost?.toString() || "",
			documentUrl: t.documentUrl || "",
			notes: t.notes || "",
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
		if (!form.title.trim()) {
			toast.error("El título es obligatorio");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				...form,
				startDate: form.startDate || null,
				endDate: form.endDate || null,
				expirationDate: form.expirationDate || null,
				durationHours: form.durationHours || null,
				cost: form.cost || null,
				documentUrl: form.documentUrl || null,
				notes: form.notes || null,
			};
			const url = editingId
				? TRAINING_BY_ID_ENDPOINT(editingId)
				: TRAININGS_BY_USER_ENDPOINT(userId);
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error();
			toast.success(editingId ? "Capacitación actualizada" : "Capacitación creada");
			closeForm();
			loadTrainings();
		} catch {
			toast.error("Error al guardar");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (t: Training) => {
		if (!token) return;
		if (!confirm(`¿Eliminar "${t.title}"?`)) return;
		try {
			const res = await fetch(TRAINING_BY_ID_ENDPOINT(t.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Capacitación eliminada");
			loadTrainings();
		} catch {
			toast.error("Error al eliminar");
		}
	};

	const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
		setForm((s) => ({ ...s, [k]: v }));

	return (
		<div className="space-y-4 py-2">
			{/* Stats */}
			<div className="grid grid-cols-3 gap-3">
				<div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
					<div className="flex items-center gap-2">
						<GraduationCap className="h-4 w-4 text-emerald-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Completadas año
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.completedYear}
					</p>
				</div>
				<div className="rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 p-3">
					<div className="flex items-center gap-2">
						<BookOpen className="h-4 w-4 text-blue-600" />
						<span className="text-xs font-medium text-muted-foreground">
							En curso
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.inProgressCount}
					</p>
				</div>
				<div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
					<div className="flex items-center gap-2">
						<Clock3 className="h-4 w-4 text-amber-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Vencen &lt;30d
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.expiringSoonCount}
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Historial</p>
					<p className="text-xs text-muted-foreground">
						Cursos, certificaciones y vencimientos
					</p>
				</div>
				{!formOpen && (
					<Button size="sm" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Nueva capacitación
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							{editingId ? "Editar capacitación" : "Nueva capacitación"}
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
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">Título *</Label>
							<Input
								value={form.title}
								onChange={(e) => setF("title", e.target.value)}
								placeholder="Especialización en contratos laborales"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Proveedor / Institución</Label>
							<Input
								value={form.provider}
								onChange={(e) => setF("provider", e.target.value)}
								placeholder="Universidad Austral, Coursera..."
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Categoría</Label>
							<Select
								value={form.category}
								onValueChange={(v) => setF("category", v as TrainingCategory)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="COURSE">Curso</SelectItem>
									<SelectItem value="CERTIFICATION">Certificación</SelectItem>
									<SelectItem value="WORKSHOP">Taller</SelectItem>
									<SelectItem value="SEMINAR">Seminario</SelectItem>
									<SelectItem value="OTHER">Otro</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Estado</Label>
							<Select
								value={form.status}
								onValueChange={(v) => setF("status", v as TrainingStatus)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="PLANNED">Planificado</SelectItem>
									<SelectItem value="IN_PROGRESS">En curso</SelectItem>
									<SelectItem value="COMPLETED">Completado</SelectItem>
									<SelectItem value="EXPIRED">Vencido</SelectItem>
									<SelectItem value="CANCELLED">Cancelado</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Horas</Label>
							<Input
								type="number"
								min="0"
								value={form.durationHours}
								onChange={(e) => setF("durationHours", e.target.value)}
								placeholder="40"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Inicio</Label>
							<Input
								type="date"
								value={form.startDate}
								onChange={(e) => setF("startDate", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Fin</Label>
							<Input
								type="date"
								value={form.endDate}
								onChange={(e) => setF("endDate", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Vence</Label>
							<Input
								type="date"
								value={form.expirationDate}
								onChange={(e) => setF("expirationDate", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Costo (ARS)</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.cost}
								onChange={(e) => setF("cost", e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">URL del certificado</Label>
							<Input
								value={form.documentUrl}
								onChange={(e) => setF("documentUrl", e.target.value)}
								placeholder="https://..."
							/>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">Notas</Label>
							<Textarea
								rows={2}
								value={form.notes}
								onChange={(e) => setF("notes", e.target.value)}
								placeholder="Contenido, profesor, etc..."
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
			) : trainings.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
						<GraduationCap className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">
						Sin capacitaciones cargadas
					</p>
				</div>
			) : (
				<div className="space-y-2 max-h-[45vh] overflow-y-auto">
					{trainings.map((t) => {
						const Icon = categoryIcon[t.category];
						const status = statusStyle[t.status];
						const daysToExpire = daysUntil(t.expirationDate);
						const expiringSoon =
							daysToExpire !== null &&
							daysToExpire >= 0 &&
							daysToExpire <= 30 &&
							(t.status === "COMPLETED" || t.status === "IN_PROGRESS");
						return (
							<div
								key={t.id}
								className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
							>
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
										<Icon className="h-4 w-4 text-primary" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<p className="text-sm font-medium text-foreground">
												{t.title}
											</p>
											<Badge
												variant="outline"
												className={`text-[10px] ${status.className}`}
											>
												{status.label}
											</Badge>
											<Badge variant="outline" className="text-[10px]">
												{categoryLabel[t.category]}
											</Badge>
											{expiringSoon && (
												<Badge
													variant="outline"
													className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
												>
													<Clock3 className="h-2.5 w-2.5 mr-0.5" />
													Vence en {daysToExpire}d
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground mt-0.5">
											{t.provider && `${t.provider} · `}
											{t.startDate && formatDate(t.startDate)}
											{t.endDate && ` → ${formatDate(t.endDate)}`}
											{t.durationHours && ` · ${t.durationHours}h`}
										</p>
										{t.expirationDate && (
											<p className="text-[11px] text-muted-foreground mt-0.5">
												Vencimiento: {formatDate(t.expirationDate)}
											</p>
										)}
										{t.notes && (
											<p className="text-xs text-muted-foreground mt-1 italic">
												{t.notes}
											</p>
										)}
										{t.documentUrl && (
											<a
												href={t.documentUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-primary hover:underline mt-1 inline-block"
											>
												Ver certificado →
											</a>
										)}
									</div>
								</div>
								<div className="flex items-center gap-0.5 shrink-0">
									<Button
										size="icon"
										variant="ghost"
										onClick={() => openEditForm(t)}
										title="Editar"
										className="h-8 w-8"
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => handleDelete(t)}
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
