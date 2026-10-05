"use client";

import {
	CheckCircle2,
	Clock,
	DollarSign,
	FileText,
	Loader2,
	Pencil,
	Plus,
	Receipt,
	Trash2,
	Wallet,
	X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import PagarProgramadoDialog from "@/components/caja/PagarProgramadoDialog";
import Adjuntos from "@/components/rrhh/Adjuntos";
import { useDocumentos, useEsRrhhAdmin } from "@/components/rrhh/api";
import ReciboPreviewDialog from "@/components/rrhh/ReciboPreviewDialog";
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
import { PAYROLL_BY_ID_ENDPOINT, PAYROLLS_BY_USER_ENDPOINT } from "@/constant/api-endpoints";
import { CONCEPTO_LABEL, type ConceptoTipo } from "@/constant/rrhh";
import { apiErrorMessage } from "@/lib/api-error";
import { parseMonto } from "@/lib/monto";

// Recibos de sueldo / remuneraciones del mes. Cada uno puede llevar sus
// conceptos de costo (remuneración, cargas sociales, obra social, monotributo,
// IIBB…): se proyectan en Gastos e Ingresos y se pagan desde la Caja.
// La persona ve los suyos (Mi perfil) sin poder cambiarlos.

interface Concepto {
	id: number;
	concepto: ConceptoTipo;
	descripcion: string | null;
	monto: string;
	vencimiento: string;
	scheduledTransactionId: number | null;
	scheduledTransaction: {
		id: number;
		status: "pending" | "paid" | "cancelled";
		paidAt: string | null;
		cajaMovimientos: { id: number; fecha: string; caja: { id: number; nombre: string } }[];
	} | null;
}

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
	conceptos?: Concepto[];
}

interface Stats {
	countYear: number;
	grossYear: string;
	netYear: string;
	costYear?: string;
}

interface ConceptoForm {
	id?: number;
	concepto: ConceptoTipo;
	descripcion: string;
	monto: string;
	vencimiento: string;
	pagado: boolean;
}

interface FormState {
	period: string;
	payDate: string;
	grossAmount: string;
	netAmount: string;
	contributions: string;
	deductions: string;
	currency: string;
	notes: string;
	conceptos: ConceptoForm[];
}

const currentPeriod = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Día 5 del mes siguiente al período (vencimiento sugerido). */
const vencimientoSugerido = (period: string) => {
	const [y, m] = period.split("-").map(Number);
	if (!y || !m) return "";
	const d = new Date(Date.UTC(y, m, 5));
	return d.toISOString().slice(0, 10);
};

const EMPTY_FORM = (): FormState => ({
	period: currentPeriod(),
	payDate: "",
	grossAmount: "",
	netAmount: "",
	contributions: "",
	deductions: "",
	currency: "ARS",
	notes: "",
	conceptos: [],
});

const CONCEPTOS = Object.keys(CONCEPTO_LABEL) as ConceptoTipo[];

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
				timeZone: "UTC",
			})
		: "—";

interface PayrollsTabProps {
	userId: number;
}

