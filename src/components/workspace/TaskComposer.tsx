"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Check, UserRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Calendar } from "@/components/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay } from "@/lib/workspace-api";
import type { WorkPerson } from "@/types/workspace";

export interface NewTaskInput {
	title: string;
	assigneeIds?: number[];
	/** "YYYY-MM-DD". */
	dueDate?: string;
}

interface Props {
	people: WorkPerson[];
	onCreate: (input: NewTaskInput) => Promise<void>;
	onClose: () => void;
}

const dashed =
	"grid size-7 place-items-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-foreground/60 hover:text-foreground";

/** Card-shaped composer (like Asana's): name, assignee and due date. Enter creates and stays open. */
export function TaskComposer({ people, onCreate, onClose }: Props) {
	const [title, setTitle] = useState("");
	const [assignee, setAssignee] = useState<WorkPerson | null>(null);
	const [due, setDue] = useState<string>("");
	const [busy, setBusy] = useState(false);
	// A picker is open (its content is portaled): losing focus to it must not close the composer.
	const [picking, setPicking] = useState<"assignee" | "due" | null>(null);
	const box = useRef<HTMLDivElement>(null);
	const input = useRef<HTMLInputElement>(null);

	const submit = async () => {
		const t = title.trim();
		if (!t || busy) return;
		setBusy(true);
		await onCreate({
			title: t,
			...(assignee ? { assigneeIds: [assignee.id] } : {}),
			...(due ? { dueDate: due } : {}),
		});
		setBusy(false);
		setTitle("");
		setAssignee(null);
		setDue("");
		input.current?.focus();
	};

	return (
		<div
			ref={box}
			onBlur={(e) => {
				if (picking || box.current?.contains(e.relatedTarget as Node | null)) return;
				if (!title.trim()) onClose();
			}}
			className="rounded-xl border border-board-card-hover bg-board-card p-3.5 shadow-[0_6px_16px_-8px_rgba(15,23,42,0.3)]"
		>
			<div className="flex items-start gap-2.5">
				<span
					className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full border border-muted-foreground/50 text-muted-foreground/60"
					aria-hidden
				>
					<Check className="size-3" strokeWidth={3} />
				</span>
				<input
					ref={input}
					autoFocus
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							submit();
						}
						if (e.key === "Escape") onClose();
					}}
					placeholder="Escribe el nombre de la tarea"
					aria-label="Nombre de la tarea nueva"
					className="w-full bg-transparent text-sm leading-snug outline-none placeholder:text-muted-foreground"
				/>
			</div>
			<div className="mt-3 flex items-center gap-2 pl-6.5">
				<Popover open={picking === "assignee"} onOpenChange={(o) => setPicking(o ? "assignee" : null)}>
					<PopoverTrigger asChild>
						<button type="button" aria-label="Responsable" title="Responsable" className={assignee ? "rounded-full" : dashed}>
							{assignee ? (
								<GroupAvatar size="sm" users={[{ name: assignee.name ?? undefined, image: assignee.image ?? undefined }]} />
							) : (
								<UserRound className="size-3.5" />
							)}
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-64 p-0" align="start">
						<Command>
							<CommandInput placeholder="Responsable..." />
							<CommandList>
								<CommandEmpty>Nadie con ese nombre.</CommandEmpty>
								<CommandGroup>
									{people.map((p) => (
										<CommandItem
											key={p.id}
											value={`${p.name ?? ""} ${p.id}`}
											onSelect={() => {
												setAssignee(assignee?.id === p.id ? null : p);
												setPicking(null);
												input.current?.focus();
											}}
										>
											<Check className={assignee?.id === p.id ? "size-4" : "size-4 opacity-0"} />
											{p.name ?? "Sin nombre"}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				<Popover open={picking === "due"} onOpenChange={(o) => setPicking(o ? "due" : null)}>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label="Fecha de entrega"
							title="Fecha de entrega"
							className={
								due
									? "inline-flex h-7 items-center gap-1 rounded-full border border-border px-2 text-xs tabular-nums text-foreground"
									: dashed
							}
						>
							<CalendarDays className="size-3.5" />
							{due && formatDay(`${due}T00:00:00.000Z`)}
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							locale={es}
							selected={due ? new Date(`${due}T12:00:00`) : undefined}
							onSelect={(d) => {
								setDue(d ? format(d, "yyyy-MM-dd") : "");
								setPicking(null);
								input.current?.focus();
							}}
						/>
					</PopoverContent>
				</Popover>

				{due && (
					<button
						type="button"
						aria-label="Quitar la fecha"
						onClick={() => setDue("")}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="size-3.5" />
					</button>
				)}
				<span className="ml-auto text-[11px] text-muted-foreground">Enter para crear</span>
			</div>
		</div>
	);
}
