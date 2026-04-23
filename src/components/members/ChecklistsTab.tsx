"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	BookOpen,
	ClipboardCheck,
	FileText,
	KeyRound,
	Loader2,
	Monitor,
	Plus,
	Trash2,
	UserMinus,
	UserPlus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	CHECKLIST_ITEM_BY_ID_ENDPOINT,
	CHECKLIST_ITEMS_ENDPOINT,
	CHECKLISTS_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	EmploymentChecklist,
	EmploymentChecklistItem,
	EmploymentChecklistItemCategory,
	EmploymentChecklistType,
} from "@/types/checklist";

interface ChecklistsTabProps {
	userId: number;
}

const TYPE_LABELS: Record<EmploymentChecklistType, string> = {
	ONBOARDING: "Onboarding",
	OFFBOARDING: "Offboarding",
};

const TYPE_DESCRIPTIONS: Record<EmploymentChecklistType, string> = {
	ONBOARDING: "Tareas para el alta del empleado",
	OFFBOARDING: "Tareas para la desvinculación del empleado",
};

const CATEGORY_LABELS: Record<EmploymentChecklistItemCategory, string> = {
	EQUIPMENT: "Equipo",
	ACCESS: "Accesos",
	DOCUMENTS: "Documentos",
	TRAINING: "Capacitación",
	OTHER: "Otro",
};

const CATEGORY_STYLES: Record<EmploymentChecklistItemCategory, string> = {
	EQUIPMENT: "bg-cyan-50 text-cyan-700 border-cyan-200",
	ACCESS: "bg-purple-50 text-purple-700 border-purple-200",
	DOCUMENTS: "bg-blue-50 text-blue-700 border-blue-200",
	TRAINING: "bg-indigo-50 text-indigo-700 border-indigo-200",
	OTHER: "bg-gray-50 text-gray-700 border-gray-200",
};

const CATEGORY_ICONS: Record<EmploymentChecklistItemCategory, typeof Monitor> =
	{
		EQUIPMENT: Monitor,
		ACCESS: KeyRound,
		DOCUMENTS: FileText,
		TRAINING: BookOpen,
		OTHER: ClipboardCheck,
	};

const STATUS_LABELS = {
	PENDING: "Pendiente",
	IN_PROGRESS: "En curso",
	COMPLETED: "Completado",
} as const;

const STATUS_STYLES = {
	PENDING: "bg-gray-100 text-gray-700",
	IN_PROGRESS: "bg-amber-100 text-amber-700",
	COMPLETED: "bg-emerald-100 text-emerald-700",
} as const;

