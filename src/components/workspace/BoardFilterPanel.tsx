"use client";

import {
	CalendarCheck,
	CalendarClock,
	CalendarDays,
	CalendarPlus,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Flag,
	ListFilter,
	Plus,
	UserRound,
	UserRoundPen,
	X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_LABEL } from "@/lib/workspace-api";
import {
	type BoardFilters,
	countFilters,
	DUE_LABEL,
	type DuePreset,
	EMPTY_FILTERS,
	PAST_LABEL,
	type PastPreset,
} from "@/lib/workspace-filters";
import { cn } from "@/lib/utils";
import type { WorkPerson, WorkPriority } from "@/types/workspace";

type RowKey = "completion" | "assignees" | "due" | "creators" | "created" | "updated" | "completed" | "priorities";

const ROWS: { key: RowKey; label: string; icon: typeof Clock }[] = [
	{ key: "completion", label: "Estado de finalización", icon: CheckCircle2 },
	{ key: "assignees", label: "Responsable", icon: UserRound },
	{ key: "due", label: "Fecha de entrega", icon: CalendarDays },
	{ key: "creators", label: "Creador", icon: UserRoundPen },
	{ key: "created", label: "Fecha de creación", icon: CalendarPlus },
	{ key: "updated", label: "Última modificación", icon: Clock },
	{ key: "completed", label: "Fecha de finalización", icon: CalendarCheck },
	{ key: "priorities", label: "Prioridad", icon: Flag },
];

const isSet = (f: BoardFilters, k: RowKey) => {
	const v = f[k];
	return Array.isArray(v) ? v.length > 0 : k === "completion" ? v !== "all" : v !== null;
};

function Chip({
	active,
	icon: Icon,
	children,
	onClick,
	className,
}: {
	active: boolean;
	icon: typeof Clock;
	children: React.ReactNode;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
				active
					? "border-primary/60 bg-primary/10 text-primary"
					: "border-border text-foreground hover:bg-muted",
				className,
			)}
		>
			<Icon className="size-4" />
			{children}
		</button>
	);
}

