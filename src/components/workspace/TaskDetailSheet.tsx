"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
	ArrowDownUp,
	ArrowUp,
	ArrowUpRight,
	CalendarDays,
	Check,
	ChevronDown,
	Contact,
	FileText,
	ImageIcon,
	ImageOff,
	Link2,
	Loader2,
	Maximize2,
	Minimize2,
	MoreHorizontal,
	PanelRightClose,
	Paperclip,
	Plus,
	Scale,
	ThumbsUp,
	Trash2,
	UserRound,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type MentionSource, NoteEditor } from "@/components/case-details/NoteEditor";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/useConfirm";
import { resumenExpedientes } from "@/lib/expediente-label";
import {
	caseHeadline,
	caseMentionLabel,
	dayOf,
	errorMessage,
	fileSize,
	formatDay,
	isOverdue,
	leadMentionLabel,
	leadSubtitle,
	PRIORITY_LABEL,
	projectColor,
	workspaceFetch,
	workspaceUpload,
} from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type {
	WorkActivity,
	WorkAttachment,
	WorkBoard,
	WorkCard,
	WorkCaseRef,
	WorkColumn,
	WorkComment,
	WorkLeadRef,
	WorkMentionRef,
	WorkPerson,
	WorkTaskDetail,
} from "@/types/workspace";
import { CompleteToggle } from "./CompleteToggle";
import { DueCalendar, PeopleList, PriorityList } from "./pickers";
import { RichTextView } from "./RichTextView";

interface Props {
	taskId: number | null;
	token: string | undefined;
	myId: number | null;
	/** Changes when a live notice for this task arrives: re-fetch it. */
	refreshKey: number;
	projectId: number;
	project: WorkBoard["project"];
	people: WorkPerson[];
	columns: WorkColumn[];
	onClose: () => void;
	/** Opens another task in the panel (a subtask or the parent). */
	onOpenTask: (id: number) => void;
	/** The card changed (title, column, assignees...): the board replaces it. */
	onCardChange: (card: WorkCard) => void;
	onArchived: (id: number) => void;
	/** Something the board counts changed (subtasks): reload it. */
	onBoardStale: () => void;
}

const names = (ids: unknown, people: Map<number, string>) =>
	(Array.isArray(ids) ? ids : []).map((id) => people.get(Number(id)) ?? "alguien").join(", ");

function describeActivity(a: WorkActivity, people: Map<number, string>) {
	const d = a.data ?? {};
	switch (a.action) {
		case "task.created":
			return "creó esta tarea";
		case "task.moved":
			return `la movió de ${d.from ?? "—"} a ${d.to ?? "—"}`;
		case "task.completed":
			return "la marcó como finalizada";
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
		case "task.leads":
			return "cambió los leads vinculados";
		case "attachment.added":
			return typeof d.fileName === "string" ? `adjuntó ${d.fileName}` : "adjuntó un archivo";
		case "attachment.archived":
			return "quitó un adjunto";
		case "task.assigned": {
			const parts = [];
			if (Array.isArray(d.added) && d.added.length) parts.push(`asignó a ${names(d.added, people)}`);
			if (Array.isArray(d.removed) && d.removed.length) parts.push(`quitó a ${names(d.removed, people)}`);
			return parts.join(" y ") || "cambió los responsables";
		}
		default:
			return "editó la tarea";
	}
}

const caseSubtitle = (c: WorkCaseRef) => `Caso ${c.number ?? c.id} · ${resumenExpedientes(c.files)}`;
/** Images the browser can show (they can also be the card cover). */
const isImage = (f: WorkAttachment) => /^image\/(jpeg|png|webp|gif)$/.test(f.mimeType ?? "");
/** "Hace 22 días". */
const ago = (iso: string) => {
	const s = formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
	return s.charAt(0).toUpperCase() + s.slice(1);
};
const dashedIcon =
	"grid size-7 place-items-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="grid min-h-9 grid-cols-[8.5rem_1fr] items-center gap-3">
			{/* Lines up with the first line when the value wraps (several cases or leads). */}
			<span className="self-start text-sm leading-9 text-muted-foreground">{label}</span>
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>
		</div>
	);
}

type FeedItem =
	| { kind: "comment"; at: string; comment: WorkComment }
	| { kind: "activity"; at: string; activity: WorkActivity };

