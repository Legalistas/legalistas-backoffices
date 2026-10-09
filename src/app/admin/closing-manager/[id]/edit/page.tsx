"use client";

import { ChevronLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import AportesCards from "@/components/closing-manager/AportesCards";
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
import {
	type AportesDetalle,
	APORTES_VACIOS,
	algunaTarjetaActiva,
	calcularAportes,
} from "@/lib/aportes-cierre";
import { cn } from "@/lib/utils";
import type {
	ChargeCollector,
	ClosingManagerEntry,
} from "@/types/closing-manager";

/** Fecha del servidor → valor de un <input type="date">. */
const soloDia = (v: unknown) => (v ? String(v).slice(0, 10) : "");

const inputClass =
	"w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all";

// Estado COBRADOS en verde, para que se vea de un vistazo qué ya entró.
// Mismo criterio de color que el badge de la tabla (statusColors.CHARGED).
const chargedTriggerClass =
	"border-green-500 bg-green-50 text-green-800 font-medium dark:border-green-700 dark:bg-green-900/20 dark:text-green-300";

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
	const [hpChargedAt, setHpChargedAt] = useState(""); // YYYY-MM-DD
	const [hpChargedById, setHpChargedById] = useState<string>(""); // "" o number string
	const [hpAgreed, setHpAgreed] = useState("20");
	const [hpTotal, setHpTotal] = useState("0");
	const [withRepresentante, setWithRepresentante] = useState(true);
	const [representantePercent, setRepresentantePercent] = useState("25");
	const [pclAgreed, setPclAgreed] = useState("20");
	const [pclTotal, setPclTotal] = useState("0");
	const [pclStatus, setPclStatus] = useState("EARRINGS");
	const [pclChargedAt, setPclChargedAt] = useState("");
	// Fechas estimadas de cobro y plazo de gracia de la PCL solicitada (AAAA-MM-DD).
	const [hpFechaEstimada, setHpFechaEstimada] = useState("");
	const [pclFechaEstimada, setPclFechaEstimada] = useState("");
	const [pclGraciaHasta, setPclGraciaHasta] = useState("");
	const [pclChargedById, setPclChargedById] = useState<string>("");
	const [aportes, setAportes] = useState<AportesDetalle>(APORTES_VACIOS);
	// Cierre cargado antes de las tarjetas: sus aportes (un total a mano y un %)
	// se conservan tal cual mientras no se active ninguna tarjeta.
	const [aportesAnteriores, setAportesAnteriores] = useState<{
		representante: number;
		legalistas: number;
	} | null>(null);
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

	// Auto-set/clear de fecha de cobro al cambiar el estado.
	// Cuando un estado pasa a CHARGED y no hay fecha → setear hoy.
	// Cuando deja de ser CHARGED → limpiar fecha y "cobrado por".
	useEffect(() => {
		if (feeStatus === "CHARGED" && !hpChargedAt) {
			setHpChargedAt(new Date().toISOString().slice(0, 10));
		} else if (feeStatus !== "CHARGED" && (hpChargedAt || hpChargedById)) {
			setHpChargedAt("");
			setHpChargedById("");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [feeStatus]);

	useEffect(() => {
		if (pclStatus === "CHARGED" && !pclChargedAt) {
			setPclChargedAt(new Date().toISOString().slice(0, 10));
		} else if (pclStatus !== "CHARGED" && (pclChargedAt || pclChargedById)) {
			setPclChargedAt("");
			setPclChargedById("");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pclStatus]);

	// Cobradores eligibles: los dos abogados del caso (responsable e interno),
	// que ya vienen en la respuesta del cierre — no hace falta pedir nada más.
	// Se suman los que ya figuran cargados en el cierre para no perder valores
	// históricos si el cobro lo registró alguien que hoy no es ninguno de los dos.
	const chargeCollectors = useMemo<ChargeCollector[]>(() => {
		if (!closing) return [];
		const byId = new Map<number, ChargeCollector>();
		const add = (
			person: ChargeCollector | null | undefined,
			role?: string,
		) => {
			if (!person?.id || byId.has(person.id)) return;
			byId.set(person.id, {
				...person,
				name: role ? `${person.name} (${role})` : person.name,
			});
		};
		add(closing.case?.responsibleLawyer, "Responsable");
		add(closing.case?.internalLawyer, "Interno");
		add(closing.hpChargedBy);
		add(closing.pclChargedBy);
		return [...byId.values()];
	}, [closing]);

	// % de HP y PCL para el representante (25 si se deja vacío).
	const repPct = Number.isFinite(parseFloat(representantePercent))
		? Math.min(100, Math.max(0, parseFloat(representantePercent)))
		: 25;
	const repRatio = withRepresentante ? repPct / 100 : 0;

	// Calculated fields
	const calc = useMemo(() => {
		const hp = Number(hpTotal) || 0;
		const pcl = Number(pclTotal) || 0;
		// Aportes: las tres tarjetas o, en un cierre anterior sin tocar, lo que ya tenía.
		const tarjetas = calcularAportes(
			aportes,
			Number(capitalAmount) || 0,
			withRepresentante,
		);
		const anteriores =
			aportesAnteriores && !algunaTarjetaActiva(aportes) ? aportesAnteriores : null;

		const hpRep = withRepresentante ? hp * repRatio : 0;
		const hpLeg = hp - hpRep;
		const pclRep = withRepresentante ? pcl * repRatio : 0;
		const pclLeg = pcl - pclRep;
		const aportesRep = anteriores ? anteriores.representante : tarjetas.representante;
		const aportesLeg = anteriores ? anteriores.legalistas : tarjetas.legalistas;
		// Aportes Legalistas se descuentan de HP (NO de PCL).
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
		repRatio,
		pclTotal,
		capitalAmount,
		aportes,
		aportesAnteriores,
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
				setHpChargedAt(
					data.hpChargedAt ? String(data.hpChargedAt).slice(0, 10) : "",
				);
				setHpChargedById(
					data.hpChargedById != null ? String(data.hpChargedById) : "",
				);
				setHpAgreed(String(data.hpAgreed ?? 20));
				setHpTotal(String(data.hpTotal ?? 0));
				setWithRepresentante(data.hpDistribution ?? true);
				setRepresentantePercent(String(Number(data.representantePercent ?? 25)));
				setPclAgreed(String(data.pclAgreed ?? 20));
				setPclTotal(String(data.pclTotal ?? 0));
				setPclStatus(data.pclStatus || "EARRINGS");
				setPclChargedAt(
					data.pclChargedAt ? String(data.pclChargedAt).slice(0, 10) : "",
				);
				setPclChargedById(
					data.pclChargedById != null ? String(data.pclChargedById) : "",
				);
				setHpFechaEstimada(soloDia(data.hpFechaEstimada));
				setPclFechaEstimada(soloDia(data.pclFechaEstimada));
				setPclGraciaHasta(soloDia(data.pclGraciaHasta));
				setAportes(data.aportesDetalle ?? APORTES_VACIOS);
				const aportesRep = Number(data.aportesRepresentante) || 0;
				const aportesLeg = Number(data.aportesLegalistas) || 0;
				setAportesAnteriores(
					!data.aportesDetalle && aportesRep + aportesLeg > 0
						? { representante: aportesRep, legalistas: aportesLeg }
						: null,
				);
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
					hpChargedAt:
						feeStatus === "CHARGED" && hpChargedAt ? hpChargedAt : null,
					hpChargedById:
						feeStatus === "CHARGED" && hpChargedById
							? Number(hpChargedById)
							: null,
					hpAgreed: parseFloat(hpAgreed) || 20,
					hpTotal: parseFloat(hpTotal) || 0,
					hpDistribution: withRepresentante,
					representantePercent: repPct,
					pclAgreed: parseFloat(pclAgreed) || 0,
					pclTotal: parseFloat(pclTotal) || 0,
					pclDistribution: withRepresentante,
					pclStatus,
					pclChargedAt:
						pclStatus === "CHARGED" && pclChargedAt ? pclChargedAt : null,
					pclChargedById:
						pclStatus === "CHARGED" && pclChargedById
							? Number(pclChargedById)
							: null,
					hpFechaEstimada: hpFechaEstimada || null,
					pclFechaEstimada: pclFechaEstimada || null,
					// Plazo vacío: al pasar a Solicitado lo pone el servidor (5 días
					// hábiles); en uno que ya estaba solicitado, se quita.
					...(pclStatus === "REQUESTED"
						? {
								pclGraciaHasta:
									pclGraciaHasta || (closing?.pclStatus === "REQUESTED" ? null : undefined),
							}
						: {}),
					// Un cierre anterior sin tocar conserva sus aportes: no se mandan.
					...(aportesAnteriores && !algunaTarjetaActiva(aportes) ? {} : { aportes }),
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
								<SelectTrigger
									className={cn(
										"h-11",
										feeStatus === "CHARGED" && chargedTriggerClass,
									)}
								>
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

					{feeStatus !== "CHARGED" && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div className="space-y-1.5">
								<label htmlFor="hp-estimada" className="text-sm font-medium text-foreground">
									Fecha estimada de cobro de honorarios
								</label>
								<input
									id="hp-estimada"
									type="date"
									value={hpFechaEstimada}
									onChange={(e) => setHpFechaEstimada(e.target.value)}
									className={inputClass}
								/>
								<p className="text-xs text-muted-foreground">
									Con esta fecha se proyecta el ingreso en Gastos e Ingresos y en la Caja. Vacía: la
									fecha del cierre.
								</p>
							</div>
						</div>
					)}

					{/* Datos de cobro HP — solo cuando el estado está CHARGED */}
					{feeStatus === "CHARGED" && (
						<div className="rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50/40 dark:bg-green-900/10 p-4 space-y-3">
							<p className="text-xs font-semibold uppercase tracking-wider text-green-800 dark:text-green-300">
								Cobro de Honorarios
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground">
										Fecha de cobro
									</label>
									<input
										type="date"
										value={hpChargedAt}
										onChange={(e) => setHpChargedAt(e.target.value)}
										className={inputClass}
									/>
								</div>
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground">
										Cobrado por
									</label>
									<Select
										value={hpChargedById || "_"}
										onValueChange={(v) =>
											setHpChargedById(v === "_" ? "" : v)
										}
									>
										<SelectTrigger className="h-11">
											<span className="truncate">
												{hpChargedById
													? chargeCollectors.find(
															(c) => String(c.id) === hpChargedById,
														)?.name ?? "Sin especificar"
													: "Sin especificar"}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="_">Sin especificar</SelectItem>
											{chargeCollectors.map((c) => (
												<SelectItem key={c.id} value={String(c.id)}>
													{c.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					)}

					{/* Distribución con representante */}
					<div className="flex items-center justify-between rounded-xl border border-border px-5 py-3.5">
						<div>
							<p className="text-sm font-medium text-foreground">Distribución con representante</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								Su porcentaje aplica tanto a HP como a PCL; el resto es lo que cobra Legalistas.
							</p>
						</div>
						<div className="flex items-center gap-3">
							<label htmlFor="representante-percent" className="text-xs text-muted-foreground">
								% del representante
							</label>
							<div className="relative w-24">
								<input
									id="representante-percent"
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={representantePercent}
									onChange={(e) => setRepresentantePercent(e.target.value)}
									disabled={!withRepresentante}
									className="w-full h-10 px-3 pr-7 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted disabled:text-muted-foreground"
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
									%
								</span>
							</div>
							<Switch checked={withRepresentante} onCheckedChange={setWithRepresentante} />
						</div>
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
									HP Legalistas{calc.aportesLeg > 0 ? " (neto)" : ""} ($)
								</label>
								<div
									className={`${displayClass} font-semibold text-foreground`}
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
					<AportesCards
						desdeNegociacion={!!closing?.negotiationId}
						value={aportes}
						onChange={setAportes}
						capital={Number(capitalAmount) || 0}
						conRepresentante={withRepresentante}
						anteriores={aportesAnteriores}
						pagos={closing?.aportesPagos}
					/>

					{/* Monto a Cobrar + Gastos de la Causa */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<div
							className={`rounded-xl p-5 border-2 lg:col-span-2 ${calc.montoTransferir < 0 ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}
						>
							<div className="flex items-center justify-between">
								<div>
									<h4 className="font-semibold text-sm text-foreground">
										Monto a Cobrar por Legalistas
									</h4>
									<p className="text-xs text-muted-foreground mt-0.5">
										HP Legalistas (neto de aportes) + PCL Legalistas
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
								<SelectTrigger
									className={cn(
										"h-11",
										pclStatus === "CHARGED" && chargedTriggerClass,
									)}
								>
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
						{pclStatus !== "CHARGED" && (
							<div className="space-y-1.5">
								<label htmlFor="pcl-estimada" className="text-sm font-medium text-foreground">
									Fecha estimada de cobro de PCL
								</label>
								<input
									id="pcl-estimada"
									type="date"
									value={pclFechaEstimada}
									onChange={(e) => setPclFechaEstimada(e.target.value)}
									className={inputClass}
								/>
							</div>
						)}
					</div>

					{pclStatus === "REQUESTED" && (
						<div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-3">
							<p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
								PCL solicitada: plazo de gracia
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<label htmlFor="pcl-gracia" className="text-xs text-muted-foreground">
										Último día del plazo
									</label>
									<input
										id="pcl-gracia"
										type="date"
										value={pclGraciaHasta}
										onChange={(e) => setPclGraciaHasta(e.target.value)}
										className={inputClass}
									/>
								</div>
								<p className="text-xs text-muted-foreground md:pt-6">
									{pclGraciaHasta
										? "Si pasa ese día y la PCL sigue sin cobrarse, le llega a Contable un aviso prioritario para reclamarla."
										: closing?.pclStatus === "REQUESTED"
											? "Sin plazo: no se le va a avisar a Contable."
											: "Al guardar se ponen 5 días hábiles desde hoy. Si querés otro plazo, elegí la fecha."}
								</p>
							</div>
							{closing?.pclReclamar && (
								<p className="text-sm font-medium text-red-600 dark:text-red-400">
									El plazo ya venció: hay que reclamar esta PCL.
								</p>
							)}
						</div>
					)}

					{/* Datos de cobro PCL — solo cuando el estado está CHARGED */}
					{pclStatus === "CHARGED" && (
						<div className="rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50/40 dark:bg-green-900/10 p-4 space-y-3">
							<p className="text-xs font-semibold uppercase tracking-wider text-green-800 dark:text-green-300">
								Cobro de PCL
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground">
										Fecha de cobro
									</label>
									<input
										type="date"
										value={pclChargedAt}
										onChange={(e) => setPclChargedAt(e.target.value)}
										className={inputClass}
									/>
								</div>
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground">
										Cobrado por
									</label>
									<Select
										value={pclChargedById || "_"}
										onValueChange={(v) =>
											setPclChargedById(v === "_" ? "" : v)
										}
									>
										<SelectTrigger className="h-11">
											<span className="truncate">
												{pclChargedById
													? chargeCollectors.find(
															(c) => String(c.id) === pclChargedById,
														)?.name ?? "Sin especificar"
													: "Sin especificar"}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="_">Sin especificar</SelectItem>
											{chargeCollectors.map((c) => (
												<SelectItem key={c.id} value={String(c.id)}>
													{c.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					)}

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
