"use client";

import {
	CalendarDays,
	Check,
	ChevronsUpDown,
	ExternalLink,
	Info,
	MapPin,
	Scale,
	UserCircle,
	Users,
	Video,
} from "lucide-react";

import type React from "react";
import { useEffect, useState } from "react";
import { toDateTimeLocalFormat } from "@/constant/calendar";
import { Button } from "@/components/ui/button";
import { DateTimeQuarterInput } from "@/components/ui/datetime-quarter-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type EventSource = "calendar" | "cases" | "crm";

const EVENT_COLORS = [
	{ label: "Azul", value: "#3b82f6" },
	{ label: "Verde", value: "#10b981" },
	{ label: "Morado", value: "#8b5cf6" },
	{ label: "Rojo", value: "#ef4444" },
	{ label: "Naranja", value: "#f97316" },
	{ label: "Amarillo", value: "#f59e0b" },
	{ label: "Rosa", value: "#ec4899" },
	{ label: "Gris", value: "#6b7280" },
];

const SOURCE_INFO: Record<
	EventSource,
	{ label: string; color: string }
> = {
	calendar: { label: "Evento del Calendario", color: "#3b82f6" },
	cases: { label: "Evento de Causa Legal", color: "#7c3aed" },
	crm: { label: "Reunión CRM", color: "#0d9488" },
};

const CASE_EVENT_TYPES: Record<number, string> = {
	1: "Audiencia",
	2: "Pericia",
};
const CASE_AUDIENCIA_SUBTYPES: Record<number, string> = {
	1: "Homologación",
	2: "Trámite",
	3: "AVC",
	4: "Ratificación",
	5: "Testimonial",
	6: "Confesional",
	7: "Reconocimiento",
};
const CASE_PERICIA_SUBTYPES: Record<number, string> = {
	1: "Pericia SRT",
	2: "JPM (Privada)",
	3: "Oficial (Judicial)",
	4: "Psicológica",
	5: "Otras",
};

interface Lawyer {
	id: number;
	name: string;
	email?: string;
	image?: string;
}

interface EventModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (eventData: any) => void;
	onDelete?: () => void;
	isNewEvent?: boolean;
	validateDate?: (date: string) => boolean;
	lawyers?: Lawyer[];
	event: {
		title?: string;
		start?: string;
		end?: string;
		allDay?: boolean;
		meetLink?: string;
		description?: string;
		color?: string;
		responsibleId?: number | null;
		responsiblePerson?: Lawyer | null;
		source?: EventSource;
		sourceMeta?: Record<string, any>;
	} | null;
}

