"use client";

import {
	Check,
	ClipboardCheck,
	Loader2,
	Pencil,
	Plus,
	Send,
	Star,
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
	REVIEW_ACKNOWLEDGE_ENDPOINT,
	REVIEW_BY_ID_ENDPOINT,
	REVIEW_SUBMIT_ENDPOINT,
	REVIEWS_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";

type ReviewType = "SELF" | "MANAGER" | "PEER";
type ReviewStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED";

interface CategoryRating {
	category: string;
	score: number;
	comment?: string;
}

interface PerformanceReview {
	id: number;
	userId: number;
	reviewerId: number | null;
	reviewType: ReviewType;
	period: string;
	status: ReviewStatus;
	overallRating: number | null;
	categoryRatings: CategoryRating[] | null;
	strengths: string | null;
	areasToImprove: string | null;
	goalsNext: string | null;
	comments: string | null;
	submittedAt: string | null;
	acknowledgedAt: string | null;
	createdAt: string;
	reviewer?: { id: number; name: string; image: string | null } | null;
}

interface Stats {
	total: number;
	avgRating: number | null;
}

const DEFAULT_CATEGORIES = [
	"Calidad del trabajo",
	"Comunicación",
	"Compromiso / Puntualidad",
	"Trabajo en equipo",
	"Iniciativa / Autonomía",
];

interface FormState {
	reviewType: ReviewType;
	period: string;
	overallRating: string;
	categoryRatings: CategoryRating[];
	strengths: string;
	areasToImprove: string;
	goalsNext: string;
	comments: string;
}

const emptyForm = (): FormState => ({
	reviewType: "MANAGER",
	period: String(new Date().getFullYear()),
	overallRating: "",
	categoryRatings: DEFAULT_CATEGORIES.map((c) => ({
		category: c,
		score: 3,
		comment: "",
	})),
	strengths: "",
	areasToImprove: "",
	goalsNext: "",
	comments: "",
});

const typeLabel: Record<ReviewType, string> = {
	SELF: "Auto-evaluación",
	MANAGER: "Manager",
	PEER: "Par / 360°",
};

const statusStyle: Record<
	ReviewStatus,
	{ label: string; className: string }
> = {
	DRAFT: {
		label: "Borrador",
		className: "bg-muted text-muted-foreground border-border",
	},
	SUBMITTED: {
		label: "Enviada",
		className:
			"bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
	},
	ACKNOWLEDGED: {
		label: "Firmada",
		className:
			"bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
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

const StarRating = ({
	value,
	onChange,
	readOnly = false,
	size = "sm",
}: {
	value: number;
	onChange?: (v: number) => void;
	readOnly?: boolean;
	size?: "sm" | "md";
}) => {
	const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
	return (
		<div className="flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((n) => (
				<button
					key={n}
					type="button"
					disabled={readOnly}
					onClick={() => onChange?.(n)}
					className={readOnly ? "cursor-default" : "cursor-pointer"}
				>
					<Star
						className={`${sizeClass} transition-colors ${
							n <= value
								? "fill-amber-400 text-amber-400"
								: "text-muted-foreground/30"
						}`}
					/>
				</button>
			))}
		</div>
	);
};

interface PerformanceTabProps {
	userId: number;
}

