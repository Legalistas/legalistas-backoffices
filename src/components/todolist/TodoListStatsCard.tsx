"use client";

import {
	CheckCircle,
	Clock,
	ListTodo,
	PlayCircle,
	XCircle,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { TodoListStats } from "@/types/todolist";

interface TodoListStatsCardProps {
	stats: TodoListStats | null;
	isLoading?: boolean;
}

export function TodoListStatsCard({
	stats,
	isLoading,
}: TodoListStatsCardProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
				{[...Array(5)].map((_, i) => (
					<Card key={i} className="animate-pulse">
						<CardHeader className="pb-2">
							<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
						</CardHeader>
						<CardContent>
							<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (!stats) return null;

	const statsData = [
		{
			title: "Total",
			value: stats.total,
			icon: ListTodo,
			color: "text-purple-600 dark:text-purple-400",
			bgColor: "bg-purple-100 dark:bg-purple-500/20",
		},
		{
			title: "Pendientes",
			value: stats.pending,
			icon: Clock,
			color: "text-yellow-600 dark:text-yellow-400",
			bgColor: "bg-yellow-100 dark:bg-yellow-500/20",
		},
		{
			title: "En Progreso",
			value: stats.inProgress,
			icon: PlayCircle,
			color: "text-blue-600 dark:text-blue-400",
			bgColor: "bg-blue-100 dark:bg-blue-500/20",
		},
		{
			title: "Completados",
			value: stats.completed,
			icon: CheckCircle,
			color: "text-green-600 dark:text-green-400",
			bgColor: "bg-green-100 dark:bg-green-500/20",
		},
		{
			title: "Cancelados",
			value: stats.cancelled,
			icon: XCircle,
			color: "text-gray-600 dark:text-gray-400",
			bgColor: "bg-gray-100 dark:bg-gray-500/20",
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
			{statsData.map((stat) => {
				const Icon = stat.icon;
				return (
					<Card key={stat.title} className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
									{stat.title}
								</CardTitle>
								<div className={`${stat.bgColor} p-2 rounded-lg`}>
									<Icon className={`h-4 w-4 ${stat.color}`} />
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className={`text-2xl font-bold ${stat.color}`}>
								{stat.value}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