export default function ChecklistsTab({ userId }: ChecklistsTabProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [checklists, setChecklists] = useState<EmploymentChecklist[]>([]);
	const [loading, setLoading] = useState(true);
	const [actioningId, setActioningId] = useState<number | null>(null);

	const [addItemOpen, setAddItemOpen] = useState(false);
	const [addItemChecklistId, setAddItemChecklistId] = useState<number | null>(
		null,
	);

	const fetchChecklists = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const res = await fetch(CHECKLISTS_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			const json = await res.json();
			setChecklists(json.data ?? []);
		} catch (err) {
			console.error(err);
			toast.error("No se pudieron cargar las checklists");
		} finally {
			setLoading(false);
		}
	}, [token, userId]);

	useEffect(() => {
		fetchChecklists();
	}, [fetchChecklists]);

	const handleCreateChecklist = async (type: EmploymentChecklistType) => {
		if (!token) return;
		try {
			const res = await fetch(CHECKLISTS_BY_USER_ENDPOINT(userId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ type }),
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			toast.success(`Checklist de ${TYPE_LABELS[type]} creada`);
			fetchChecklists();
		} catch (err) {
			console.error(err);
			toast.error("No se pudo crear la checklist");
		}
	};

	const handleToggleItem = async (item: EmploymentChecklistItem) => {
		if (!token) return;
		const newStatus = item.status === "DONE" ? "PENDING" : "DONE";
		setActioningId(item.id);

		// Optimistic update
		setChecklists((prev) =>
			prev.map((c) =>
				c.id !== item.checklistId
					? c
					: {
							...c,
							items: c.items.map((it) =>
								it.id === item.id ? { ...it, status: newStatus } : it,
							),
						},
			),
		);

		try {
			const res = await fetch(CHECKLIST_ITEM_BY_ID_ENDPOINT(item.id), {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ status: newStatus }),
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			fetchChecklists();
		} catch (err) {
			console.error(err);
			toast.error("No se pudo actualizar el item");
			fetchChecklists();
		} finally {
			setActioningId(null);
		}
	};

	const handleDeleteItem = async (item: EmploymentChecklistItem) => {
		if (!token) return;
		if (!confirm(`¿Eliminar item "${item.title}"?`)) return;
		try {
			const res = await fetch(CHECKLIST_ITEM_BY_ID_ENDPOINT(item.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			toast.success("Item eliminado");
			fetchChecklists();
		} catch (err) {
			console.error(err);
			toast.error("No se pudo eliminar el item");
		}
	};

	const openAddItem = (checklistId: number) => {
		setAddItemChecklistId(checklistId);
		setAddItemOpen(true);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-10">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const onboarding = checklists.find((c) => c.type === "ONBOARDING");
	const offboarding = checklists.find((c) => c.type === "OFFBOARDING");

	return (
		<div className="space-y-4">
			{!onboarding && !offboarding && (
				<div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
					<ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
					<p className="text-sm font-medium text-foreground">
						No hay checklists generadas todavía
					</p>
					<p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
						Las checklists se generan automáticamente al crear la ficha de empleado
						(onboarding) o al marcarlo como TERMINATED (offboarding). También las
						podés generar manualmente abajo.
					</p>
					<div className="flex items-center justify-center gap-2 mt-4">
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleCreateChecklist("ONBOARDING")}
						>
							<UserPlus className="h-4 w-4 mr-1.5" />
							Generar onboarding
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleCreateChecklist("OFFBOARDING")}
						>
							<UserMinus className="h-4 w-4 mr-1.5" />
							Generar offboarding
						</Button>
					</div>
				</div>
			)}

			{onboarding && (
				<ChecklistCard
					checklist={onboarding}
					actioningId={actioningId}
					onToggleItem={handleToggleItem}
					onDeleteItem={handleDeleteItem}
					onAddItem={() => openAddItem(onboarding.id)}
				/>
			)}

			{offboarding && (
				<ChecklistCard
					checklist={offboarding}
					actioningId={actioningId}
					onToggleItem={handleToggleItem}
					onDeleteItem={handleDeleteItem}
					onAddItem={() => openAddItem(offboarding.id)}
				/>
			)}

			{onboarding && !offboarding && (
				<div className="text-center">
					<Button
						size="sm"
						variant="ghost"
						onClick={() => handleCreateChecklist("OFFBOARDING")}
					>
						<UserMinus className="h-4 w-4 mr-1.5" />
						Generar checklist de offboarding
					</Button>
				</div>
			)}

			<AddItemDialog
				open={addItemOpen}
				onOpenChange={setAddItemOpen}
				checklistId={addItemChecklistId}
				onAdded={fetchChecklists}
			/>
		</div>
	);
}

interface ChecklistCardProps {
	checklist: EmploymentChecklist;
	actioningId: number | null;
	onToggleItem: (item: EmploymentChecklistItem) => void;
	onDeleteItem: (item: EmploymentChecklistItem) => void;
	onAddItem: () => void;
}

