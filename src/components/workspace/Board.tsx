"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import {
	ArrowDownUp,
	ArrowLeft,
	CheckCircle2,
	ListFilter,
	Lock,
	MoreHorizontal,
	Plus,
	Search,
	Settings2,
	UserPlus,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectRealtime } from "@/hooks/useWorkspaceSocket";
import {
	dayOf,
	errorMessage,
	isOverdue,
	positionAt,
	projectColor,
	workspaceFetch,
} from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkBoard, WorkCard, WorkColumn, WorkPriority } from "@/types/workspace";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";
import { ShareDialog } from "./ShareDialog";
import { TaskCard } from "./TaskCard";
import { TaskDetailSheet } from "./TaskDetailSheet";

type Sort = "manual" | "due" | "priority" | "title";
const SORT_LABEL: Record<Sort, string> = {
	manual: "A mano (arrastrando)",
	due: "Fecha de vencimiento",
	priority: "Prioridad",
	title: "Alfabético",
};
const PRIORITY_RANK: Record<WorkPriority, number> = { URGENT: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
const byPosition = (a: WorkCard, b: WorkCard) => a.position - b.position;
const SORTERS: Record<Sort, (a: WorkCard, b: WorkCard) => number> = {
	manual: byPosition,
	due: (a, b) => (dayOf(a.dueDate) ?? "9999").localeCompare(dayOf(b.dueDate) ?? "9999") || byPosition(a, b),
	priority: (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || byPosition(a, b),
	title: (a, b) => a.title.localeCompare(b.title, "es"),
};

/** Inline input that stays open to add several in a row. */
function InlineAdd({
	placeholder,
	onAdd,
	onClose,
}: {
	placeholder: string;
	onAdd: (text: string) => Promise<void>;
	onClose: () => void;
}) {
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				const t = text.trim();
				if (!t) return;
				setBusy(true);
				await onAdd(t);
				setBusy(false);
				setText("");
			}}
		>
			<Input
				autoFocus
				value={text}
				disabled={busy}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
				onBlur={() => !text.trim() && onClose()}
				placeholder={placeholder}
				className="h-10 bg-board-card"
			/>
		</form>
	);
}

