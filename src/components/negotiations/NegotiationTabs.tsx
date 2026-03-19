"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ViewMode } from "@/types/negotiations";

interface NegotiationTabsProps {
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	counts?: {
		iniciar: number;
		curso: number;
		suspenso: number;
		finalizadas: number;
		perdidas: number;
	};
}

const TABS: { key: ViewMode; label: string }[] = [
	{ key: "iniciar", label: "Iniciar" },
	{ key: "curso", label: "En Curso" },
	{ key: "suspenso", label: "Suspenso" },
	{ key: "finalizadas", label: "Finalizadas" },
	{ key: "perdidas", label: "Perdidas" },
];

export function NegotiationTabs({
	viewMode,
	onViewModeChange,
	counts = { iniciar: 0, curso: 0, suspenso: 0, finalizadas: 0, perdidas: 0 },
}: NegotiationTabsProps) {
	return (
		<Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
			<TabsList variant="line" className="w-full border-b border-border rounded-none bg-transparent">
				{TABS.map((tab) => (
					<TabsTrigger key={tab.key} value={tab.key}>
						{tab.label}
						<Badge variant="secondary" className="ml-2 text-xs">
							{counts[tab.key]}
						</Badge>
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