export default function PayrollsTab({ userId }: PayrollsTabProps) {
	const { data: session } = useSession();
	const esAdmin = useEsRrhhAdmin();
	const { documentos, recargar: recargarDocs } = useDocumentos(userId);
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
	const [pagar, setPagar] = useState<number | null>(null);
	// Recibo abierto en la vista previa (el PDF que arma el sistema).
	const [verRecibo, setVerRecibo] = useState<Payroll | null>(null);

	const token = session?.user?.accessToken;
	// El costo (con cargas del empleador) lo ve RR.HH.; la persona ve su neto y bruto.
	const verCosto = esAdmin && stats.costYear !== undefined;

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
		setForm(EMPTY_FORM());
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
			notes: p.notes || "",
			conceptos: (p.conceptos ?? []).map((c) => ({
				id: c.id,
				concepto: c.concepto,
				descripcion: c.descripcion ?? "",
				monto: String(Number(c.monto)).replace(".", ","),
				vencimiento: c.vencimiento.slice(0, 10),
				pagado: c.scheduledTransaction?.status === "paid",
			})),
		});
		setFormOpen(true);
	};

	const closeForm = () => {
		setFormOpen(false);
		setEditingId(null);
		setForm(EMPTY_FORM());
	};

	const handleSave = async () => {
		if (!token) return;
		if (!form.period || !form.grossAmount || !form.netAmount) {
			toast.error("Período, bruto y neto son obligatorios");
			return;
		}
		const conceptos = [];
		for (const c of form.conceptos) {
			const monto = parseMonto(c.monto);
			if (!monto || monto <= 0) {
				toast.error(`${CONCEPTO_LABEL[c.concepto]}: el monto tiene que ser mayor a 0`);
				return;
			}
			if (!c.vencimiento) {
				toast.error(`${CONCEPTO_LABEL[c.concepto]}: falta el vencimiento`);
				return;
			}
			conceptos.push({
				...(c.id ? { id: c.id } : {}),
				concepto: c.concepto,
				descripcion: c.descripcion.trim() || null,
				monto,
				vencimiento: c.vencimiento,
			});
		}
		setIsSaving(true);
		try {
			const payload = {
				period: form.period,
				payDate: form.payDate || null,
				grossAmount: form.grossAmount,
				netAmount: form.netAmount,
				contributions: form.contributions || null,
				deductions: form.deductions || null,
				currency: form.currency,
				notes: form.notes || null,
				conceptos,
			};
			const url = editingId ? PAYROLL_BY_ID_ENDPOINT(editingId) : PAYROLLS_BY_USER_ENDPOINT(userId);
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al guardar"));
			toast.success(
				editingId ? "Recibo actualizado" : "Recibo creado",
				conceptos.length > 0
					? { description: "Los conceptos quedaron en Gastos e Ingresos para pagar." }
					: undefined,
			);
			closeForm();
			loadPayrolls();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al guardar");
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
			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al eliminar"));
			toast.success("Recibo eliminado");
			loadPayrolls();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al eliminar");
		}
	};

	const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
		setForm((s) => ({ ...s, [k]: v }));

	const setConcepto = (i: number, cambios: Partial<ConceptoForm>) =>
		setForm((s) => ({
			...s,
			conceptos: s.conceptos.map((c, j) => (j === i ? { ...c, ...cambios } : c)),
		}));

	const agregarConcepto = () => {
		const usados = new Set(form.conceptos.map((c) => c.concepto));
		const siguiente = CONCEPTOS.find((c) => !usados.has(c)) ?? "OTRO";
		setForm((s) => ({
			...s,
			conceptos: [
				...s.conceptos,
				{
					concepto: siguiente,
					descripcion: "",
					monto: siguiente === "REMUNERACION" && s.netAmount ? s.netAmount.replace(".", ",") : "",
					vencimiento: vencimientoSugerido(s.period),
					pagado: false,
				},
			],
		}));
	};

	const totalConceptos = form.conceptos.reduce((s, c) => s + (parseMonto(c.monto) ?? 0), 0);

	return (
		<div className="space-y-4 py-2">
			{/* Stats */}
			<div className={`grid gap-3 ${verCosto ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
				<div className="rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 p-3">
					<div className="flex items-center gap-2">
						<Receipt className="h-4 w-4 text-blue-600" />
						<span className="text-xs font-medium text-muted-foreground">Recibos del año</span>
					</div>
					<p className="text-lg font-bold text-foreground mt-1">{stats.countYear}</p>
				</div>
				<div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
					<div className="flex items-center gap-2">
						<DollarSign className="h-4 w-4 text-emerald-600" />
						<span className="text-xs font-medium text-muted-foreground">Neto acumulado</span>
					</div>
					<p className="text-sm font-bold text-foreground mt-1 truncate">
						{formatMoney(stats.netYear)}
					</p>
				</div>
				<div className="rounded-lg border border-border bg-muted/20 p-3">
					<div className="flex items-center gap-2">
						<DollarSign className="h-4 w-4 text-muted-foreground" />
						<span className="text-xs font-medium text-muted-foreground">Bruto acumulado</span>
					</div>
					<p className="text-sm font-bold text-foreground mt-1 truncate">
						{formatMoney(stats.grossYear)}
					</p>
				</div>
				{verCosto && (
					<div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
						<div className="flex items-center gap-2">
							<Wallet className="h-4 w-4 text-amber-600" />
							<span className="text-xs font-medium text-muted-foreground">Costo del año</span>
						</div>
						<p className="text-sm font-bold text-foreground mt-1 truncate">
							{formatMoney(stats.costYear ?? null)}
						</p>
					</div>
				)}
			</div>

			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">Historial de recibos</p>
					<p className="text-xs text-muted-foreground">
						Los conceptos de costo de cada recibo (sueldo, SAC, cargas…) se pagan desde la Caja.
					</p>
				</div>
				{esAdmin && !formOpen && (
					<Button size="sm" onClick={openCreateForm}>
						<Plus className="h-4 w-4 mr-1" />
						Nuevo recibo
					</Button>
				)}
			</div>

			{formOpen && (
				<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">{editingId ? "Editar recibo" : "Nuevo recibo"}</p>
						<Button size="icon" variant="ghost" onClick={closeForm} className="h-7 w-7">
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
							<Label className="text-xs">Notas</Label>
							<Input
								value={form.notes}
								onChange={(e) => setF("notes", e.target.value)}
								placeholder="Observaciones..."
							/>
						</div>
					</div>

					{/* Conceptos de costo */}
					<div className="rounded-md border border-border bg-background p-3 space-y-2">
						<div className="flex items-center justify-between gap-2">
							<div>
								<p className="text-xs font-semibold">Conceptos de costo</p>
								<p className="text-[11px] text-muted-foreground">
									Cada uno queda en Gastos e Ingresos con su vencimiento y se paga desde la Caja.
								</p>
							</div>
							<Button size="sm" variant="outline" onClick={agregarConcepto} className="h-7">
								<Plus className="h-3.5 w-3.5 mr-1" />
								Concepto
							</Button>
						</div>
						{form.conceptos.map((c, i) => (
							<div
								key={c.id ?? `nuevo-${i}`}
								className="grid grid-cols-2 md:grid-cols-[160px_1fr_130px_140px_32px] items-end gap-2"
							>
								<div className="space-y-1">
									<Label className="text-[11px]">Concepto</Label>
									<Select
										value={c.concepto}
										onValueChange={(v) => setConcepto(i, { concepto: v as ConceptoTipo })}
										disabled={c.pagado}
									>
										<SelectTrigger className="h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{CONCEPTOS.map((k) => (
												<SelectItem key={k} value={k}>
													{CONCEPTO_LABEL[k]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px]">Detalle</Label>
									<Input
										className="h-8"
										value={c.descripcion}
										onChange={(e) => setConcepto(i, { descripcion: e.target.value })}
										placeholder="Opcional"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px]">Monto</Label>
									<Input
										className="h-8"
										inputMode="decimal"
										value={c.monto}
										onChange={(e) => setConcepto(i, { monto: e.target.value })}
										placeholder="0,00"
										disabled={c.pagado}
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px]">Vence</Label>
									<Input
										className="h-8"
										type="date"
										value={c.vencimiento}
										onChange={(e) => setConcepto(i, { vencimiento: e.target.value })}
										disabled={c.pagado}
									/>
								</div>
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8 text-destructive hover:text-destructive"
									onClick={() =>
										setForm((s) => ({ ...s, conceptos: s.conceptos.filter((_, j) => j !== i) }))
									}
									disabled={c.pagado}
									title={
										c.pagado ? "Ya está pago: anulá el pago en la Caja para quitarlo" : "Quitar"
									}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						))}
						{form.conceptos.length > 0 && (
							<p className="text-right text-xs text-muted-foreground">
								Costo total del mes:{" "}
								<span className="font-semibold text-foreground">{formatMoney(totalConceptos)}</span>
							</p>
						)}
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
				<div className="space-y-2">
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
										<span className="text-xs text-muted-foreground font-mono">{p.period}</span>
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
										<p className="text-xs text-muted-foreground mt-1 italic truncate">{p.notes}</p>
									)}

									{esAdmin && (p.conceptos?.length ?? 0) > 0 && (
										<div className="mt-2 space-y-1">
											{p.conceptos?.map((c) => {
												const st = c.scheduledTransaction;
												const pago = st?.status === "paid";
												const caja = st?.cajaMovimientos?.[0]?.caja?.nombre;
												return (
													<div
														key={c.id}
														className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/40 px-2 py-1 text-xs"
													>
														<span className="font-medium min-w-27.5">
															{CONCEPTO_LABEL[c.concepto]}
															{c.descripcion ? ` · ${c.descripcion}` : ""}
														</span>
														<span className="tabular-nums">{formatMoney(c.monto)}</span>
														<span className="text-muted-foreground">
															vence {formatDate(c.vencimiento)}
														</span>
														{pago ? (
															<span className="inline-flex items-center gap-1 text-emerald-600">
																<CheckCircle2 className="h-3 w-3" />
																Pagado{caja ? ` desde ${caja}` : ""}
															</span>
														) : (
															<>
																<span className="inline-flex items-center gap-1 text-amber-600">
																	<Clock className="h-3 w-3" />
																	Pendiente
																</span>
																{st && (
																	<Button
																		size="sm"
																		variant="outline"
																		className="h-6 px-2 text-xs"
																		onClick={() => setPagar(st.id)}
																	>
																		<Wallet className="h-3 w-3 mr-1" />
																		Pagar
																	</Button>
																)}
															</>
														)}
													</div>
												);
											})}
										</div>
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
									<Adjuntos
										userId={userId}
										documentos={documentos.filter((d) => d.reciboId === p.id)}
										fijo={{
											tipo: "RECIBO",
											reciboId: p.id,
											periodo: p.period,
											titulo: `Recibo ${p.period}`,
										}}
										puedeSubir={esAdmin}
										puedeBorrar={esAdmin}
										textoBoton="Adjuntar recibo firmado"
										onCambio={recargarDocs}
									/>
								</div>
							</div>
							<div className="flex items-center gap-0.5 shrink-0">
								<Button
									size="sm"
									variant="outline"
									onClick={() => setVerRecibo(p)}
									className="h-8 px-2.5 text-xs"
								>
									<FileText className="h-3.5 w-3.5 mr-1" />
									Ver recibo
								</Button>
								{esAdmin && (
									<>
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
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			<PagarProgramadoDialog
				programadoId={pagar}
				onClose={() => setPagar(null)}
				onPaid={() => {
					setPagar(null);
					loadPayrolls();
				}}
			/>
			<ReciboPreviewDialog
				payrollId={verRecibo?.id ?? null}
				periodo={verRecibo ? periodLabel(verRecibo.period) : undefined}
				onClose={() => setVerRecibo(null)}
			/>
		</div>
	);
}
