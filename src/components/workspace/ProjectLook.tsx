"use client";

import {
	BarChart3,
	Briefcase,
	Building2,
	Calculator,
	CalendarDays,
	Check,
	Code,
	FileText,
	Flag,
	Folder,
	Gavel,
	Handshake,
	Heart,
	KanbanSquare,
	Laptop,
	Lightbulb,
	type LucideIcon,
	Mail,
	Megaphone,
	Rocket,
	Scale,
	Shield,
	Star,
	Target,
	Users,
	Wallet,
} from "lucide-react";
import { PROJECT_COLORS } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";

/** Icons a project can have; work_projects.icon stores the key. */
export const PROJECT_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
	board: { icon: KanbanSquare, label: "Tablero" },
	scale: { icon: Scale, label: "Balanza" },
	gavel: { icon: Gavel, label: "Martillo" },
	file: { icon: FileText, label: "Documento" },
	folder: { icon: Folder, label: "Carpeta" },
	briefcase: { icon: Briefcase, label: "Maletín" },
	handshake: { icon: Handshake, label: "Acuerdo" },
	users: { icon: Users, label: "Personas" },
	megaphone: { icon: Megaphone, label: "Megáfono" },
	target: { icon: Target, label: "Objetivo" },
	chart: { icon: BarChart3, label: "Gráfico" },
	wallet: { icon: Wallet, label: "Billetera" },
	calculator: { icon: Calculator, label: "Calculadora" },
	laptop: { icon: Laptop, label: "Computadora" },
	code: { icon: Code, label: "Código" },
	rocket: { icon: Rocket, label: "Cohete" },
	calendar: { icon: CalendarDays, label: "Calendario" },
	mail: { icon: Mail, label: "Correo" },
	building: { icon: Building2, label: "Edificio" },
	shield: { icon: Shield, label: "Escudo" },
	lightbulb: { icon: Lightbulb, label: "Idea" },
	flag: { icon: Flag, label: "Bandera" },
	star: { icon: Star, label: "Estrella" },
	heart: { icon: Heart, label: "Corazón" },
};

/** The project's icon (a board when it has none or an unknown one). */
export function ProjectIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
	const Icon = PROJECT_ICONS[icon ?? ""]?.icon ?? KanbanSquare;
	return <Icon className={className} aria-hidden />;
}

/** Color and icon pickers, used when creating and editing a project. */
export function ProjectLookPicker({
	color,
	icon,
	onColor,
	onIcon,
}: {
	color: string;
	icon: string | null;
	onColor: (c: string) => void;
	onIcon: (i: string) => void;
}) {
	const chosenIcon = icon ?? "board";
	return (
		<>
			<fieldset className="space-y-1.5">
				<legend className="text-sm font-medium">Color</legend>
				<div className="flex flex-wrap gap-2">
					{PROJECT_COLORS.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => onColor(c)}
							aria-label={`Color ${c}`}
							aria-pressed={color === c}
							className={cn(
								"grid size-8 place-items-center rounded-lg text-white ring-offset-2 ring-offset-background transition-shadow",
								color === c && "ring-2 ring-foreground",
							)}
							style={{ backgroundColor: c }}
						>
							{color === c && <Check className="size-4" strokeWidth={3} />}
						</button>
					))}
				</div>
			</fieldset>
			<fieldset className="space-y-1.5">
				<legend className="text-sm font-medium">Ícono</legend>
				<div className="grid grid-cols-8 gap-1.5">
					{Object.entries(PROJECT_ICONS).map(([key, { icon: Icon, label }]) => (
						<button
							key={key}
							type="button"
							onClick={() => onIcon(key)}
							aria-label={label}
							title={label}
							aria-pressed={chosenIcon === key}
							className={cn(
								"grid aspect-square place-items-center rounded-lg border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
								chosenIcon === key && "text-white hover:text-white",
							)}
							style={chosenIcon === key ? { backgroundColor: color } : undefined}
						>
							<Icon className="size-4" />
						</button>
					))}
				</div>
			</fieldset>
		</>
	);
}