export default function PerformanceTab({ userId }: PerformanceTabProps) {
	const { data: session } = useSession();
	const [reviews, setReviews] = useState<PerformanceReview[]>([]);
	const [stats, setStats] = useState<Stats>({ total: 0, avgRating: null });
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(emptyForm());

	const token = session?.user?.accessToken;

	const loadReviews = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const res = await fetch(REVIEWS_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setReviews(json.data || []);
			setStats(json.stats || { total: 0, avgRating: null });
		} catch {
			toast.error("Error al cargar evaluaciones");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (userId && token) loadReviews();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, token]);

	const openCreateForm = () => {
		setEditingId(null);
		setForm(emptyForm());
		setFormOpen(true);
	};

	const openEditForm = (r: PerformanceReview) => {
		setEditingId(r.id);
		setForm({
			reviewType: r.reviewType,
			period: r.period,
			overallRating: r.overallRating?.toString() || "",
			categoryRatings:
				r.categoryRatings && r.categoryRatings.length > 0
					? r.categoryRatings
					: DEFAULT_CATEGORIES.map((c) => ({
							category: c,
							score: 3,
							comment: "",
						})),
			strengths: r.strengths || "",
			areasToImprove: r.areasToImprove || "",
			goalsNext: r.goalsNext || "",
			comments: r.comments || "",
		});
		setFormOpen(true);
	};

	const closeForm = () => {
		setFormOpen(false);
		setEditingId(null);
		setForm(emptyForm());
	};

	const handleSave = async () => {
		if (!token) return;
		if (!form.period.trim()) {
			toast.error("El período es obligatorio");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				...form,
				overallRating: form.overallRating || null,
				categoryRatings: form.categoryRatings.filter((c) => c.category.trim()),
				strengths: form.strengths || null,
				areasToImprove: form.areasToImprove || null,
				goalsNext: form.goalsNext || null,
				comments: form.comments || null,
			};
			const url = editingId
				? REVIEW_BY_ID_ENDPOINT(editingId)
				: REVIEWS_BY_USER_ENDPOINT(userId);
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error();
			toast.success(editingId ? "Evaluación actualizada" : "Evaluación creada");
			closeForm();
			loadReviews();
		} catch {
			toast.error("Error al guardar");
		} finally {
			setIsSaving(false);
		}
	};

	const handleAction = async (
		url: string,
		successMsg: string,
		confirmMsg?: string,
	) => {
		if (!token) return;
		if (confirmMsg && !confirm(confirmMsg)) return;
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success(successMsg);
			loadReviews();
		} catch {
			toast.error("Error al ejecutar la acción");
		}
	};

	const handleSubmit = (r: PerformanceReview) =>
		handleAction(
			REVIEW_SUBMIT_ENDPOINT(r.id),
			"Evaluación enviada",
			"¿Enviar esta evaluación? Ya no podrás editarla libremente.",
		);

	const handleAck = (r: PerformanceReview) =>
		handleAction(
			REVIEW_ACKNOWLEDGE_ENDPOINT(r.id),
			"Evaluación firmada",
			"¿Firmar conforme? Se marca como aceptada por el empleado.",
		);

	const handleDelete = async (r: PerformanceReview) => {
		if (!token) return;
		if (!confirm(`¿Eliminar la evaluación del período ${r.period}?`)) return;
		try {
			const res = await fetch(REVIEW_BY_ID_ENDPOINT(r.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Evaluación eliminada");
			loadReviews();
		} catch {
			toast.error("Error al eliminar");
		}
	};

	const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
		setForm((s) => ({ ...s, [k]: v }));

	const updateCategoryRating = (
		idx: number,
		field: "category" | "score" | "comment",
		value: string | number,
	) => {
		setForm((s) => ({
			...s,
			categoryRatings: s.categoryRatings.map((c, i) =>
				i === idx ? { ...c, [field]: value } : c,
			),
		}));
	};

	const addCategory = () =>
		setForm((s) => ({
			...s,
			categoryRatings: [
				...s.categoryRatings,
				{ category: "", score: 3, comment: "" },
			],
		}));

	const removeCategory = (idx: number) =>
		setForm((s) => ({
			...s,
			categoryRatings: s.categoryRatings.filter((_, i) => i !== idx),
		}));

	return (
		<div className="space-y-4 py-2">
			{/* Stats */}
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 p-3">
					<div className="flex items-center gap-2">
						<ClipboardCheck className="h-4 w-4 text-blue-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Evaluaciones totales
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.total}
					</p>
				</div>
				<div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
					<div className="flex items-center gap-2">
						<Star className="h-4 w-4 text-amber-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Promedio general
						</span>
					</div>
					<div className="flex items-center gap-2 mt-1">
						<p className="text-lg font-bold text-foreground">
							{stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
						</p>
						{stats.avgRating && (
							<StarRating value={Math.round(stats.avgRating)} readOnly />
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Historial</p>
					<p className="text-xs text-muted-foreground">
						Auto-evaluaciones, evaluaciones de manager y pares
					</p>
				</div>
				{!formOpen && (
					<Button size="sm" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Nueva evaluación
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							{editingId ? "Editar evaluación" : "Nueva evaluación"}
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
							<Label className="text-xs">Tipo *</Label>
							<Select
								value={form.reviewType}
								onValueChange={(v) => setF("reviewType", v as ReviewType)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="SELF">Auto-evaluación</SelectItem>
									<SelectItem value="MANAGER">Manager</SelectItem>
									<SelectItem value="PEER">Par / 360°</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Período *</Label>
							<Input
								value={form.period}
								onChange={(e) => setF("period", e.target.value)}
								placeholder="2026, 2026-Q1, 2026-H1..."
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Calificación general</Label>
							<div className="flex items-center gap-2 h-9">
								<StarRating
									value={Number(form.overallRating) || 0}
									onChange={(n) => setF("overallRating", String(n))}
									size="md"
								/>
								<span className="text-xs text-muted-foreground">
									{form.overallRating ? `${form.overallRating}/5` : "—"}
								</span>
							</div>
						</div>
					</div>

					{/* Categorías configurables */}
					<div className="space-y-2 pt-2 border-t border-border">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-semibold">
								Calificación por categoría
							</Label>
							<Button size="sm" variant="ghost" onClick={addCategory}>
								<Plus className="h-3 w-3 mr-1" />
								Agregar
							</Button>
						</div>
						{form.categoryRatings.map((c, idx) => (
							<div
								key={idx}
								className="flex items-center gap-2 rounded-md border border-border p-2"
							>
								<Input
									value={c.category}
									onChange={(e) =>
										updateCategoryRating(idx, "category", e.target.value)
									}
									placeholder="Categoría..."
									className="flex-1 h-8 text-xs"
								/>
								<StarRating
									value={c.score}
									onChange={(n) => updateCategoryRating(idx, "score", n)}
								/>
								<Input
									value={c.comment || ""}
									onChange={(e) =>
										updateCategoryRating(idx, "comment", e.target.value)
									}
									placeholder="Comentario"
									className="flex-1 h-8 text-xs"
								/>
								<Button
									size="icon"
									variant="ghost"
									onClick={() => removeCategory(idx)}
									className="h-7 w-7 text-destructive hover:text-destructive"
								>
									<X className="h-3.5 w-3.5" />
								</Button>
							</div>
						))}
					</div>

					{/* Campos libres */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
						<div className="space-y-1.5">
							<Label className="text-xs">Fortalezas</Label>
							<Textarea
								rows={3}
								value={form.strengths}
								onChange={(e) => setF("strengths", e.target.value)}
								placeholder="Puntos fuertes del empleado..."
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">A mejorar</Label>
							<Textarea
								rows={3}
								value={form.areasToImprove}
								onChange={(e) => setF("areasToImprove", e.target.value)}
								placeholder="Áreas de mejora..."
							/>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">Objetivos del próximo período</Label>
							<Textarea
								rows={2}
								value={form.goalsNext}
								onChange={(e) => setF("goalsNext", e.target.value)}
								placeholder="OKRs, metas, objetivos..."
							/>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">Comentarios adicionales</Label>
							<Textarea
								rows={2}
								value={form.comments}
								onChange={(e) => setF("comments", e.target.value)}
								placeholder="Notas libres..."
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-2 border-t border-border">
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
			) : reviews.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
						<ClipboardCheck className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">
						Sin evaluaciones todavía
					</p>
				</div>
			) : (
				<div className="space-y-2 max-h-[50vh] overflow-y-auto">
					{reviews.map((r) => {
						const status = statusStyle[r.status];
						return (
							<div
								key={r.id}
								className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/20 transition-colors"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-2 flex-wrap">
										<p className="text-sm font-semibold text-foreground">
											{r.period}
										</p>
										<Badge
											variant="outline"
											className={`text-[10px] ${status.className}`}
										>
											{status.label}
										</Badge>
										<Badge variant="outline" className="text-[10px]">
											{typeLabel[r.reviewType]}
										</Badge>
										{r.overallRating && (
											<div className="flex items-center gap-1">
												<StarRating value={r.overallRating} readOnly />
												<span className="text-xs text-muted-foreground">
													{r.overallRating}/5
												</span>
											</div>
										)}
									</div>
									<div className="flex items-center gap-0.5 shrink-0">
										{r.status === "DRAFT" && (
											<Button
												size="icon"
												variant="ghost"
												onClick={() => handleSubmit(r)}
												title="Enviar"
												className="h-8 w-8 text-blue-600 hover:text-blue-700"
											>
												<Send className="h-3.5 w-3.5" />
											</Button>
										)}
										{r.status === "SUBMITTED" && (
											<Button
												size="icon"
												variant="ghost"
												onClick={() => handleAck(r)}
												title="Firmar conforme"
												className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
											>
												<Check className="h-3.5 w-3.5" />
											</Button>
										)}
										{r.status !== "ACKNOWLEDGED" && (
											<Button
												size="icon"
												variant="ghost"
												onClick={() => openEditForm(r)}
												title="Editar"
												className="h-8 w-8"
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
										)}
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

								{r.reviewer && (
									<p className="text-[11px] text-muted-foreground">
										Evaluado por {r.reviewer.name}
										{r.submittedAt && ` · enviado ${formatDate(r.submittedAt)}`}
										{r.acknowledgedAt && ` · firmado ${formatDate(r.acknowledgedAt)}`}
									</p>
								)}

								{r.categoryRatings && r.categoryRatings.length > 0 && (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
										{r.categoryRatings.map((c, i) => (
											<div
												key={i}
												className="flex items-center justify-between gap-2 text-xs"
											>
												<span className="text-muted-foreground truncate">
													{c.category}
												</span>
												<StarRating value={c.score} readOnly />
											</div>
										))}
									</div>
								)}

								{(r.strengths || r.areasToImprove || r.goalsNext || r.comments) && (
									<div className="pt-1 space-y-1 text-xs">
										{r.strengths && (
											<div>
												<span className="font-medium text-emerald-600">Fortalezas:</span>{" "}
												<span className="text-foreground whitespace-pre-wrap">{r.strengths}</span>
											</div>
										)}
										{r.areasToImprove && (
											<div>
												<span className="font-medium text-amber-600">A mejorar:</span>{" "}
												<span className="text-foreground whitespace-pre-wrap">{r.areasToImprove}</span>
											</div>
										)}
										{r.goalsNext && (
											<div>
												<span className="font-medium text-blue-600">Objetivos:</span>{" "}
												<span className="text-foreground whitespace-pre-wrap">{r.goalsNext}</span>
											</div>
										)}
										{r.comments && (
											<div>
												<span className="font-medium text-muted-foreground">Notas:</span>{" "}
												<span className="text-foreground whitespace-pre-wrap">{r.comments}</span>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
