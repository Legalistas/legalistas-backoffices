"use client";

import { ChevronLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { CLOSING_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import {
	closingType,
	statusCapital,
	statusData,
} from "@/constant/closing-manager";
import type { ClosingManagerEntry } from "@/types/closing-manager";

const inputClass =
	"w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all";

const readOnlyClass =
	"w-full h-11 px-3 rounded-lg border border-border bg-muted text-sm outline-none cursor-default";

const displayClass =
	"h-11 flex items-center px-3 rounded-lg bg-muted border border-border text-sm";

const formatARS = (n: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 2,
	}).format(n);

export default function EditClosingPage() {
	const router = useRouter();
	const params = useParams();
	const { data: session } = useSession();
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [closing, setClosing] = useState<ClosingManagerEntry | null>(null);

	// Form state
	const [type, setType] = useState("SRT");
	const [closingDate, setClosingDate] = useState("");
	const [capitalAmount, setCapitalAmount] = useState("");
	const [capitalState, setCapitalState] = useState("AGREEMENT_IN_MANAGEMENT");
	const [feeStatus, setFeeStatus] = useState("EARRINGS");
	const [hpAgreed, setHpAgreed] = useState("20");
	const [hpTotal, setHpTotal] = useState("0");
	const [withRepresentante, setWithRepresentante] = useState(true);
	const [pclAgreed, setPclAgreed] = useState("20");
	const [pclTotal, setPclTotal] = useState("0");
	const [pclStatus, setPclStatus] = useState("EARRINGS");
	const [contributionsAmount, setContributionsAmount] = useState("0");
	const [applyContributions, setApplyContributions] = useState(true);
	const [detail, setDetail] = useState("");

	// Auto-calculate HP Total and PCL Total
	useEffect(() => {
		const capital = parseFloat(capitalAmount) || 0;
		const hpPercent = parseFloat(hpAgreed) || 0;
		setHpTotal(((capital * hpPercent) / 100).toFixed(2));
	}, [capitalAmount, hpAgreed]);

	useEffect(() => {
		const capital = parseFloat(capitalAmount) || 0;
		const pclPercent = parseFloat(pclAgreed) || 0;
		setPclTotal(((capital * pclPercent) / 100).toFixed(2));
	}, [capitalAmount, pclAgreed]);

	// Calculated fields
	const calc = useMemo(() => {
		const hp = Number(hpTotal) || 0;
		const pcl = Number(pclTotal) || 0;
		const aportes = applyContributions ? Number(contributionsAmount) || 0 : 0;
		const hpRep = withRepresentante ? hp * 0.25 : 0;
		const hpLeg = hp - hpRep;
		const pclRep = withRepresentante ? pcl * 0.25 : 0;
		const pclLeg = pcl - pclRep;
		const aportesRep = withRepresentante ? aportes * 0.25 : 0;
		const aportesLeg = withRepresentante ? aportes * 0.75 : aportes;
		const montoTransferir = hpLeg + pclLeg - aportesLeg;
		return {
			hpRep,
			hpLeg,
			pclRep,
			pclLeg,
			aportesRep,
			aportesLeg,
			montoTransferir,
		};
	}, [
		hpTotal,
		withRepresentante,
		pclTotal,
		contributionsAmount,
		applyContributions,
	]);

	// Fetch closing
	useEffect(() => {
		const fetchClosing = async () => {
			if (!session?.user?.accessToken) {
				setIsLoading(false);
				return;
			}
			try {
				const response = await fetch(
					CLOSING_BY_ID_ENDPOINT(Number(params.id)),
					{
						headers: { Authorization: `Bearer ${session.user.accessToken}` },
					},
				);
				if (!response.ok) throw new Error("Error al cargar el cierre");
				const result = await response.json();
				const data = result.data || result;
				setClosing(data);

				setType(data.type || "SRT");
				setClosingDate(data.date ? String(data.date).slice(0, 10) : "");
				setCapitalAmount(String(data.capitalAmount ?? 0));
				setCapitalState(data.capitalState || "AGREEMENT_IN_MANAGEMENT");
				setFeeStatus(data.feeStatus || "EARRINGS");
				setHpAgreed(String(data.hpAgreed ?? 20));
				setHpTotal(String(data.hpTotal ?? 0));
				setWithRepresentante(data.hpDistribution ?? true);
				setPclAgreed(String(data.pclAgreed ?? 20));
				setPclTotal(String(data.pclTotal ?? 0));
				setPclStatus(data.pclStatus || "EARRINGS");
				setContributionsAmount(String(data.contributionsAmount ?? 0));
				setApplyContributions(data.applyContributions ?? true);
				setDetail(data.detail || "");
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error desconocido");
			} finally {
				setIsLoading(false);
			}
		};
		fetchClosing();
	}, [params.id, session?.user?.accessToken]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);
		try {
			const response = await fetch(CLOSING_BY_ID_ENDPOINT(Number(params.id)), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					type,
					date: closingDate || undefined,
					capitalAmount: parseFloat(capitalAmount) || 0,
					capitalState,
					feeStatus,
					hpAgreed: parseFloat(hpAgreed) || 20,
					hpTotal: parseFloat(hpTotal) || 0,
					hpDistribution: withRepresentante,
					pclAgreed: parseFloat(pclAgreed) || 0,
					pclTotal: parseFloat(pclTotal) || 0,
					pclDistribution: withRepresentante,
					pclStatus,
					contributionsAmount: parseFloat(contributionsAmount) || 0,
					applyContributions,
					detail: detail || null,
				}),
			});
			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || "Error al actualizar");
			}
			router.push("/admin/closing-manager");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!closing) {
		return (
			<div className="text-center py-12">
				<p className="text-destructive">No se pudo cargar el cierre</p>
				<Link href="/admin/closing-manager">
					<Button variant="outline" className="mt-4">
						Volver
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link href="/admin/closing-manager">
					<Button variant="outline" size="sm">
						<ChevronLeft className="h-4 w-4 mr-2" />
						Volver
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Editar Cierre
					</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						Modifica los datos del cierre
					</p>
				</div>
			</div>

			<div className="rounded-xl border border-border bg-card shadow-sm">
				{/* Info del case (solo lectura) */}
				<div className="bg-primary/5 dark:bg-primary/10 border-b border-border rounded-t-xl p-5">
					<h4 className="font-semibold text-sm text-primary mb-3">
						Datos del Case ID
					</h4>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
						<div className="bg-background/60 dark:bg-background/30 rounded-lg p-3">
							<span className="text-muted-foreground text-xs block mb-1">Causa</span>
							<span className="font-medium text-foreground">
								{closing.case?.title || "-"}
							</span>
						</div>
						<div className="bg-background/60 dark:bg-background/30 rounded-lg p-3">
							<span className="text-muted-foreground text-xs block mb-1">
								Expediente
							</span>
							<span className="font-medium text-foreground">
								{closing.case?.number || "-"}
							</span>
						</div>
						<div className="bg-background/60 dark:bg-background/30 rounded-lg p-3">
							<span className="text-muted-foreground text-xs block mb-1">
								Representante
							</span>
							<span className="font-medium text-foreground">
								{closing.case?.responsibleLawyer?.name || "-"}
							</span>
						</div>
						<div className="bg-background/60 dark:bg-background/30 rounded-lg p-3">
							<span className="text-muted-foreground text-xs block mb-1">
								Abogado Interno
							</span>
							<span className="font-medium text-foreground">
								{closing.case?.internalLawyer?.name || "-"}
							</span>
						</div>
						<div className="bg-background/60 dark:bg-background/30 rounded-lg p-3">
							<label className="text-muted-foreground text-xs block mb-1">Fecha</label>
							<input
								type="date"
								value={closingDate}
								onChange={(e) => setClosingDate(e.target.value)}
								className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground focus:outline-none focus:ring-0"
							/>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{error && (
						<div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
							{error}
						</div>
					)}

					{/* Estados y tipo */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground">
								Tipo de Cierre <span className="text-destructive">*</span>
							</label>
							<Select value={type} onValueChange={setType}>
								<SelectTrigger className="h-11">
									<span className="truncate">
										{closingType[type as keyof typeof closingType] ||
											"Seleccione"}
									</span>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(closingType)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v as string}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground">
								Capital ($)
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
									$
								</span>
								<input
									type="number"
									step="0.01"
									min="0"
									value={capitalAmount}
									onChange={(e) => setCapitalAmount(e.target.value)}
									className={`${inputClass} pl-7`}
								/>
							</div>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground">
								Estado Capital <span className="text-destructive">*</span>
							</label>
							<Select value={capitalState} onValueChange={setCapitalState}>
								<SelectTrigger className="h-11">
									<span className="truncate">
										{statusCapital[
											capitalState as keyof typeof statusCapital
										] || "Seleccione"}
									</span>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(statusCapital)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v as string}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground">
								Estado Honorarios <span className="text-destructive">*</span>
							</label>
							<Select value={feeStatus} onValueChange={setFeeStatus}>
								<SelectTrigger className="h-11">
									<span className="truncate">
										{statusData[feeStatus as keyof typeof statusData] ||
											"Seleccione"}
									</span>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(statusData)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v as string}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Distribución con representante */}
					<div className="flex items-center justify-between rounded-xl border border-border px-5 py-3.5">
						<div>
							<p className="text-sm font-medium text-foreground">Distribución con representante (25%)</p>
							<p className="text-xs text-muted-foreground mt-0.5">Aplica tanto a HP como a PCL</p>
						</div>
						<Switch checked={withRepresentante} onCheckedChange={setWithRepresentante} />
					</div>

					{/* HP */}
					<div className="border border-border rounded-xl p-5 space-y-4">
						<h4 className="font-semibold text-sm text-foreground">
							Honorarios Pactados (HP)
						</h4>
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									HP Convenido (%)
								</label>
								<div className="relative">
									<input
										type="number"
										step="0.01"
										min="0"
										max="100"
										value={hpAgreed}
										onChange={(e) => setHpAgreed(e.target.value)}
										className={`${inputClass} pr-8`}
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
										%
									</span>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">HP Total ($)</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
										$
									</span>
									<input
										type="number"
										step="0.01"
										min="0"
										value={hpTotal}
										readOnly
										className={`${readOnlyClass} pl-7`}
									/>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									HP Representante ($)
								</label>
								<div
									className={`${displayClass} ${!withRepresentante ? "text-muted-foreground" : "font-medium text-foreground"}`}
								>
									{formatARS(calc.hpRep)}
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									HP Legalistas ($)
								</label>
								<div className={`${displayClass} font-semibold text-foreground`}>
									{formatARS(calc.hpLeg)}
								</div>
							</div>
						</div>
					</div>

					{/* PCL */}
					<div className="border border-border rounded-xl p-5 space-y-4">
						<h4 className="font-semibold text-sm text-foreground">
							Pacto de Cuota Litis (PCL)
						</h4>
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									PCL Convenido (%)
								</label>
								<div className="relative">
									<input
										type="number"
										step="0.01"
										min="0"
										max="100"
										value={pclAgreed}
										onChange={(e) => setPclAgreed(e.target.value)}
										className={`${inputClass} pr-8`}
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
										%
									</span>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">PCL Total ($)</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
										$
									</span>
									<input
										type="number"
										step="0.01"
										min="0"
										value={pclTotal}
										readOnly
										className={`${readOnlyClass} pl-7`}
									/>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									PCL Representante ($)
								</label>
								<div
									className={`${displayClass} ${!withRepresentante ? "text-muted-foreground" : "font-medium text-foreground"}`}
								>
									{formatARS(calc.pclRep)}
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									PCL Legalistas ($)
								</label>
								<div className={`${displayClass} font-semibold text-foreground`}>
									{formatARS(calc.pclLeg)}
								</div>
							</div>
						</div>
					</div>

					{/* Aportes */}
					<div className="border border-border rounded-xl p-5 space-y-4">
						<div className="flex items-center justify-between">
							<h4 className="font-semibold text-sm text-foreground">Aportes</h4>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span>Aplicar aportes</span>
								<Switch checked={applyContributions} onCheckedChange={setApplyContributions} />
							</div>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									Aportes Totales ($)
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
										$
									</span>
									<input
										type="number"
										step="0.01"
										min="0"
										value={contributionsAmount}
										onChange={(e) => setContributionsAmount(e.target.value)}
										disabled={!applyContributions}
										className={`${inputClass} pl-7 disabled:bg-muted disabled:text-muted-foreground`}
									/>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									Aportes Representante ($)
								</label>
								<div
									className={`${displayClass} ${!applyContributions || !withRepresentante ? "text-muted-foreground" : "text-foreground"}`}
								>
									{formatARS(calc.aportesRep)}
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-muted-foreground">
									Aportes Legalistas ($)
								</label>
								<div
									className={`${displayClass} ${!applyContributions ? "text-muted-foreground" : "text-foreground"}`}
								>
									{formatARS(calc.aportesLeg)}
								</div>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							Monto manual ingresado por la contadora.{" "}
							{withRepresentante ? "Distribución: 75% Legalistas / 25% Representante." : "Distribución: 100% Legalistas."}
						</p>
					</div>

					{/* Monto a Transferir + Gastos de la Causa */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<div
							className={`rounded-xl p-5 border-2 lg:col-span-2 ${calc.montoTransferir < 0 ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}
						>
							<div className="flex items-center justify-between">
								<div>
									<h4 className="font-semibold text-sm text-foreground">
										Monto a Transferir a Legalistas
									</h4>
									<p className="text-xs text-muted-foreground mt-0.5">
										HP Legalistas + PCL Legalistas - Aportes Legalistas
									</p>
								</div>
								<span
									className={`text-3xl font-bold ${calc.montoTransferir < 0 ? "text-destructive" : "text-primary"}`}
								>
									{formatARS(calc.montoTransferir)}
								</span>
							</div>
						</div>
						<div className="rounded-xl p-5 border-2 border-amber-500/30 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-400/5">
							<div className="flex flex-col justify-between h-full">
								<div>
									<h4 className="font-semibold text-sm text-foreground">
										Gastos de la Causa
									</h4>
									<p className="text-xs text-muted-foreground mt-0.5">
										Total acumulado (solo lectura)
									</p>
								</div>
								<span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
									{formatARS(closing.totalCaseExpenses || 0)}
								</span>
							</div>
						</div>
					</div>

					{/* Estado PCL */}
					<div className="grid grid-cols-2 gap-5">
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-foreground">
								Estado PCL
							</label>
							<Select value={pclStatus} onValueChange={setPclStatus}>
								<SelectTrigger className="h-11">
									<span className="truncate">
										{statusData[pclStatus as keyof typeof statusData] ||
											"Seleccione"}
									</span>
								</SelectTrigger>
								<SelectContent>
									{Object.entries(statusData)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v as string}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Detalle */}
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-foreground">Detalle</label>
						<textarea
							value={detail}
							onChange={(e) => setDetail(e.target.value)}
							rows={3}
							className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
							placeholder="Descripción de la situación del cierre..."
						/>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-6 border-t border-border">
						<Link href="/admin/closing-manager">
							<Button type="button" variant="outline" className="px-6">
								Cancelar
							</Button>
						</Link>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="px-6"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Guardar Cambios
								</>
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