function ChecklistCard({
	checklist,
	actioningId,
	onToggleItem,
	onDeleteItem,
	onAddItem,
}: ChecklistCardProps) {
	const total = checklist.items.length;
	const done = useMemo(
		() =>
			checklist.items.filter(
				(i) => i.status === "DONE" || i.status === "SKIPPED",
			).length,
		[checklist.items],
	);
	const percent = total > 0 ? Math.round((done / total) * 100) : 0;

	const Icon = checklist.type === "ONBOARDING" ? UserPlus : UserMinus;

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-2.5">
						<div
							className={`p-2 rounded-md ${checklist.type === "ONBOARDING" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
						>
							<Icon className="h-5 w-5" />
						</div>
						<div>
							<CardTitle className="text-base">
								{TYPE_LABELS[checklist.type]}
							</CardTitle>
							<CardDescription className="text-xs">
								{TYPE_DESCRIPTIONS[checklist.type]} · Creada{" "}
								{format(parseISO(checklist.createdAt), "dd MMM yyyy", {
									locale: es,
								})}
							</CardDescription>
						</div>
					</div>
					<Badge className={STATUS_STYLES[checklist.status]} variant="outline">
						{STATUS_LABELS[checklist.status]}
					</Badge>
				</div>

				<div className="mt-3">
					<div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
						<span>
							{done} de {total} completados
						</span>
						<span className="font-medium">{percent}%</span>
					</div>
					<Progress value={percent} className="h-2" />
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<ul className="space-y-1.5">
					{checklist.items.map((item) => {
						const CatIcon = CATEGORY_ICONS[item.category];
						const isDone = item.status === "DONE";
						return (
							<li
								key={item.id}
								className="flex items-start gap-3 rounded-md border bg-card p-3 hover:bg-muted/30 transition-colors"
							>
								<Checkbox
									checked={isDone}
									disabled={actioningId === item.id}
									onCheckedChange={() => onToggleItem(item)}
									className="mt-0.5"
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span
											className={`text-sm font-medium ${
												isDone
													? "line-through text-muted-foreground"
													: "text-foreground"
											}`}
										>
											{item.title}
										</span>
										<Badge
											variant="outline"
											className={`text-[10px] h-5 ${CATEGORY_STYLES[item.category]}`}
										>
											<CatIcon className="h-2.5 w-2.5 mr-1" />
											{CATEGORY_LABELS[item.category]}
										</Badge>
									</div>
									{item.description && (
										<p className="text-xs text-muted-foreground mt-0.5">
											{item.description}
										</p>
									)}
									{isDone && item.completedBy && item.completedAt && (
										<p className="text-[10px] text-emerald-700 mt-1">
											Completado por {item.completedBy.name} el{" "}
											{format(parseISO(item.completedAt), "dd MMM yyyy", {
												locale: es,
											})}
										</p>
									)}
								</div>
								<Button
									size="icon"
									variant="ghost"
									className="h-7 w-7 shrink-0"
									onClick={() => onDeleteItem(item)}
									title="Eliminar item"
								>
									<Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
								</Button>
							</li>
						);
					})}
				</ul>

				<div className="mt-3 pt-3 border-t">
					<Button
						size="sm"
						variant="ghost"
						onClick={onAddItem}
						className="text-xs"
					>
						<Plus className="h-3.5 w-3.5 mr-1" />
						Agregar item
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

interface AddItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	checklistId: number | null;
	onAdded: () => void;
}

function AddItemDialog({
	open,
	onOpenChange,
	checklistId,
	onAdded,
}: AddItemDialogProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] =
		useState<EmploymentChecklistItemCategory>("OTHER");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!open) {
			setTitle("");
			setDescription("");
			setCategory("OTHER");
		}
	}, [open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!checklistId || !token) return;
		if (!title.trim()) {
			toast.error("El título es obligatorio");
			return;
		}
		setSubmitting(true);
		try {
			const res = await fetch(CHECKLIST_ITEMS_ENDPOINT(checklistId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() || null,
					category,
				}),
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			toast.success("Item agregado");
			onOpenChange(false);
			onAdded();
		} catch (err) {
			console.error(err);
			toast.error("No se pudo agregar el item");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Agregar item</DialogTitle>
						<DialogDescription>
							Sumá una tarea adicional a la checklist.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 py-4">
						<div className="grid gap-1.5">
							<Label htmlFor="ci-title">Título *</Label>
							<Input
								id="ci-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="ci-cat">Categoría</Label>
							<Select
								value={category}
								onValueChange={(v) =>
									setCategory(v as EmploymentChecklistItemCategory)
								}
							>
								<SelectTrigger id="ci-cat">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(
										Object.keys(CATEGORY_LABELS) as EmploymentChecklistItemCategory[]
									).map((k) => (
										<SelectItem key={k} value={k}>
											{CATEGORY_LABELS[k]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="ci-desc">Descripción</Label>
							<Textarea
								id="ci-desc"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={submitting}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={submitting}>
							{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
							Agregar
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