/** Several people (0 = unassigned when `withNone`), picked from a searchable list. */
function PeoplePicker({
	value,
	people,
	withNone,
	onChange,
}: {
	value: number[];
	people: WorkPerson[];
	withNone?: boolean;
	onChange: (ids: number[]) => void;
}) {
	const options = [...(withNone ? [{ id: 0, name: "Sin asignar", image: null }] : []), ...people];
	const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
	const names = options.filter((p) => value.includes(p.id)).map((p) => p.name ?? "Sin nombre");
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 max-w-64 justify-between gap-2 font-normal">
					<span className="truncate">{names.length ? names.join(", ") : "Elegí personas"}</span>
					<ChevronDown className="size-4 shrink-0 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-72 p-0" align="start">
				<Command>
					<CommandInput placeholder="Buscar persona..." />
					<CommandList>
						<CommandEmpty>Nadie con ese nombre.</CommandEmpty>
						<CommandGroup>
							{options.map((p) => (
								<CommandItem key={p.id} value={`${p.name ?? ""} ${p.id}`} onSelect={() => toggle(p.id)}>
									<Check className={cn("size-4", value.includes(p.id) ? "opacity-100" : "opacity-0")} />
									{p.name ?? "Sin nombre"}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

interface Props {
	filters: BoardFilters;
	onChange: (f: BoardFilters) => void;
	people: WorkPerson[];
}

/** Asana-like "Filtrar": quick filters plus "Agregar filtro" rows. */
export function BoardFilterPanel({ filters: f, onChange, people }: Props) {
	// Rows added from "Agregar filtro" that have no value yet.
	const [pending, setPending] = useState<RowKey[]>([]);
	const set = (patch: Partial<BoardFilters>) => onChange({ ...f, ...patch });
	const rows = ROWS.filter((r) => isSet(f, r.key) || pending.includes(r.key));
	const count = countFilters(f);

	const removeRow = (k: RowKey) => {
		setPending((p) => p.filter((x) => x !== k));
		set({ [k]: EMPTY_FILTERS[k] } as Partial<BoardFilters>);
	};

	const control = (k: RowKey) => {
		switch (k) {
			case "completion":
				return (
					<Select value={f.completion} onValueChange={(v) => set({ completion: v as BoardFilters["completion"] })}>
						<SelectTrigger size="sm" className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="open">Sin finalizar</SelectItem>
							<SelectItem value="done">Finalizadas</SelectItem>
							<SelectItem value="all">Todas</SelectItem>
						</SelectContent>
					</Select>
				);
			case "assignees":
				return <PeoplePicker value={f.assignees} people={people} withNone onChange={(assignees) => set({ assignees })} />;
			case "creators":
				return <PeoplePicker value={f.creators} people={people} onChange={(creators) => set({ creators })} />;
			case "due":
				return (
					<Select value={f.due ?? undefined} onValueChange={(v) => set({ due: v as DuePreset })}>
						<SelectTrigger size="sm" className="w-48">
							<SelectValue placeholder="Elegí cuándo" />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(DUE_LABEL) as DuePreset[]).map((d) => (
								<SelectItem key={d} value={d}>
									{DUE_LABEL[d]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			case "created":
			case "updated":
			case "completed":
				return (
					<Select value={f[k] ?? undefined} onValueChange={(v) => set({ [k]: v as PastPreset })}>
						<SelectTrigger size="sm" className="w-56">
							<SelectValue placeholder="Elegí cuándo" />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(PAST_LABEL) as PastPreset[]).map((d) => (
								<SelectItem key={d} value={d}>
									{PAST_LABEL[d]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			case "priorities":
				return (
					<div className="flex flex-wrap gap-1.5">
						{(Object.keys(PRIORITY_LABEL) as WorkPriority[]).map((p) => {
							const on = f.priorities.includes(p);
							return (
								<button
									key={p}
									type="button"
									aria-pressed={on}
									onClick={() =>
										set({ priorities: on ? f.priorities.filter((x) => x !== p) : [...f.priorities, p] })
									}
									className={cn(
										"h-7 rounded-md border px-2 text-xs",
										on ? "border-primary/60 bg-primary/10 text-primary" : "border-border hover:bg-muted",
									)}
								>
									{PRIORITY_LABEL[p]}
								</button>
							);
						})}
					</div>
				);
		}
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className={cn("h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground", count > 0 && "text-primary")}
				>
					<ListFilter className="size-4" />
					Filtrar{count > 0 ? ` (${count})` : ""}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[min(40rem,calc(100vw-2rem))] p-0">
				<div className="flex items-center justify-between px-5 pt-4">
					<h2 className="text-base font-semibold">Filtros</h2>
					<button
						type="button"
						disabled={count === 0 && pending.length === 0}
						onClick={() => {
							setPending([]);
							onChange(EMPTY_FILTERS);
						}}
						className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
					>
						Borrar
					</button>
				</div>

				<div className="space-y-2 px-5 pt-3">
					<p className="text-xs font-medium text-muted-foreground">Filtros rápidos</p>
					<div className="flex flex-wrap gap-2">
						<Chip
							icon={CheckCircle2}
							active={f.completion === "open"}
							onClick={() => set({ completion: f.completion === "open" ? "all" : "open", completed: null })}
						>
							Tareas sin finalizar
						</Chip>
						<span className="inline-flex">
							<Chip
								icon={CheckCircle2}
								active={f.completion === "done"}
								className="rounded-r-none"
								onClick={() =>
									set(f.completion === "done" ? { completion: "all", completed: null } : { completion: "done" })
								}
							>
								Tareas finalizadas{f.completion === "done" && f.completed ? ` · ${PAST_LABEL[f.completed]}` : ""}
							</Chip>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										aria-label="Cuándo se finalizaron"
										className={cn(
											"inline-flex h-8 items-center rounded-r-full border border-l-0 px-2",
											f.completion === "done"
												? "border-primary/60 bg-primary/10 text-primary"
												: "border-border hover:bg-muted",
										)}
									>
										<ChevronDown className="size-4" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onSelect={() => set({ completion: "done", completed: null })}>
										Todas las finalizadas
									</DropdownMenuItem>
									{(Object.keys(PAST_LABEL) as PastPreset[]).map((d) => (
										<DropdownMenuItem key={d} onSelect={() => set({ completion: "done", completed: d })}>
											Finalizadas {PAST_LABEL[d].toLowerCase()}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</span>
						<Chip icon={UserRound} active={f.mine} onClick={() => set({ mine: !f.mine })}>
							Solo mis tareas
						</Chip>
						<Chip
							icon={CalendarClock}
							active={f.due === "thisWeek"}
							onClick={() => set({ due: f.due === "thisWeek" ? null : "thisWeek" })}
						>
							Para entregar esta semana
						</Chip>
						<Chip
							icon={CalendarDays}
							active={f.due === "nextWeek"}
							onClick={() => set({ due: f.due === "nextWeek" ? null : "nextWeek" })}
						>
							Para entregar la próxima semana
						</Chip>
					</div>
				</div>

				{rows.length > 0 && (
					<ul className="mt-4 space-y-2 border-t border-border px-5 pt-4">
						{rows.map(({ key, label, icon: Icon }) => (
							<li key={key} className="flex flex-wrap items-center gap-3">
								<span className="flex w-44 items-center gap-2 text-sm">
									<Icon className="size-4 text-muted-foreground" />
									{label}
								</span>
								<div className="min-w-0 flex-1">{control(key)}</div>
								<Button
									variant="ghost"
									size="icon"
									className="size-8 text-muted-foreground"
									aria-label={`Quitar el filtro ${label}`}
									onClick={() => removeRow(key)}
								>
									<X className="size-4" />
								</Button>
							</li>
						))}
					</ul>
				)}

				<div className="px-3 py-3">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
								<Plus className="size-4" />
								Agregar filtro
								<ChevronDown className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-60">
							{ROWS.filter((r) => !rows.some((x) => x.key === r.key)).map(({ key, label, icon: Icon }) => (
								<DropdownMenuItem key={key} onSelect={() => setPending((p) => [...p, key])}>
									<Icon className="size-4" />
									{label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</PopoverContent>
		</Popover>
	);
}
