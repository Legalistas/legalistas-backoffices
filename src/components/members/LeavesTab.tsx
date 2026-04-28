"use client";

import {
	Ban,
	Check,
	Loader2,
	Palmtree,
	Pencil,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/Can";
import { Role } from "@/constant/user";
import { SUPERADMIN } from "@/constant/menu";
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
	LEAVE_APPROVE_ENDPOINT,
	LEAVE_BY_ID_ENDPOINT,
	LEAVE_CANCEL_ENDPOINT,
	LEAVE_REJECT_ENDPOINT,
	LEAVES_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";

const APPROVER_ROLES = [
	...SUPERADMIN,
	Role.COORDINADOR_FINANCIERO,
	Role.DIRECTOR_FINANCIERO,
	Role.CONTADOR_SENIOR,
	Role.ANALISTA_FINANCIERO,
	Role.TESORERO,
	Role.AUDITOR_INTERNO,
];

type LeaveType =
	| "VACATION"
	| "SICK"
	| "STUDY"
	| "MATERNITY"
	| "PATERNITY"
	| "UNPAID"
	| "OTHER";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

interface Leave {
	id: number;
	userId: number;
	type: LeaveType;
	status: LeaveStatus;
	startDate: string;
	endDate: string;
	daysRequested: number;
	reason: string | null;
	documentUrl: string | null;
	approvedById: number | null;
	approvedAt: string | null;
	rejectionReason: string | null;
	createdAt: string;
	approvedBy?: { id: number; name: string; image: string | null } | null;
}

interface Stats {
	vacationDaysYear: number;
	pendingCount: number;
}

interface FormState {
	type: LeaveType;
	startDate: string;
	endDate: string;
	reason: string;
	documentUrl: string;
}

const EMPTY_FORM: FormState = {
	type: "VACATION",
	startDate: "",
	endDate: "",
	reason: "",
	documentUrl: "",
};

const typeLabel: Record<LeaveType, string> = {
	VACATION: "Vacaciones",
	SICK: "Enfermedad",
	STUDY: "Estudio",
	MATERNITY: "Maternidad",
	PATERNITY: "Paternidad",
	UNPAID: "Sin goce",
	OTHER: "Otra",
};

const statusBadge: Record<
	LeaveStatus,
	{ label: string; className: string }
> = {
	PENDING: {
		label: "Pendiente",
		className:
			"bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
	},
	APPROVED: {
		label: "Aprobada",
		className:
			"bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
	},
	REJECTED: {
		label: "Rechazada",
		className:
			"bg-destructive/10 text-destructive border-destructive/20",
	},
	CANCELLED: {
		label: "Cancelada",
		className: "bg-muted text-muted-foreground border-border",
	},
};

// Para campos "día calendario" (startDate, endDate) almacenados como medianoche UTC:
// extraemos YYYY-MM-DD del ISO para evitar el shift por zona horaria.
const formatDay = (iso: string) => {
	const [y, m, d] = iso.slice(0, 10).split("-");
	return `${d}/${m}/${y}`;
};

// Para timestamps reales (approvedAt, createdAt) sí queremos la zona horaria local.
const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

const toInputDate = (iso: string) => iso.slice(0, 10);

type FilterType = "all" | LeaveStatus;

interface LeavesTabProps {
	userId: number;
}

export default function LeavesTab({ userId }: LeavesTabProps) {
	const { data: session } = useSession();
	const [leaves, setLeaves] = useState<Leave[]>([]);
	const [stats, setStats] = useState<Stats>({
		vacationDaysYear: 0,
		pendingCount: 0,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [filter, setFilter] = useState<FilterType>("all");

	const token = session?.user?.accessToken;

	const loadLeaves = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const res = await fetch(LEAVES_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setLeaves(json.data || []);
			setStats(json.stats || { vacationDaysYear: 0, pendingCount: 0 });
		} catch {
			toast.error("Error al cargar licencias");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (userId && token) loadLeaves();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, token]);

	const filtered = useMemo(() => {
		if (filter === "all") return leaves;
		return leaves.filter((l) => l.status === filter);
	}, [leaves, filter]);

	const openCreateForm = () => {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setFormOpen(true);
	};

	const openEditForm = (l: Leave) => {
		setEditingId(l.id);
		setForm({
			type: l.type,
			startDate: toInputDate(l.startDate),
			endDate: toInputDate(l.endDate),
			reason: l.reason || "",
			documentUrl: l.documentUrl || "",
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
		if (!form.startDate || !form.endDate) {
			toast.error("Fechas de inicio y fin son obligatorias");
			return;
		}
		if (new Date(form.endDate) < new Date(form.startDate)) {
			toast.error("La fecha de fin no puede ser anterior al inicio");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				...form,
				reason: form.reason || null,
				documentUrl: form.documentUrl || null,
			};
			const url = editingId
				? LEAVE_BY_ID_ENDPOINT(editingId)
				: LEAVES_BY_USER_ENDPOINT(userId);
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error();
			toast.success(editingId ? "Solicitud actualizada" : "Solicitud enviada");
			closeForm();
			loadLeaves();
		} catch {
			toast.error("Error al guardar");
		} finally {
			setIsSaving(false);
		}
	};

	const handleAction = async (
		url: string,
		successMsg: string,
		body?: object,
	) => {
		if (!token) return;
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: body ? JSON.stringify(body) : undefined,
			});
			if (!res.ok) throw new Error();
			toast.success(successMsg);
			loadLeaves();
		} catch {
			toast.error("Error al ejecutar la acción");
		}
	};

	const handleApprove = (l: Leave) =>
		handleAction(LEAVE_APPROVE_ENDPOINT(l.id), "Solicitud aprobada");

	const handleReject = (l: Leave) => {
		const reason = prompt("Motivo del rechazo (opcional):") ?? "";
		handleAction(LEAVE_REJECT_ENDPOINT(l.id), "Solicitud rechazada", {
			rejectionReason: reason || null,
		});
	};

	const handleCancel = (l: Leave) => {
		if (!confirm("¿Cancelar esta solicitud?")) return;
		handleAction(LEAVE_CANCEL_ENDPOINT(l.id), "Solicitud cancelada");
	};

	const handleDelete = async (l: Leave) => {
		if (!token) return;
		if (!confirm(`¿Eliminar la solicitud de ${typeLabel[l.type]}?`)) return;
		try {
			const res = await fetch(LEAVE_BY_ID_ENDPOINT(l.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Solicitud eliminada");
			loadLeaves();
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
				<div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
					<div className="flex items-center gap-2">
						<Palmtree className="h-4 w-4 text-emerald-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Vacaciones tomadas este año
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.vacationDaysYear} <span className="text-xs font-normal text-muted-foreground">días</span>
					</p>
				</div>
				<div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
					<div className="flex items-center gap-2">
						<div className="h-2 w-2 rounded-full bg-amber-500" />
						<span className="text-xs font-medium text-muted-foreground">
							Solicitudes pendientes
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.pendingCount}
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
						<SelectTrigger className="w-[160px] h-8 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todas</SelectItem>
							<SelectItem value="PENDING">Pendientes</SelectItem>
							<SelectItem value="APPROVED">Aprobadas</SelectItem>
							<SelectItem value="REJECTED">Rechazadas</SelectItem>
							<SelectItem value="CANCELLED">Canceladas</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{!formOpen && (
					<Button size="sm" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Nueva solicitud
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							{editingId ? "Editar solicitud" : "Nueva solicitud"}
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
							<Label className="text-xs">Tipo</Label>
							<Select
								value={form.type}
								onValueChange={(v) => setF("type", v as LeaveType)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="VACATION">Vacaciones</SelectItem>
									<SelectItem value="SICK">Enfermedad</SelectItem>
									<SelectItem value="STUDY">Estudio</SelectItem>
									<SelectItem value="MATERNITY">Maternidad</SelectItem>
									<SelectItem value="PATERNITY">Paternidad</SelectItem>
									<SelectItem value="UNPAID">Sin goce</SelectItem>
									<SelectItem value="OTHER">Otra</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Desde *</Label>
							<Input
								type="date"
								value={form.startDate}
								onChange={(e) => setF("startDate", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Hasta *</Label>
							<Input
								type="date"
								value={form.endDate}
								onChange={(e) => setF("endDate", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">URL del certificado</Label>
							<Input
								value={form.documentUrl}
								onChange={(e) => setF("documentUrl", e.target.value)}
								placeholder="https://..."
							/>
						</div>
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-xs">Motivo / observaciones</Label>
							<Input
								value={form.reason}
								onChange={(e) => setF("reason", e.target.value)}
								placeholder="Detalles adicionales..."
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={closeForm} disabled={isSaving}>
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{editingId ? "Guardar" : "Enviar"}
						</Button>
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : filtered.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
						<Palmtree className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">
						{filter === "all"
							? "Sin solicitudes todavía"
							: "No hay solicitudes con ese filtro"}
					</p>
				</div>
			) : (
				<div className="space-y-2 max-h-[45vh] overflow-y-auto">
					{filtered.map((l) => {
						const badge = statusBadge[l.status];
						return (
							<div
								key={l.id}
								className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<p className="text-sm font-medium text-foreground">
											{typeLabel[l.type]}
										</p>
										<Badge variant="outline" className={`text-[10px] ${badge.className}`}>
											{badge.label}
										</Badge>
										<span className="text-xs text-muted-foreground">
											{l.daysRequested} {l.daysRequested === 1 ? "día" : "días"}
										</span>
									</div>
									<p className="text-xs text-muted-foreground mt-0.5">
										{formatDay(l.startDate)} → {formatDay(l.endDate)}
									</p>
									{l.reason && (
										<p className="text-xs text-muted-foreground mt-1 italic">
											{l.reason}
										</p>
									)}
									{l.status === "REJECTED" && l.rejectionReason && (
										<p className="text-xs text-destructive mt-1">
											Rechazo: {l.rejectionReason}
										</p>
									)}
									{l.approvedBy && (
										<p className="text-[10px] text-muted-foreground mt-1">
											{l.status === "APPROVED" ? "Aprobada" : "Resuelta"} por {l.approvedBy.name}
											{l.approvedAt && ` · ${formatDate(l.approvedAt)}`}
										</p>
									)}
									{l.documentUrl && (
										<a
											href={l.documentUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-primary hover:underline mt-1 inline-block"
										>
											Ver documento →
										</a>
									)}
								</div>
								<div className="flex items-center gap-0.5 shrink-0">
									{l.status === "PENDING" && (
										<>
											<Can role={APPROVER_ROLES}>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleApprove(l)}
													title="Aprobar"
													className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
												>
													<Check className="h-3.5 w-3.5" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleReject(l)}
													title="Rechazar"
													className="h-8 w-8 text-destructive hover:text-destructive"
												>
													<Ban className="h-3.5 w-3.5" />
												</Button>
											</Can>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => openEditForm(l)}
												title="Editar"
												className="h-8 w-8"
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => handleCancel(l)}
												title="Cancelar"
												className="h-8 w-8"
											>
												<X className="h-3.5 w-3.5" />
											</Button>
										</>
									)}
									<Can role={APPROVER_ROLES}>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => handleDelete(l)}
											title="Eliminar"
											className="h-8 w-8 text-destructive hover:text-destructive"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</Can>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
