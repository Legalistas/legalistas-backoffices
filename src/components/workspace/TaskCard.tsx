"use client";

import { CalendarDays, CheckCircle2, ListTree, MessageSquare, Scale } from "lucide-react";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { formatDay, isOverdue, PRIORITY_LABEL } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkCard } from "@/types/workspace";

const PRIORITY_STYLE = {
	HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
	URGENT: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
} as const;

export function TaskCard({ task, onOpen }: { task: WorkCard; onOpen: () => void }) {
	const done = !!task.completedAt;
	const overdue = isOverdue(task.dueDate, done);
	const flag = task.priority === "HIGH" || task.priority === "URGENT" ? task.priority : null;

	return (
		<button
			type="button"
			onClick={onOpen}
			className="group w-full rounded-lg border border-border bg-card p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		>
			<div className="flex items-start gap-2">
				{done && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Completada" />}
				<p
					className={cn(
						"text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]",
						done && "text-muted-foreground line-through decoration-muted-foreground/50",
					)}
				>
					{task.title}
				</p>
			</div>

			{(flag || task.dueDate || task.subtasks > 0 || task.comments > 0 || task.cases > 0 || task.assignees.length > 0) && (
				<div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
					{flag && (
						<span className={cn("rounded px-1.5 py-0.5 font-medium", PRIORITY_STYLE[flag])}>
							{PRIORITY_LABEL[flag]}
						</span>
					)}
					{task.dueDate && (
						<span
							className={cn(
								"inline-flex items-center gap-1 tabular-nums",
								overdue && "font-medium text-red-600 dark:text-red-400",
							)}
							title={overdue ? "Vencida" : "Vence"}
						>
							<CalendarDays className="size-3.5" />
							{formatDay(task.dueDate)}
						</span>
					)}
					{task.subtasks > 0 && (
						<span className="inline-flex items-center gap-1 tabular-nums" title="Subtareas">
							<ListTree className="size-3.5" />
							{task.subtasks}
						</span>
					)}
					{task.comments > 0 && (
						<span className="inline-flex items-center gap-1 tabular-nums" title="Comentarios">
							<MessageSquare className="size-3.5" />
							{task.comments}
						</span>
					)}
					{task.cases > 0 && (
						<span className="inline-flex items-center gap-1 tabular-nums" title="Causas vinculadas">
							<Scale className="size-3.5" />
							{task.cases}
						</span>
					)}
					{task.assignees.length > 0 && (
						<GroupAvatar
							className="ml-auto"
							users={task.assignees.map((p) => ({ name: p.name ?? undefined, image: p.image ?? undefined }))}
						/>
					)}
				</div>
			)}
		</button>
	);
}
