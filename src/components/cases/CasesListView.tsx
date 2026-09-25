"use client";

import { AlertCircle, CalendarCheck, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getServiceName } from "@/lib/functions";
import type { Cases } from "@/types/cases";
import { StageSelectDropdown } from "./StageSelectDropdown";
import { type AdministrativeSubstage, aplicaSubetapa, SubstageSelect } from "./SubstageSelect";

interface CasesListViewProps {
	cases: Cases[];
	hasActiveFilters: boolean;
	handleClearSearch: () => void;
	handleDelete: (id: number) => void;
	onStageChange: (caseId: number, newStageId: number) => void;
	onSubstageChange: (caseId: number, substage: AdministrativeSubstage) => void;
	onResultChange: (caseId: number, newResult: string) => void;
	onNoteCreate: (caseId: number, note: string) => void | Promise<void>;
	isArchivedView?: boolean;
	onGoogleReviewToggle?: (caseId: number, value: boolean) => void;
}

// Helper para limpiar HTML de las notas
const stripHtml = (html: string) => {
	if (!html) return "";
	return html.replace(/<[^>]*>/g, "").trim();
};

/** "2 expedientes · Nº 21-23701468-2, 21-23701470-9" (debajo del título). */
const resumenExpedientes = (files: Cases["files"] | undefined) => {
	const cantidad = files?.length ?? 0;
	if (!files || cantidad === 0) return "Sin expedientes";
	const numeros = files.map((f) => f.cuij?.trim()).filter(Boolean);
	const texto = `${cantidad} ${cantidad === 1 ? "expediente" : "expedientes"}`;
	return numeros.length ? `${texto} · Nº ${numeros.join(", ")}` : texto;
};

/** "23/09/2026 14:30" en hora argentina. */
const fechaNota = (fecha: string | Date) =>
	new Date(fecha)
		.toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "America/Argentina/Buenos_Aires",
		})
		.replace(",", "");

