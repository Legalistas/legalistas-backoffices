"use client";

import { format } from "date-fns";
import { Archive, Check, CheckCircle2, Circle, Link2, Loader2, Plus, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NoteEditor } from "@/components/case-details/NoteEditor";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/useConfirm";
import { RichTextView } from "./RichTextView";
import { dayOf, errorMessage, PRIORITY_LABEL, workspaceFetch } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type {
	WorkActivity,
	WorkCard,
	WorkCaseRef,
	WorkColumn,
	WorkPerson,
	WorkPriority,
	WorkTaskDetail,
} from "@/types/workspace";

interface Props {
	taskId: number | null;
	token: string | undefined;
	myId: number | null;
	projectId: number;
	people: WorkPerson[];
	columns: WorkColumn[];
	onClose: () => void;
	/** La tarjeta cambió (título, columna, asignados...): el tablero la reemplaza. */
	onCardChange: (card: WorkCard) => void;
	onArchived: (id: number) => void;
	/** Cambió algo que el tablero cuenta (subtareas): que se recargue. */
	onBoardStale: () => void;
}

const names = (ids: unknown, people: Map<number, string>) =>
	(Array.isArray(ids) ? ids : []).map((id) => people.get(Number(id)) ?? "alguien").join(", ");

function describeActivity(a: WorkActivity, people: Map<number, string>) {
	const d = a.data ?? {};
	switch (a.action) {
		case "task.created":
			return "creó la tarea";
		case "task.moved":
			return `la movió de ${d.from ?? "—"} a ${d.to ?? "—"}`;
		case "task.completed":
			return "la marcó como completada";
		case "task.reopened":
			return "la reabrió";
		case "task.archived":
			return "la archivó";
		case "comment.created":
			return "comentó";
		case "comment.archived":
			return "archivó un comentario";
		case "task.cases":
			return "cambió las causas vinculadas";
		case "task.assigned": {
			const parts = [];
			if (Array.isArray(d.added) && d.added.length) parts.push(`asignó a ${names(d.added, people)}`);
			if (Array.isArray(d.removed) && d.removed.length) parts.push(`quitó a ${names(d.removed, people)}`);
			return parts.join(" y ") || "cambió los asignados";
		}
		default:
			return "editó la tarea";
	}
}

const caseLabel = (c: WorkCaseRef) => c.title || c.number || `Causa ${c.id}`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-[7rem_1fr] items-center gap-3">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