export function TaskDetailSheet({
	taskId,
	token,
	myId,
	refreshKey,
	projectId,
	project,
	people,
	columns,
	onClose,
	onOpenTask,
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
	// Bumped to clear the editor after commenting (it is uncontrolled).
	const [composerKey, setComposerKey] = useState(0);
	const [caseQuery, setCaseQuery] = useState("");
	const [caseResults, setCaseResults] = useState<WorkCaseRef[]>([]);
	const [leadQuery, setLeadQuery] = useState("");
	const [leadResults, setLeadResults] = useState<WorkLeadRef[]>([]);
	const [uploading, setUploading] = useState(0);
	const [dropping, setDropping] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);
	const [feedTab, setFeedTab] = useState<"comments" | "all">("comments");
	const [newestFirst, setNewestFirst] = useState(false);
	const [wide, setWide] = useState(false);
	const [picker, setPicker] = useState<"assignee" | "due" | "priority" | null>(null);
	const { confirm, ConfirmationDialog } = useConfirm();
	// While the title is being typed, a live reload does not overwrite it.
	const editingTitle = useRef(false);
	const subtaskInput = useRef<HTMLInputElement>(null);

	const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p.name ?? "Sin nombre"])), [people]);

	const load = useCallback(async () => {
		if (!taskId || !token) return;
		try {
			const t = await workspaceFetch<WorkTaskDetail>(`/tasks/${taskId}`, token);
			setTask(t);
			if (!editingTitle.current) setTitle(t.title);
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: only when a notice arrives.
	useEffect(() => {
		if (refreshKey) load();
	}, [refreshKey]);

	const canEdit = !!task?.permissions.edit;
	const canComment = !!task?.permissions.comment;

	/** Cases this person can link or mention with #. */
	const searchCases = useCallback(
		(q: string) => workspaceFetch<WorkCaseRef[]>(`/projects/${projectId}/cases?q=${encodeURIComponent(q)}`, token),
		[projectId, token],
	);
	const searchCaseMentions = useCallback(
		async (q: string) =>
			(await searchCases(q)).map((c) => ({
				id: c.id,
				label: caseMentionLabel(c),
				title: caseHeadline(c),
				subtitle: caseSubtitle(c),
			})),
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

	/** CRM leads this person can link or mention with $. */
	const searchLeads = useCallback(
		(q: string) => workspaceFetch<WorkLeadRef[]>(`/projects/${projectId}/leads?q=${encodeURIComponent(q)}`, token),
		[projectId, token],
	);
	const searchLeadMentions = useCallback(
		async (q: string) =>
			(await searchLeads(q)).map((l) => ({
				id: l.id,
				label: leadMentionLabel(l),
				title: l.name.toUpperCase(),
				subtitle: leadSubtitle(l),
			})),
		[searchLeads],
	);

	/** Negotiations (%) and closings (-): only mentioned in the text, not linked. */
	const searchRefs = useCallback(
		(kind: "negotiations" | "closings", word: string) => async (q: string) =>
			(
				await workspaceFetch<WorkMentionRef[]>(`/projects/${projectId}/${kind}?q=${encodeURIComponent(q)}`, token)
			).map((r) => ({
				id: r.id,
				label: `${r.name.toUpperCase()} · ${word} ${r.id}`,
				title: r.name.toUpperCase(),
				subtitle: r.subtitle,
			})),
		[projectId, token],
	);

	const mentionSources = useMemo<MentionSource[]>(
		() => [
			{ char: "#", search: searchCaseMentions, emptyText: "No hay causas con ese nombre" },
			{ char: "$", search: searchLeadMentions, emptyText: "No hay leads con ese nombre" },
			{
				char: "%",
				search: searchRefs("negotiations", "Negociación"),
				emptyText: "No hay negociaciones con eso",
				minQuery: 1,
			},
			{ char: "-", search: searchRefs("closings", "Cierre"), emptyText: "No hay cierres con eso", minQuery: 1 },
		],
		[searchCaseMentions, searchLeadMentions, searchRefs],
	);

	useEffect(() => {
		if (!canEdit) return;
		let alive = true;
		searchLeads(leadQuery)
			.then((r) => alive && setLeadResults(r))
			.catch(() => alive && setLeadResults([]));
		return () => {
			alive = false;
		};
	}, [leadQuery, canEdit, searchLeads]);

	/** Saves and refreshes: the board card and the detail (with its history). */
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
		run(() => workspaceFetch<WorkCard>(`/tasks/${taskId}`, token, { method: "PATCH", json }), okMessage);

	const saveTitle = () => {
		editingTitle.current = false;
		const next = title.trim();
		if (!task || !next || next === task.title) return setTitle(task?.title ?? "");
		patch({ title: next });
	};

	const setAssignees = (userIds: number[]) =>
		run(() => workspaceFetch<WorkCard>(`/tasks/${taskId}/assignees`, token, { method: "PUT", json: { userIds } }));
	const toggleAssignee = (id: number) => {
		if (!task) return;
		const current = task.assignees.map((p) => p.id);
		setAssignees(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
	};

	const moveTo = (columnId: number) =>
		run(() =>
			workspaceFetch<WorkCard>(`/tasks/${taskId}/move`, token, {
				method: "POST",
				// At the end of the chosen column.
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
		subtaskInput.current?.focus();
	};

	const toggleSubtask = (id: number, completed: boolean) =>
		run(async () => {
			await workspaceFetch(`/tasks/${id}`, token, { method: "PATCH", json: { completed } });
			onBoardStale();
			return null;
		});

	const setCases = (caseIds: number[]) =>
		run(() => workspaceFetch<WorkCard>(`/tasks/${taskId}/cases`, token, { method: "PUT", json: { caseIds } }));

	const setLeads = (leadIds: number[]) =>
		run(() => workspaceFetch<WorkCard>(`/tasks/${taskId}/leads`, token, { method: "PUT", json: { leadIds } }));

	/** One request per file; the first image becomes the cover (the backend decides). */
	const uploadFiles = async (files: FileList | File[]) => {
		const list = [...files];
		if (!list.length || !taskId) return;
		setUploading((n) => n + list.length);
		for (const file of list) {
			try {
				onCardChange(await workspaceUpload<WorkCard>(`/tasks/${taskId}/attachments`, token, file));
			} catch (e) {
				toast.error(`${file.name}: ${errorMessage(e, "no se pudo adjuntar")}`);
			} finally {
				setUploading((n) => n - 1);
			}
		}
		await load();
	};

	const setCover = (f: WorkAttachment, cover: boolean) =>
		run(() =>
			workspaceFetch<WorkCard>(`/attachments/${f.id}/cover`, token, { method: "POST", json: { cover } }),
		);

	const archiveAttachment = async (f: WorkAttachment) => {
		const ok = await confirm({
			title: "Quitar adjunto",
			description: `"${f.fileName}" deja de verse en la tarea.`,
			confirmLabel: "Quitar",
			variant: "destructive",
		});
		if (ok) run(() => workspaceFetch<WorkCard>(`/attachments/${f.id}/archive`, token, { method: "POST" }));
	};

	const toggleLike = () => run(() => workspaceFetch<WorkCard>(`/tasks/${taskId}/like`, token, { method: "POST" }));

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(`${window.location.origin}/admin/workspace/projects/${projectId}?task=${taskId}`);
			toast.success("Enlace copiado");
		} catch {
			toast.error("No se pudo copiar el enlace");
		}
	};

	const sendComment = async () => {
		if (!task) return;
		setSaving(true);
		try {
			await workspaceFetch(`/tasks/${task.id}/comments`, token, { method: "POST", json: { body: comment } });
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
			title: "Eliminar tarea",
			description: `"${task.title}" deja de verse en el tablero. Queda guardada en el historial por si hay que recuperarla.`,
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			await workspaceFetch(`/tasks/${task.id}/archive`, token, { method: "POST" });
			onArchived(task.id);
			toast.success("Tarea eliminada");
			onClose();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo eliminar"));
		}
	};

	const done = !!task?.completedAt;
	const likes = task?.likes ?? [];
	const liked = myId !== null && likes.includes(myId);
	const commentEmpty = !comment.replace(/<[^>]*>/g, "").trim() && !comment.includes('data-type="mention"');

	const feed = useMemo<FeedItem[]>(() => {
		if (!task) return [];
		const comments: FeedItem[] = task.comments.map((c) => ({ kind: "comment", at: c.createdAt, comment: c }));
		const activity: FeedItem[] = task.activity
			.filter((a) => feedTab === "all" || a.action === "task.created")
			.filter((a) => a.action !== "comment.created")
			.map((a) => ({ kind: "activity", at: a.createdAt, activity: a }));
		const items = [...activity, ...comments].sort((x, y) => x.at.localeCompare(y.at));
		return newestFirst ? items.reverse() : items;
	}, [task, feedTab, newestFirst]);

	const iconButton = "size-8 text-muted-foreground hover:text-foreground";

	return (
		<Sheet open={taskId !== null} onOpenChange={(open) => !open && onClose()}>
			<SheetContent showCloseButton={false} className={cn("w-full gap-0 p-0", wide ? "sm:max-w-5xl" : "sm:max-w-2xl")}>
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
					<div className="flex h-full flex-col">
						{/* Top bar, like Asana's task pane. */}
						<header className="flex items-center gap-1 border-b border-border px-4 py-2.5">
							<Button
								size="sm"
								variant="outline"
								disabled={!canEdit || saving}
								onClick={() => patch({ completed: !done })}
								className={cn(
									"h-8 gap-1.5",
									done && "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white",
								)}
							>
								<Check className="size-4" />
								{done ? "Finalizada" : "Marcar como finalizada"}
							</Button>
							{saving && <Loader2 className="ml-1 size-4 animate-spin text-muted-foreground" />}
							<div className="ml-auto flex items-center gap-0.5">
								{task.assignees.length > 0 && (
									<GroupAvatar
										max={3}
										size="sm"
										className="mr-1"
										users={task.assignees.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
									/>
								)}
								<Button
									variant="ghost"
									size="icon"
									className={cn(iconButton, liked && "text-primary hover:text-primary")}
									disabled={!canComment}
									onClick={toggleLike}
									aria-pressed={liked}
									aria-label={liked ? "Quitar me gusta" : "Me gusta"}
									title={liked ? "Quitar me gusta" : "Me gusta"}
								>
									<ThumbsUp className={cn("size-4", liked && "fill-current")} />
								</Button>
								{likes.length > 0 && (
									<span className="mr-1 text-xs tabular-nums text-muted-foreground">{likes.length}</span>
								)}
								<Button
									variant="ghost"
									size="icon"
									className={iconButton}
									onClick={copyLink}
									aria-label="Copiar enlace"
									title="Copiar enlace"
								>
									<Link2 className="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className={iconButton}
									onClick={() => setWide((w) => !w)}
									aria-label={wide ? "Achicar el panel" : "Ampliar el panel"}
									title={wide ? "Achicar" : "Ampliar"}
								>
									{wide ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className={iconButton} aria-label="Más opciones">
											<MoreHorizontal className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-52">
										<DropdownMenuItem onSelect={copyLink}>
											<Link2 className="size-4" />
											Copiar enlace
										</DropdownMenuItem>
										{canEdit && (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem variant="destructive" onSelect={archive}>
													<Trash2 className="size-4" />
													Eliminar tarea
												</DropdownMenuItem>
											</>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
								<Button variant="ghost" size="icon" className={iconButton} onClick={onClose} aria-label="Cerrar" title="Cerrar">
									<PanelRightClose className="size-4" />
								</Button>
							</div>
						</header>

						<div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
							<div className="space-y-6 px-6 pt-5 pb-6">
								{task.parentTask && (
									<button
										type="button"
										onClick={() => onOpenTask(task.parentTask?.id ?? task.id)}
										className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
									>
										<ArrowUpRight className="size-3.5" />
										Subtarea de <span className="font-medium">{task.parentTask.title}</span>
									</button>
								)}

								<textarea
									aria-label="Título de la tarea"
									value={title}
									disabled={!canEdit}
									rows={Math.max(1, Math.ceil(title.length / 42))}
									onChange={(e) => setTitle(e.target.value)}
									onFocus={() => {
										editingTitle.current = true;
									}}
									onBlur={saveTitle}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											e.currentTarget.blur();
										}
									}}
									className="-mx-2 w-[calc(100%+1rem)] resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-2xl leading-tight font-semibold outline-none hover:border-border focus:border-ring disabled:hover:border-transparent"
								/>

								<div className="space-y-1">
									<Row label="Responsable">
										{task.assignees.map((p) => (
											<span
												key={p.id}
												className="inline-flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-1 pl-0.5 text-sm"
											>
												<GroupAvatar size="sm" users={[{ name: p.name ?? undefined, image: p.image ?? undefined }]} />
												<span className="max-w-40 truncate">{p.name}</span>
												{canEdit && (
													<button
														type="button"
														onClick={() => toggleAssignee(p.id)}
														aria-label={`Quitar a ${p.name}`}
														className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
													>
														<X className="size-3.5" />
													</button>
												)}
											</span>
										))}
										{canEdit && (
											<Popover open={picker === "assignee"} onOpenChange={(o) => setPicker(o ? "assignee" : null)}>
												<PopoverTrigger asChild>
													<button
														type="button"
														className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
														aria-label="Agregar responsable"
													>
														<span className={dashedIcon}>
															{task.assignees.length ? <Plus className="size-3.5" /> : <UserRound className="size-3.5" />}
														</span>
														{task.assignees.length === 0 && "Sin responsable"}
													</button>
												</PopoverTrigger>
												<PopoverContent className="w-64 p-0" align="start">
													<PeopleList
														people={people}
														selected={task.assignees.map((p) => p.id)}
														onPick={(p) => toggleAssignee(p.id)}
													/>
												</PopoverContent>
											</Popover>
										)}
										{!canEdit && task.assignees.length === 0 && (
											<span className="text-sm text-muted-foreground">Sin responsable</span>
										)}
									</Row>

									<Row label="Fecha de entrega">
										<Popover open={picker === "due"} onOpenChange={(o) => setPicker(o ? "due" : null)}>
											<PopoverTrigger asChild disabled={!canEdit}>
												<button
													type="button"
													className={cn(
														"inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-muted disabled:hover:bg-transparent",
														task.dueDate
															? isOverdue(task.dueDate, done)
																? "font-medium text-red-600 dark:text-red-400"
																: "text-foreground"
															: "text-muted-foreground",
													)}
												>
													<span className={task.dueDate ? "grid size-7 place-items-center" : dashedIcon}>
														<CalendarDays className="size-3.5" />
													</span>
													{task.dueDate ? formatDay(task.dueDate) : "Sin fecha de entrega"}
												</button>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<DueCalendar
													value={dayOf(task.dueDate)}
													onPick={(d) => {
														setPicker(null);
														patch({ dueDate: d });
													}}
												/>
											</PopoverContent>
										</Popover>
									</Row>

									<Row label="Prioridad">
										<Popover open={picker === "priority"} onOpenChange={(o) => setPicker(o ? "priority" : null)}>
											<PopoverTrigger asChild disabled={!canEdit}>
												<button
													type="button"
													className={cn(
														"inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm hover:bg-muted disabled:hover:bg-transparent",
														task.priority === "URGENT" && "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
														task.priority === "HIGH" &&
															"bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
													)}
												>
													{PRIORITY_LABEL[task.priority]}
													{canEdit && <ChevronDown className="size-3.5 opacity-60" />}
												</button>
											</PopoverTrigger>
											<PopoverContent className="w-48 p-0" align="start">
												<PriorityList
													value={task.priority}
													onPick={(p) => {
														setPicker(null);
														patch({ priority: p });
													}}
												/>
											</PopoverContent>
										</Popover>
									</Row>

									<Row label="Causas">
										{task.cases.map((c) => (
											<span
												key={c.id}
												className="inline-flex max-w-full items-start gap-1.5 rounded-md bg-muted px-2 py-1.5 text-xs"
											>
												<Scale className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
												<Link
													href={`/admin/legal-cases/${c.id}`}
													className="min-w-0 hover:underline"
													title={`${caseHeadline(c)} — ${caseSubtitle(c)}`}
												>
													<span className="block truncate font-medium">{caseHeadline(c)}</span>
													<span className="block truncate text-[11px] text-muted-foreground">{caseSubtitle(c)}</span>
												</Link>
												{canEdit && (
													<button
														type="button"
														aria-label={`Desvincular ${caseHeadline(c)}`}
														onClick={() => setCases(task.cases.filter((x) => x.id !== c.id).map((x) => x.id))}
														className="rounded text-muted-foreground hover:text-foreground"
													>
														<X className="size-3.5" />
													</button>
												)}
											</span>
										))}
										{canEdit ? (
											<Popover>
												<PopoverTrigger asChild>
													<button
														type="button"
														className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
													>
														<span className={dashedIcon}>
															<Plus className="size-3.5" />
														</span>
														{task.cases.length === 0 && "Vincular causa"}
													</button>
												</PopoverTrigger>
												<PopoverContent className="w-96 p-0" align="start">
													<Command shouldFilter={false}>
														<CommandInput
															placeholder="Cliente, #número o expediente..."
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
																			<span className="min-w-0">
																				<span className="block truncate text-sm">{caseHeadline(c)}</span>
																				<span className="block truncate text-xs text-muted-foreground">
																					{caseSubtitle(c)}
																				</span>
																			</span>
																		</CommandItem>
																	))}
															</CommandGroup>
														</CommandList>
													</Command>
												</PopoverContent>
											</Popover>
										) : (
											task.cases.length === 0 && <span className="text-sm text-muted-foreground">Ninguna</span>
										)}
									</Row>

									<Row label="Leads">
										{task.leads.map((l) => (
											<span
												key={l.id}
												className="inline-flex max-w-full items-start gap-1.5 rounded-md bg-muted px-2 py-1.5 text-xs"
											>
												<Contact className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
												<Link
													href={`/admin/crm/leads/${l.id}`}
													className="min-w-0 hover:underline"
													title={`${l.name} — ${leadSubtitle(l)}`}
												>
													<span className="block truncate font-medium">{l.name.toUpperCase()}</span>
													<span className="block truncate text-[11px] text-muted-foreground">{leadSubtitle(l)}</span>
												</Link>
												{canEdit && (
													<button
														type="button"
														aria-label={`Desvincular ${l.name}`}
														onClick={() => setLeads(task.leads.filter((x) => x.id !== l.id).map((x) => x.id))}
														className="rounded text-muted-foreground hover:text-foreground"
													>
														<X className="size-3.5" />
													</button>
												)}
											</span>
										))}
										{canEdit ? (
											<Popover>
												<PopoverTrigger asChild>
													<button
														type="button"
														className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
													>
														<span className={dashedIcon}>
															<Plus className="size-3.5" />
														</span>
														{task.leads.length === 0 && "Vincular lead"}
													</button>
												</PopoverTrigger>
												<PopoverContent className="w-96 p-0" align="start">
													<Command shouldFilter={false}>
														<CommandInput
															placeholder="Nombre, teléfono o número de lead..."
															value={leadQuery}
															onValueChange={setLeadQuery}
														/>
														<CommandList>
															<CommandEmpty>No hay leads con eso.</CommandEmpty>
															<CommandGroup>
																{leadResults
																	.filter((l) => !task.leads.some((x) => x.id === l.id))
																	.map((l) => (
																		<CommandItem
																			key={l.id}
																			value={String(l.id)}
																			onSelect={() => setLeads([...task.leads.map((x) => x.id), l.id])}
																		>
																			<span className="min-w-0">
																				<span className="block truncate text-sm">{l.name.toUpperCase()}</span>
																				<span className="block truncate text-xs text-muted-foreground">
																					{leadSubtitle(l)}
																				</span>
																			</span>
																		</CommandItem>
																	))}
															</CommandGroup>
														</CommandList>
													</Command>
												</PopoverContent>
											</Popover>
										) : (
											task.leads.length === 0 && <span className="text-sm text-muted-foreground">Ninguno</span>
										)}
									</Row>
								</div>

								{!task.parentTaskId && (
									<section className="space-y-2">
										<h3 className="text-sm font-semibold">Proyectos</h3>
										<div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
											<span
												className="size-3 shrink-0 rounded-sm"
												style={{ backgroundColor: projectColor(project) }}
												aria-hidden
											/>
											<span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
											<DropdownMenu>
												<DropdownMenuTrigger asChild disabled={!canEdit}>
													<button
														type="button"
														className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:hover:bg-transparent"
													>
														{task.column?.name ?? "Sin sección"}
														{canEdit && <ChevronDown className="size-3.5" />}
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-52">
													{columns.map((c) => (
														<DropdownMenuItem key={c.id} onSelect={() => moveTo(c.id)}>
															<Check className={cn("size-4", c.id === task.column?.id ? "opacity-100" : "opacity-0")} />
															{c.name}
														</DropdownMenuItem>
													))}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</section>
								)}

								<section className="space-y-2">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-semibold">Descripción</h3>
										{descriptionDirty && canEdit && (
											<Button size="sm" onClick={saveDescription} disabled={saving}>
												Guardar
											</Button>
										)}
									</div>
									{canEdit ? (
										<NoteEditor
											key={task.id}
											content={task.description ?? ""}
											onChange={(html) => {
												setDescription(html);
												setDescriptionDirty(true);
											}}
											mentionUsers={people.map((p) => ({ id: p.id, name: p.name ?? "Sin nombre", image: p.image }))}
											mentionSources={mentionSources}
											placeholder="¿De qué se trata esta tarea? @ persona, # causa, $ lead, % negociación, - cierre"
										/>
									) : task.description ? (
										<RichTextView html={task.description} />
									) : (
										<p className="text-sm text-muted-foreground">Sin descripción.</p>
									)}
								</section>

								<section
									aria-label="Adjuntos"
									className={cn("space-y-2 rounded-lg", dropping && "ring-2 ring-primary/50 ring-offset-4 ring-offset-background")}
									onDragOver={(e) => {
										if (!canEdit || !e.dataTransfer.types.includes("Files")) return;
										e.preventDefault();
										setDropping(true);
									}}
									onDragLeave={() => setDropping(false)}
									onDrop={(e) => {
										if (!canEdit) return;
										e.preventDefault();
										setDropping(false);
										uploadFiles(e.dataTransfer.files);
									}}
								>
									<div className="flex items-center gap-2">
										<h3 className="text-sm font-semibold">
											Adjuntos
											{task.attachments.length > 0 && (
												<span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
													{task.attachments.length}
												</span>
											)}
										</h3>
										{uploading > 0 && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
										{canEdit && (
											<>
												<Button
													variant="ghost"
													size="sm"
													className="ml-auto h-7 gap-1.5 px-2 text-xs text-muted-foreground"
													onClick={() => fileInput.current?.click()}
												>
													<Paperclip className="size-3.5" />
													Adjuntar
												</Button>
												<input
													ref={fileInput}
													type="file"
													multiple
													hidden
													accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
													onChange={(e) => {
														if (e.target.files) uploadFiles(e.target.files);
														e.target.value = "";
													}}
												/>
											</>
										)}
									</div>
									{task.attachments.length === 0 ? (
										canEdit && (
											<button
												type="button"
												onClick={() => fileInput.current?.click()}
												className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground"
											>
												<Paperclip className="size-4" />
												Arrastrá archivos acá o hacé clic para adjuntar (hasta 25 MB)
											</button>
										)
									) : (
										<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											{task.attachments.map((f) => (
												<li
													key={f.id}
													className="group flex items-center gap-3 rounded-lg border border-border bg-background p-2"
												>
													<a
														href={f.url ?? undefined}
														target="_blank"
														rel="noreferrer"
														className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground"
														aria-label={`Abrir ${f.fileName}`}
													>
														{isImage(f) && f.url ? (
															// biome-ignore lint/performance/noImgElement: signed MinIO URL.
															<img src={f.url} alt="" loading="lazy" className="size-full object-cover" />
														) : (
															<FileText className="size-5" />
														)}
														{f.isCover && (
															<span className="absolute inset-x-0 bottom-0 bg-black/60 py-px text-center text-[9px] font-medium text-white">
																Portada
															</span>
														)}
													</a>
													<div className="min-w-0 flex-1">
														<a
															href={f.url ?? undefined}
															target="_blank"
															rel="noreferrer"
															className="block truncate text-sm font-medium hover:underline"
															title={f.fileName}
														>
															{f.fileName}
														</a>
														<p className="truncate text-xs text-muted-foreground">
															{fileSize(f.size)} · {ago(f.createdAt)}
														</p>
													</div>
													{canEdit && (
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-7 shrink-0 text-muted-foreground"
																	aria-label={`Opciones de ${f.fileName}`}
																>
																	<MoreHorizontal className="size-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" className="w-52">
																{isImage(f) &&
																	(f.isCover ? (
																		<DropdownMenuItem onSelect={() => setCover(f, false)}>
																			<ImageOff className="size-4" />
																			Quitar de la portada
																		</DropdownMenuItem>
																	) : (
																		<DropdownMenuItem onSelect={() => setCover(f, true)}>
																			<ImageIcon className="size-4" />
																			Usar como portada
																		</DropdownMenuItem>
																	))}
																{(f.uploadedBy?.id === myId || task.permissions.manage) && (
																	<DropdownMenuItem variant="destructive" onSelect={() => archiveAttachment(f)}>
																		<Trash2 className="size-4" />
																		Quitar adjunto
																	</DropdownMenuItem>
																)}
															</DropdownMenuContent>
														</DropdownMenu>
													)}
												</li>
											))}
										</ul>
									)}
								</section>

								{!task.parentTaskId && (
									<section className="space-y-2">
										<div className="flex items-center gap-2">
											<h3 className="text-sm font-semibold">
												Subtareas
												{task.subtasks.length > 0 && (
													<span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
														{task.subtasks.filter((s) => s.completedAt).length}/{task.subtasks.length}
													</span>
												)}
											</h3>
											{canEdit && (
												<Button
													variant="ghost"
													size="icon"
													className="size-7 text-muted-foreground"
													aria-label="Agregar subtarea"
													onClick={() => subtaskInput.current?.focus()}
												>
													<Plus className="size-4" />
												</Button>
											)}
										</div>
										<ul className="divide-y divide-border">
											{task.subtasks.map((s) => (
												<li key={s.id} className="flex items-center gap-2.5 py-2">
													<CompleteToggle
														done={!!s.completedAt}
														label={s.completedAt ? `Reabrir "${s.title}"` : `Completar "${s.title}"`}
														onClick={() => canEdit && toggleSubtask(s.id, !s.completedAt)}
													/>
													<button
														type="button"
														onClick={() => onOpenTask(s.id)}
														className={cn(
															"min-w-0 flex-1 truncate text-left text-sm hover:underline",
															s.completedAt && "text-muted-foreground",
														)}
													>
														{s.title}
													</button>
													{s.dueDate && (
														<span className="text-xs tabular-nums text-muted-foreground">{formatDay(s.dueDate)}</span>
													)}
													{s.assignees.length > 0 && (
														<GroupAvatar
															users={s.assignees.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
														/>
													)}
												</li>
											))}
										</ul>
										{canEdit && (
											<form onSubmit={addSubtask}>
												<input
													ref={subtaskInput}
													value={newSubtask}
													onChange={(e) => setNewSubtask(e.target.value)}
													placeholder="Agregar subtarea"
													aria-label="Agregar subtarea"
													className="w-full border-b border-border bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
												/>
											</form>
										)}
									</section>
								)}
							</div>

							{/* Comments and history, like Asana's feed. */}
							<section className="border-t border-border bg-muted/30 px-6 py-4">
								<div className="flex items-center gap-1">
									{(
										[
											["comments", "Comentarios"],
											["all", "Toda la actividad"],
										] as const
									).map(([key, label]) => (
										<button
											key={key}
											type="button"
											onClick={() => setFeedTab(key)}
											aria-pressed={feedTab === key}
											className={cn(
												"rounded-md px-2.5 py-1 text-xs font-medium",
												feedTab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
											)}
										>
											{label}
										</button>
									))}
									<button
										type="button"
										onClick={() => setNewestFirst((v) => !v)}
										className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
									>
										<ArrowDownUp className="size-3.5" />
										{newestFirst ? "Más recientes" : "Más antiguas"}
									</button>
								</div>
								<ol className="mt-3 space-y-4">
									{feed.map((item) =>
										item.kind === "activity" ? (
											<li key={`a${item.activity.id}`} className="flex items-center gap-2 text-sm">
												<GroupAvatar
													users={[
														{
															name: item.activity.actor?.name ?? undefined,
															image: item.activity.actor?.image ?? undefined,
														},
													]}
												/>
												<span className="min-w-0 flex-1 text-muted-foreground">
													<span className="font-medium text-foreground">{item.activity.actor?.name ?? "Alguien"}</span>{" "}
													{describeActivity(item.activity, peopleById)}
													<span className="ml-1.5 text-xs">· {ago(item.at)}</span>
												</span>
											</li>
										) : (
											<li key={`c${item.comment.id}`} className="space-y-1">
												<div className="flex items-center gap-2 text-sm">
													<GroupAvatar
														users={[
															{ name: item.comment.author.name ?? undefined, image: item.comment.author.image ?? undefined },
														]}
													/>
													<span className="font-medium">{item.comment.author.name ?? "Alguien"}</span>
													<span className="text-xs text-muted-foreground">{ago(item.at)}</span>
													{(item.comment.author.id === myId || task.permissions.manage) && (
														<button
															type="button"
															onClick={() => archiveComment(item.comment.id)}
															className="ml-auto text-xs text-muted-foreground hover:text-destructive"
														>
															Archivar
														</button>
													)}
												</div>
												<div className="pl-7">
													<RichTextView html={item.comment.body} />
												</div>
											</li>
										),
									)}
								</ol>
							</section>
						</div>

						{canComment && (
							<footer className="border-t border-border bg-background px-4 py-3">
								<div className="relative">
									<NoteEditor
										key={composerKey}
										content=""
										onChange={setComment}
										mentionUsers={people.map((p) => ({ id: p.id, name: p.name ?? "Sin nombre", image: p.image }))}
										mentionSources={mentionSources}
										placeholder="Escribí un comentario... @ persona, # causa, $ lead, % negociación, - cierre"
									/>
									<Button
										size="icon"
										onClick={sendComment}
										disabled={saving || commentEmpty}
										aria-label="Enviar comentario"
										title="Enviar comentario"
										className="absolute right-2 bottom-2 size-8 rounded-full"
									>
										<ArrowUp className="size-4" />
									</Button>
								</div>
							</footer>
						)}
					</div>
				)}
			</SheetContent>
			{ConfirmationDialog}
		</Sheet>
	);
}
