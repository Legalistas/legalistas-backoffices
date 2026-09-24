"use client";

import {
	Check,
	CheckCircle2,
	ChevronDown,
	PauseCircle,
	PlayCircle,
	TrendingUp,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { NegotiationStatus } from "@/types/negotiations";

interface NegotiationStatusDropdownProps {
	currentStatus: NegotiationStatus;
	onStatusChange: (newStatus: NegotiationStatus) => void;
}

const STATUS_LABELS: Record<NegotiationStatus, string> = {
	INICIAR: "Iniciar",
	CURSO: "En Curso",
	SUSPENSO: "Suspenso",
	FINALIZADAS: "Finalizada",
	PERDIDAS: "Perdida",
};

const STATUS_CONFIG: Record<
	NegotiationStatus,
	{ bg: string; color: string; icon: typeof PlayCircle }
> = {
	INICIAR: { bg: "#dbeafe", color: "#1d4ed8", icon: PlayCircle },
	CURSO: { bg: "#d1fae5", color: "#047857", icon: TrendingUp },
	SUSPENSO: { bg: "#fef3c7", color: "#b45309", icon: PauseCircle },
	FINALIZADAS: { bg: "#dcfce7", color: "#15803d", icon: CheckCircle2 },
	PERDIDAS: { bg: "#fee2e2", color: "#b91c1c", icon: XCircle },
};

// Mismas transiciones que valida el backend (negotation.controller.ts)
const VALID_TRANSITIONS: Record<NegotiationStatus, NegotiationStatus[]> = {
	INICIAR: ["CURSO", "PERDIDAS"],
	CURSO: ["SUSPENSO", "FINALIZADAS", "PERDIDAS"],
	SUSPENSO: ["CURSO", "PERDIDAS"],
	FINALIZADAS: [],
	PERDIDAS: [],
};

export function NegotiationStatusDropdown({
	currentStatus,
	onStatusChange,
}: NegotiationStatusDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	const config = STATUS_CONFIG[currentStatus];
	const CurrentIcon = config.icon;
	const allowedTargets = VALID_TRANSITIONS[currentStatus];

	const badgeStyle = {
		backgroundColor: config.bg,
		color: config.color,
		borderColor: `${config.color}40`,
	};

	// Estado final (Finalizada/Perdida): sin transiciones posibles, se muestra fijo
	if (allowedTargets.length === 0) {
		return (
			<span
				className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full border"
				style={badgeStyle}
			>
				<CurrentIcon className="h-3 w-3" />
				{STATUS_LABELS[currentStatus]}
			</span>
		);
	}

	const options: NegotiationStatus[] = [currentStatus, ...allowedTargets];

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full cursor-pointer transition-all hover:shadow-sm border"
				style={badgeStyle}
				onClick={(e) => e.stopPropagation()}
			>
				<CurrentIcon className="h-3 w-3" />
				<span>{STATUS_LABELS[currentStatus]}</span>
				<ChevronDown
					className={`h-2.5 w-2.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
				/>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto min-w-40 p-1"
				align="start"
				sideOffset={4}
				onClick={(e) => e.stopPropagation()}
			>
				{options.map((s) => {
					const sc = STATUS_CONFIG[s];
					const Icon = sc.icon;
					const isSelected = s === currentStatus;
					return (
						<button
							type="button"
							key={s}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!isSelected) onStatusChange(s);
								setIsOpen(false);
							}}
							className={`w-full px-2.5 py-1.5 text-left text-xs transition-colors flex items-center gap-2 rounded-md ${
								isSelected ? "bg-accent" : "hover:bg-accent"
							}`}
						>
							<Icon className="h-3.5 w-3.5 shrink-0" style={{ color: sc.color }} />
							<span
								className={`flex-1 ${isSelected ? "font-semibold" : "font-medium"}`}
								style={{ color: sc.color }}
							>
								{STATUS_LABELS[s]}
							</span>
							{isSelected && (
								<Check className="h-3 w-3" style={{ color: sc.color }} />
							)}
						</button>
					);
				})}
			</PopoverContent>
		</Popover>
	);
}
