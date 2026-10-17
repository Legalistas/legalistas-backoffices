"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import {
	ArrowDownAZ,
	ArrowDownUp,
	ArrowLeft,
	ArrowLeftToLine,
	ArrowRight,
	ArrowRightToLine,
	CalendarCheck,
	CalendarDays,
	CalendarPlus,
	Check,
	CheckCircle2,
	Clock,
	Columns3,
	EyeOff,
	Flag,
	GripVertical,
	ListTree,
	Lock,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Settings2,
	ThumbsUp,
	Trash2,
	UserPlus,
	UserRound,
	UserRoundPen,
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
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/useConfirm";
import { useProjectRealtime } from "@/hooks/useWorkspaceSocket";
import { errorMessage, positionAt, projectColor, workspaceFetch } from "@/lib/workspace-api";
import {
	type BoardFilters,
	countFilters,
	EMPTY_FILTERS,
	matchesFilters,
	SORTERS,
	type SortKey,
} from "@/lib/workspace-filters";
import { cn } from "@/lib/utils";
import type { WorkBoard, WorkCard, WorkColumn, WorkPriority } from "@/types/workspace";
import { BoardFilterPanel } from "./BoardFilterPanel";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";
import { ShareDialog } from "./ShareDialog";
import { type CardActions, TaskCard } from "./TaskCard";
import { type NewTaskInput, TaskComposer } from "./TaskComposer";
import { TaskDetailSheet } from "./TaskDetailSheet";

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Clock }[] = [
	{ key: "manual", label: "Sin ordenar (a mano)", icon: GripVertical },
	{ key: "due", label: "Fecha de entrega", icon: CalendarDays },
	{ key: "assignee", label: "Responsable", icon: UserRound },
	{ key: "creator", label: "Creador", icon: UserRoundPen },
	{ key: "created", label: "Fecha de creación", icon: CalendarPlus },
	{ key: "updated", label: "Última modificación", icon: Clock },
	{ key: "completed", label: "Fecha de finalización", icon: CalendarCheck },
	{ key: "priority", label: "Prioridad", icon: Flag },
	{ key: "likes", label: "Me gusta", icon: ThumbsUp },
	{ key: "title", label: "Orden alfabético", icon: ArrowDownAZ },
];

const byPosition = (a: WorkCard, b: WorkCard) => a.position - b.position;

/** Collapsed columns are a per-viewer convenience, kept in this browser. */
const collapsedKey = (projectId: number) => `workspace-collapsed-${projectId}`;
const readCollapsed = (projectId: number): number[] => {
	try {
		return JSON.parse(localStorage.getItem(collapsedKey(projectId)) ?? "[]");
	} catch {
		return [];
	}
};

