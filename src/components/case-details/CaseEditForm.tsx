"use client";

import { Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LAWYERS_ENDPOINT } from "@/constant/api-endpoints";
import { Role } from "@/constant/user";
import { servicesType, stageCases } from "@/lib/constant";
import type { Cases } from "@/types/cases";

interface Lawyer {
	id: number;
	name: string;
	roleUser?: Array<{
		role?: {
			name: string;
		};
	}>;
}

interface CaseEditFormProps {
	caseData: Cases;
	onSave: (updatedCase: Partial<Cases>) => void;
	onCancel: () => void;
}

export const CaseEditForm = ({
	caseData,
	onSave,
	onCancel,
}: CaseEditFormProps) => {
	const { data: session } = useSession();
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({
		title: caseData.title,
		createdAt: caseData.createdAt
			? new Date(caseData.createdAt).toISOString().split("T")[0]
			: "",
		number: caseData.number ? caseData.number.toString() : "",
		status: caseData.status || "IN_PROGRESS",
		isArchived: caseData.isArchived || false,
		servicesId: caseData.servicesId || undefined,
		stageId: caseData.stageId || 1,
		responsibleLawyerId: caseData.responsibleLawyerId || undefined,
		internalLawyerId: caseData.internalLawyerId || undefined,
		injury: caseData.injury || "",
		disabilityPercentage: caseData.disabilityPercentage ?? undefined,
	});

	// Estados para los abogados
	const [responsibleLawyers, setResponsibleLawyers] = useState<Lawyer[]>([]);
	const [internalLawyers, setInternalLawyers] = useState<Lawyer[]>([]);
	const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);
	const [lawyersError, setLawyersError] = useState<string | null>(null);

	// Función para cargar abogados
	const fetchDataLawyer = useCallback(async () => {
		try {
			setIsLoadingLawyers(true);
			setLawyersError(null);
			const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			if (data && data.data) {
				// Separar abogados por rol
				const responsible = data.data.filter((lawyer: any) =>
					lawyer.roleUser?.some(
						(ru: any) =>
							ru.role?.name === Role.DIRECTOR_GENERAL_CEO ||
							ru.role?.name === Role.GERENTE_GENERAL_COO ||
							ru.role?.name === Role.ABOGADO_REPRESENTANTE,
					),
				);

				const internal = data.data.filter((lawyer: any) =>
					lawyer.roleUser?.some(
						(ru: any) =>
							ru.role?.name === Role.ASISTENTE_LEGAL ||
							ru.role?.name === Role.GERENTE_GENERAL_COO ||
							ru.role?.name === Role.DIRECTORA_AREA_LEGAL,
					),
				);

				setResponsibleLawyers(responsible);
				setInternalLawyers(internal);
			}
		} catch (error) {
			console.error("Error fetching lawyers:", error);
			setLawyersError("Error al cargar los datos de abogados");
		} finally {
			setIsLoadingLawyers(false);
		}
	}, [session?.user?.accessToken]);

	// Cargar datos al montar el componente
	useEffect(() => {
		if (session?.user?.accessToken) {
			fetchDataLawyer();
		}
	}, [fetchDataLawyer]);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value, type } = e.target;

		if (type === "checkbox") {
			const checked = (e.target as HTMLInputElement).checked;
			setFormData((prev) => ({ ...prev, [name]: checked }));
		} else if (name === "disabilityPercentage") {
			setFormData((prev) => ({
				...prev,
				[name]: value === "" ? undefined : Number.parseFloat(value),
			}));
		} else if (
			name === "servicesId" ||
			name === "responsibleLawyerId" ||
			name === "internalLawyerId" ||
			name === "stageId"
		) {
			// Convertir a número o undefined si está vacío
			setFormData((prev) => ({
				...prev,
				[name]: value === "" ? undefined : Number(value),
			}));
		} else {
			// Para todos los demás campos (string)
			setFormData((prev) => ({ ...prev, [name]: value }));
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		console.log("=== GUARDANDO CASO ===");
		console.log("Form data:", formData);

		setIsLoading(true);

		// Preparar datos para envío con tipos correctos
		const submitData: Partial<Cases> = {
			title: formData.title,
			// Convertir string de fecha a Date object
			createdAt: formData.createdAt ? new Date(formData.createdAt) : undefined,
			// Mantener number como string según el tipo Cases
			number: formData.number || undefined,
			// status: formData.status as "IN_PROGRESS" | "WON" | "LOST",
			// isArchived: formData.isArchived,
			servicesId: formData.servicesId,
			stageId: formData.stageId,
			responsibleLawyerId: formData.responsibleLawyerId,
			internalLawyerId: formData.internalLawyerId,
			injury: formData.injury || null,
			disabilityPercentage: formData.disabilityPercentage ?? null,
		};

		console.log("Submit data:", submitData);

		try {
			onSave(submitData);
			console.log("onSave ejecutado exitosamente");
		} catch (error) {
			console.error("Error en onSave:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="mb-8 overflow-hidden rounded-lg border border-border bg-card shadow">
			<div className="border-b border-border bg-card px-6 py-4">
				<h2 className="text-xl font-semibold text-foreground">Editar caso</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Modificar la información del caso
				</p>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="space-y-6 px-6 py-6">
					{/* Título del caso */}
					<div className="space-y-2">
						<label
							htmlFor="title"
							className="block text-sm font-medium text-foreground"
						>
							Título del caso
						</label>
						<input
							id="title"
							name="title"
							type="text"
							value={formData.title || ""}
							onChange={handleChange}
							required
							className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					{/* Grid para campos de fecha y número */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Fecha de creación */}
						<div className="space-y-2">
							<label
								htmlFor="createdAt"
								className="block text-sm font-medium text-foreground"
							>
								Fecha de creación
							</label>
							<input
								id="createdAt"
								name="createdAt"
								type="date"
								value={formData.createdAt}
								onChange={handleChange}
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>

						{/* Número de caso */}
						<div className="space-y-2">
							<label
								htmlFor="number"
								className="block text-sm font-medium text-foreground"
							>
								Número de caso
							</label>
							<input
								id="number"
								name="number"
								type="text"
								value={formData.number}
								onChange={handleChange}
								placeholder="841"
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>
					</div>

					{/* Lesión + Incapacidad */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<label
								htmlFor="injury"
								className="block text-sm font-medium text-foreground"
							>
								Lesión
							</label>
							<input
								id="injury"
								name="injury"
								type="text"
								value={formData.injury}
								onChange={handleChange}
								placeholder="Ej: Fractura de muñeca, lumbalgia, etc."
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="disabilityPercentage"
								className="block text-sm font-medium text-foreground"
							>
								% Incapacidad
							</label>
							<input
								id="disabilityPercentage"
								name="disabilityPercentage"
								type="number"
								step="0.01"
								min="0"
								max="100"
								value={formData.disabilityPercentage ?? ""}
								onChange={handleChange}
								placeholder="Ej: 22.5"
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>
					</div>

					{/* Grid para selects principales */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Servicio - Select único */}
						<div className="space-y-2">
							<label
								htmlFor="servicesId"
								className="block text-sm font-medium text-foreground"
							>
								Servicio
							</label>
							<select
								id="servicesId"
								name="servicesId"
								value={formData.servicesId || ""}
								onChange={handleChange}
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							>
								<option value="">Seleccionar servicio</option>
								{servicesType.map((service) => (
									<option key={service.id} value={service.value}>
										{service.label}
									</option>
								))}
							</select>
						</div>

						{/* Estado del caso */}
						{/* <div className="space-y-2">
                            <label htmlFor="status" className="block text-sm font-medium text-foreground">
                                Estado del caso
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="IN_PROGRESS">En Progreso</option>
                                <option value="WON">Ganado</option>
                                <option value="LOST">Perdido</option>
                            </select>
                        </div> */}

						{/* Etapa del caso */}
						<div className="space-y-2">
							<label
								htmlFor="stageId"
								className="block text-sm font-medium text-foreground"
							>
								Etapa del caso
							</label>
							<select
								id="stageId"
								name="stageId"
								value={formData.stageId}
								onChange={handleChange}
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							>
								{stageCases.map((stage) => (
									<option key={stage.id} value={stage.value}>
										{stage.label}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Grid para abogados */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Abogado Responsable */}
						<div className="space-y-2">
							<label
								htmlFor="responsibleLawyerId"
								className="block text-sm font-medium text-foreground"
							>
								Abogado Responsable
							</label>
							<select
								id="responsibleLawyerId"
								name="responsibleLawyerId"
								value={formData.responsibleLawyerId || ""}
								onChange={handleChange}
								disabled={isLoadingLawyers}
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-muted disabled:cursor-not-allowed"
							>
								<option value="">
									{isLoadingLawyers
										? "Cargando abogados..."
										: "Seleccionar abogado responsable"}
								</option>
								{responsibleLawyers.map((lawyer) => (
									<option key={lawyer.id} value={lawyer.id}>
										{lawyer.name}
									</option>
								))}
							</select>
							{lawyersError && (
								<p className="text-xs text-red-500">
									Error al cargar abogados responsables
								</p>
							)}
						</div>

						{/* Abogado Interno */}
						<div className="space-y-2">
							<label
								htmlFor="internalLawyerId"
								className="block text-sm font-medium text-foreground"
							>
								Abogado Interno
							</label>
							<select
								id="internalLawyerId"
								name="internalLawyerId"
								value={formData.internalLawyerId || ""}
								onChange={handleChange}
								disabled={isLoadingLawyers}
								className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-muted disabled:cursor-not-allowed"
							>
								<option value="">
									{isLoadingLawyers
										? "Cargando abogados..."
										: "Seleccionar abogado interno"}
								</option>
								{internalLawyers.map((lawyer) => (
									<option key={lawyer.id} value={lawyer.id}>
										{lawyer.name}
									</option>
								))}
							</select>
							{lawyersError && (
								<p className="text-xs text-red-500">
									Error al cargar abogados internos
								</p>
							)}
						</div>
					</div>

					{/* Checkbox para archivado */}
					{/* <div className="flex items-center space-x-2">
                        <input
                            id="isArchived"
                            name="isArchived"
                            type="checkbox"
                            checked={formData.isArchived}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-input text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isArchived" className="text-sm font-medium text-foreground">
                            Caso archivado
                        </label>
                    </div> */}
				</div>

				{/* Botones de acción */}
				<div className="flex justify-between border-t border-border bg-muted px-6 py-4">
					<Button variant="default" onClick={onCancel}>
						Cancelar
					</Button>
					<Button
						type="submit"
						variant="default"
						disabled={isLoadingLawyers || isLoading}
						className="bg-primary text-white hover:bg-primary/85 dark:text-foreground py-2 px-2"
					>
						{isLoading ? (
							<div className="flex items-center space-x-2">
								<Loader2 className="h-4 w-4 animate-spin text-white" />
								<span>Guardando...</span>
							</div>
						) : isLoadingLawyers ? (
							<div className="flex items-center space-x-2">
								<Loader2 className="h-4 w-4 animate-spin text-white" />
								<span>Cargando...</span>
							</div>
						) : (
							<div className="flex items-center space-x-2">
								<Save className="h-4 w-4 text-white" />
								<span>Guardar cambios</span>
							</div>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
};
