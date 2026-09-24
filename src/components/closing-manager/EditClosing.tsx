"use client";

import { AlertCircle, Loader2, Save, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CLOSING_BY_ID_ENDPOINT,
	CLOSINGS_CHARGE_COLLECTORS_ENDPOINT,
} from "@/constant/api-endpoints";
import {
	closingType,
	statusCapital,
	statusData,
} from "@/constant/closing-manager";
import type { ClosingManagerEntry } from "@/types/closing-manager";

const toDateInputValue = (raw?: string | null): string => {
	if (!raw) return "";
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return "";
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};

const todayInputValue = () => toDateInputValue(new Date().toISOString());

interface EditClosingProps {
	closing: ClosingManagerEntry;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const inputClass =
	"w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none";

const formatARS = (n: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 2,
	}).format(n);

export default function EditClosing({
	closing,
	isOpen,
	onClose,
	onSuccess,
}: EditClosingProps) {
	const { data: session } = useSession();

	// Form state
	const [type, setType] = useState("SRT");
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
	const [aportesRepresentantePercent, setAportesRepresentantePercent] =
		useState("25");
	const [detail, setDetail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Cobro HP/PCL
	const [hpChargedAt, setHpChargedAt] = useState("");
	const [hpChargedById, setHpChargedById] = useState("");
	const [pclChargedAt, setPclChargedAt] = useState("");
	const [pclChargedById, setPclChargedById] = useState("");
	const [collectors, setCollectors] = useState<
		{ id: number; name: string }[]
	>([]);

	const hpCharged = feeStatus === "CHARGED";
	const pclCharged = pclStatus === "CHARGED";

	// Initialize from closing data
	useEffect(() => {
		if (closing) {
			setType(closing.type || "SRT");
			setCapitalAmount(String(closing.capitalAmount || 0));
			setCapitalState(closing.capitalState || "AGREEMENT_IN_MANAGEMENT");
			setFeeStatus(closing.feeStatus || "EARRINGS");
			setHpAgreed(String(closing.hpAgreed ?? 20));
			setHpTotal(String(closing.hpTotal ?? 0));
			setWithRepresentante(closing.hpDistribution ?? true);
			setPclAgreed(String(closing.pclAgreed ?? 20));
			setPclTotal(String(closing.pclTotal ?? 0));
			setPclStatus(closing.pclStatus || "EARRINGS");
			setContributionsAmount(String(closing.contributionsAmount ?? 0));
			setApplyContributions(closing.applyContributions ?? true);
			setAportesRepresentantePercent(
				String(closing.aportesRepresentantePercent ?? 25),
			);
			setDetail(closing.detail || "");
			setHpChargedAt(toDateInputValue(closing.hpChargedAt));
			setHpChargedById(
				closing.hpChargedById ? String(closing.hpChargedById) : "",
			);
			setPclChargedAt(toDateInputValue(closing.pclChargedAt));
			setPclChargedById(
				closing.pclChargedById ? String(closing.pclChargedById) : "",
			);
		}
	}, [closing]);

	// Cargar usuarios habilitados para registrar cobros. Usa el endpoint
	// dedicado del backend (`CHARGE_COLLECTOR_ROLES` en closing.controller.ts)
	// en vez de reimplementar la lista de roles acá — antes esta lista local
	// solo tenía 4 roles administrativos y dejaba afuera a legales (Julieta,
	// Agustín) que el backend sí habilita.
	useEffect(() => {
		const token = session?.user?.accessToken;
		if (!token) return;
		(async () => {
			try {
				const res = await fetch(CLOSINGS_CHARGE_COLLECTORS_ENDPOINT, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) return;
				const data: { id: number; name: string }[] = await res.json();
				setCollectors(data);
			} catch {
				// silent
			}
		})();
	}, [session?.user?.accessToken]);

	// Calculated fields in real-time
	const calc = useMemo(() => {
		const hp = Number(hpTotal) || 0;
		const pcl = Number(pclTotal) || 0;
		const aportes = applyContributions ? Number(contributionsAmount) || 0 : 0;
		const aportesRepPctClamped = Math.max(
			0,
			Math.min(100, Number(aportesRepresentantePercent) || 0),
		);
		const aportesRepRatio = withRepresentante ? aportesRepPctClamped / 100 : 0;

		const hpRep = withRepresentante ? hp * 0.25 : 0;
		const hpLeg = hp - hpRep;
		const pclRep = withRepresentante ? pcl * 0.25 : 0;
		const pclLeg = pcl - pclRep;
		const aportesRep = aportes * aportesRepRatio;
		const aportesLeg = aportes - aportesRep;
		// Los aportes Legalistas se descuentan de HP Legalistas (NO de PCL Legalistas).
		const hpLegNeto = hpLeg - aportesLeg;
		const montoTransferir = hpLegNeto + pclLeg;

		return {
			hpRep,
			hpLeg,
			hpLegNeto,
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
		aportesRepresentantePercent,
	]);

	const handleHpChargedToggle = (checked: boolean) => {
		if (checked) {
			setFeeStatus("CHARGED");
			if (!hpChargedAt) setHpChargedAt(todayInputValue());
		} else {
			setFeeStatus("EARRINGS");
			setHpChargedAt("");
			setHpChargedById("");
		}
	};

	const handlePclChargedToggle = (checked: boolean) => {
		if (checked) {
			setPclStatus("CHARGED");
			if (!pclChargedAt) setPclChargedAt(todayInputValue());
		} else {
			setPclStatus("EARRINGS");
			setPclChargedAt("");
			setPclChargedById("");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);
		try {
			const response = await fetch(CLOSING_BY_ID_ENDPOINT(closing.id), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					type,
					capitalAmount: parseFloat(capitalAmount) || 0,
					capitalState,
					feeStatus,
					hpAgreed: parseFloat(hpAgreed) || 20,
					hpTotal: parseFloat(hpTotal) || 0,
					hpDistribution: withRepresentante,
					hpChargedAt: hpCharged ? hpChargedAt || null : null,
					hpChargedById: hpCharged && hpChargedById ? Number(hpChargedById) : null,
					pclAgreed: parseFloat(pclAgreed) || 0,
					pclTotal: parseFloat(pclTotal) || 0,
					pclDistribution: withRepresentante,
					pclStatus,
					pclChargedAt: pclCharged ? pclChargedAt || null : null,
					pclChargedById: pclCharged && pclChargedById ? Number(pclChargedById) : null,
					contributionsAmount: parseFloat(contributionsAmount) || 0,
					applyContributions,
					aportesRepresentantePercent:
						parseFloat(aportesRepresentantePercent) || 25,
					detail: detail || null,
				}),
			});
			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || "Error al actualizar");
			}
			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const formatDate = (d: string) => {
		const date = new Date(d);
		return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl">
				{/* Header */}
				<div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						Editar Cierre
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{error && (
						<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
							<AlertCircle className="w-5 h-5 text-red-600" />
							<p className="text-sm text-red-600">{error}</p>
						</div>
					)}

					{/* Info del cierre (solo lectura) */}
					<div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
						<h4 className="font-semibold text-sm text-primary mb-3">
							Datos del Case ID
						</h4>
						<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
							<div>
								<span className="text-gray-500">Causa:</span>{" "}
								<span className="font-medium">{closing.case?.title}</span>
							</div>
							<div>
								<span className="text-gray-500">Expediente:</span>{" "}
								<span className="font-medium">
									{closing.case?.number || "-"}
								</span>
							</div>
							<div>
								<span className="text-gray-500">Representante:</span>{" "}
								<span className="font-medium">
									{closing.case?.responsibleLawyer?.name || "-"}
								</span>
							</div>
							<div>
								<span className="text-gray-500">Abogado Interno:</span>{" "}
								<span className="font-medium">
									{closing.case?.internalLawyer?.name || "-"}
								</span>
							</div>
							<div>
								<span className="text-gray-500">Fecha:</span>{" "}
								<span className="font-medium">{formatDate(closing.date)}</span>
							</div>
						</div>
					</div>

					{/* Campos principales */}
					<div className="grid grid-cols-2 gap-6">
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Tipo de Cierre <span className="text-red-500">*</span>
							</label>
							<Select value={type} onValueChange={setType}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(closingType)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Capital ($)</label>
							<input
								type="number"
								step="0.01"
								min="0"
								value={capitalAmount}
								onChange={(e) => setCapitalAmount(e.target.value)}
								className={inputClass}
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">
								Estado Capital <span className="text-red-500">*</span>
							</label>
							<Select value={capitalState} onValueChange={setCapitalState}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(statusCapital)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">
								Estado Honorarios <span className="text-red-500">*</span>
							</label>
							<Select value={feeStatus} onValueChange={setFeeStatus}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(statusData)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Estado PCL</label>
							<Select value={pclStatus} onValueChange={setPclStatus}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(statusData)
										.filter(([k]) => k === k.toUpperCase())
										.map(([k, v]) => (
											<SelectItem key={k} value={k}>
												{v}
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
					<div className="border border-gray-200 rounded-lg p-4 space-y-4">
						<h4 className="font-semibold text-sm">
							Honorarios Pactados (HP)
						</h4>
						<div className="grid grid-cols-4 gap-4">
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									HP Convenido (%)
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={hpAgreed}
									onChange={(e) => setHpAgreed(e.target.value)}
									className={inputClass}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">HP Total ($)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={hpTotal}
									onChange={(e) => setHpTotal(e.target.value)}
									className={inputClass}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									HP Representante ($)
								</label>
								<div
									className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!withRepresentante ? "text-gray-400" : ""}`}
								>
									{formatARS(calc.hpRep)}
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									HP Legalistas{calc.aportesLeg > 0 ? " (neto)" : ""} ($)
								</label>
								<div
									className="h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm font-medium"
									title={
										calc.aportesLeg > 0
											? `${formatARS(calc.hpLeg)} − aportes ${formatARS(calc.aportesLeg)}`
											: undefined
									}
								>
									{formatARS(calc.hpLegNeto)}
								</div>
							</div>
						</div>

						{/* Cobro HP */}
						<div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
							<label className="flex items-center gap-2 cursor-pointer select-none h-10">
								<Checkbox
									checked={hpCharged}
									onCheckedChange={(v) => handleHpChargedToggle(v === true)}
								/>
								<span className="text-sm font-medium">HP Cobrado</span>
							</label>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">Fecha de cobro</label>
								<input
									type="date"
									value={hpChargedAt}
									onChange={(e) => setHpChargedAt(e.target.value)}
									disabled={!hpCharged}
									className={inputClass}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">Cobró</label>
								<Select
									value={hpChargedById || "none"}
									onValueChange={(v) =>
										setHpChargedById(v === "none" ? "" : v)
									}
									disabled={!hpCharged}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Sin asignar</SelectItem>
										{collectors.map((u) => (
											<SelectItem key={u.id} value={String(u.id)}>
												{u.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* PCL */}
					<div className="border border-gray-200 rounded-lg p-4 space-y-4">
						<h4 className="font-semibold text-sm">
							Pacto de Cuota Litis (PCL)
						</h4>
						<div className="grid grid-cols-4 gap-4">
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									PCL Convenido (%)
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={pclAgreed}
									onChange={(e) => setPclAgreed(e.target.value)}
									className={inputClass}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">PCL Total ($)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={pclTotal}
									onChange={(e) => setPclTotal(e.target.value)}
									className={inputClass}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									PCL Representante ($)
								</label>
								<div
									className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!withRepresentante ? "text-gray-400" : ""}`}
								>
									{formatARS(calc.pclRep)}
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									PCL Legalistas ($)
								</label>
								<div className="h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm font-medium">
									{formatARS(calc.pclLeg)}
								</div>
							</div>
						</div>

						{/* Cobro PCL */}
						<div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
							<label className="flex items-center gap-2 cursor-pointer select-none h-10">
								<Checkbox
									checked={pclCharged}
									onCheckedChange={(v) => handlePclChargedToggle(v === true)}
								/>
								<span className="text-sm font-medium">PCL Cobrado</span>
							</label>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">Fecha de cobro</label>
								<input
									type="date"
									value={pclChargedAt}
									onChange={(e) => setPclChargedAt(e.target.value)}
									disabled={!pclCharged}
									className={inputClass}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">Cobró</label>
								<Select
									value={pclChargedById || "none"}
									onValueChange={(v) =>
										setPclChargedById(v === "none" ? "" : v)
									}
									disabled={!pclCharged}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Sin asignar</SelectItem>
										{collectors.map((u) => (
											<SelectItem key={u.id} value={String(u.id)}>
												{u.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Aportes */}
					<div className="border border-gray-200 rounded-lg p-4 space-y-4">
						<div className="flex items-center justify-between">
							<h4 className="font-semibold text-sm">Aportes</h4>
							<div className="flex items-center gap-2 text-sm">
								<span>Aplicar aportes</span>
								<Switch checked={applyContributions} onCheckedChange={setApplyContributions} />
							</div>
						</div>
						<div className="grid grid-cols-4 gap-4">
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									Aportes Totales ($)
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={contributionsAmount}
									onChange={(e) => setContributionsAmount(e.target.value)}
									className={inputClass}
									disabled={!applyContributions}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									% Representante
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={aportesRepresentantePercent}
									onChange={(e) =>
										setAportesRepresentantePercent(e.target.value)
									}
									className={inputClass}
									disabled={!applyContributions || !withRepresentante}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									Aportes Representante ($)
								</label>
								<div
									className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!applyContributions || !withRepresentante ? "text-gray-400" : ""}`}
								>
									{formatARS(calc.aportesRep)}
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-xs text-gray-500">
									Aportes Legalistas ($)
								</label>
								<div
									className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!applyContributions ? "text-gray-400" : ""}`}
								>
									{formatARS(calc.aportesLeg)}
								</div>
							</div>
						</div>
						<p className="text-xs text-gray-400">
							Los aportes Legalistas se descuentan de los Honorarios (HP), no
							del PCL.{" "}
							{withRepresentante
								? `Distribución: ${100 - (parseFloat(aportesRepresentantePercent) || 0)}% Legalistas / ${parseFloat(aportesRepresentantePercent) || 0}% Representante.`
								: "Distribución: 100% Legalistas."}
						</p>
					</div>

					{/* Monto a Cobrar + Gastos de la Causa */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
						<div
							className={`rounded-lg p-4 border-2 lg:col-span-2 ${calc.montoTransferir < 0 ? "border-red-300 bg-red-50" : "border-primary/30 bg-primary/5"}`}
						>
							<div className="flex items-center justify-between">
								<div>
									<h4 className="font-semibold text-sm">
										Monto a Cobrar por Legalistas
									</h4>
									<p className="text-xs text-gray-500 mt-0.5">
										HP Legalistas (neto de aportes) + PCL Legalistas
									</p>
								</div>
								<span
									className={`text-2xl font-bold ${calc.montoTransferir < 0 ? "text-red-700" : "text-primary"}`}
								>
									{formatARS(calc.montoTransferir)}
								</span>
							</div>
						</div>
						<div className="rounded-lg p-4 border-2 border-amber-200 bg-amber-50">
							<h4 className="font-semibold text-sm">Gastos de la Causa</h4>
							<p className="text-xs text-gray-500 mt-0.5">Solo lectura</p>
							<span className="text-xl font-bold text-amber-700 mt-1 block">
								{formatARS(closing.totalCaseExpenses || 0)}
							</span>
						</div>
					</div>

					{/* Detalle */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Detalle</label>
						<textarea
							value={detail}
							onChange={(e) => setDetail(e.target.value)}
							rows={3}
							className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
							placeholder="Descripción de la situación del cierre..."
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-6 border-t border-gray-200">
						<Button
							type="button"
							onClick={onClose}
							variant="outline"
							disabled={isSubmitting}
							className="flex-1"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="flex-1 bg-primary hover:bg-primary/85 text-white"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-2" />
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