export const EventModal = ({
	isOpen,
	onClose,
	onSave,
	onDelete,
	event,
	isNewEvent = false,
	validateDate = () => true,
	lawyers = [],
}: EventModalProps) => {
	const [title, setTitle] = useState("");
	const [start, setStart] = useState("");
	const [end, setEnd] = useState("");
	const [allDay, setAllDay] = useState(true);
	const [dateError, setDateError] = useState<string | null>(null);
	const [meetLink, setMeetLink] = useState("");
	const [description, setDescription] = useState("");
	const [color, setColor] = useState("#3b82f6");
	const [responsibleId, setResponsibleId] = useState<number | null>(null);

	const source: EventSource = event?.source || "calendar";
	const isReadOnly = source !== "calendar" && !isNewEvent;
	const sourceInfo = SOURCE_INFO[source];

	useEffect(() => {
		if (event) {
			setTitle(event.title || "");
			setMeetLink(event.meetLink || "");
			setDescription(event.description || "");
			setColor(event.color || "#3b82f6");
			setResponsibleId(event.responsibleId ?? null);

			if (event.start) {
				const startDateTime = toDateTimeLocalFormat(
					typeof event.start === "string" ? event.start : String(event.start),
				);
				setStart(startDateTime);
				setDateError(
					!validateDate(event.start)
						? "Esta fecha corresponde a un día festivo"
						: null,
				);
			} else {
				setStart("");
				setDateError(null);
			}

			if (event.end) {
				setEnd(
					toDateTimeLocalFormat(
						typeof event.end === "string" ? event.end : String(event.end),
					),
				);
			} else {
				setEnd("");
			}

			setAllDay(event.allDay !== undefined ? event.allDay : true);
		} else {
			setTitle("");
			setStart("");
			setEnd("");
			setAllDay(true);
			setDateError(null);
			setMeetLink("");
			setDescription("");
			setColor("#3b82f6");
			setResponsibleId(null);
		}
	}, [event, validateDate]);

	const handleStartChange = (newDate: string) => {
		setStart(newDate);
		const dateOnly = newDate.split("T")[0];
		setDateError(
			!validateDate(dateOnly)
				? "Esta fecha corresponde a un día festivo"
				: null,
		);
	};

	const handleSubmit = () => {
		if (!title || !start) return;
		const dateOnly = start.split("T")[0];
		if (!validateDate(dateOnly)) {
			setDateError("No se puede guardar en un día festivo");
			return;
		}
		onSave({
			title,
			start: allDay ? start.split("T")[0] : start,
			end: end ? (allDay ? end.split("T")[0] : end) : undefined,
			allDay,
			meetLink: meetLink.trim() || undefined,
			description: description.trim() || undefined,
			color,
			responsibleId: responsibleId || undefined,
		});
	};

	const isSaveDisabled = !title || !start || !!dateError;

	const meta = event?.sourceMeta || {};
	const caseEventType = meta.type ? CASE_EVENT_TYPES[meta.type] : null;
	const caseEventSubType =
		meta.type === 1
			? CASE_AUDIENCIA_SUBTYPES[meta.subType]
			: meta.type === 2
				? CASE_PERICIA_SUBTYPES[meta.subType]
				: null;

	const SourceIcon = () => {
		const iconClass = "h-4 w-4";
		switch (source) {
			case "cases":
				return <Scale className={iconClass} />;
			case "crm":
				return <Users className={iconClass} />;
			default:
				return <CalendarDays className={iconClass} />;
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-xl">
				{/* Source badge */}
				{source !== "calendar" && (
					<div
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
						style={{ backgroundColor: `${sourceInfo.color}15`, color: sourceInfo.color }}
					>
						<SourceIcon />
						<span>{sourceInfo.label}</span>
						{isReadOnly && (
							<span className="ml-auto text-xs opacity-70 flex items-center gap-1">
								<Info className="h-3 w-3" />
								Solo lectura
							</span>
						)}
					</div>
				)}

				<DialogHeader>
					<DialogTitle className="flex items-center gap-3">
						<div
							className="h-4 w-4 rounded-full shrink-0 ring-2 ring-offset-1"
							style={{
								backgroundColor: isReadOnly ? sourceInfo.color : color,
								"--tw-ring-color": `${isReadOnly ? sourceInfo.color : color}30`,
							} as React.CSSProperties}
						/>
						{isNewEvent
							? "Crear Nuevo Evento"
							: isReadOnly
								? "Detalle del Evento"
								: "Editar Evento"}
					</DialogTitle>
					<DialogDescription className="sr-only">Formulario de evento del calendario</DialogDescription>
				</DialogHeader>

				{/* Case meta info */}
				{source === "cases" && (caseEventType || meta.status || meta.location) && (
					<div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg space-y-1.5">
						{caseEventType && (
							<div className="flex items-center gap-2 text-sm">
								<span className="font-medium text-violet-700 dark:text-violet-300">Tipo:</span>
								<span className="text-violet-600 dark:text-violet-400">
									{caseEventType}{caseEventSubType ? ` — ${caseEventSubType}` : ""}
								</span>
							</div>
						)}
						{meta.status && (
							<div className="flex items-center gap-2 text-sm">
								<span className="font-medium text-violet-700 dark:text-violet-300">Estado:</span>
								<span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-muted text-muted-foreground">
									{meta.status}
								</span>
							</div>
						)}
						{meta.location && (
							<div className="flex items-center gap-2 text-sm">
								<MapPin className="h-3.5 w-3.5 text-violet-500" />
								<span className="text-violet-600 dark:text-violet-400">{meta.location}</span>
							</div>
						)}
					</div>
				)}

				{source === "crm" && (meta.type || meta.note) && (
					<div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg space-y-1.5">
						{meta.type && (
							<div className="flex items-center gap-2 text-sm">
								<span className="font-medium text-teal-700 dark:text-teal-300">Tipo:</span>
								<span className="text-teal-600 dark:text-teal-400">{meta.type}</span>
							</div>
						)}
						{meta.note && (
							<div className="text-sm text-teal-600 dark:text-teal-400">{meta.note}</div>
						)}
					</div>
				)}

				<div className="space-y-4">
					{/* Title */}
					<div className="space-y-2">
						<Label>
							Título {!isReadOnly && <span className="text-red-500">*</span>}
						</Label>
						{isReadOnly ? (
							<p className="text-sm font-medium py-2">{title || "—"}</p>
						) : (
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Título del evento"
							/>
						)}
					</div>

					{/* Color picker */}
					{!isReadOnly && (
						<div className="space-y-2">
							<Label>Color del evento</Label>
							<div className="flex gap-2 flex-wrap">
								{EVENT_COLORS.map((c) => (
									<button
										key={c.value}
										type="button"
										onClick={() => setColor(c.value)}
										className={`h-7 w-7 rounded-full transition-all duration-200 hover:scale-110 ${
											color === c.value
												? "ring-2 ring-offset-2 ring-ring scale-110"
												: ""
										}`}
										style={{ backgroundColor: c.value }}
										title={c.label}
									/>
								))}
							</div>
						</div>
					)}

					{/* Start date */}
					<div className="space-y-2">
						<Label>
							Fecha y hora de inicio{" "}
							{!isReadOnly && <span className="text-red-500">*</span>}
						</Label>
						{isReadOnly ? (
							<p className="text-sm text-muted-foreground py-2">
								{start
									? new Date(start).toLocaleString("es-AR", {
											dateStyle: "long",
											...(allDay ? {} : { timeStyle: "short" }),
										})
									: "—"}
							</p>
						) : (
							<>
								{allDay ? (
									<Input
										type="date"
										value={start.split("T")[0]}
										onChange={(e) => handleStartChange(e.target.value)}
										className={dateError ? "border-red-500 focus-visible:ring-red-500" : ""}
									/>
								) : (
									<DateTimeQuarterInput
										value={start}
										onChange={handleStartChange}
										className={dateError ? "[&_input]:border-red-500" : ""}
									/>
								)}
								{dateError && (
									<p className="text-red-500 text-xs">{dateError}</p>
								)}
							</>
						)}
					</div>

					{/* End date */}
					{!allDay && !isReadOnly && (
						<div className="space-y-2">
							<Label>Fecha y hora de fin (opcional)</Label>
							<DateTimeQuarterInput value={end} onChange={setEnd} />
						</div>
					)}

					{/* All day */}
					{!isReadOnly && (
						<div className="flex items-center space-x-2">
							<Checkbox
								id="allDay"
								checked={allDay}
								onCheckedChange={(checked) => {
									const val = checked === true;
									setAllDay(val);
									if (val) {
										if (start) setStart(start.split("T")[0]);
										if (end) setEnd(end.split("T")[0]);
									}
								}}
							/>
							<Label htmlFor="allDay" className="cursor-pointer">
								Todo el día
							</Label>
						</div>
					)}

					{/* Meet link */}
					{(meetLink || !isReadOnly) && (
						<div className="space-y-2">
							<Label className="flex items-center gap-1.5">
								<Video className="h-4 w-4 text-emerald-500" />
								Enlace de reunión {!isReadOnly && "(opcional)"}
							</Label>
							{isReadOnly ? (
								meetLink ? (
									<a
										href={meetLink}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
									>
										<Video className="h-3.5 w-3.5" />
										Unirse a la reunión
										<ExternalLink className="h-3 w-3" />
									</a>
								) : null
							) : (
								<div className="flex gap-2">
									<Input
										type="url"
										value={meetLink}
										onChange={(e) => setMeetLink(e.target.value)}
										placeholder="https://meet.google.com/..."
										className="flex-1"
									/>
									{meetLink.trim() && (
										<a
											href={meetLink}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
										>
											<ExternalLink className="h-3.5 w-3.5" />
											Unirse
										</a>
									)}
								</div>
							)}
						</div>
					)}

					{/* Responsible */}
					{!isReadOnly && lawyers.length > 0 && (
						<LawyerCombobox
							lawyers={lawyers}
							value={responsibleId}
							onChange={setResponsibleId}
						/>
					)}
					{isReadOnly && event?.responsiblePerson && (
						<div className="space-y-2">
							<Label className="flex items-center gap-1.5">
								<UserCircle className="h-4 w-4 text-blue-500" />
								Responsable
							</Label>
							<p className="text-sm font-medium py-2">
								{event.responsiblePerson.name}
							</p>
						</div>
					)}

					{/* Description */}
					{(description || !isReadOnly) && (
						<div className="space-y-2">
							<Label>Descripción {!isReadOnly && "(opcional)"}</Label>
							{isReadOnly ? (
								<p className="text-sm text-muted-foreground whitespace-pre-wrap">
									{description || "Sin descripción"}
								</p>
							) : (
								<Textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Agregar una descripción..."
									rows={3}
								/>
							)}
						</div>
					)}
				</div>

				<DialogFooter>
					{isReadOnly ? (
						<Button variant="outline" onClick={onClose}>
							Cerrar
						</Button>
					) : (
						<>
							{!isNewEvent && onDelete && (
								<Button
									variant="outline"
									className="mr-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20"
									onClick={onDelete}
								>
									Eliminar
								</Button>
							)}
							<Button variant="outline" onClick={onClose}>
								Cancelar
							</Button>
							<Button onClick={handleSubmit} disabled={isSaveDisabled}>
								Guardar
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

// --- Combobox con búsqueda para responsable ---

function LawyerCombobox({
	lawyers,
	value,
	onChange,
}: {
	lawyers: Lawyer[];
	value: number | null;
	onChange: (id: number | null) => void;
}) {
	const [open, setOpen] = useState(false);
	const selectedName = lawyers.find((l) => l.id === value)?.name;

	return (
		<div className="space-y-2">
			<Label className="flex items-center gap-1.5">
				<UserCircle className="h-4 w-4 text-blue-500" />
				Responsable (opcional)
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-full justify-between font-normal"
					>
						<span className="truncate">
							{selectedName || "Sin asignar"}
						</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
					<Command>
						<CommandInput placeholder="Buscar responsable..." />
						<CommandList>
							<CommandEmpty>Sin resultados.</CommandEmpty>
							<CommandGroup>
								<CommandItem
									value="__none__"
									onSelect={() => {
										onChange(null);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === null ? "opacity-100" : "opacity-0",
										)}
									/>
									Sin asignar
								</CommandItem>
								{lawyers.map((l) => (
									<CommandItem
										key={l.id}
										value={l.name}
										onSelect={() => {
											onChange(l.id === value ? null : l.id);
											setOpen(false);
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												value === l.id ? "opacity-100" : "opacity-0",
											)}
										/>
										{l.name}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
