"use client";

import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import InjuryAutocomplete from "@/components/common/InjuryAutocomplete";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	CASES_ENDPOINT,
	SETTINGS_JURISDICTIONS_ENDPOINT,
} from "@/constant/api-endpoints";
import { isAdministrativeProcessType, TYPES_PROCCESS } from "@/constant/causes";
import { apiErrorMessage } from "@/lib/api-error";

// Formulario simplificado (relevamiento 6.1). Ya no se cargan:
//  - Título: se arma solo con las partes y el tipo de proceso.
//  - Estado de proceso: lo reemplazan las etapas del caso.
//  - Fecha de expediente / del accidente: ya está en el caso.
//  - Descripción: va en Notas.
//  - Caducidad de instancia manual: la reemplaza el sistema de Plazos.
//  - Administrativo / judicial: sale del tipo de proceso.

interface NewFileModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (fileData: any) => void;
	/** @deprecated El tipo (administrativo/judicial) sale del tipo de proceso. */
	initialFileType?: number;
	caseId: number;
	onStageChange?: (stage: number) => void;
	fileToEdit?: any;
	isEditMode?: boolean;
}

interface Jurisdiction {
	id: number;
	name: string;
	courts: Court[];
}

interface Court {
	id: number;
	charter: string;
	courtName: string;
}

const inputClass =
	"w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60";

export const NewFileModal = ({
	isOpen,
	onClose,
	onSave,
	caseId,
	fileToEdit,
	isEditMode = false,
}: NewFileModalProps) => {
	const { data: session } = useSession();
	const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		cuij: "",
		typeProcess: "",
		jurisdiction: "",
		court: "",
		injury: "",
	});

	const fetchJurisdictions = useCallback(async () => {
		try {
			const response = await fetch(`${SETTINGS_JURISDICTIONS_ENDPOINT}`, {
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
			});
			if (!response.ok) throw new Error("Error fetching jurisdictions");
			setJurisdictions(await response.json());
		} catch (error) {
			console.error("Error fetching jurisdictions:", error);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		fetchJurisdictions();
	}, [fetchJurisdictions]);

	useEffect(() => {
		if (fileToEdit && isEditMode) {
			setForm({
				cuij: fileToEdit.cuij || "",
				typeProcess: fileToEdit.typeProcessId?.toString() || "",
				jurisdiction: fileToEdit.jurisdictionId?.toString() || "",
				court: fileToEdit.courtId?.toString() || "",
				injury: fileToEdit.injury || "",
			});
		}
	}, [fileToEdit, isEditMode]);

	const courts =
		jurisdictions.find((j) => j.id.toString() === form.jurisdiction)?.courts ??
		[];

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: value,
			// Cambiar la jurisdicción invalida el juzgado elegido.
			...(name === "jurisdiction" ? { court: "" } : {}),
		}));
	};

	const handleSubmit = async () => {
		if (!form.typeProcess) {
			toast.error("Seleccioná el tipo de proceso");
			return;
		}
		setSaving(true);
		try {
			const endpoint = isEditMode
				? `${CASES_ENDPOINT}/${caseId}/files/${fileToEdit.id}`
				: `${CASES_ENDPOINT}/${caseId}/files`;

			const response = await fetch(endpoint, {
				method: isEditMode ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					caseId,
					proceduralStageId: 1,
					cuij: form.cuij || null,
					jurisdictionId: form.jurisdiction ? Number(form.jurisdiction) : null,
					courtId: form.court ? Number(form.court) : null,
					typeProcessId: Number(form.typeProcess),
					injury: form.injury,
					createdByUserId: session?.user?.id || undefined,
				}),
			});

			if (!response.ok)
				throw new Error(
					await apiErrorMessage(response, "Error al guardar el expediente"),
				);

			onSave(await response.json());
			onClose();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Error al guardar el expediente",
			);
		} finally {
			setSaving(false);
		}
	};

	const tipo = form.typeProcess ? Number(form.typeProcess) : null;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? "Editar expediente" : "Nuevo expediente"}
					</DialogTitle>
					<DialogDescription>
						La carátula se arma sola con las partes y el tipo de proceso.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 overflow-y-auto flex-1 pr-1">
					{isEditMode && fileToEdit?.title && (
						<div className="rounded-md border bg-muted/40 px-3 py-2">
							<p className="text-xs text-muted-foreground">Carátula</p>
							<p className="text-sm font-medium">{fileToEdit.title}</p>
						</div>
					)}

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label
								htmlFor="typeProcess"
								className="block text-sm font-medium text-foreground"
							>
								Tipo de proceso <span className="text-destructive">*</span>
							</label>
							<select
								id="typeProcess"
								name="typeProcess"
								value={form.typeProcess}
								onChange={handleChange}
								className={inputClass}
							>
								<option value="">Seleccioná el tipo de proceso</option>
								{TYPES_PROCCESS.map((option) => (
									<option key={option.id} value={option.id}>
										{option.value}
									</option>
								))}
							</select>
							{tipo != null && (
								<p className="text-xs text-muted-foreground">
									Expediente{" "}
									{isAdministrativeProcessType(tipo) ? "administrativo" : "judicial"}
								</p>
							)}
						</div>

						<div className="space-y-2 sm:col-span-2">
							<label
								htmlFor="cuij"
								className="block text-sm font-medium text-foreground"
							>
								Código único (CUIJ)
							</label>
							<input
								id="cuij"
								name="cuij"
								placeholder="Ej: 21-12345678-9"
								value={form.cuij}
								onChange={handleChange}
								className={inputClass}
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="jurisdiction"
								className="block text-sm font-medium text-foreground"
							>
								Jurisdicción
							</label>
							<select
								id="jurisdiction"
								name="jurisdiction"
								value={form.jurisdiction}
								onChange={handleChange}
								className={inputClass}
							>
								<option value="">Seleccioná jurisdicción</option>
								{jurisdictions.map((j) => (
									<option key={j.id} value={j.id.toString()}>
										{j.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="court"
								className="block text-sm font-medium text-foreground"
							>
								Juzgado
							</label>
							<select
								id="court"
								name="court"
								value={form.court}
								onChange={handleChange}
								disabled={!form.jurisdiction}
								className={inputClass}
							>
								<option value="">Seleccioná juzgado</option>
								{courts.map((c) => (
									<option key={c.id} value={c.id.toString()}>
										{c.charter} - {c.courtName}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-2 sm:col-span-2">
							<label
								htmlFor="injury"
								className="block text-sm font-medium text-foreground"
							>
								Tipo de lesión
							</label>
							<InjuryAutocomplete
								id="injury"
								value={form.injury}
								onChange={(injury) => setForm((prev) => ({ ...prev, injury }))}
								placeholder={
									isEditMode
										? "Buscá en el baremo…"
										: "Si lo dejás vacío, se usa la lesión del caso"
								}
							/>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={saving}
						className="bg-primary text-white px-4 py-2.5 text-sm hover:bg-primary/85 dark:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isEditMode ? "Guardar cambios" : "Agregar expediente"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
