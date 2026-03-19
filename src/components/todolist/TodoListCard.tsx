"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckCircle, Edit, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { type TodoList, TodoPriority, TodoStatus } from "@/types/todolist";

interface TodoListCardProps {
	todo: TodoList;
	onEdit?: (todo: TodoList) => void;
	onDelete?: (id: number) => void;
	onUpdateStatus?: (id: number, status: TodoStatus) => void;
}

const statusConfig: Record<
	TodoStatus,
	{ color: "primary" | "success" | "error" | "warning" | "info"; label: string }
> = {
	[TodoStatus.PENDING]: { color: "warning", label: "Pendiente" },
	[TodoStatus.IN_PROGRESS]: { color: "info", label: "En Progreso" },
	[TodoStatus.COMPLETED]: { color: "success", label: "Completado" },
	[TodoStatus.CANCELLED]: { color: "error", label: "Cancelado" },
};

const priorityConfig: Record<
	TodoPriority,
	{ color: "primary" | "success" | "error" | "warning" | "info"; label: string }
> = {
	[TodoPriority.LOW]: { color: "primary", label: "Baja" },
	[TodoPriority.MEDIUM]: { color: "info", label: "Media" },
	[TodoPriority.HIGH]: { color: "warning", label: "Alta" },
	[TodoPriority.URGENT]: { color: "error", label: "Urgente" },
};

export function TodoListCard({
	todo,
	onEdit,
	onDelete,
	onUpdateStatus,
}: TodoListCardProps) {
	const handleCompleteToggle = () => {
		if (onUpdateStatus) {
			const newStatus =
				todo.status === TodoStatus.COMPLETED
					? TodoStatus.PENDING
					: TodoStatus.COMPLETED;
			onUpdateStatus(todo.id, newStatus);
		}
	};

	return (
		<Card className="hover:shadow-lg transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-lg font-semibold">
							{todo.title}
						</CardTitle>
						<div className="flex gap-2 mt-2">
							<Badge variant="secondary">
								{statusConfig[todo.status].label}
							</Badge>
							<Badge
								variant="secondary"
							>
								{priorityConfig[todo.priority].label}
							</Badge>
						</div>
					</div>
					<div className="flex gap-2">
						{onEdit && (
							<Button size="sm" variant="ghost" onClick={() => onEdit(todo)}>
								<Edit className="h-4 w-4" />
							</Button>
						)}
						{onDelete && (
							<Button
								variant="ghost"
								onClick={() => onDelete(todo.id)}
								className="text-red-500 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{todo.description && (
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
						{todo.description}
					</p>
				)}

				<div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
					{todo.user && (
						<div className="flex items-center gap-2">
							<User className="h-4 w-4" />
							<span>{todo.user.name}</span>
						</div>
					)}

					{todo.dueDate && (
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							<span>
								Vence:{" "}
								{format(new Date(todo.dueDate), "d 'de' MMMM, yyyy", {
									locale: es,
								})}
							</span>
						</div>
					)}
				</div>

				{onUpdateStatus && (
					<div className="mt-4 pt-4 border-t dark:border-gray-700">
						<Button
							variant={
								todo.status === TodoStatus.COMPLETED ? "outline" : "default"
							}
							onClick={handleCompleteToggle}
							className="w-full"
						>
							<CheckCircle className="h-4 w-4 mr-2" />
							{todo.status === TodoStatus.COMPLETED
								? "Marcar como pendiente"
								: "Marcar como completado"}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