export default function Board({ projectId }: { projectId: number }) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const myId = Number(session?.user?.id) || null;
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const openTaskId = Number(searchParams.get("task")) || null;

	const [board, setBoard] = useState<WorkBoard | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [assignee, setAssignee] = useState<"all" | "me" | "none">("all");
	const [onlyLate, setOnlyLate] = useState(false);
	const [onlyHigh, setOnlyHigh] = useState(false);
	const [sort, setSort] = useState<Sort>("manual");
	const [addingIn, setAddingIn] = useState<number | null>(null);
	const [addingSection, setAddingSection] = useState(false);
	const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
	const [shareOpen, setShareOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const load = useCallback(async () => {
		if (!token) return;
		try {
			setBoard(await workspaceFetch<WorkBoard>(`/projects/${projectId}/board`, token));
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "No se pudo cargar el tablero"));
		}
	}, [token, projectId]);

	useEffect(() => {
		load();
	}, [load]);

	// Live: when someone changes something (also from another tab) the board
	// reloads and, if it is the open task, its detail too.
	const [detailRefresh, setDetailRefresh] = useState(0);
	const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useProjectRealtime(projectId, token, (e) => {
		if (reloadTimer.current) clearTimeout(reloadTimer.current);
		reloadTimer.current = setTimeout(load, 250);
		if (!e || (openTaskId && (e.taskId === openTaskId || e.parentTaskId === openTaskId))) {
			setDetailRefresh((n) => n + 1);
		}
	});

	const openTask = (id: number | null) => {
		const params = new URLSearchParams(searchParams.toString());
		if (id) params.set("task", String(id));
		else params.delete("task");
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	};

	const replaceCard = (card: WorkCard) =>
		setBoard((b) => (b ? { ...b, tasks: b.tasks.map((t) => (t.id === card.id ? card : t)) } : b));

	const filterCount = (assignee !== "all" ? 1 : 0) + (onlyLate ? 1 : 0) + (onlyHigh ? 1 : 0);
	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (board?.tasks ?? []).filter(
			(t) =>
				(!q || t.title.toLowerCase().includes(q)) &&
				(assignee === "all" ||
					(assignee === "me" ? t.assignees.some((p) => p.id === myId) : t.assignees.length === 0)) &&
				(!onlyLate || isOverdue(t.dueDate, !!t.completedAt)) &&
				(!onlyHigh || t.priority === "HIGH" || t.priority === "URGENT"),
		);
	}, [board, query, assignee, onlyLate, onlyHigh, myId]);

	const columnTasks = (c: WorkColumn) => visible.filter((t) => t.columnId === c.id).sort(SORTERS[sort]);
	// Dragging only makes sense with every card shown in its manual order.
	const reorderLocked = filterCount > 0 || !!query.trim() || sort !== "manual";

	const onDragEnd = async ({ draggableId, source, destination }: DropResult) => {
		if (!board || !destination) return;
		if (source.droppableId === destination.droppableId && source.index === destination.index) return;
		const id = Number(draggableId);
		const columnId = Number(destination.droppableId);
		// Reorder right away; if the backend rejects it, reload.
		const siblings = board.tasks.filter((t) => t.columnId === columnId && t.id !== id).sort(byPosition);
		const position = positionAt(
			siblings.map((t) => t.position),
			destination.index,
		);
		setBoard({
			...board,
			tasks: board.tasks.map((t) => (t.id === id ? { ...t, columnId, position } : t)),
		});
		try {
			replaceCard(
				await workspaceFetch<WorkCard>(`/tasks/${id}/move`, token, {
					method: "POST",
					json: { columnId, index: destination.index },
				}),
			);
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo mover la tarea"));
			load();
		}
	};

	const run = async (fn: () => Promise<unknown>, okMessage?: string) => {
		try {
			await fn();
			if (okMessage) toast.success(okMessage);
			await load();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo guardar"));
		}
	};

	const addTask = async (columnId: number, title: string) => {
		try {
			const card = await workspaceFetch<WorkCard>(`/projects/${projectId}/tasks`, token, {
				method: "POST",
				json: { title, columnId },
			});
			setBoard((b) => (b ? { ...b, tasks: [...b.tasks, card] } : b));
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo crear la tarea"));
		}
	};

	const toggleTask = async (task: WorkCard) => {
		try {
			replaceCard(
				await workspaceFetch<WorkCard>(`/tasks/${task.id}`, token, {
					method: "PATCH",
					json: { completed: !task.completedAt },
				}),
			);
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo actualizar la tarea"));
		}
	};

	const saveColumnName = (id: number, name: string) => {
		setRenaming(null);
		const column = board?.columns.find((c) => c.id === id);
		if (!name.trim() || name.trim() === column?.name) return;
		run(() => workspaceFetch(`/columns/${id}`, token, { method: "PATCH", json: { name: name.trim() } }));
	};

	if (error) {
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
				<p className="text-sm font-medium">{error}</p>
				<Button variant="outline" asChild>
					<Link href="/admin/workspace">Volver al espacio de trabajo</Link>
				</Button>
			</div>
		);
	}

	if (!board) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-80" />
				<div className="flex gap-3">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-[60vh] w-75 shrink-0 rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	const { project, columns, people, permissions } = board;
	const toolbarButton = "h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground";

	return (
		<div className="flex h-[calc(100vh-7rem)] flex-col">
			<header className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3">
				<Button variant="ghost" size="icon" asChild className="shrink-0">
					<Link href="/admin/workspace" aria-label="Volver al espacio de trabajo">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<span
					className="size-7 shrink-0 rounded-lg"
					style={{ backgroundColor: projectColor(project) }}
					aria-hidden
				/>
				<div className="min-w-0">
					<h1 className="flex items-center gap-2 text-xl font-semibold text-balance">
						{project.name}
						{project.privacy === "PRIVATE" && <Lock className="size-4 text-muted-foreground" aria-label="Privado" />}
					</h1>
					{project.team && <p className="text-xs text-muted-foreground">Equipo {project.team.name}</p>}
				</div>
				<div className="ml-auto flex items-center gap-2">
					<GroupAvatar
						max={5}
						size="sm"
						users={people.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
					/>
					<Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
						<UserPlus className="size-4" />
						Compartir
					</Button>
				</div>
			</header>

			<div className="flex flex-wrap items-center gap-1 border-y border-border py-2">
				{permissions.edit && (
					<Button
						size="sm"
						className="h-8"
						onClick={() => {
							setAddingIn(columns[0]?.id ?? null);
							setSort("manual");
						}}
						disabled={columns.length === 0}
					>
						<Plus className="size-4" />
						Agregar tarea
					</Button>
				)}
				<div className="ml-auto flex flex-wrap items-center gap-1">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className={cn(toolbarButton, filterCount > 0 && "text-primary")}>
								<ListFilter className="size-4" />
								Filtrar{filterCount > 0 ? ` (${filterCount})` : ""}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel>Asignadas a</DropdownMenuLabel>
							<DropdownMenuRadioGroup value={assignee} onValueChange={(v) => setAssignee(v as typeof assignee)}>
								<DropdownMenuRadioItem value="all">Cualquiera</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="me">Mí</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="none">Nadie</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem checked={onlyLate} onCheckedChange={(v) => setOnlyLate(!!v)}>
								Solo vencidas
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem checked={onlyHigh} onCheckedChange={(v) => setOnlyHigh(!!v)}>
								Solo prioridad alta o urgente
							</DropdownMenuCheckboxItem>
							{filterCount > 0 && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onSelect={() => {
											setAssignee("all");
											setOnlyLate(false);
											setOnlyHigh(false);
										}}
									>
										Quitar filtros
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className={cn(toolbarButton, sort !== "manual" && "text-primary")}>
								<ArrowDownUp className="size-4" />
								Ordenar
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
								{(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
									<DropdownMenuRadioItem key={s} value={s}>
										{SORT_LABEL[s]}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					{permissions.manage && (
						<Button variant="ghost" size="sm" className={toolbarButton} onClick={() => setSettingsOpen(true)}>
							<Settings2 className="size-4" />
							Opciones
						</Button>
					)}
					{searchOpen ? (
						<div className="relative">
							<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								autoFocus
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onBlur={() => !query && setSearchOpen(false)}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										setQuery("");
										setSearchOpen(false);
									}
								}}
								placeholder="Buscar tarea"
								aria-label="Buscar tarea"
								className="h-8 w-52 pl-8"
							/>
						</div>
					) : (
						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-muted-foreground"
							aria-label="Buscar tarea"
							onClick={() => setSearchOpen(true)}
						>
							<Search className="size-4" />
						</Button>
					)}
				</div>
			</div>

			{reorderLocked && permissions.edit && (
				<p className="pt-2 text-xs text-muted-foreground">
					Con filtros, búsqueda u orden activos no se arrastran tarjetas.
				</p>
			)}

			<DragDropContext onDragEnd={onDragEnd}>
				<div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pt-3 pb-2 [scrollbar-width:thin]">
					{columns.map((column) => {
						const tasks = columnTasks(column);
						return (
							<section
								key={column.id}
								aria-label={column.name}
								className="flex w-75 shrink-0 flex-col gap-2"
							>
								<div className="flex min-h-12 items-center gap-2 rounded-xl bg-board-column px-4 py-2.5">
									{renaming?.id === column.id ? (
										<Input
											autoFocus
											value={renaming.name}
											aria-label="Nombre de la columna"
											onChange={(e) => setRenaming({ id: column.id, name: e.target.value })}
											onBlur={() => saveColumnName(column.id, renaming.name)}
											onKeyDown={(e) => {
												if (e.key === "Enter") saveColumnName(column.id, renaming.name);
												if (e.key === "Escape") setRenaming(null);
											}}
											className="h-8"
										/>
									) : (
										<>
											<h2 className="truncate text-[15px] font-semibold">{column.name}</h2>
											{column.isDone && (
												<CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label="Completa las tareas" />
											)}
											<span className="text-sm text-muted-foreground tabular-nums">{tasks.length}</span>
										</>
									)}
									{permissions.manage && renaming?.id !== column.id && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="ml-auto size-7 text-muted-foreground"
													aria-label={`Opciones de ${column.name}`}
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-64">
												<DropdownMenuItem onSelect={() => setRenaming({ id: column.id, name: column.name })}>
													Cambiar nombre
												</DropdownMenuItem>
												<DropdownMenuCheckboxItem
													checked={column.isDone}
													onCheckedChange={(v) =>
														run(() =>
															workspaceFetch(`/columns/${column.id}`, token, {
																method: "PATCH",
																json: { isDone: !!v },
															}),
														)
													}
												>
													Las tareas que entran se completan
												</DropdownMenuCheckboxItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="text-destructive focus:text-destructive"
													onSelect={() =>
														run(
															() => workspaceFetch(`/columns/${column.id}/archive`, token, { method: "POST" }),
															"Columna archivada",
														)
													}
												>
													Archivar columna
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</div>
								<Droppable droppableId={String(column.id)} isDropDisabled={!permissions.edit || reorderLocked}>
									{(provided, snapshot) => (
										<div
											ref={provided.innerRef}
											{...provided.droppableProps}
											className={cn(
												"min-h-24 flex-1 space-y-2 overflow-y-auto rounded-xl bg-board-column p-2 [scrollbar-width:thin]",
												snapshot.isDraggingOver && "ring-2 ring-primary/40 ring-inset",
											)}
										>
											{tasks.map((task, index) => (
												<Draggable
													key={task.id}
													draggableId={String(task.id)}
													index={index}
													isDragDisabled={!permissions.edit || reorderLocked}
												>
													{(drag) => (
														<div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>
															<TaskCard
																task={task}
																onOpen={() => openTask(task.id)}
																onToggle={permissions.edit ? () => toggleTask(task) : undefined}
															/>
														</div>
													)}
												</Draggable>
											))}
											{provided.placeholder}
											{tasks.length === 0 && !snapshot.isDraggingOver && (filterCount > 0 || query.trim()) && (
												<p className="px-2 py-6 text-center text-xs text-muted-foreground">Nada con ese filtro</p>
											)}
											{/* Right below the last card, like Trello or Asana. */}
											{permissions.edit &&
												(addingIn === column.id ? (
													<InlineAdd
														placeholder="Título y Enter"
														onAdd={(title) => addTask(column.id, title)}
														onClose={() => setAddingIn(null)}
													/>
												) : (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setAddingIn(column.id)}
														className="w-full justify-start text-muted-foreground"
													>
														<Plus className="size-4" />
														Agregar tarea
													</Button>
												))}
										</div>
									)}
								</Droppable>
							</section>
						);
					})}

					{permissions.manage && (
						<div className="w-75 shrink-0">
							{addingSection ? (
								<InlineAdd
									placeholder="Nombre de la sección y Enter"
									onAdd={(name) =>
										run(
											() => workspaceFetch(`/projects/${projectId}/columns`, token, { method: "POST", json: { name } }),
											"Sección agregada",
										)
									}
									onClose={() => setAddingSection(false)}
								/>
							) : (
								<Button
									variant="ghost"
									onClick={() => setAddingSection(true)}
									className="w-full justify-start text-muted-foreground"
								>
									<Plus className="size-4" />
									Agregar sección
								</Button>
							)}
						</div>
					)}
				</div>
			</DragDropContext>

			{(filterCount > 0 || query.trim()) && (
				<div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
					{visible.length} de {board.tasks.length} tareas
					<button
						type="button"
						className="inline-flex items-center gap-1 hover:text-foreground"
						onClick={() => {
							setQuery("");
							setSearchOpen(false);
							setAssignee("all");
							setOnlyLate(false);
							setOnlyHigh(false);
						}}
					>
						<X className="size-3.5" />
						Quitar filtros
					</button>
				</div>
			)}

			<TaskDetailSheet
				taskId={openTaskId}
				token={token}
				myId={myId}
				refreshKey={detailRefresh}
				projectId={projectId}
				people={people}
				columns={columns}
				onClose={() => openTask(null)}
				onCardChange={replaceCard}
				onArchived={(id) => setBoard((b) => (b ? { ...b, tasks: b.tasks.filter((t) => t.id !== id) } : b))}
				onBoardStale={load}
			/>
			<ShareDialog
				open={shareOpen}
				projectId={projectId}
				orgId={project.organizationId}
				token={token}
				onOpenChange={setShareOpen}
				onChanged={load}
			/>
			<ProjectSettingsDialog
				open={settingsOpen}
				project={project}
				token={token}
				onOpenChange={setSettingsOpen}
				onSaved={load}
			/>
		</div>
	);
}
