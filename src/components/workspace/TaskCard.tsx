"use client";

import {
	CalendarDays,
	ChevronRight,
	Contact,
	Flag,
	ListTree,
	MessageSquare,
	Paperclip,
	Pencil,
	Plus,
	Scale,
	ThumbsUp,
	UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dayOf, formatDay, isOverdue, PRIORITY_LABEL } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkCard, WorkPerson, WorkPriority } from "@/types/workspace";
import { CompleteToggle } from "./CompleteToggle";
import { DueCalendar, PeopleList, PriorityList } from "./pickers";

const PRIORITY_STYLE = {
	HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
	URGENT: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
} as const;

/** Edits made right on the card (pencil, hover pickers, like). Without them the card is read-only. */
export interface CardActions {
	toggle: (id: number, done: boolean) => void;
	rename: (id: number, title: string) => void;
	setAssignees: (id: number, userIds: number[]) => void;
	setDue: (id: number, day: string | null) => void;
	setPriority: (id: number, priority: WorkPriority) => void;
}

interface Props {
	task: WorkCard;
	people: WorkPerson[];
	myId: number | null;
	onOpen: (id: number) => void;
	actions?: CardActions;
	/** "Me gusta"; without it the count is shown but cannot be clicked. */
	onLike?: (id: number) => void;
	/** Subtasks listed on the card. */
	expanded?: boolean;
	onToggleExpand?: () => void;
}

const stop = (fn?: () => void) => (e: React.SyntheticEvent) => {
	e.stopPropagation();
	fn?.();
};
// Shown on hover / keyboard focus, and while its picker is open.
const onHover =
	"opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100";
const dashedIcon =
	"grid size-6 place-items-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-foreground/60 hover:text-foreground";

type Picker = "assignee" | "due" | "priority" | "field" | null;

