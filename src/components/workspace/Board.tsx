"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { ArrowLeft, Lock, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useProjectRealtime } from "@/hooks/useWorkspaceSocket";
import { errorMessage, positionAt, workspaceFetch } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkBoard, WorkCard, WorkColumn } from "@/types/workspace";
import { TaskCard } from "./TaskCard";
import { TaskDetailSheet } from "./TaskDetailSheet";

const byPosition = (a: WorkCard, b: WorkCard) => a.position - b.position;

function AddTask({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [busy, setBusy] = useState(false);

	if (!open) {
		return (
			<Button
				variant="ghost"
				size="sm"
				onClick={() => setOpen(true)}
				className="w-full justify-start text-muted-foreground"
			>
				<Plus className="size-4" />
				Agregar tarea
			</Button>
		);
	}
	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				const t = title.trim();
				if (!t) return;
				setBusy(true);
				await onAdd(t);
				setBusy(false);
				// Stays open to add several in a row.
				setTitle("");
			}}
		>
			<Input
				autoFocus
				value={title}
				disabled={busy}
				onChange={(e) => setTitle(e.target.value)}
				onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
				onBlur={() => !title.trim() && setOpen(false)}
				placeholder="Título y Enter"
				className="h-9 bg-card"
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
	const [onlyMine, setOnlyMine] = useState(false);

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

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (board?.tasks ?? []).filter(
			(t) =>
				(!q || t.title.toLowerCase().includes(q)) &&
				(!onlyMine || t.assignees.some((p) => p.id === myId)),
		);
	}, [board, query, onlyMine, myId]);

	const columnTasks = (c: WorkColumn) =>
		visible.filter((t) => t.columnId === c.id).sort(byPosition);

	const filtering = !!query.trim() || onlyMine;

	const onDragEnd = async ({ draggableId, source, destination }: DropResult) => {
		if (!board || !destination) return;
		if (source.droppableId === destination.droppableId && source.index === destination.index) return;
		const id = Number(draggableId);
		const columnId = Number(destination.droppableId);
		// Reorder right away; if the backend rejects it, reload.
		const siblings = board.tasks
			.filter((t) => t.columnId === columnId && t.id !== id)
			.sort(byPosition);
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
				<Skeleton className="h-9 w-72" />
				<div className="flex gap-4">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-[60vh] w-72 shrink-0" />
					))}
				</div>
			</div>
		);
	}

	const { project, columns, people, permissions } = board;

	return (
		<div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
			<header className="flex flex-wrap items-center gap-x-4 gap-y-3">
				<Button variant="ghost" size="icon" asChild className="shrink-0">
					<Link href="/admin/workspace" aria-label="Volver al espacio de trabajo">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div className="min-w-0">
					<h1 className="flex items-center gap-2 text-xl font-semibold text-balance">
						{project.name}
						{project.privacy === "PRIVATE" && (
							<Lock className="size-4 text-muted-foreground" aria-label="Privado" />
						)}
					</h1>
					{project.team && <p className="text-xs text-muted-foreground">Equipo {project.team.name}</p>}
				</div>
				<GroupAvatar
					max={6}
					size="sm"
					users={people.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
				/>
				<div className="ml-auto flex flex-wrap items-center gap-4">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar tarea"
							aria-label="Buscar tarea"
							className="h-9 w-56 pl-8"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Switch id="solo-mias" checked={onlyMine} onCheckedChange={setOnlyMine} />
						<Label htmlFor="solo-mias" className="text-sm">
							Solo las mías
						</Label>
					</div>
				</div>
			</header>

			<DragDropContext onDragEnd={onDragEnd}>
				<div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
					{columns.map((column) => {
						const tasks = columnTasks(column);
						return (
							<section
								key={column.id}
								aria-label={column.name}
								className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 dark:bg-muted/20"
							>
								<div className="flex items-center justify-between px-3 pt-3 pb-2">
									<h2 className={cn("text-sm font-semibold", column.isDone && "text-emerald-700 dark:text-emerald-400")}>
										{column.name}
									</h2>
									<span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
										{tasks.length}
									</span>
								</div>
								<Droppable droppableId={String(column.id)} isDropDisabled={!permissions.edit || filtering}>
									{(provided, snapshot) => (
										<div
											ref={provided.innerRef}
											{...provided.droppableProps}
											className={cn(
												"min-h-16 flex-1 space-y-2 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]",
												snapshot.isDraggingOver && "rounded-lg bg-primary/5",
											)}
										>
											{tasks.map((task, index) => (
												<Draggable
													key={task.id}
													draggableId={String(task.id)}
													index={index}
													isDragDisabled={!permissions.edit || filtering}
												>
													{(drag) => (
														<div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>
															<TaskCard task={task} onOpen={() => openTask(task.id)} />
														</div>
													)}
												</Draggable>
											))}
											{provided.placeholder}
											{tasks.length === 0 && !snapshot.isDraggingOver && filtering && (
												<p className="px-2 py-6 text-center text-xs text-muted-foreground">
													Nada con ese filtro
												</p>
											)}
											{/* Right below the last card, like Trello or Asana. */}
											{permissions.edit && !filtering && (
												<AddTask onAdd={(title) => addTask(column.id, title)} />
											)}
										</div>
									)}
								</Droppable>
							</section>
						);
					})}
				</div>
			</DragDropContext>

			{filtering && permissions.edit && (
				<p className="text-xs text-muted-foreground">Con un filtro activo no se pueden arrastrar tarjetas.</p>
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
				onArchived={(id) =>
					setBoard((b) => (b ? { ...b, tasks: b.tasks.filter((t) => t.id !== id) } : b))
				}
				onBoardStale={load}
			/>
		</div>
	);
}