export const CasesListView = ({
	cases,
	hasActiveFilters,
	handleClearSearch,
	handleDelete,
	onStageChange,
	onSubstageChange,
	onResultChange,
	onNoteCreate,
	isArchivedView = false,
	onGoogleReviewToggle,
}: CasesListViewProps) => {
	const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

	const getLastNoteRow = (caso: Cases) => {
		if (!caso.notes || caso.notes.length === 0) return null;
		return [...caso.notes].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)[0];
	};
	const getLastNote = (caso: Cases) => {
		const ultima = getLastNoteRow(caso);
		return ultima ? stripHtml(ultima.note) : "";
	};

	const handleNoteBlur = async (caseId: number) => {
		const newNote = editingNotes[caseId];
		if (newNote === undefined) return;
		const caso = cases.find((c) => c.id === caseId);
		const lastNote = caso ? getLastNote(caso) : "";

		// Sin cambios reales → solo limpiar estado de edición
		if (newNote.trim() === "" || newNote === lastNote) {
			setEditingNotes((prev) => {
				const next = { ...prev };
				delete next[caseId];
				return next;
			});
			return;
		}

		// Esperar el guardado + refetch antes de limpiar, así el input no
		// parpadea a la nota vieja mientras la nueva data llega del backend.
		try {
			await onNoteCreate(caseId, newNote);
		} finally {
			setEditingNotes((prev) => {
				const next = { ...prev };
				delete next[caseId];
				return next;
			});
		}
	};

	const handleNoteKeyDown = (e: React.KeyboardEvent, caseId: number) => {
		if (e.key === "Enter") {
			e.preventDefault();
			(e.target as HTMLInputElement).blur();
		}
	};

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
			<div className="w-full overflow-x-auto">
				<Table className="w-full min-w-250">
					<TableHeader className="bg-gray-50 dark:bg-white/5">
						<TableRow>
							<TableCell className="w-[1%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Caso #
							</TableCell>
							<TableCell className="w-[16%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Título
							</TableCell>
							<TableCell className="w-[9%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Servicio
							</TableCell>
							<TableCell className="w-[20%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Etapa
							</TableCell>
							<TableCell className="w-[15%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Nota
							</TableCell>
							<TableCell className="w-[11%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Abog. Responsable
							</TableCell>
							<TableCell className="w-[11%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Abog. Interno
							</TableCell>
							<TableCell className="w-[7%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Eventos
							</TableCell>
							{isArchivedView && (
								<TableCell className="w-[8%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">
									Reseña Google
								</TableCell>
							)}
							<TableCell className="w-[8%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-right">
								Acción
							</TableCell>
						</TableRow>
					</TableHeader>
					<TableBody>
						{cases.length > 0 ? (
							cases.map((caso) => (
								<TableRow
									key={caso.id}
									className="hover:bg-gray-50 dark:hover:bg-white/5"
								>
									{/* Caso # */}
									<TableCell className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
										<Link
											href={`/admin/legal-cases/${caso.id}`}
											className="hover:underline font-medium"
										>
											{caso.number ?? caso.id ?? "Sin número"}
										</Link>
									</TableCell>
									{/* Título + expedientes */}
									<TableCell className="px-3 py-2">
										<Link
											href={`/admin/legal-cases/${caso.id}`}
											className="text-xs font-medium text-gray-700 uppercase dark:text-gray-300 hover:underline"
										>
											{caso.title}
										</Link>
										<p
											className="mt-0.5 max-w-65 truncate text-[10px] text-gray-500 dark:text-gray-400"
											title={resumenExpedientes(caso.files)}
										>
											{resumenExpedientes(caso.files)}
										</p>
									</TableCell>
									{/* Servicio */}
									<TableCell className="px-3 py-2">
										<Badge>
											{getServiceName(Number(caso.servicesId))}
										</Badge>
									</TableCell>
									{/* Etapa (+ subetapa si es Administrativo) */}
									<TableCell className="px-3 py-2">
										<div className="flex items-center gap-1.5">
											<StageSelectDropdown
												currentStageId={Number(caso.stageId)}
												onStageChange={(newStageId) =>
													onStageChange(caso.id, newStageId)
												}
											/>
											{aplicaSubetapa(Number(caso.stageId), Number(caso.servicesId)) && (
												<SubstageSelect
													value={caso.administrativeSubstage}
													onChange={(substage) => onSubstageChange(caso.id, substage)}
													// Mismo alto que el selector de etapa (el trigger fija h-9).
													className="w-37.5 rounded-lg px-2.5 text-[11px] data-[size=default]:h-7.5"
												/>
											)}
										</div>
									</TableCell>
									{/* Nota + fecha de la nota */}
									<TableCell className="px-3 py-2">
										<Input
											value={editingNotes[caso.id] ?? getLastNote(caso)}
											onChange={(e) =>
												setEditingNotes((prev) => ({
													...prev,
													[caso.id]: e.target.value,
												}))
											}
											onBlur={() => handleNoteBlur(caso.id)}
											onKeyDown={(e) => handleNoteKeyDown(e, caso.id)}
											placeholder="Nota..."
											className="h-7 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary text-xs dark:text-gray-300 dark:placeholder:text-gray-500"
										/>
										{getLastNoteRow(caso) && (
											<p className="px-3 text-[10px] text-gray-500 dark:text-gray-400">
												{fechaNota(getLastNoteRow(caso)?.createdAt ?? "")}
											</p>
										)}
									</TableCell>
									{/* Abog. Responsable */}
									<TableCell className="px-3 py-2">
										{caso?.responsibleLawyer ? (
											<div className="flex items-center gap-1.5">
												{caso?.responsibleLawyer?.image ? (
													<Image
														className="w-5 h-5 rounded-full"
														src={
															caso.responsibleLawyer.image.startsWith("http")
																? caso.responsibleLawyer.image
																: `${process.env.NEXT_PUBLIC_BACKEND_URL}${caso.responsibleLawyer.image}`
														}
														alt={`${caso?.responsibleLawyer?.name || "Lawyer"}`}
														width={20}
														height={20}
													/>
												) : (
													<div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px]">
														{caso?.responsibleLawyer?.name?.charAt(0).toUpperCase() || "L"}
													</div>
												)}
												<span className="text-xs text-gray-700 dark:text-gray-300 truncate uppercase">
													{caso?.responsibleLawyer?.name || "Sin asignar"}
												</span>
											</div>
										) : (
											<span className="text-xs text-gray-500 dark:text-gray-500">
												Sin asignar
											</span>
										)}
									</TableCell>
									{/* Abog. Interno */}
									<TableCell className="px-3 py-2">
										{caso?.internalLawyer ? (
											<div className="flex items-center gap-1.5">
												{caso?.internalLawyer?.image ? (
													<Image
														className="w-5 h-5 rounded-full"
														src={
															caso.internalLawyer.image.startsWith("http")
																? caso.internalLawyer.image
																: `${process.env.NEXT_PUBLIC_BACKEND_URL}${caso.internalLawyer.image}`
														}
														alt={`${caso?.internalLawyer?.name || "Lawyer"}`}
														width={20}
														height={20}
													/>
												) : (
													<div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px]">
														{caso?.internalLawyer?.name?.charAt(0).toUpperCase() || "L"}
													</div>
												)}
												<span className="text-xs text-gray-700 dark:text-gray-300 truncate uppercase">
													{caso?.internalLawyer?.name || "Sin asignar"}
												</span>
											</div>
										) : (
											<span className="text-xs text-gray-500 dark:text-gray-500">
												Sin asignar
											</span>
										)}
									</TableCell>
									{/* Eventos (audiencias, pericias, reuniones) */}
									<TableCell className="px-3 py-2">
										{caso._count?.caseEvents === 0 ? (
											<span
												title="Sin audiencias, pericias ni reuniones cargadas"
												className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-50 dark:bg-red-950 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
											>
												<AlertCircle className="h-2.5 w-2.5" />
												Sin eventos
											</span>
										) : caso._count ? (
											<span
												title="Audiencias, pericias y reuniones cargadas"
												className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
											>
												<CalendarCheck className="h-2.5 w-2.5" />
												{caso._count.caseEvents}{" "}
												{caso._count.caseEvents === 1 ? "evento" : "eventos"}
											</span>
										) : null}
									</TableCell>
									{isArchivedView && (
										<TableCell className="px-3 py-2 text-center">
											<div
												className="flex items-center justify-center"
												title={
													caso.googleReviewLeft
														? "Reseña dejada"
														: "Marcar cuando el cliente deje la reseña"
												}
											>
												<Checkbox
													checked={!!caso.googleReviewLeft}
													onCheckedChange={(v) =>
														onGoogleReviewToggle?.(caso.id, v === true)
													}
													onClick={(e) => e.stopPropagation()}
												/>
											</div>
										</TableCell>
									)}
									{/* Acción */}
									<TableCell className="px-3 py-2 text-right">
										<div className="flex items-center justify-end gap-1">
											<Link
												href={`/admin/legal-cases/${caso.id}?edit=true`}
												className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-white/5 transition-colors"
											>
												<Pencil className="h-3.5 w-3.5" />
												<span className="sr-only">Editar</span>
											</Link>
											<button
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleDelete(caso.id);
												}}
												className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-white/5 transition-colors"
											>
												<Trash2 className="h-3.5 w-3.5" />
												<span className="sr-only">Eliminar</span>
											</button>
										</div>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={isArchivedView ? 10 : 9}
									className="px-3 py-6 text-center"
								>
									<div className="flex flex-col items-center justify-center">
										<AlertCircle className="h-6 w-6 text-amber-500 mb-2" />
										<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
											{hasActiveFilters
												? "No se encontraron casos que coincidan con los filtros seleccionados."
												: "No hay casos disponibles."}
										</p>
										{hasActiveFilters && (
											<Button
												type="button"
												variant="outline"
												onClick={handleClearSearch}
												className="mt-3"
											>
												Limpiar filtros
											</Button>
										)}
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};
