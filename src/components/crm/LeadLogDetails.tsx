"use client";
import {
	Activity,
	Calendar,
	CheckSquare,
	ChevronDown,
	FileText,
	Filter,
	History,
	type LucideIcon,
	Mail,
	Phone,
	Plus,
	RefreshCw,
	User,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Dropdown } from "@/components/shared/Dropdown";
import { DropdownItem } from "@/components/shared/DropdownItem";
import { Button } from "@/components/ui/button";
import { LOG_TYPES } from "@/constant/crm";
import { formatDate } from "@/lib/functions";
import type { Lead } from "@/types/crm";

interface LeadLogsDetailsProps {
	lead: Lead;
}

// Function to get the appropriate icon based on log type
const getLogIcon = (type: string): LucideIcon => {
	switch (type) {
		case "CREATED":
			return Plus;
		case "EMAIL":
			return Mail;
		case "CALL":
			return Phone;
		case "MEETING":
			return Calendar;
		case "NOTE":
			return FileText;
		case "TASK":
			return CheckSquare;
		case "STATUS_CHANGE":
			return RefreshCw;
		case "OTHER":
		default:
			return Activity;
	}
};

// Function to get the human-readable label for a log type
const getLogLabel = (type: string): string => {
	const logType = LOG_TYPES.find((lt) => lt.type === type);
	return logType ? logType.label : type;
};

// Function to get background color class based on log type
const getLogBgColor = (type: string): string => {
	switch (type) {
		case "CREATED":
			return "bg-green-100 dark:bg-green-900";
		case "EMAIL":
			return "bg-blue-100 dark:bg-blue-900";
		case "CALL":
			return "bg-purple-100 dark:bg-purple-900";
		case "MEETING":
			return "bg-yellow-100 dark:bg-yellow-900";
		case "NOTE":
			return "bg-gray-100 dark:bg-gray-800";
		case "TASK":
			return "bg-indigo-100 dark:bg-indigo-900";
		case "STATUS_CHANGE":
			return "bg-orange-100 dark:bg-orange-900";
		case "OTHER":
		default:
			return "bg-gray-100 dark:bg-gray-800";
	}
};

// Function to get icon color class based on log type
const getLogIconColor = (type: string): string => {
	switch (type) {
		case "CREATED":
			return "text-green-600 dark:text-green-400";
		case "EMAIL":
			return "text-blue-600 dark:text-blue-400";
		case "CALL":
			return "text-purple-600 dark:text-purple-400";
		case "MEETING":
			return "text-yellow-600 dark:text-yellow-400";
		case "NOTE":
			return "text-gray-600 dark:text-gray-400";
		case "TASK":
			return "text-indigo-600 dark:text-indigo-400";
		case "STATUS_CHANGE":
			return "text-orange-600 dark:text-orange-400";
		case "OTHER":
		default:
			return "text-gray-600 dark:text-gray-400";
	}
};

export default function LeadLogDetails({ lead }: LeadLogsDetailsProps) {
	const [filterType, setFilterType] = useState<string | null>(null);
	const [filterOpen, setFilterOpen] = useState(false);

	const allLogs = lead.crmLeadLogs ?? [];
	const typesPresent = LOG_TYPES.filter((lt) =>
		allLogs.some((log) => log.type === lt.type),
	);
	const logs = allLogs
		.filter((log) => !filterType || log.type === filterType)
		.sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

	return (
		<div className="w-full">
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
						<History className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h3 className="text-lg font-semibold">Línea de tiempo</h3>
						<p className="text-sm text-muted-foreground">Historial de actividades</p>
					</div>
				</div>

				{typesPresent.length > 0 && (
					<div className="relative">
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5 rounded-full"
							onClick={() => setFilterOpen((v) => !v)}
						>
							<Filter className="h-3.5 w-3.5" />
							{filterType ? getLogLabel(filterType) : "Filtrar"}
						</Button>
						<Dropdown
							isOpen={filterOpen}
							onClose={() => setFilterOpen(false)}
							className="w-44"
						>
							<DropdownItem
								onClick={() => {
									setFilterType(null);
									setFilterOpen(false);
								}}
								className={!filterType ? "bg-accent text-accent-foreground" : ""}
							>
								Todos
							</DropdownItem>
							{typesPresent.map((lt) => (
								<DropdownItem
									key={lt.type}
									onClick={() => {
										setFilterType(lt.type);
										setFilterOpen(false);
									}}
									className={filterType === lt.type ? "bg-accent text-accent-foreground" : ""}
								>
									{lt.label}
								</DropdownItem>
							))}
						</Dropdown>
					</div>
				)}
			</div>

			{logs.length > 0 ? (
				<div className="space-y-4">
					{logs.map((log, index) => {
						const IconComponent = getLogIcon(log.type);
						const isLast = index === logs.length - 1;
						return (
							<div key={log.id ?? index} className="relative flex gap-4">
								{!isLast && (
									<span className="absolute top-10 left-5 h-[calc(100%-8px)] w-px -translate-x-1/2 bg-border" />
								)}
								<div
									className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getLogBgColor(log.type)}`}
								>
									<IconComponent className={`h-5 w-5 ${getLogIconColor(log.type)}`} />
								</div>
								<div className="flex-1 rounded-xl border border-border bg-background p-4 pb-5">
									<div className="flex items-start justify-between gap-3">
										<p className="text-sm font-semibold">{log.title}</p>
										<span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
											<Calendar className="h-3 w-3" />
											{formatDate(log.createdAt)}
										</span>
									</div>
									<p className="mt-0.5 flex items-center text-xs text-muted-foreground">
										{getLogLabel(log.type)}
										{log.createdByUser ? (
											<>
												{" por"}
												{log.createdByUser.image ? (
													<Image
														src={
															log.createdByUser.image.startsWith("http")
																? log.createdByUser.image
																: `${process.env.NEXT_PUBLIC_BACKEND_URL}${log.createdByUser.image}`
														}
														alt={log.createdByUser.name || "User Avatar"}
														width={20}
														height={20}
														quality={100}
														className="rounded-full mx-1 aspect-square object-cover"
													/>
												) : (
													<User className="h-4 w-4 text-gray-500 mx-1" />
												)}
												{log.createdByUser.name}
											</>
										) : (
											<span className="ml-1">— Sistema</span>
										)}
									</p>
									<p className="mt-1.5 text-sm">{log.description}</p>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="text-center py-6">
					<Activity className="h-12 w-12 mx-auto text-muted-foreground" />
					<p className="mt-2 text-muted-foreground">
						{filterType ? "No hay actividades de este tipo" : "No hay actividades registradas"}
					</p>
				</div>
			)}
		</div>
	);
}