export function TaskCard({ task, people, myId, onOpen, actions, onLike, expanded, onToggleExpand }: Props) {
	const done = !!task.completedAt;
	const overdue = isOverdue(task.dueDate, done);
	const flag = task.priority === "HIGH" || task.priority === "URGENT" ? task.priority : null;
	const likes = task.likes ?? [];
	const liked = myId !== null && likes.includes(myId);
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(task.title);
	const [picker, setPicker] = useState<Picker>(null);
	const [fieldView, setFieldView] = useState<"menu" | "due" | "assignee" | "priority">("menu");
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const counters = [
		{ n: task.comments, icon: MessageSquare, label: "Comentarios" },
		{ n: task.cases, icon: Scale, label: "Causas vinculadas" },
		{ n: task.leads ?? 0, icon: Contact, label: "Leads vinculados" },
		{ n: task.attachments ?? 0, icon: Paperclip, label: "Adjuntos" },
	].filter((c) => c.n > 0);

	useEffect(() => {
		if (!editing) setTitle(task.title);
	}, [task.title, editing]);

	useEffect(() => {
		if (editing) {
			titleRef.current?.focus();
			titleRef.current?.select();
		}
	}, [editing]);

	const saveTitle = () => {
		setEditing(false);
		const next = title.trim();
		if (next && next !== task.title) actions?.rename(task.id, next);
		else setTitle(task.title);
	};

	const assignedIds = task.assignees.map((p) => p.id);
	const toggleAssignee = (p: WorkPerson) =>
		actions?.setAssignees(
			task.id,
			assignedIds.includes(p.id) ? assignedIds.filter((x) => x !== p.id) : [...assignedIds, p.id],
		);
	const open = (p: Picker) => (o: boolean) => {
		setPicker(o ? p : null);
		if (p === "field" && o) setFieldView("menu");
		// Back to the title after choosing a field, so Enter / clicking away still saves.
		if (p === "field" && !o) setTimeout(() => titleRef.current?.focus());
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: holds other buttons, so it cannot be a <button>.
		<div
			role="button"
			tabIndex={0}
			onClick={() => !editing && onOpen(task.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter" && e.target === e.currentTarget) onOpen(task.id);
			}}
			className={cn(
				"group relative w-full cursor-pointer rounded-xl border border-board-card-border bg-board-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[box-shadow,border-color] hover:border-board-card-hover hover:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
				editing && "cursor-default border-board-card-hover",
			)}
		>
			{actions && !editing && (
				<button
					type="button"
					onClick={stop(() => setEditing(true))}
					aria-label={`Editar "${task.title}"`}
					title="Editar la tarjeta"
					className={cn(
						"absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-lg border border-board-card-border bg-board-card text-muted-foreground hover:text-foreground",
						onHover,
					)}
				>
					<Pencil className="size-4" />
				</button>
			)}

			{task.cover && (
				// Signed MinIO URL (private bucket): next/image would need the host configured.
				// biome-ignore lint/performance/noImgElement: see above.
				<img
					src={task.cover}
					alt=""
					loading="lazy"
					className="-mx-4 -mt-4 mb-3 block h-36 w-[calc(100%+2rem)] max-w-none rounded-t-xl object-cover"
				/>
			)}

			<div className="flex items-start gap-2.5">
				<span className="mt-px">
					<CompleteToggle
						done={done}
						label={done ? `Reabrir "${task.title}"` : `Completar "${task.title}"`}
						onClick={stop(() => actions?.toggle(task.id, !done))}
					/>
				</span>
				{editing ? (
					<textarea
						ref={titleRef}
						value={title}
						rows={Math.min(5, Math.max(1, Math.ceil(title.length / 30)))}
						onClick={stop()}
						onChange={(e) => setTitle(e.target.value)}
						onBlur={() => !picker && saveTitle()}
						onKeyDown={(e) => {
							e.stopPropagation();
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								saveTitle();
							}
							if (e.key === "Escape") {
								setTitle(task.title);
								setEditing(false);
							}
						}}
						aria-label="Nombre de la tarea"
						className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-snug outline-none"
					/>
				) : (
					<p className={cn("pr-8 text-sm leading-snug text-foreground wrap-anywhere", done && "text-muted-foreground")}>
						{task.title}
					</p>
				)}
			</div>

			{editing && actions && (
				<div className="mt-2 pl-6.5">
					<Popover open={picker === "field"} onOpenChange={open("field")}>
						<PopoverTrigger asChild>
							<button
								type="button"
								onClick={stop()}
								onMouseDown={(e) => e.preventDefault()}
								className="inline-flex h-7 items-center gap-1.5 rounded-md border border-board-card-border px-2 text-xs text-muted-foreground hover:text-foreground"
							>
								<Plus className="size-3.5" />
								Agregar campo
							</button>
						</PopoverTrigger>
						<PopoverContent
							className={fieldView === "due" ? "w-auto p-0" : "w-64 p-0"}
							align="start"
							onClick={stop()}
						>
							{fieldView === "menu" && (
								<ul className="py-1">
									{(
										[
											["due", "Fecha de entrega", CalendarDays],
											["assignee", "Responsable", UserRound],
											["priority", "Prioridad", Flag],
										] as const
									).map(([key, label, Icon]) => (
										<li key={key}>
											<button
												type="button"
												onClick={() => setFieldView(key)}
												className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
											>
												<Icon className="size-4 text-muted-foreground" />
												{label}
											</button>
										</li>
									))}
								</ul>
							)}
							{fieldView === "due" && (
								<DueCalendar
									value={dayOf(task.dueDate)}
									onPick={(d) => {
										actions.setDue(task.id, d);
										open("field")(false);
									}}
								/>
							)}
							{fieldView === "assignee" && (
								<PeopleList people={people} selected={assignedIds} onPick={toggleAssignee} />
							)}
							{fieldView === "priority" && (
								<PriorityList
									value={task.priority}
									onPick={(p) => {
										actions.setPriority(task.id, p);
										open("field")(false);
									}}
								/>
							)}
						</PopoverContent>
					</Popover>
				</div>
			)}

			{(flag || task.dueDate) && (
				<div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6.5 text-xs">
					{flag && (
						<span className={cn("rounded-md px-1.5 py-0.5 font-medium", PRIORITY_STYLE[flag])}>
							{PRIORITY_LABEL[flag]}
						</span>
					)}
					{task.dueDate && (
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 tabular-nums text-muted-foreground",
								overdue && "bg-red-50 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400",
							)}
							title={overdue ? "Vencida" : "Vence"}
						>
							<CalendarDays className="size-3.5" />
							{formatDay(task.dueDate)}
						</span>
					)}
				</div>
			)}

			<div className="mt-3 flex min-h-6 items-center gap-2 pl-6.5 text-xs text-muted-foreground">
				{actions ? (
					<Popover open={picker === "assignee"} onOpenChange={open("assignee")}>
						<PopoverTrigger asChild>
							<button
								type="button"
								onClick={stop()}
								aria-label="Responsable"
								title="Responsable"
								className={task.assignees.length ? "rounded-full" : dashedIcon}
							>
								{task.assignees.length ? (
									<GroupAvatar
										size="sm"
										users={task.assignees.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
									/>
								) : (
									<UserRound className="size-3.5" />
								)}
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-64 p-0" align="start" onClick={stop()}>
							<PeopleList people={people} selected={assignedIds} onPick={toggleAssignee} />
						</PopoverContent>
					</Popover>
				) : task.assignees.length > 0 ? (
					<GroupAvatar
						size="sm"
						users={task.assignees.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
					/>
				) : (
					<span className={dashedIcon} title="Sin asignar" aria-label="Sin asignar">
						<UserRound className="size-3.5" />
					</span>
				)}

				{actions && !task.dueDate && (
					<Popover open={picker === "due"} onOpenChange={open("due")}>
						<PopoverTrigger asChild>
							<button
								type="button"
								onClick={stop()}
								aria-label="Fecha de entrega"
								title="Fecha de entrega"
								className={cn(dashedIcon, onHover)}
							>
								<CalendarDays className="size-3.5" />
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start" onClick={stop()}>
							<DueCalendar
								value={null}
								onPick={(d) => {
									actions.setDue(task.id, d);
									setPicker(null);
								}}
							/>
						</PopoverContent>
					</Popover>
				)}

				<span className="ml-auto flex items-center gap-2.5">
					{counters.map(({ n, icon: Icon, label }) => (
						<span key={label} className="inline-flex items-center gap-1 tabular-nums" title={label}>
							{n}
							<Icon className="size-3.5" />
						</span>
					))}
					{task.subtasks > 0 && (
						<button
							type="button"
							onClick={stop(onToggleExpand)}
							aria-expanded={!!expanded}
							aria-label={`${expanded ? "Contraer" : "Expandir"} las ${task.subtasks} subtareas`}
							className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 tabular-nums hover:bg-muted hover:text-foreground"
						>
							{task.subtasks}
							<ListTree className="size-3.5" />
							<ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
						</button>
					)}
					{(likes.length > 0 || onLike) && (
						<button
							type="button"
							disabled={!onLike}
							onClick={stop(() => onLike?.(task.id))}
							aria-pressed={liked}
							aria-label={liked ? "Quitar me gusta" : "Me gusta"}
							title={liked ? "Quitar me gusta" : "Me gusta"}
							className={cn(
								"inline-flex items-center gap-1 rounded-md px-1 py-0.5 tabular-nums hover:bg-muted hover:text-foreground disabled:pointer-events-none",
								liked && "text-primary hover:text-primary",
								likes.length === 0 && onHover,
							)}
						>
							{likes.length > 0 && likes.length}
							<ThumbsUp className={cn("size-3.5", liked && "fill-current")} />
						</button>
					)}
				</span>
			</div>

			{expanded && (task.subtaskItems?.length ?? 0) > 0 && (
				<ul className="mt-3 space-y-1 border-t border-board-card-border pt-2.5 pl-6.5">
					{task.subtaskItems?.map((s) => (
						<li key={s.id} className="flex items-center gap-2">
							<CompleteToggle
								done={!!s.completedAt}
								label={s.completedAt ? `Reabrir "${s.title}"` : `Completar "${s.title}"`}
								onClick={stop(() => actions?.toggle(s.id, !s.completedAt))}
							/>
							<button
								type="button"
								onClick={stop(() => onOpen(s.id))}
								className={cn(
									"min-w-0 flex-1 truncate text-left text-xs hover:underline",
									s.completedAt ? "text-muted-foreground" : "text-foreground",
								)}
							>
								{s.title}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
