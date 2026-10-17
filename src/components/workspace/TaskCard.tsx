"use client";

import { CalendarDays, ListTree, MessageSquare, Scale, UserRound } from "lucide-react";
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
	onOpen: () => void;
	/** Without it the circle is shown but cannot be clicked (no edit permission). */
	onToggle?: () => void;
}

export function TaskCard({ task, onOpen, onToggle }: Props) {
	const done = !!task.completedAt;
	const overdue = isOverdue(task.dueDate, done);
	const flag = task.priority === "HIGH" || task.priority === "URGENT" ? task.priority : null;
	const counters = [
		{ n: task.subtasks, icon: ListTree, label: "Subtareas" },
		{ n: task.comments, icon: MessageSquare, label: "Comentarios" },
		{ n: task.cases, icon: Scale, label: "Causas vinculadas" },
	].filter((c) => c.n > 0);

	return (
		// biome-ignore lint/a11y/useSemanticElements: holds the complete button, so it cannot be a <button>.
		<div
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(e) => {
				if (e.key === "Enter") onOpen();
			}}
			className="group w-full cursor-pointer rounded-xl border border-board-card-border bg-board-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[box-shadow,border-color] hover:border-board-card-hover hover:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		>
			<div className="flex items-start gap-2.5">
				<span className="mt-px">
					<CompleteToggle
						done={done}
						label={done ? `Reabrir "${task.title}"` : `Completar "${task.title}"`}
						onClick={(e) => {
							e.stopPropagation();
							onToggle?.();
						}}
					/>
				</span>
				<p
					className={cn(
						"text-sm leading-snug text-foreground wrap-anywhere",
						done && "text-muted-foreground",
					)}
				>
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
				</span>
			</div>
		</div>
	);
}