/** Inline input that stays open to add several in a row (new sections). */
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
	const { confirm, ConfirmationDialog } = useConfirm();

	const [board, setBoard] = useState<WorkBoard | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
	const [sort, setSort] = useState<SortKey>("manual");
	/** Where the task composer is open: a column, at its top or bottom. */
	const [adding, setAdding] = useState<{ columnId: number; atStart: boolean } | null>(null);
	const [addingSection, setAddingSection] = useState(false);
	const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
	const [collapsed, setCollapsed] = useState<number[]>([]);
	/** Cards with their subtasks listed. */
	const [expanded, setExpanded] = useState<number[]>([]);
	const [shareOpen, setShareOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	useEffect(() => {
		setCollapsed(readCollapsed(projectId));
	}, [projectId]);

	const saveCollapsed = useCallback(
		(next: number[]) => {
			setCollapsed(next);
			try {
				localStorage.setItem(collapsedKey(projectId), JSON.stringify(next));
			} catch {
				// Private mode or blocked storage: it just won't be remembered.
			}
		},
		[projectId],
	);
	const toggleCollapsed = (id: number) =>
		saveCollapsed(collapsed.includes(id) ? collapsed.filter((x) => x !== id) : [...collapsed, id]);

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

	const filterCount = countFilters(filters);
	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		const now = new Date();
		return (board?.tasks ?? []).filter(
			(t) => (!q || t.title.toLowerCase().includes(q)) && matchesFilters(t, filters, myId, now),
		);
	}, [board, query, filters, myId]);

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

	const addTask = async (columnId: number, input: NewTaskInput, atStart: boolean) => {
		try {
			const card = await workspaceFetch<WorkCard>(`/projects/${projectId}/tasks`, token, {
				method: "POST",
				json: { ...input, columnId, atStart },
			});
			setBoard((b) => (b ? { ...b, tasks: [...b.tasks, card] } : b));
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo crear la tarea"));
		}
	};

	/** Opens the composer at the top of a column (expanding it and showing manual order). */
	const startAddingAtTop = (columnId: number) => {
		if (collapsed.includes(columnId)) toggleCollapsed(columnId);
		setSort("manual");
		setAdding({ columnId, atStart: true });
	};

	/** Saves a change made right on a card (or on one of its subtasks) and updates it. */
	const saveCard = async (id: number, request: () => Promise<WorkCard>) => {
		try {
			const card = await request();
			if (board?.tasks.some((t) => t.id === id)) replaceCard(card);
			else load(); // A subtask: its parent card shows it.
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo actualizar la tarea"));
		}
	};
	const patchCard = (id: number, json: Record<string, unknown>) =>
		saveCard(id, () => workspaceFetch<WorkCard>(`/tasks/${id}`, token, { method: "PATCH", json }));

	const cardActions: CardActions = {
		toggle: (id, completed) => patchCard(id, { completed }),
		rename: (id, title) => patchCard(id, { title }),
		setDue: (id, dueDate) => patchCard(id, { dueDate }),
		setPriority: (id, priority: WorkPriority) => patchCard(id, { priority }),
		setAssignees: (id, userIds) =>
			saveCard(id, () =>
				workspaceFetch<WorkCard>(`/tasks/${id}/assignees`, token, { method: "PUT", json: { userIds } }),
			),
	};
	const likeTask = (id: number) =>
		saveCard(id, () => workspaceFetch<WorkCard>(`/tasks/${id}/like`, token, { method: "POST" }));

	const saveColumnName = (id: number, name: string) => {
		setRenaming(null);
		const column = board?.columns.find((c) => c.id === id);
		if (!name.trim() || name.trim() === column?.name) return;
		run(() => workspaceFetch(`/columns/${id}`, token, { method: "PATCH", json: { name: name.trim() } }));
	};

	/** New section next to another one, ready to be renamed in its header. */
	const addSectionBeside = async (besideId: number, side: "left" | "right") => {
		try {
			const column = await workspaceFetch<WorkColumn>(`/projects/${projectId}/columns`, token, {
				method: "POST",
				json: { name: "Nueva sección", besideId, side },
			});
			await load();
			setRenaming({ id: column.id, name: column.name });
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo agregar la sección"));
		}
	};

	const deleteSection = async (column: WorkColumn, count: number) => {
		if (count > 0) {
			toast.error("La sección tiene tareas: movelas o archivalas antes de eliminarla");
			return;
		}
		const ok = await confirm({
			title: "Eliminar sección",
			description: `"${column.name}" deja de verse en el tablero.`,
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (ok) run(() => workspaceFetch(`/columns/${column.id}/archive`, token, { method: "POST" }), "Sección eliminada");
	};

	const setSubtasksExpanded = (column: WorkColumn, open: boolean) => {
		const ids = (board?.tasks ?? []).filter((t) => t.columnId === column.id && t.subtasks > 0).map((t) => t.id);
		setExpanded((prev) => (open ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id))));
	};

	const clearAll = () => {
		setQuery("");
		setSearchOpen(false);
		setFilters(EMPTY_FILTERS);
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
	const sortLabel = SORT_OPTIONS.find((s) => s.key === sort)?.label;
	const headerButton = "size-7 text-muted-foreground hover:text-foreground";

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
						onClick={() => columns[0] && startAddingAtTop(columns[0].id)}
						disabled={columns.length === 0}
					>
						<Plus className="size-4" />
						Agregar tarea
					</Button>
				)}
				<div className="ml-auto flex flex-wrap items-center gap-1">
					<BoardFilterPanel filters={filters} onChange={setFilters} people={people} />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className={cn(toolbarButton, sort !== "manual" && "text-primary")}>
								<ArrowDownUp className="size-4" />
								{sort === "manual" ? "Ordenar" : sortLabel}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-60">
							{SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
								<DropdownMenuItem key={key} onSelect={() => setSort(key)}>
									<Icon className="size-4" />
									<span className="flex-1">{label}</span>
									{sort === key && <Check className="size-4" />}
								</DropdownMenuItem>
							))}
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

			{(filterCount > 0 || query.trim() || sort !== "manual") && (
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
					{(filterCount > 0 || query.trim()) && (
						<>
							<span className="tabular-nums">
								{visible.length} de {board.tasks.length} tareas
							</span>
							<button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={clearAll}>
								<X className="size-3.5" />
								Quitar filtros
							</button>
						</>
					)}
					{permissions.edit && <span>Con filtros, búsqueda u orden activos no se arrastran tarjetas.</span>}
				</div>
			)}

			<DragDropContext onDragEnd={onDragEnd}>
				<div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pt-3 pb-2 [scrollbar-width:thin]">
					{columns.map((column) => {
						const tasks = columnTasks(column);

						if (collapsed.includes(column.id)) {
							return (
								<button
									key={column.id}
									type="button"
									onClick={() => toggleCollapsed(column.id)}
									aria-label={`Expandir la sección ${column.name}`}
									title="Expandir la sección"
									className="flex w-12 shrink-0 flex-col items-center gap-3 rounded-xl bg-board-column py-3 text-muted-foreground hover:text-foreground"
								>
									<ArrowRightToLine className="size-4" />
									<span className="text-sm font-semibold text-foreground [writing-mode:vertical-rl]">
										{column.name}
									</span>
									<span className="text-xs tabular-nums">{tasks.length}</span>
								</button>
							);
						}

						return (
							<section key={column.id} aria-label={column.name} className="flex w-75 shrink-0 flex-col gap-2">
								<div className="flex min-h-12 items-center gap-1.5 rounded-xl bg-board-column py-2 pr-2 pl-3">
									{renaming?.id === column.id ? (
										<Input
											autoFocus
											onFocus={(e) => e.currentTarget.select()}
											value={renaming.name}
											aria-label="Nombre de la sección"
											onChange={(e) => setRenaming({ id: column.id, name: e.target.value })}
											onBlur={() => saveColumnName(column.id, renaming.name)}
											onKeyDown={(e) => {
												if (e.key === "Enter") saveColumnName(column.id, renaming.name);
												if (e.key === "Escape") setRenaming(null);
											}}
											maxLength={80}
											className="h-8 min-w-0 flex-1 border-foreground/40 bg-board-card text-[15px] font-semibold"
										/>
									) : permissions.manage ? (
										<button
											type="button"
											onClick={() => setRenaming({ id: column.id, name: column.name })}
											title="Renombrar la sección"
											className="min-w-0 truncate rounded-md px-1 py-0.5 text-left text-[15px] font-semibold hover:bg-board-card"
										>
											{column.name}
										</button>
									) : (
										<h2 className="min-w-0 truncate px-1 text-[15px] font-semibold">{column.name}</h2>
									)}
									{column.isDone && (
										<CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label="Completa las tareas" />
									)}
									<span className="text-sm text-muted-foreground tabular-nums">{tasks.length}</span>
									<span className="ml-auto flex shrink-0 items-center">
										<Button
											variant="ghost"
											size="icon"
											className={headerButton}
											aria-label={`Contraer la sección ${column.name}`}
											title="Contraer la sección"
											onClick={() => toggleCollapsed(column.id)}
										>
											<ArrowLeftToLine className="size-4" />
										</Button>
										{permissions.edit && (
											<Button
												variant="ghost"
												size="icon"
												className={headerButton}
												aria-label={`Agregar tarea arriba de ${column.name}`}
												title="Agregar tarea"
												onClick={() => startAddingAtTop(column.id)}
											>
												<Plus className="size-4" />
											</Button>
										)}
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className={headerButton}
													aria-label={`Más opciones de ${column.name}`}
													title="Más opciones"
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="end"
												className="w-72"
												// Do not return focus to "⋯": it would close the rename input that the menu opens.
												onCloseAutoFocus={(e) => e.preventDefault()}
											>
												{permissions.manage && (
													<>
														<DropdownMenuItem onSelect={() => setRenaming({ id: column.id, name: column.name })}>
															<Pencil className="size-4" />
															Renombrar la sección
														</DropdownMenuItem>
														<DropdownMenuSub>
															<DropdownMenuSubTrigger className="gap-2">
																<Columns3 className="size-4 text-muted-foreground" />
																Agregar sección
															</DropdownMenuSubTrigger>
															<DropdownMenuSubContent>
																<DropdownMenuItem onSelect={() => addSectionBeside(column.id, "left")}>
																	<ArrowLeft className="size-4" />
																	Agregar sección a la izquierda
																</DropdownMenuItem>
																<DropdownMenuItem onSelect={() => addSectionBeside(column.id, "right")}>
																	<ArrowRight className="size-4" />
																	Agregar sección a la derecha
																</DropdownMenuItem>
															</DropdownMenuSubContent>
														</DropdownMenuSub>
														<DropdownMenuSeparator />
													</>
												)}
												<DropdownMenuSub>
													<DropdownMenuSubTrigger className="gap-2">
														<ListTree className="size-4 text-muted-foreground" />
														Expandir o contraer las subtareas
													</DropdownMenuSubTrigger>
													<DropdownMenuSubContent>
														<DropdownMenuItem onSelect={() => setSubtasksExpanded(column, true)}>
															Expandir todo
														</DropdownMenuItem>
														<DropdownMenuItem onSelect={() => setSubtasksExpanded(column, false)}>
															Contraer todo
														</DropdownMenuItem>
													</DropdownMenuSubContent>
												</DropdownMenuSub>
												<DropdownMenuSub>
													<DropdownMenuSubTrigger className="gap-2">
														<Columns3 className="size-4 text-muted-foreground" />
														Expandir o contraer las columnas
													</DropdownMenuSubTrigger>
													<DropdownMenuSubContent>
														<DropdownMenuItem onSelect={() => saveCollapsed([])}>Expandir todo</DropdownMenuItem>
														<DropdownMenuItem onSelect={() => saveCollapsed(columns.map((c) => c.id))}>
															Contraer todo
														</DropdownMenuItem>
													</DropdownMenuSubContent>
												</DropdownMenuSub>
												<DropdownMenuItem
													onSelect={() =>
														saveCollapsed([
															...new Set([
																...collapsed,
																...columns.filter((c) => columnTasks(c).length === 0).map((c) => c.id),
															]),
														])
													}
												>
													<EyeOff className="size-4" />
													Ocultar todas las columnas vacías
												</DropdownMenuItem>
												{permissions.manage && (
													<>
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
															variant="destructive"
															onSelect={() =>
																deleteSection(
																	column,
																	board.tasks.filter((t) => t.columnId === column.id).length,
																)
															}
														>
															<Trash2 className="size-4" />
															Eliminar sección
														</DropdownMenuItem>
													</>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</span>
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
											{adding?.columnId === column.id && adding.atStart && (
												<TaskComposer
													people={people}
													onCreate={(input) => addTask(column.id, input, true)}
													onClose={() => setAdding(null)}
												/>
											)}
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
																people={people}
																myId={myId}
																onOpen={openTask}
																actions={permissions.edit ? cardActions : undefined}
																onLike={permissions.comment ? likeTask : undefined}
																expanded={expanded.includes(task.id)}
																onToggleExpand={() =>
																	setExpanded((prev) =>
																		prev.includes(task.id) ? prev.filter((x) => x !== task.id) : [...prev, task.id],
																	)
																}
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
												(adding?.columnId === column.id && !adding.atStart ? (
													<TaskComposer
														people={people}
														onCreate={(input) => addTask(column.id, input, false)}
														onClose={() => setAdding(null)}
													/>
												) : (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setAdding({ columnId: column.id, atStart: false })}
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
			{ConfirmationDialog}
		</div>
	);
}
