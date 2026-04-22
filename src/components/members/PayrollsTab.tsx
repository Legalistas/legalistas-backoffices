"use client";

import { DollarSign, Loader2, Pencil, Plus, Receipt, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	PAYROLL_BY_ID_ENDPOINT,
	PAYROLLS_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints";

interface Payroll {
	id: number;
	userId: number;
	period: string;
	payDate: string | null;
	grossAmount: string;
	netAmount: string;
	contributions: string | null;
	deductions: string | null;
	currency: string;
	documentUrl: string | null;
	notes: string | null;
	createdAt: string;
}

interface Stats {
	countYear: number;
	grossYear: string;
	netYear: string;
}

interface FormState {
	period: string;
	payDate: string;
	grossAmount: string;
	netAmount: string;
	contributions: string;
	deductions: string;
	currency: string;
	documentUrl: string;
	notes: string;
}

const currentPeriod = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const EMPTY_FORM: FormState = {
	period: currentPeriod(),
	payDate: "",
	grossAmount: "",
	netAmount: "",
	contributions: "",
	deductions: "",
	currency: "ARS",
	documentUrl: "",
	notes: "",
};

const formatMoney = (value: string | number | null, currency = "ARS") => {
	if (value === null || value === undefined || value === "") return "—";
	const num = typeof value === "string" ? Number(value) : value;
	if (Number.isNaN(num)) return "—";
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(num);
};

const periodLabel = (period: string) => {
	const [y, m] = period.split("-");
	const date = new Date(Number(y), Number(m) - 1, 1);
	return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

const formatDate = (iso: string | null) =>
	iso
		? new Date(iso).toLocaleDateString("es-AR", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			})
		: "—";

interface PayrollsTabProps {
	userId: number;
}

export default function PayrollsTab({ userId }: PayrollsTabProps) {
	const { data: session } = useSession();
	const [payrolls, setPayrolls] = useState<Payroll[]>([]);
	const [stats, setStats] = useState<Stats>({
		countYear: 0,
		grossYear: "0",
		netYear: "0",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);

	const token = session?.user?.accessToken;

	const loadPayrolls = async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			const res = await fetch(PAYROLLS_BY_USER_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			const json = await res.json();
			setPayrolls(json.data || []);
			setStats(json.stats || { countYear: 0, grossYear: "0", netYear: "0" });
		} catch {
			toast.error("Error al cargar recibos");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (userId && token) loadPayrolls();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, token]);

	const openCreateForm = () => {
		setEditingId(null);
		setForm(EMPTY_FORM);
		setFormOpen(true);
	};

	const openEditForm = (p: Payroll) => {
		setEditingId(p.id);
		setForm({
			period: p.period,
			payDate: p.payDate ? p.payDate.slice(0, 10) : "",
			grossAmount: p.grossAmount?.toString() || "",
			netAmount: p.netAmount?.toString() || "",
			contributions: p.contributions?.toString() || "",
			deductions: p.deductions?.toString() || "",
			currency: p.currency || "ARS",
			documentUrl: p.documentUrl || "",
			notes: p.notes || "",
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
		if (!form.period || !form.grossAmount || !form.netAmount) {
			toast.error("Período, bruto y neto son obligatorios");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				...form,
				payDate: form.payDate || null,
				contributions: form.contributions || null,
				deductions: form.deductions || null,
				documentUrl: form.documentUrl || null,
				notes: form.notes || null,
			};
			const url = editingId
				? PAYROLL_BY_ID_ENDPOINT(editingId)
				: PAYROLLS_BY_USER_ENDPOINT(userId);
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error();
			toast.success(editingId ? "Recibo actualizado" : "Recibo creado");
			closeForm();
			loadPayrolls();
		} catch {
			toast.error("Error al guardar");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (p: Payroll) => {
		if (!token) return;
		if (!confirm(`¿Eliminar el recibo de ${periodLabel(p.period)}?`)) return;
		try {
			const res = await fetch(PAYROLL_BY_ID_ENDPOINT(p.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Recibo eliminado");
			loadPayrolls();
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
				<div className="rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 p-3">
					<div className="flex items-center gap-2">
						<Receipt className="h-4 w-4 text-blue-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Recibos del año
						</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">
						{stats.countYear}
					</p>
				</div>
				<div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
					<div className="flex items-center gap-2">
						<DollarSign className="h-4 w-4 text-emerald-600" />
						<span className="text-xs font-medium text-muted-foreground">
							Neto acumulado
						</span>
					</div>
					<p className="text-sm font-bold text-foreground mt-1 truncate">
						{formatMoney(stats.netYear)}
					</p>
				</div>
				<div className="rounded-lg border border-border bg-muted/20 p-3">
					<div className="flex items-center gap-2">
						<DollarSign className="h-4 w-4 text-muted-foreground" />
						<span className="text-xs font-medium text-muted-foreground">
							Bruto acumulado
						</span>
					</div>
					<p className="text-sm font-bold text-foreground mt-1 truncate">
						{formatMoney(stats.grossYear)}
					</p>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Historial de recibos</p>
					<p className="text-xs text-muted-foreground">
						Carga manual. Un recibo por período mensual.
					</p>
				</div>
				{!formOpen && (
					<Button size="sm" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Nuevo recibo
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							{editingId ? "Editar recibo" : "Nuevo recibo"}
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
							<Label className="text-xs">Período *</Label>
							<Input
								type="month"
								value={form.period}
								onChange={(e) => setF("period", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Fecha de pago</Label>
							<Input
								type="date"
								value={form.payDate}
								onChange={(e) => setF("payDate", e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Bruto *</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.grossAmount}
								onChange={(e) => setF("grossAmount", e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Neto *</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.netAmount}
								onChange={(e) => setF("netAmount", e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Aportes</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.contributions}
								onChange={(e) => setF("contributions", e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Deducciones</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.deductions}
								onChange={(e) => setF("deductions", e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Moneda</Label>
							<Input
								value={form.currency}
								onChange={(e) => setF("currency", e.target.value.toUpperCase())}
								placeholder="ARS"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">URL del PDF</Label>
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
			) : payrolls.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
						<Receipt className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">Sin recibos todavía</p>
				</div>
			) : (
				<div className="space-y-2 max-h-[45vh] overflow-y-auto">
					{payrolls.map((p) => (
						<div
							key={p.id}
							className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
						>
							<div className="flex items-start gap-3 min-w-0 flex-1">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
									<Receipt className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<p className="text-sm font-medium text-foreground capitalize">
											{periodLabel(p.period)}
										</p>
										<span className="text-xs text-muted-foreground font-mono">
											{p.period}
										</span>
									</div>
									<div className="flex items-center gap-3 flex-wrap mt-1 text-xs">
										<span className="text-muted-foreground">
											Neto:{" "}
											<span className="font-semibold text-emerald-600">
												{formatMoney(p.netAmount, p.currency)}
											</span>
										</span>
										<span className="text-muted-foreground">
											Bruto:{" "}
											<span className="font-medium text-foreground">
												{formatMoney(p.grossAmount, p.currency)}
											</span>
										</span>
										{p.contributions && (
											<span className="text-muted-foreground">
												Aportes:{" "}
												<span className="font-medium text-foreground">
													{formatMoney(p.contributions, p.currency)}
												</span>
											</span>
										)}
									</div>
									<p className="text-[11px] text-muted-foreground mt-0.5">
										Pago: {formatDate(p.payDate)}
									</p>
									{p.notes && (
										<p className="text-xs text-muted-foreground mt-1 italic truncate">
											{p.notes}
										</p>
									)}
									{p.documentUrl && (
										<a
											href={p.documentUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-primary hover:underline mt-1 inline-block"
										>
											Descargar PDF →
										</a>
									)}
								</div>
							</div>
							<div className="flex items-center gap-0.5 shrink-0">
								<Button
									size="icon"
									variant="ghost"
									onClick={() => openEditForm(p)}
									title="Editar"
									className="h-8 w-8"
								>
									<Pencil className="h-3.5 w-3.5" />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									onClick={() => handleDelete(p)}
									title="Eliminar"
									className="h-8 w-8 text-destructive hover:text-destructive"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
