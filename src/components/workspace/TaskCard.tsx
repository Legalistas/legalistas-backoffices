"use client";

import { CalendarDays, ChevronRight, ListTree, MessageSquare, Scale, UserRound } from "lucide-react";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { formatDay, isOverdue, PRIORITY_LABEL } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkCard } from "@/types/workspace";
import { CompleteToggle } from "./CompleteToggle";

const PRIORITY_STYLE = {
	HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
	URGENT: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
} as const;

interface Props {
	task: WorkCard;
	onOpen: (id: number) => void;
	/** Without it the circles are shown but cannot be clicked (no edit permission). */
	onToggle?: (id: number, done: boolean) => void;
	/** Subtasks listed on the card. */
	expanded?: boolean;
	onToggleExpand?: () => void;
}

const stop = (fn?: () => void) => (e: React.MouseEvent) => {
	e.stopPropagation();
	fn?.();
};

export function TaskCard({ task, onOpen, onToggle, expanded, onToggleExpand }: Props) {
	const done = !!task.completedAt;
	const overdue = isOverdue(task.dueDate, done);
	const flag = task.priority === "HIGH" || task.priority === "URGENT" ? task.priority : null;
	const counters = [
		{ n: task.comments, icon: MessageSquare, label: "Comentarios" },
		{ n: task.cases, icon: Scale, label: "Causas vinculadas" },
	].filter((c) => c.n > 0);

	return (
		// biome-ignore lint/a11y/useSemanticElements: holds other buttons, so it cannot be a <button>.
		<div
			role="button"
			tabIndex={0}
			onClick={() => onOpen(task.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter" && e.target === e.currentTarget) onOpen(task.id);
			}}
			className="group w-full cursor-pointer rounded-xl border border-board-card-border bg-board-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[box-shadow,border-color] hover:border-board-card-hover hover:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		>
			<div className="flex items-start gap-2.5">
				<span className="mt-px">
					<CompleteToggle
						done={done}
						label={done ? `Reabrir "${task.title}"` : `Completar "${task.title}"`}
						onClick={stop(() => onToggle?.(task.id, !done))}
					/>
				</span>
				<p className={cn("text-sm leading-snug text-foreground wrap-anywhere", done && "text-muted-foreground")}>
					{task.title}
				</p>
			</div>

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
				{task.assignees.length > 0 ? (
					<GroupAvatar
						size="sm"
						users={task.assignees.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
					/>
				) : (
					<span
						className="grid size-6 place-items-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground"
						title="Sin asignar"
						aria-label="Sin asignar"
					>
						<UserRound className="size-3.5" />
					</span>
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
				</span>
			</div>

			{expanded && task.subtaskItems.length > 0 && (
				<ul className="mt-3 space-y-1 border-t border-board-card-border pt-2.5 pl-6.5">
					{task.subtaskItems.map((s) => (
						<li key={s.id} className="flex items-center gap-2">
							<CompleteToggle
								done={!!s.completedAt}
								label={s.completedAt ? `Reabrir "${s.title}"` : `Completar "${s.title}"`}
								onClick={stop(() => onToggle?.(s.id, !s.completedAt))}
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
