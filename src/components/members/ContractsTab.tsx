"use client";

import { FileText, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import {
	CONTRACT_BY_ID_ENDPOINT,
	CONTRACTS_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";

type ContractType = "FIXED_TERM" | "INDEFINITE" | "INTERNSHIP" | "FREELANCE";
type ContractStatus = "ACTIVE" | "EXPIRED" | "TERMINATED" | "DRAFT";

interface Contract {
	id: number;
	userId: number;
	type: ContractType;
	status: ContractStatus;
	startDate: string;
	endDate: string | null;
	baseSalary: string | null;
	documentUrl: string | null;
	notes: string | null;
	parentId: number | null;
	parent?: { id: number; type: ContractType; startDate: string; endDate: string | null } | null;
	createdAt: string;
}

interface FormState {
	type: ContractType;
	status: ContractStatus;
	startDate: string;
	endDate: string;
	baseSalary: string;
	documentUrl: string;
	notes: string;
	parentId: string;
}

const EMPTY_FORM: FormState = {
	type: "INDEFINITE",
	status: "ACTIVE",
	startDate: "",
	endDate: "",
	baseSalary: "",
	documentUrl: "",
	notes: "",
	parentId: "",
};

const typeLabel: Record<ContractType, string> = {
	FIXED_TERM: "Plazo fijo",
	INDEFINITE: "Tiempo indeterminado",
	INTERNSHIP: "Pasantía",
	FREELANCE: "Monotributista",
};

const statusLabel: Record<ContractStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
	ACTIVE: { label: "Activo", variant: "default" },
	EXPIRED: { label: "Vencido", variant: "secondary" },
	TERMINATED: { label: "Rescindido", variant: "destructive" },
	DRAFT: { label: "Borrador", variant: "outline" },
};

const toInputDate = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
const formatDate = (iso: string | null) =>
	iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

interface ContractsTabProps {
	userId: number;
}

export default function ContractsTab({ userId }: ContractsTabProps) {
	const { data: session } = useSession();
	const [contracts, setContracts] = useState<Contract[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);

	const token = session?.user?.accessToken;

	const loadContracts = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const res = await fetch(CONTRACTS_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setContracts(json.data || []);
		} catch {
			toast.error("Error al cargar contratos");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (userId && token) loadContracts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, token]);

	const openCreateForm = () => {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setFormOpen(true);
	};

	const openEditForm = (c: Contract) => {
		setEditingId(c.id);
		setForm({
			type: c.type,
			status: c.status,
			startDate: toInputDate(c.startDate),
			endDate: toInputDate(c.endDate),
			baseSalary: c.baseSalary?.toString() || "",
			documentUrl: c.documentUrl || "",
			notes: c.notes || "",
			parentId: c.parentId?.toString() || "",
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
		if (!form.startDate) {
			toast.error("La fecha de inicio es obligatoria");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				...form,
				endDate: form.endDate || null,
				baseSalary: form.baseSalary || null,
				documentUrl: form.documentUrl || null,
				notes: form.notes || null,
				parentId: form.parentId || null,
			};
			const url = editingId
				? CONTRACT_BY_ID_ENDPOINT(editingId)
				: CONTRACTS_BY_USER_ENDPOINT(userId);
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error();
			toast.success(editingId ? "Contrato actualizado" : "Contrato creado");
			closeForm();
			loadContracts();
		} catch {
			toast.error("Error al guardar el contrato");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (c: Contract) => {
		if (!token) return;
		if (!confirm(`¿Eliminar el contrato de ${typeLabel[c.type]} del ${formatDate(c.startDate)}?`)) return;
		try {
			const res = await fetch(CONTRACT_BY_ID_ENDPOINT(c.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Contrato eliminado");
			loadContracts();
		} catch {
			toast.error("Error al eliminar");
		}
	};

	const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
		setForm((s) => ({ ...s, [k]: v }));

	return (
		<div className="space-y-4 py-2">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Contratos</p>
					<p className="text-xs text-muted-foreground">
						Historial completo con renovaciones
					</p>
				</div>
				{!formOpen && (
					<Button size="sm" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Nuevo contrato
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/2 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							{editingId ? "Editar contrato" : "Nuevo contrato"}
						</p>
						<Button size="icon" variant="ghost" onClick={closeForm} className="h-7 w-7">
							<X className="h-4 w-4" />
						</Button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">Tipo</Label>
							<Select value={form.type} onValueChange={(v) => setF("type", v as ContractType)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="INDEFINITE">Tiempo indeterminado</SelectItem>
									<SelectItem value="FIXED_TERM">Plazo fijo</SelectItem>
									<SelectItem value="INTERNSHIP">Pasantía</SelectItem>
									<SelectItem value="FREELANCE">Monotributista</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Estado</Label>
							<Select value={form.status} onValueChange={(v) => setF("status", v as ContractStatus)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ACTIVE">Activo</SelectItem>
									<SelectItem value="EXPIRED">Vencido</SelectItem>
									<SelectItem value="TERMINATED">Rescindido</SelectItem>
									<SelectItem value="DRAFT">Borrador</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Inicio *</Label>
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
							<Label className="text-xs">Sueldo básico</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.baseSalary}
								onChange={(e) => setF("baseSalary", e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Renueva contrato (ID)</Label>
							<Select
								value={form.parentId || "none"}
								onValueChange={(v) => setF("parentId", v === "none" ? "" : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Ninguno" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Ninguno</SelectItem>
									{contracts
										.filter((c) => c.id !== editingId)
										.map((c) => (
											<SelectItem key={c.id} value={c.id.toString()}>
												#{c.id} · {typeLabel[c.type]} ({formatDate(c.startDate)})
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">URL del documento PDF</Label>
							<Input
								value={form.documentUrl}
								onChange={(e) => setF("documentUrl", e.target.value)}
								placeholder="https://..."
							/>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">Notas</Label>
							<Input
								value={form.notes}
								onChange={(e) => setF("notes", e.target.value)}
								placeholder="Observaciones..."
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-2">
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
			) : contracts.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
						<FileText className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">Sin contratos todavía</p>
				</div>
			) : (
				<div className="space-y-2">
					{contracts.map((c) => {
						const status = statusLabel[c.status];
						return (
							<div
								key={c.id}
								className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
							>
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
										<FileText className="h-4 w-4 text-primary" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<p className="text-sm font-medium text-foreground">
												{typeLabel[c.type]}
											</p>
											<Badge variant={status.variant} className="text-[10px]">
												{status.label}
											</Badge>
											{c.parentId && (
												<Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/30">
													Renovación de #{c.parentId}
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground mt-0.5">
											{formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : "sin vencimiento"}
											{c.baseSalary && ` · $${Number(c.baseSalary).toLocaleString("es-AR")}`}
										</p>
										{c.notes && (
											<p className="text-xs text-muted-foreground mt-1 italic truncate">
												{c.notes}
											</p>
										)}
										{c.documentUrl && (
											<a
												href={c.documentUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-primary hover:underline mt-1 inline-block"
											>
												Ver PDF →
											</a>
										)}
									</div>
								</div>
								<div className="flex items-center gap-0.5 shrink-0">
									<Button
										size="icon"
										variant="ghost"
										onClick={() => openEditForm(c)}
										title="Editar"
										className="h-8 w-8"
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => handleDelete(c)}
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
