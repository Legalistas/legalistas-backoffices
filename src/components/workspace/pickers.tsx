"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { PRIORITY_LABEL } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkPerson, WorkPriority } from "@/types/workspace";

/**
 * Picker bodies (no Popover around them), so the same list works in the
 * composer, on a card on hover and inside "Agregar campo".
 */

export function PeopleList({
	people,
	selected,
	onPick,
}: {
	people: WorkPerson[];
	selected: number[];
	onPick: (p: WorkPerson) => void;
}) {
	return (
		<Command>
			<CommandInput placeholder="Responsable..." />
			<CommandList>
				<CommandEmpty>Nadie con ese nombre.</CommandEmpty>
				<CommandGroup>
					{people.map((p) => (
						<CommandItem key={p.id} value={`${p.name ?? ""} ${p.id}`} onSelect={() => onPick(p)}>
							<Check className={cn("size-4", selected.includes(p.id) ? "opacity-100" : "opacity-0")} />
							{p.name ?? "Sin nombre"}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

/** Calendar for a due date ("YYYY-MM-DD"); null clears it. */
export function DueCalendar({ value, onPick }: { value: string | null; onPick: (day: string | null) => void }) {
	return (
		<div>
			<Calendar
				mode="single"
				locale={es}
				selected={value ? new Date(`${value}T12:00:00`) : undefined}
				onSelect={(d) => onPick(d ? format(d, "yyyy-MM-dd") : null)}
			/>
			{value && (
				<button
					type="button"
					onClick={() => onPick(null)}
					className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-xs text-muted-foreground hover:text-foreground"
				>
					<X className="size-3.5" />
					Quitar la fecha
				</button>
			)}
		</div>
	);
}

export function PriorityList({ value, onPick }: { value: WorkPriority; onPick: (p: WorkPriority) => void }) {
	return (
		<ul className="py-1">
			{(Object.keys(PRIORITY_LABEL) as WorkPriority[]).map((p) => (
				<li key={p}>
					<button
						type="button"
						onClick={() => onPick(p)}
						className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
					>
						<Check className={cn("size-4", value === p ? "opacity-100" : "opacity-0")} />
						{PRIORITY_LABEL[p]}
					</button>
				</li>
			))}
		</ul>
	);
}
