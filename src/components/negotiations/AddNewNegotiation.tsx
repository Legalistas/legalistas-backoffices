"use client";

import { AlertCircle, Loader2, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CounterpartyLawyerSelect from "./CounterpartyLawyerSelect";
import {
	NEGOTIATIONS_ENDPOINT,
	NEGOTIATIONS_NEGOTIABLE_CAUSES_ENDPOINT,
} from "@/constant/api-endpoints";
import {
	buildFilteredUrl,
	useRolePermissions,
} from "@/hooks/useRolePermissions";

interface NegotiableCause {
	id: number;
	number: string;
	title: string;
	injury: string | null;
	internalLawyerId?: number;
	responsibleLawyerId?: number;
	internalLawyer?: { id: number; name: string; image: string };
	responsibleLawyer?: { id: number; name: string; image: string };
	customer: { id: number; name: string; image?: string };
	parts: { id: number; name: string; partyType: string }[];
}

export default function AddNewNegotiation() {
	const router = useRouter();
	const { data: session } = useSession();
	const permissions = useRolePermissions();

	const [formData, setFormData] = useState({
		contraparteLawyer: "",
		incLegalistas: "",
		deArt: "",
		liquidacion100: "",
		liquidacion80: "",
		notes: "",
		injury: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [causes, setCauses] = useState<NegotiableCause[]>([]);
	const [selectedCause, setSelectedCause] = useState<NegotiableCause | null>(null);
	const [causeSearchTerm, setCauseSearchTerm] = useState("");
	const [showCauseSuggestions, setShowCauseSuggestions] = useState(false);
	const [isLoadingCauses, setIsLoadingCauses] = useState(false);

	const causeSelectRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const fetchCauses = async () => {
			if (!session?.user?.accessToken) return;
			setIsLoadingCauses(true);
			try {
				const url = buildFilteredUrl(
					NEGOTIATIONS_NEGOTIABLE_CAUSES_ENDPOINT,
					permissions,
					{ limit: "5000" },
				);
				const response = await fetch(url, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});
				if (!response.ok) throw new Error("Error al cargar causas");
				const data = await response.json();

				let causesData = data.data || [];
				if (permissions.isLawyer) {
					const userId = permissions.getUserId();
					if (userId) {
						causesData = causesData.filter(
							(cause: NegotiableCause) =>
								cause.internalLawyerId === userId ||
								cause.responsibleLawyerId === userId,
						);
					}
				}
				setCauses(causesData);
			} catch {
				setError("No se pudieron cargar las causas disponibles");
			} finally {
				setIsLoadingCauses(false);
			}
		};

		if (session?.user?.accessToken) fetchCauses();
	}, [session?.user?.accessToken, permissions]);

	const filteredCauses = causes.filter(
		(cause) =>
			(cause.title || "").toLowerCase().includes(causeSearchTerm.toLowerCase()) ||
			(cause.customer?.name || "").toLowerCase().includes(causeSearchTerm.toLowerCase()) ||
			(cause.number || "").includes(causeSearchTerm),
	);

	const handleSelectCause = (cause: NegotiableCause) => {
		setSelectedCause(cause);
		setCauseSearchTerm(cause.title || `Causa #${cause.id}`);
		setShowCauseSuggestions(false);
		setFormData((prev) => ({ ...prev, injury: cause.injury || "" }));
	};

	const handleRemoveCause = () => {
		setSelectedCause(null);
		setCauseSearchTerm("");
		setFormData((prev) => ({ ...prev, injury: "" }));
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (causeSelectRef.current && !causeSelectRef.current.contains(event.target as Node)) {
				setShowCauseSuggestions(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		if (formData.liquidacion100) {
			const liq100 = parseFloat(formData.liquidacion100);
			if (!Number.isNaN(liq100)) {
				setFormData((prev) => ({ ...prev, liquidacion80: (liq100 * 0.8).toFixed(2) }));
			}
		}
	}, [formData.liquidacion100]);

	const getActor = () =>
		selectedCause?.parts?.find((p) => p.partyType === "actor")?.name || "-";
	const getDemandado = () =>
		selectedCause?.parts?.find((p) => p.partyType === "demandado")?.name || "-";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCause) {
			setError("Por favor seleccione una causa");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch(NEGOTIATIONS_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					caseId: selectedCause.id,
					contraparteLawyer: formData.contraparteLawyer || null,
					incLegalistas: formData.incLegalistas ? parseFloat(formData.incLegalistas) : null,
					deArt: formData.deArt ? parseFloat(formData.deArt) : null,
					liquidacion100: formData.liquidacion100 ? parseFloat(formData.liquidacion100) : null,
					liquidacion80: formData.liquidacion80 ? parseFloat(formData.liquidacion80) : null,
					notes: formData.notes || null,
					injury: formData.injury || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al crear la negociación");
			}

			router.push("/admin/negotiation");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al crear la negociación");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl">
			<div className="rounded-lg border shadow-sm">
				{/* Header */}
				<div className="border-b px-6 py-4">
					<h2 className="text-xl font-semibold">Nueva Negociación</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Seleccioná una causa para iniciar la negociación
					</p>
				</div>

				{error && (
					<div className="mx-6 mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
						<div className="flex">
							<AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
							<p className="ml-3 text-sm text-red-700 dark:text-red-300">{error}</p>
						</div>
					</div>
				)}

				<form onSubmit={handleSubmit}>
					<div className="space-y-4 px-6 py-4">
						{/* Cause selector */}
						<div className="space-y-2">
							<Label>
								Seleccionar Causa <span className="text-red-500">*</span>
							</Label>
							<div className="relative w-full" ref={causeSelectRef}>
								<div className="relative w-full min-h-[42px] rounded-md border bg-background shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
									<div className="flex flex-wrap items-center gap-1 p-2">
										{selectedCause && (
											<div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 text-primary text-xs rounded-full">
												<span className="max-w-[250px] truncate">
													{selectedCause.title || `Causa #${selectedCause.id}`}
												</span>
												<button
													type="button"
													onClick={handleRemoveCause}
													className="hover:bg-primary/10 rounded-full p-0.5"
												>
													<X className="w-3 h-3" />
												</button>
											</div>
										)}
										<div className="flex-1 min-w-[120px] relative">
											<input
												type="text"
												className="w-full border-0 bg-transparent pl-2 pr-8 py-1 text-sm placeholder-muted-foreground focus:outline-none focus:ring-0"
												placeholder={
													selectedCause ? "" : "Buscar causa por título, cliente o número..."
												}
												value={causeSearchTerm}
												onChange={(e) => {
													setCauseSearchTerm(e.target.value);
													setShowCauseSuggestions(true);
												}}
												onFocus={() => setShowCauseSuggestions(true)}
											/>
											<div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
												{isLoadingCauses ? (
													<Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
												) : (
													<Search className="w-4 h-4 text-muted-foreground" />
												)}
											</div>
										</div>
									</div>
								</div>

								{showCauseSuggestions && filteredCauses.length > 0 && (
									<div className="absolute z-[100] mt-2 w-full max-h-80 overflow-auto rounded-lg border-2 bg-popover text-popover-foreground shadow-2xl">
										{filteredCauses.map((cause) => (
											<div
												key={cause.id}
												className={`cursor-pointer px-4 py-3 text-sm transition-all hover:bg-muted border-b border-border last:border-b-0 ${
													selectedCause?.id === cause.id
														? "bg-primary/5 border-l-4 border-l-primary"
														: "border-l-4 border-l-transparent"
												}`}
												onClick={() => handleSelectCause(cause)}
											>
												<div className="font-semibold">
													{cause.title || `Causa #${cause.id}`}
												</div>
												<div className="text-xs text-muted-foreground mt-1">
													{cause.customer?.name}
												</div>
												{cause.responsibleLawyer && (
													<div className="text-xs text-muted-foreground mt-0.5">
														Ab. Representante: {cause.responsibleLawyer.name}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Auto-filled case data */}
						{selectedCause && (
							<>
								<div className="mt-4 pt-4 border-t-2 border-border">
									<h3 className="text-sm font-semibold mb-3">
										Datos de la Causa (lectura)
									</h3>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1.5">
											<Label className="text-xs">Actor</Label>
											<Input value={getActor()} disabled />
										</div>
										<div className="space-y-1.5">
											<Label className="text-xs">Demandado</Label>
											<Input value={getDemandado()} disabled />
										</div>
										<div className="space-y-1.5">
											<Label className="text-xs">Abogado Representante</Label>
											<Input value={selectedCause.responsibleLawyer?.name || "-"} disabled />
										</div>
										<div className="space-y-1.5">
											<Label className="text-xs">Abogado Interno</Label>
											<Input value={selectedCause.internalLawyer?.name || "-"} disabled />
										</div>
										<div className="col-span-2 space-y-1.5">
											<Label className="text-xs">
												Lesión
												{!selectedCause.injury && (
													<span className="ml-1 text-red-500">*</span>
												)}
											</Label>
											{selectedCause.injury ? (
												<Input value={selectedCause.injury} disabled />
											) : (
												<Input
													value={formData.injury}
													onChange={(e) =>
														setFormData({ ...formData, injury: e.target.value })
													}
													placeholder="Ingresá el tipo de lesión"
												/>
											)}
										</div>
									</div>
								</div>

								{/* Negotiation data */}
								<div className="space-y-4 pt-4 border-t-2 border-border">
									<h3 className="text-sm font-semibold mb-3">
										Datos de la Negociación
									</h3>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1.5">
											<Label>Abogado Contraparte</Label>
											<CounterpartyLawyerSelect
												caseId={selectedCause?.id ?? null}
												value={formData.contraparteLawyer}
												onChange={(name) =>
													setFormData({ ...formData, contraparteLawyer: name })
												}
											/>
										</div>

										<div className="space-y-1.5">
											<Label>% Legalistas</Label>
											<div className="relative">
												<Input
													type="number"
													value={formData.incLegalistas}
													onChange={(e) =>
														setFormData({ ...formData, incLegalistas: e.target.value })
													}
													placeholder="0"
													min="0"
													max="100"
													step="0.01"
													className="pr-8"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
													%
												</span>
											</div>
										</div>

										<div className="space-y-1.5">
											<Label>% PMO</Label>
											<div className="relative">
												<Input
													type="number"
													value={formData.deArt}
													onChange={(e) =>
														setFormData({ ...formData, deArt: e.target.value })
													}
													placeholder="0"
													min="0"
													max="100"
													step="0.01"
													className="pr-8"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
													%
												</span>
											</div>
										</div>

										<div className="space-y-1.5">
											<Label>Liquidación 100%</Label>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
													$
												</span>
												<Input
													type="number"
													value={formData.liquidacion100}
													onChange={(e) =>
														setFormData({ ...formData, liquidacion100: e.target.value })
													}
													placeholder="0.00"
													min="0"
													step="0.01"
													className="pl-8"
												/>
											</div>
										</div>

										<div className="space-y-1.5">
											<Label>Liquidación 80%</Label>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
													$
												</span>
												<Input
													type="number"
													value={formData.liquidacion80}
													disabled
													className="pl-8"
												/>
											</div>
											<p className="text-xs text-muted-foreground">
												Se calcula automáticamente (80%)
											</p>
										</div>

										<div className="col-span-2 space-y-1.5">
											<Label>Notas</Label>
											<Textarea
												value={formData.notes}
												onChange={(e) =>
													setFormData({ ...formData, notes: e.target.value })
												}
												placeholder="Notas adicionales (opcional)"
												rows={3}
											/>
										</div>
									</div>
								</div>
							</>
						)}
					</div>

					<div className="flex justify-between items-center border-t px-6 py-3">
						<Button variant="outline" onClick={() => router.back()} type="button">
							Cancelar
						</Button>
						<Button type="submit" disabled={isSubmitting || !selectedCause}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creando...
								</>
							) : (
								<>
									<Plus className="mr-2 h-4 w-4" />
									Crear Negociación
								</>
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
