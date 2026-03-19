"use client";

import {
	Archive,
	Briefcase,
	Check,
	ChevronDown,
	FileText,
	Flag,
	Heart,
	Scale,
	Star,
} from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { stageCases } from "@/lib/constant";

interface StageSelectDropdownProps {
	currentStageId: number;
	onStageChange: (newStageId: number) => void;
}

const stageConfig: Record<
	number,
	{ bg: string; color: string; hoverBg: string; icon: typeof FileText }
> = {
	1: { bg: "#e0f2fe", color: "#0284c7", hoverBg: "#bae6fd", icon: FileText },
	2: { bg: "#fef3c7", color: "#d97706", hoverBg: "#fde68a", icon: Briefcase },
	3: { bg: "#fee2e2", color: "#dc2626", hoverBg: "#fecaca", icon: Scale },
	4: { bg: "#ede9fe", color: "#7c3aed", hoverBg: "#ddd6fe", icon: Heart },
	5: { bg: "#dbeafe", color: "#2563eb", hoverBg: "#bfdbfe", icon: Flag },
	6: { bg: "#d1fae5", color: "#059669", hoverBg: "#a7f3d0", icon: Star },
	7: { bg: "#f3f4f6", color: "#4b5563", hoverBg: "#e5e7eb", icon: Archive },
};

const defaultConfig = {
	bg: "#f3f4f6",
	color: "#4b5563",
	hoverBg: "#e5e7eb",
	icon: FileText,
};

export function StageSelectDropdown({
	currentStageId,
	onStageChange,
}: StageSelectDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	const currentStage = stageCases.find((s) => s.value === currentStageId);
	const currentLabel = currentStage?.label ?? "Desconocido";
	const config = stageConfig[currentStageId] ?? defaultConfig;
	const CurrentIcon = config.icon;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all hover:shadow-md border"
				style={{
					backgroundColor: config.bg,
					color: config.color,
					borderColor: config.color + "40",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<CurrentIcon className="h-3.5 w-3.5" />
				<span>{currentLabel}</span>
				<ChevronDown
					className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
				/>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto min-w-45 p-1"
				align="start"
				sideOffset={4}
				onClick={(e) => e.stopPropagation()}
			>
				{stageCases.map((stage) => {
					const sc = stageConfig[stage.value] ?? defaultConfig;
					const Icon = sc.icon;
					const isSelected = stage.value === currentStageId;
					return (
						<button
							type="button"
							key={stage.value}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!isSelected) {
									onStageChange(stage.value);
								}
								setIsOpen(false);
							}}
							className={`w-full px-2.5 py-1.5 text-left text-xs transition-colors flex items-center gap-2 rounded-md ${
								isSelected
									? "bg-accent"
									: "hover:bg-accent"
							}`}
						>
							<Icon
								className="h-3.5 w-3.5 shrink-0"
								style={{ color: sc.color }}
							/>
							<span
								className={`flex-1 ${isSelected ? "font-semibold" : "font-medium"}`}
								style={{ color: sc.color }}
							>
								{stage.label}
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
