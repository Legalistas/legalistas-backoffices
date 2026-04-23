"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
	Briefcase,
	Download,
	EllipsisVertical,
	Mail,
	Phone,
	UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RECRUITMENT_SOURCES } from "@/constant/recruitment";
import type { Candidate } from "@/types/recruitment";

interface CandidateCardProps {
	candidate: Candidate;
	onEdit: () => void;
	onDelete: () => void;
	onHire: () => void;
}

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
	RECRUITMENT_SOURCES.map((s) => [s.value, s.label]),
);

export default function CandidateCard({
	candidate,
	onEdit,
	onDelete,
	onHire,
}: CandidateCardProps) {
	const [open, setOpen] = useState(false);

	const createdAgo = (() => {
		try {
			return formatDistanceToNow(parseISO(candidate.createdAt), {
				addSuffix: true,
				locale: es,
			});
		} catch {
			return "";
		}
	})();

	const showHireAction =
		candidate.stage === "HIRED" && !candidate.hiredUserId;

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
			<div className="p-3">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
							{candidate.name}
						</h3>
						<div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
							<Briefcase className="h-3 w-3 shrink-0" />
							<span className="truncate">{candidate.position}</span>
						</div>
					</div>
					<DropdownMenu open={open} onOpenChange={setOpen}>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
								<EllipsisVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							<DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
							{candidate.cvUrl && (
								<DropdownMenuItem asChild>
									<a
										href={candidate.cvUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2"
									>
										<Download className="h-4 w-4" />
										Descargar CV
									</a>
								</DropdownMenuItem>
							)}
							{showHireAction && (
								<DropdownMenuItem onClick={onHire}>
									<UserPlus className="h-4 w-4 mr-2" />
									Crear ficha de empleado
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={onDelete}
								className="text-red-600 focus:text-red-600"
							>
								Eliminar
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="mt-2 space-y-1">
					{candidate.email && (
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Mail className="h-3 w-3 shrink-0" />
							<span className="truncate">{candidate.email}</span>
						</div>
					)}
					{candidate.phone && (
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Phone className="h-3 w-3 shrink-0" />
							<span>{candidate.phone}</span>
						</div>
					)}
				</div>

				<div className="mt-2 flex flex-wrap items-center gap-1">
					<Badge variant="secondary" className="text-[10px] h-5">
						{SOURCE_LABELS[candidate.source] ?? candidate.source}
					</Badge>
					{candidate.area && (
						<Badge variant="outline" className="text-[10px] h-5">
							{candidate.area}
						</Badge>
					)}
					{candidate.hiredUserId && (
						<Badge className="text-[10px] h-5 bg-emerald-600 hover:bg-emerald-700">
							Contratado
						</Badge>
					)}
				</div>
			</div>

			<div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
				<span className="text-[10px] text-muted-foreground">{createdAgo}</span>
				{candidate.responsible && (
					<span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
						{candidate.responsible.name}
					</span>
				)}
			</div>
		</div>
	);
}
