"use client";

import { AlertCircle, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ResultSelectDropdown } from "./ResultSelectDropdown";
import { StageSelectDropdown } from "./StageSelectDropdown";

interface CasesListViewProps {
	cases: Cases[];
	hasActiveFilters: boolean;
	handleClearSearch: () => void;
	handleDelete: (id: number) => void;
	onStageChange: (caseId: number, newStageId: number) => void;
	onResultChange: (caseId: number, newResult: string) => void;
	onNoteCreate: (caseId: number, note: string) => void;
}

// Helper para limpiar HTML de las notas
const stripHtml = (html: string) => {
	if (!html) return "";
	return html.replace(/<[^>]*>/g, "").trim();
};

export const CasesListView = ({
	cases,
	hasActiveFilters,
	handleClearSearch,
	handleDelete,
	onStageChange,
	onResultChange,
	onNoteCreate,
}: CasesListViewProps) => {
	const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

	const getLastNote = (caso: Cases) => {
		if (!caso.notes || caso.notes.length === 0) return "";
		const sorted = [...caso.notes].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		return stripHtml(sorted[0].note);
	};

	const handleNoteBlur = (caseId: number) => {
		const newNote = editingNotes[caseId];
		if (newNote === undefined) return;
		const caso = cases.find((c) => c.id === caseId);
		const lastNote = caso ? getLastNote(caso) : "";
		if (newNote.trim() !== "" && newNote !== lastNote) {
			onNoteCreate(caseId, newNote);
		}
		setEditingNotes((prev) => {
			const next = { ...prev };
			delete next[caseId];
			return next;
		});
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
				<Table className="w-full min-w-[800px]">
					<TableHeader className="bg-gray-50 dark:bg-white/5">
						<TableRow>
							<TableCell className="w-[1%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Caso #
							</TableCell>
							<TableCell className="w-[18%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Título
							</TableCell>
							<TableCell className="w-[10%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Servicio
							</TableCell>
							<TableCell className="w-[10%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Etapa
							</TableCell>
							<TableCell className="w-[15%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Nota
							</TableCell>
							<TableCell className="w-[12%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Abog. Responsable
							</TableCell>
							<TableCell className="w-[12%] px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
								Abog. Interno
							</TableCell>
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
									{/* Título */}
									<TableCell className="px-3 py-2">
										<Link
											href={`/admin/legal-cases/${caso.id}`}
											className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:underline"
										>
											{caso.title}
										</Link>
									</TableCell>
									{/* Servicio */}
									<TableCell className="px-3 py-2">
										<Badge>
											{getServiceName(Number(caso.servicesId))}
										</Badge>
									</TableCell>
									{/* Etapa */}
									<TableCell className="px-3 py-2">
										<StageSelectDropdown
											currentStageId={Number(caso.stageId)}
											onStageChange={(newStageId) =>
												onStageChange(caso.id, newStageId)
											}
										/>
									</TableCell>
									{/* Nota */}
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
												<span className="text-xs text-gray-700 dark:text-gray-300 truncate">
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
												<span className="text-xs text-gray-700 dark:text-gray-300 truncate">
													{caso?.internalLawyer?.name || "Sin asignar"}
												</span>
											</div>
										) : (
											<span className="text-xs text-gray-500 dark:text-gray-500">
												Sin asignar
											</span>
										)}
									</TableCell>
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
								<TableCell colSpan={9} className="px-3 py-6 text-center">
									<div className="flex flex-col items-center justify-center">
										<AlertCircle className="h-6 w-6 text-amber-500 mb-2" />
										<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
											{hasActiveFilters
												? "No se encontraron casos que coincidan con los filtros seleccionados."
												: "No hay casos disponibles."}
										</p>
										{hasActiveFilters && (
											<Button
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