export function TaskDetailSheet({
	taskId,
	token,
	myId,
	projectId,
	people,
	columns,
	onClose,
	onCardChange,
	onArchived,
	onBoardStale,
}: Props) {
	const [task, setTask] = useState<WorkTaskDetail | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [descriptionDirty, setDescriptionDirty] = useState(false);
	const [saving, setSaving] = useState(false);
	const [newSubtask, setNewSubtask] = useState("");
	const [comment, setComment] = useState("");
	// Cambia para vaciar el editor después de comentar (no se controla desde afuera).
	const [composerKey, setComposerKey] = useState(0);
	const [caseQuery, setCaseQuery] = useState("");
	const [caseResults, setCaseResults] = useState<WorkCaseRef[]>([]);
	const { confirm, ConfirmationDialog } = useConfirm();

	const peopleById = useMemo(
		() => new Map(people.map((p) => [p.id, p.name ?? "Sin nombre"])),
		[people],
	);

	const load = useCallback(async () => {
		if (!taskId || !token) return;
		try {
			const t = await workspaceFetch<WorkTaskDetail>(`/tasks/${taskId}`, token);
			setTask(t);
			setTitle(t.title);
			setLoadError(null);
		} catch (e) {
			setLoadError(errorMessage(e, "No se pudo abrir la tarea"));
		}
	}, [taskId, token]);

	useEffect(() => {
		setTask(null);
		setLoadError(null);
		setDescriptionDirty(false);
		load();
	}, [load]);

	useEffect(() => {
		if (task && !descriptionDirty) setDescription(task.description ?? "");
	}, [task, descriptionDirty]);

	const canEdit = !!task?.permissions.edit;
	const canComment = !!task?.permissions.comment;

	/** Causas que esta persona puede vincular o mencionar con #. */
	const searchCases = useCallback(
		(q: string) =>
			workspaceFetch<WorkCaseRef[]>(`/projects/${projectId}/cases?q=${encodeURIComponent(q)}`, token),
		[projectId, token],
	);
	const searchCaseMentions = useCallback(
		async (q: string) => (await searchCases(q)).map((c) => ({ id: c.id, label: caseLabel(c) })),
		[searchCases],
	);

	useEffect(() => {
		if (!canEdit) return;
		let alive = true;
		searchCases(caseQuery)
			.then((r) => alive && setCaseResults(r))
			.catch(() => alive && setCaseResults([]));
		return () => {
			alive = false;
		};
	}, [caseQuery, canEdit, searchCases]);

	/** Guarda y refresca: la tarjeta del tablero y el detalle (con su historial). */
	const run = async (fn: () => Promise<WorkCard | null>, okMessage?: string) => {
		setSaving(true);
		try {
			const card = await fn();
			if (card) onCardChange(card);
			await load();
			if (okMessage) toast.success(okMessage);
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo guardar"));
			await load();
		} finally {
			setSaving(false);
		}
	};

	const patch = (json: Record<string, unknown>, okMessage?: string) =>
		run(
			() => workspaceFetch<WorkCard>(`/tasks/${taskId}`, token, { method: "PATCH", json }),
			okMessage,
		);

	const saveTitle = () => {
		const next = title.trim();
		if (!task || !next || next === task.title) return setTitle(task?.title ?? "");
		patch({ title: next });
	};

	const toggleAssignee = (id: number) => {
		if (!task) return;
		const current = task.assignees.map((p) => p.id);
		const userIds = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
		run(() =>
			workspaceFetch<WorkCard>(`/tasks/${task.id}/assignees`, token, {
				method: "PUT",
				json: { userIds },
			}),
		);
	};

	const moveTo = (columnId: number) =>
		run(() =>
			workspaceFetch<WorkCard>(`/tasks/${taskId}/move`, token, {
				method: "POST",
				// Al final de la columna elegida.
				json: { columnId, index: 1_000_000 },
			}),
		);

	const saveDescription = () =>
		run(async () => {
			const card = await workspaceFetch<WorkCard>(`/tasks/${taskId}`, token, {
				method: "PATCH",
				json: { description },
			});
			setDescriptionDirty(false);
			return card;
		}, "Descripción guardada");

	const addSubtask = async (e: React.FormEvent) => {
		e.preventDefault();
		const t = newSubtask.trim();
		if (!t || !task) return;
		setNewSubtask("");
		await run(async () => {
			await workspaceFetch(`/projects/${projectId}/tasks`, token, {
				method: "POST",
				json: { title: t, parentTaskId: task.id },
			});
			onBoardStale();
			return null;
		});
	};

	const toggleSubtask = (id: number, completed: boolean) =>
		run(async () => {
			await workspaceFetch(`/tasks/${id}`, token, { method: "PATCH", json: { completed } });
			return null;
		});

	const setCases = (caseIds: number[]) =>
		run(() =>
			workspaceFetch<WorkCard>(`/tasks/${taskId}/cases`, token, { method: "PUT", json: { caseIds } }),
		);

	const sendComment = async () => {
		if (!task) return;
		setSaving(true);
		try {
			await workspaceFetch(`/tasks/${task.id}/comments`, token, {
				method: "POST",
				json: { body: comment },
			});
			setComment("");
			setComposerKey((k) => k + 1);
			await load();
			onBoardStale();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo comentar"));
		} finally {
			setSaving(false);
		}
	};

	const archiveComment = async (id: number) => {
		try {
			await workspaceFetch(`/comments/${id}/archive`, token, { method: "POST" });
			await load();
			onBoardStale();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo archivar el comentario"));
		}
	};

	const archive = async () => {
		if (!task) return;
		const ok = await confirm({
			title: "Archivar tarea",
			description: `"${task.title}" deja de verse en el tablero. No se borra: queda en el historial.`,
			confirmLabel: "Archivar",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			await workspaceFetch(`/tasks/${task.id}/archive`, token, { method: "POST" });
			onArchived(task.id);
			toast.success("Tarea archivada");
			onClose();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo archivar"));
		}
	};

	const done = !!task?.completedAt;

	return (
		<Sheet open={taskId !== null} onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
				<SheetTitle className="sr-only">{task?.title ?? "Tarea"}</SheetTitle>
				<SheetDescription className="sr-only">Detalle de la tarea</SheetDescription>

				{loadError ? (
					<div className="p-6 text-sm text-muted-foreground">{loadError}</div>
				) : !task ? (
					<div className="space-y-4 p-6">
						<Skeleton className="h-8 w-3/4" />
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-40 w-full" />
					</div>
				) : (
					<>
						<div className="space-y-4 border-b border-border px-6 pt-6 pb-5">
							<div className="flex items-center gap-2 pr-8">
								<Button
									size="sm"
									variant={done ? "default" : "outline"}
									disabled={!canEdit || saving}
									onClick={() => patch({ completed: !done })}
									className={cn(done && "bg-emerald-600 text-white hover:bg-emerald-700")}
								>
									{done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
									{done ? "Completada" : "Marcar completada"}
								</Button>
								{saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
							</div>
							{task.parentTask && (
								<p className="text-xs text-muted-foreground">
									Subtarea de <span className="font-medium text-foreground">{task.parentTask.title}</span>
								</p>
							)}
							<Input
								aria-label="Título de la tarea"
								value={title}
								disabled={!canEdit}
								onChange={(e) => setTitle(e.target.value)}
								onBlur={saveTitle}
								onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
								className="h-auto border-transparent px-2 py-1 text-lg font-semibold shadow-none hover:border-border focus-visible:border-ring md:text-lg"
							/>

							<div className="space-y-2.5">
								{!task.parentTaskId && (
									<Field label="Columna">
										<Select
											value={task.column ? String(task.column.id) : undefined}
											onValueChange={(v) => moveTo(Number(v))}
											disabled={!canEdit}
										>
											<SelectTrigger size="sm" className="w-48">
												<SelectValue placeholder="Sin columna" />
											</SelectTrigger>
											<SelectContent>
												{columns.map((c) => (
													<SelectItem key={c.id} value={String(c.id)}>
														{c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								)}
								<Field label="Asignados">
									<Popover>
										<PopoverTrigger asChild disabled={!canEdit}>
											<Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
												{task.assignees.length ? (
													<>
														<GroupAvatar
															max={4}
															users={task.assignees.map((p) => ({
																name: p.name ?? undefined,
																image: p.image ?? undefined,
															}))}
														/>
														<span className="truncate text-sm">
															{task.assignees.length === 1
																? task.assignees[0].name
																: `${task.assignees.length} personas`}
														</span>
													</>
												) : (
													<>
														<UserPlus className="size-4" />
														<span className="text-sm text-muted-foreground">Asignar</span>
													</>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-72 p-0" align="start">
											<Command>
												<CommandInput placeholder="Buscar persona..." />
												<CommandList>
													<CommandEmpty>Nadie con ese nombre en este proyecto.</CommandEmpty>
													<CommandGroup>
														{people.map((p) => {
															const on = task.assignees.some((a) => a.id === p.id);
															return (
																<CommandItem
																	key={p.id}
																	value={`${p.name ?? ""} ${p.id}`}
																	onSelect={() => toggleAssignee(p.id)}
																>
																	<Check className={cn("size-4", on ? "opacity-100" : "opacity-0")} />
																	{p.name ?? "Sin nombre"}
																</CommandItem>
															);
														})}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</Field>
								<Field label="Vence">
									<Input
										type="date"
										value={dayOf(task.dueDate) ?? ""}
										disabled={!canEdit}
										onChange={(e) => patch({ dueDate: e.target.value || null })}
										className="h-8 w-44"
									/>
								</Field>
								<Field label="Prioridad">
									<Select
										value={task.priority}
										onValueChange={(v) => patch({ priority: v as WorkPriority })}
										disabled={!canEdit}
									>
										<SelectTrigger size="sm" className="w-44">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{(Object.keys(PRIORITY_LABEL) as WorkPriority[]).map((p) => (
												<SelectItem key={p} value={p}>
													{PRIORITY_LABEL[p]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
								<Field label="Causas">
									<div className="flex flex-wrap items-center gap-1.5">
										{task.cases.map((c) => (
											<span
												key={c.id}
												className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
											>
												<Link
													href={`/admin/legal-cases/${c.id}`}
													className="truncate font-medium hover:underline"
													title={caseLabel(c)}
												>
													{caseLabel(c)}
												</Link>
												{canEdit && (
													<button
														type="button"
														aria-label={`Desvincular ${caseLabel(c)}`}
														onClick={() => setCases(task.cases.filter((x) => x.id !== c.id).map((x) => x.id))}
														className="rounded text-muted-foreground hover:text-foreground"
													>
														<X className="size-3.5" />
													</button>
												)}
											</span>
										))}
										{canEdit && (
											<Popover>
												<PopoverTrigger asChild>
													<Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
														<Link2 className="size-3.5" />
														Vincular
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-80 p-0" align="start">
													<Command shouldFilter={false}>
														<CommandInput
															placeholder="Carátula o número..."
															value={caseQuery}
															onValueChange={setCaseQuery}
														/>
														<CommandList>
															<CommandEmpty>No hay causas con eso.</CommandEmpty>
															<CommandGroup>
																{caseResults
																	.filter((c) => !task.cases.some((x) => x.id === c.id))
																	.map((c) => (
																		<CommandItem
																			key={c.id}
																			value={String(c.id)}
																			onSelect={() => setCases([...task.cases.map((x) => x.id), c.id])}
																		>
																			<span className="truncate">{caseLabel(c)}</span>
																		</CommandItem>
																	))}
															</CommandGroup>
														</CommandList>
													</Command>
												</PopoverContent>
											</Popover>
										)}
										{!canEdit && task.cases.length === 0 && (
											<span className="text-sm text-muted-foreground">Ninguna</span>
										)}
									</div>
								</Field>
							</div>
						</div>

						<section className="space-y-2 border-b border-border px-6 py-5">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold">Descripción</h3>
								{descriptionDirty && canEdit && (
									<Button size="sm" onClick={saveDescription} disabled={saving}>
										Guardar
									</Button>
								)}
							</div>
							<NoteEditor
								key={task.id}
								content={task.description ?? ""}
								onChange={(html) => {
									setDescription(html);
									setDescriptionDirty(true);
								}}
								mentionUsers={people.map((p) => ({
									id: p.id,
									name: p.name ?? "Sin nombre",
									image: p.image,
								}))}
								mentionCases={canEdit ? searchCaseMentions : undefined}
								placeholder="Detalles de la tarea... @ para mencionar a alguien, # para una causa"
							/>
						</section>

						{!task.parentTaskId && (
							<section className="space-y-2 border-b border-border px-6 py-5">
								<h3 className="text-sm font-semibold">
									Subtareas
									{task.subtasks.length > 0 && (
										<span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
											{task.subtasks.filter((s) => s.completedAt).length}/{task.subtasks.length}
										</span>
									)}
								</h3>
								<ul className="space-y-1">
									{task.subtasks.map((s) => (
										<li key={s.id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
											<button
												type="button"
												disabled={!canEdit}
												onClick={() => toggleSubtask(s.id, !s.completedAt)}
												aria-label={s.completedAt ? "Reabrir subtarea" : "Completar subtarea"}
												className="rounded-full text-muted-foreground hover:text-emerald-600 disabled:pointer-events-none"
											>
												{s.completedAt ? (
													<CheckCircle2 className="size-4 text-emerald-600" />
												) : (
													<Circle className="size-4" />
												)}
											</button>
											<span className={cn("flex-1 text-sm", s.completedAt && "text-muted-foreground line-through")}>
												{s.title}
											</span>
										</li>
									))}
								</ul>
								{canEdit && (
									<form onSubmit={addSubtask} className="flex gap-2">
										<Input
											value={newSubtask}
											onChange={(e) => setNewSubtask(e.target.value)}
											placeholder="Agregar subtarea"
											className="h-8"
										/>
										<Button type="submit" size="sm" variant="outline" disabled={!newSubtask.trim()}>
											<Plus className="size-4" />
											Agregar
										</Button>
									</form>
								)}
							</section>
						)}

						<section className="space-y-3 border-b border-border px-6 py-5">
							<h3 className="text-sm font-semibold">
								Comentarios
								{task.comments.length > 0 && (
									<span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
										{task.comments.length}
									</span>
								)}
							</h3>
							<ol className="space-y-4">
								{task.comments.map((c) => (
									<li key={c.id} className="space-y-1">
										<div className="flex items-center gap-2 text-sm">
											<GroupAvatar
												users={[{ name: c.author.name ?? undefined, image: c.author.image ?? undefined }]}
											/>
											<span className="font-medium">{c.author.name ?? "Alguien"}</span>
											<time className="text-xs text-muted-foreground tabular-nums">
												{format(new Date(c.createdAt), "dd/MM HH:mm")}
											</time>
											{(c.author.id === myId || task.permissions.manage) && (
												<button
													type="button"
													onClick={() => archiveComment(c.id)}
													className="ml-auto text-xs text-muted-foreground hover:text-destructive"
												>
													Archivar
												</button>
											)}
										</div>
										<div className="pl-7">
											<RichTextView html={c.body} />
										</div>
									</li>
								))}
							</ol>
							{canComment && (
								<div className="space-y-2">
									<NoteEditor
										key={composerKey}
										content=""
										onChange={setComment}
										mentionUsers={people.map((p) => ({
											id: p.id,
											name: p.name ?? "Sin nombre",
											image: p.image,
										}))}
										mentionCases={searchCaseMentions}
										placeholder="Escribí un comentario... @ para mencionar, # para una causa"
									/>
									<div className="flex justify-end">
										<Button
											size="sm"
											onClick={sendComment}
											disabled={saving || (!comment.replace(/<[^>]*>/g, "").trim() && !comment.includes("data-type=\"mention\""))}
										>
											Comentar
										</Button>
									</div>
								</div>
							)}
						</section>

						<section className="space-y-3 px-6 py-5">
							<h3 className="text-sm font-semibold">Actividad</h3>
							<ol className="space-y-2.5">
								{task.activity.map((a) => (
									<li key={a.id} className="flex gap-2 text-sm">
										<span className="font-medium">{a.actor?.name ?? "Alguien"}</span>
										<span className="flex-1 text-muted-foreground">{describeActivity(a, peopleById)}</span>
										<time className="shrink-0 text-xs text-muted-foreground tabular-nums">
											{format(new Date(a.createdAt), "dd/MM HH:mm")}
										</time>
									</li>
								))}
							</ol>
							{canEdit && (
								<Button
									variant="ghost"
									size="sm"
									onClick={archive}
									className="mt-2 text-muted-foreground hover:text-destructive"
								>
									<Archive className="size-4" />
									Archivar tarea
								</Button>
							)}
						</section>
					</>
				)}
			</SheetContent>
			{ConfirmationDialog}
		</Sheet>
	);
}
