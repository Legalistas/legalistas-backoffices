"use client";

import { AlertCircle, Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { NEGOTIATION_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import type { Negotiation, NegotiationStatus } from "@/types/negotiations";

interface EditNegotiationProps {
	negotiation: Negotiation;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const STATUS_OPTIONS: { value: NegotiationStatus; label: string }[] = [
	{ value: "INICIAR", label: "Iniciar" },
	{ value: "CURSO", label: "En Curso" },
	{ value: "SUSPENSO", label: "Suspenso" },
	{ value: "FINALIZADAS", label: "Finalizadas" },
	{ value: "PERDIDAS", label: "Perdidas" },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
	INICIAR: ["CURSO", "PERDIDAS"],
	CURSO: ["SUSPENSO", "FINALIZADAS", "PERDIDAS"],
	SUSPENSO: ["CURSO", "PERDIDAS"],
	FINALIZADAS: [],
	PERDIDAS: [],
};

export default function EditNegotiation({
	negotiation,
	isOpen,
	onClose,
	onSuccess,
}: EditNegotiationProps) {
	const { data: session } = useSession();
	const [formData, setFormData] = useState({
		contraparteLawyer: "",
		incLegalistas: "",
		deArt: "",
		liquidacion100: "",
		liquidacion80: "",
		notes: "",
		injury: "",
		status: "" as NegotiationStatus | "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (negotiation) {
			setFormData({
				contraparteLawyer: negotiation.contraparteLawyer || "",
				incLegalistas: negotiation.incLegalistas?.toString() || "",
				deArt: negotiation.deArt?.toString() || "",
				liquidacion100: negotiation.liquidacion100?.toString() || "",
				liquidacion80: negotiation.liquidacion80?.toString() || "",
				notes: negotiation.notes || "",
				injury: negotiation.case.injury || "",
				status: "",
			});
		}
	}, [negotiation]);

	useEffect(() => {
		if (formData.liquidacion100) {
			const liq100 = parseFloat(formData.liquidacion100);
			if (!Number.isNaN(liq100)) {
				setFormData((prev) => ({
					...prev,
					liquidacion80: (liq100 * 0.8).toFixed(2),
				}));
			}
		}
	}, [formData.liquidacion100]);

	const allowedTransitions = VALID_TRANSITIONS[negotiation.status] || [];

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const body: any = {
				contraparteLawyer: formData.contraparteLawyer || null,
				incLegalistas: formData.incLegalistas ? parseFloat(formData.incLegalistas) : null,
				deArt: formData.deArt ? parseFloat(formData.deArt) : null,
				liquidacion100: formData.liquidacion100 ? parseFloat(formData.liquidacion100) : null,
				liquidacion80: formData.liquidacion80 ? parseFloat(formData.liquidacion80) : null,
				notes: formData.notes || null,
			};

			if (formData.status) body.status = formData.status;
			if (formData.injury) body.injury = formData.injury;

			const response = await fetch(NEGOTIATION_BY_ID_ENDPOINT(negotiation.id), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al actualizar la negociación");
			}

			onSuccess();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al actualizar la negociación");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Editar Negociación</DialogTitle>
					<DialogDescription>
						{negotiation.case.title || `Causa #${negotiation.caseId}`}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
						<div className="flex">
							<AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
							<p className="ml-3 text-sm text-red-700 dark:text-red-300">{error}</p>
						</div>
					</div>
				)}

				<form onSubmit={handleSubmit}>
					<div className="space-y-4">
						{/* Case info (read-only) */}
						<div className="bg-muted/50 rounded-lg p-4 space-y-3">
							<h3 className="text-sm font-semibold">Datos de la Causa</h3>
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<span className="text-muted-foreground">Causa:</span>
									<p className="font-medium">{negotiation.case.title}</p>
								</div>
								<div>
									<span className="text-muted-foreground">Abogado Representante:</span>
									<p className="font-medium">
										{negotiation.case.responsibleLawyer?.name || "-"}
									</p>
								</div>
								<div>
									<span className="text-muted-foreground">Abogado Interno:</span>
									<p className="font-medium">
										{negotiation.case.internalLawyer?.name || "-"}
									</p>
								</div>
								<div>
									<span className="text-muted-foreground">Estado actual:</span>
									<p className="font-medium">{negotiation.status}</p>
								</div>
							</div>
						</div>

						{/* Status change */}
						{allowedTransitions.length > 0 && (
							<div className="space-y-2">
								<Label>Cambiar Estado</Label>
								<Select
									value={formData.status || "none"}
									onValueChange={(v) =>
										setFormData({ ...formData, status: v === "none" ? "" as any : v as NegotiationStatus })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sin cambio" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Sin cambio</SelectItem>
										{STATUS_OPTIONS.filter((opt) =>
											allowedTransitions.includes(opt.value),
										).map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{formData.status === "FINALIZADAS" && (
									<p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
										Esto generará un cierre automático en el Gestor de Cierres
									</p>
								)}
							</div>
						)}

						{/* Editable fields */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Abogado Contraparte</Label>
								<Input
									value={formData.contraparteLawyer}
									onChange={(e) =>
										setFormData({ ...formData, contraparteLawyer: e.target.value })
									}
									placeholder="Nombre del abogado contraparte"
								/>
							</div>

							<div className="space-y-2">
								<Label>Lesión</Label>
								<Input
									value={formData.injury}
									onChange={(e) =>
										setFormData({ ...formData, injury: e.target.value })
									}
									placeholder="Ej: hernia lumbar"
								/>
							</div>

							<div className="space-y-2">
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

							<div className="space-y-2">
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

							<div className="space-y-2">
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

							<div className="space-y-2">
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

							<div className="col-span-2 space-y-2">
								<Label>Notas</Label>
								<Textarea
									value={formData.notes}
									onChange={(e) =>
										setFormData({ ...formData, notes: e.target.value })
									}
									placeholder="Notas adicionales"
									rows={3}
								/>
							</div>
						</div>
					</div>

					<DialogFooter className="mt-6">
						<Button variant="outline" onClick={onClose} type="button">
							Cancelar
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									Guardar Cambios
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
