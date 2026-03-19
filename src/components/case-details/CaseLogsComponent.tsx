import {
	Activity,
	File,
	FileText,
	type LucideIcon,
	Plus,
	User,
} from "lucide-react";
import Image from "next/image";
import { LOG_TYPES } from "@/constant/causes";
import { formatDate } from "@/lib/functions";
import type { CaseLogs } from "@/types/cases";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface CaseLogsDetailsProps {
	logs: CaseLogs[];
}

const getLogIcon = (type: string): LucideIcon => {
	switch (type) {
		case "CREATED":
			return Plus;
		case "FILES":
			return File;
		case "NOTES":
			return FileText;
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
		case "FILES":
			return "bg-blue-100 dark:bg-blue-900";
		case "NOTES":
			return "bg-purple-100 dark:bg-purple-900";
		case "OTHER":
		default:
			return "bg-muted";
	}
};

// Function to get icon color class based on log type
const getLogIconColor = (type: string): string => {
	switch (type) {
		case "CREATED":
			return "text-green-600 dark:text-green-400";
		case "FILES":
			return "text-blue-600 dark:text-blue-400";
		case "NOTES":
			return "text-purple-600 dark:text-purple-400";
		case "OTHER":
		default:
			return "text-muted-foreground";
	}
};

export default function CaseLogsComponent({ logs }: CaseLogsDetailsProps) {
	return (
		<Card className="w-full p-0 border-none shadow-none">
			<CardHeader>
				<CardTitle>Línea de tiempo</CardTitle>
				<CardDescription>Historial de actividades</CardDescription>
			</CardHeader>
			<CardContent className="max-h-100 overflow-y-auto">
				<div className="space-y-4">
					{logs && logs.length > 0 ? (
						logs
							.sort(
								(a, b) =>
									new Date(b.createdAt).getTime() -
									new Date(a.createdAt).getTime(),
							)
							.map((log, index) => {
								const IconComponent = getLogIcon(log.type);
								return (
									<div key={index} className="flex">
										<div
											className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full ${getLogBgColor(log.type)}`}
										>
											<IconComponent
												className={`h-5 w-5 ${getLogIconColor(log.type)}`}
											/>
										</div>
										<div>
											<p className="text-sm font-medium">
												{log.title} •{" "}
												<span className="text-muted-foreground font-normal">
													{formatDate(log.createdAt)}
												</span>
											</p>
											<p className="flex items-center text-xs text-muted-foreground">
												{getLogLabel(log.type)} por
												{log.createdBy?.image ? (
													<Image
														src={
															log.createdBy.image.startsWith("http")
																? log.createdBy.image
																: `${process.env.NEXT_PUBLIC_BACKEND_URL}${log.createdBy.image}`
														}
														alt={log.createdBy?.name || "User Avatar"}
														width={20}
														height={20}
														quality={100}
														priority
														className="rounded-full mx-1 aspect-square object-cover"
													/>
												) : (
													<User className="h-5 w-5 text-muted-foreground" />
												)}
												{log.createdBy?.name || "Usuario desconocido"}
											</p>
											<p className="text-sm mt-1">{log.description}</p>
										</div>
									</div>
								);
							})
					) : (
						<div className="text-center py-6">
							<Activity className="h-12 w-12 mx-auto text-muted-foreground" />
							<p className="mt-2 text-muted-foreground">
								No hay actividades registradas
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
