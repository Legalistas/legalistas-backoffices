"use client";

import {
	DragDropContext,
	Draggable,
	Droppable,
	type DropResult,
} from "@hello-pangea/dnd";
import { Plus, Search, SquareKanban } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import CandidateCard from "@/components/recruitment/CandidateCard";
import CandidateFormDialog from "@/components/recruitment/CandidateFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	CANDIDATE_BY_ID_ENDPOINT,
	CANDIDATE_STAGE_ENDPOINT,
	CANDIDATES_ENDPOINT,
} from "@/constant/api-endpoints";
import {
	RECRUITMENT_COLUMN_CONFIG,
	RECRUITMENT_COLUMNS,
	RECRUITMENT_SOURCES,
	type RecruitmentStage,
} from "@/constant/recruitment";
import type { Candidate } from "@/types/recruitment";

export default function RecruitmentKanbanBoard() {
	const { data: session } = useSession();
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [formOpen, setFormOpen] = useState(false);
	const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(
		null,
	);

	const [search, setSearch] = useState("");
	const [sourceFilter, setSourceFilter] = useState<string>("all");

	const token = session?.user?.accessToken;

	const fetchCandidates = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(CANDIDATES_ENDPOINT, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			const json = await res.json();
			const data: Candidate[] = json.data ?? json ?? [];
			setCandidates(data);
		} catch (err) {
			console.error("Error fetching candidates:", err);
			setError(
				err instanceof Error ? err.message : "Error al cargar candidatos",
			);
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchCandidates();
	}, [fetchCandidates]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return candidates.filter((c) => {
			if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
			if (!q) return true;
			return (
				c.name.toLowerCase().includes(q) ||
				c.position.toLowerCase().includes(q) ||
				(c.email?.toLowerCase().includes(q) ?? false) ||
				(c.area?.toLowerCase().includes(q) ?? false)
			);
		});
	}, [candidates, search, sourceFilter]);

	const handleDragEnd = async (result: DropResult) => {
		const { destination, source, draggableId } = result;
		if (!destination) return;
		if (
			destination.droppableId === source.droppableId &&
			destination.index === source.index
		)
			return;

		const newStage = destination.droppableId as RecruitmentStage;
		const id = Number(draggableId);

		const previous = candidates;
		setCandidates((prev) =>
			prev.map((c) => (c.id === id ? { ...c, stage: newStage } : c)),
		);

		try {
			const res = await fetch(CANDIDATE_STAGE_ENDPOINT(id), {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ stage: newStage }),
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			toast.success("Etapa actualizada");
		} catch (err) {
			console.error(err);
			toast.error("No se pudo actualizar la etapa");
			setCandidates(previous);
		}
	};

	const handleAdd = () => {
		setCurrentCandidate(null);
		setFormOpen(true);
	};

	const handleEdit = (candidate: Candidate) => {
		setCurrentCandidate(candidate);
		setFormOpen(true);
	};

	const handleDelete = async (id: number) => {
		if (!confirm("¿Eliminar candidato? Esta acción no se puede deshacer."))
			return;
		try {
			const res = await fetch(CANDIDATE_BY_ID_ENDPOINT(id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			setCandidates((prev) => prev.filter((c) => c.id !== id));
			toast.success("Candidato eliminado");
		} catch (err) {
			console.error(err);
			toast.error("No se pudo eliminar");
		}
	};

	const handleHire = (candidate: Candidate) => {
		toast.info(
			"Para crear la ficha, usá el módulo Equipo y completá los datos del nuevo empleado.",
			{ duration: 6000 },
		);
	};

	return (
		<div className="flex flex-col h-full">
			<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
				<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
					<SquareKanban className="size-6" />
					Reclutamiento
				</h2>
				<Button onClick={handleAdd}>
					<Plus className="size-4 mr-1.5" />
					Nuevo candidato
				</Button>
			</div>

			<div className="mb-4 flex flex-wrap items-center gap-2">
				<div className="relative flex-1 min-w-[240px] max-w-sm">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Buscar por nombre, puesto, email..."
						className="pl-8 h-9"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<Select value={sourceFilter} onValueChange={setSourceFilter}>
					<SelectTrigger className="h-9 w-[200px]">
						<SelectValue placeholder="Fuente" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todas las fuentes</SelectItem>
						{RECRUITMENT_SOURCES.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{error && (
				<div className="text-red-500 text-sm py-2">Error: {error}</div>
			)}

			{loading ? (
				<BoardSkeleton />
			) : (
				<DragDropContext onDragEnd={handleDragEnd}>
					<div className="flex gap-4 pb-4 overflow-x-auto h-[calc(100vh-260px)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
						{RECRUITMENT_COLUMNS.map((column) => {
							const columnCandidates = filtered.filter(
								(c) => c.stage === column.id,
							);
							const cfg = RECRUITMENT_COLUMN_CONFIG[column.id];
							const Icon = cfg.icon;

							return (
								<div
									key={column.id}
									className="bg-white dark:bg-gray-800/30 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full w-72 shrink-0 flex flex-col"
								>
									<div
										className={`p-3 border-b ${cfg.borderColor} dark:border-gray-700`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className={`p-1.5 rounded-md ${cfg.bg}`}>
													<Icon className={`h-4 w-4 ${cfg.color}`} />
												</div>
												<h3 className="font-medium text-sm text-gray-900 dark:text-white">
													{column.title}
												</h3>
											</div>
											<span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-0.5 text-xs font-medium">
												{columnCandidates.length}
											</span>
										</div>
									</div>
									<Droppable droppableId={column.id}>
										{(provided, snapshot) => (
											<div
												{...provided.droppableProps}
												ref={provided.innerRef}
												className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors ${
													snapshot.isDraggingOver
														? "bg-gray-50 dark:bg-gray-700/20"
														: ""
												}`}
											>
												{columnCandidates.map((candidate, index) => (
													<Draggable
														key={candidate.id.toString()}
														draggableId={candidate.id.toString()}
														index={index}
													>
														{(dragProvided) => (
															<div
																ref={dragProvided.innerRef}
																{...dragProvided.draggableProps}
																{...dragProvided.dragHandleProps}
															>
																<CandidateCard
																	candidate={candidate}
																	onEdit={() => handleEdit(candidate)}
																	onDelete={() => handleDelete(candidate.id)}
																	onHire={() => handleHire(candidate)}
																/>
															</div>
														)}
													</Draggable>
												))}
												{provided.placeholder}

												{columnCandidates.length === 0 && (
													<div className="flex flex-col items-center justify-center py-8 text-gray-400">
														<Icon className="h-8 w-8 mb-2 opacity-50" />
														<p className="text-xs">Sin candidatos</p>
													</div>
												)}
											</div>
										)}
									</Droppable>
								</div>
							);
						})}
					</div>
				</DragDropContext>
			)}

			<CandidateFormDialog
				open={formOpen}
				onOpenChange={setFormOpen}
				candidate={currentCandidate}
				onSaved={fetchCandidates}
			/>
		</div>
	);
}

function BoardSkeleton() {
	return (
		<div className="flex gap-4 pb-4 overflow-hidden h-[calc(100vh-260px)]">
			{Array.from({ length: 5 }).map((_, colIdx) => (
				<div
					key={colIdx}
					className="bg-white dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700 h-full w-72 shrink-0 flex flex-col"
				>
					<div className="p-3 border-b border-gray-200 dark:border-gray-700">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-2">
								<Skeleton className="h-8 w-8 rounded-md" />
								<Skeleton className="h-4 w-24" />
							</div>
							<Skeleton className="h-5 w-7 rounded-full" />
						</div>
					</div>
					<div className="flex-1 p-3 space-y-2">
						{Array.from({ length: 2 + (colIdx % 3) }).map((_, i) => (
							<div
								key={i}
								className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
							>
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
								<Skeleton className="h-3 w-2/3" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
