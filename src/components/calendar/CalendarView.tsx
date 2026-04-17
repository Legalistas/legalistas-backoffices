"use client";

import type { EventInput, EventSourceInput } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { CalendarDays, Scale, Users, Video } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CALENDAR_EVENT_BY_ID_ENDPOINT,
	CALENDAR_UNIFIED_ENDPOINT,
	CALENDARS_EVENTS_ENDPOINT,
	LAWYERS_ENDPOINT,
	SETTINGS_HOLIDAY_ENDPOINT,
} from "@/constant/api-endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventModal } from "./EventModal";

// ── Tipos ──────────────────────────────────────────────────────────────────

type EventSource = "calendar" | "cases" | "crm";

interface HolidayApiData {
	id: number;
	title: string;
	date: string;
	createdAt: string;
	updatedAt: string;
}

interface ApiResponse {
	data: HolidayApiData[];
	meta: { total: number; page: number; limit: number; totalPages: number };
}

interface CalendarEvent extends EventInput {
	id?: string;
	title: string;
	start: string | Date;
	end?: string | Date;
	allDay?: boolean;
	className?: string;
	editable?: boolean;
	display?: string;
	color?: string;
	textColor?: string;
	backgroundColor?: string;
	borderColor?: string;
	isHoliday?: boolean;
}

interface Lawyer {
	id: number;
	name: string;
	email?: string;
	image?: string;
}

interface EventModalData {
	id?: string;
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
}

interface CalendarViewProps {
	onNewEvent?: () => void;
	onDebugInfoChange?: (info: string | null) => void;
	triggerNewEvent?: number;
}

// ── Constantes de colores por fuente ─────────────────────────────────────

const SOURCE_COLORS: Record<
	EventSource,
	{ primary: string; label: string; icon: string }
> = {
	calendar: { primary: "#3b82f6", label: "Calendario", icon: "calendar" },
	cases: { primary: "#8b5cf6", label: "Causas", icon: "scale" },
	crm: { primary: "#0d9488", label: "CRM", icon: "users" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateForCalendar(dateStr: string): string {
	if (!dateStr) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
	try {
		return new Date(dateStr).toISOString().split("T")[0];
	} catch {
		return dateStr;
	}
}

// ── Componente ─────────────────────────────────────────────────────────────

const CalendarView = ({
	onDebugInfoChange,
	triggerNewEvent,
}: CalendarViewProps) => {
	const { data: session } = useSession();
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
	const [isLoadingHolidays, setIsLoadingHolidays] = useState(true);
	const [isLoadingEvents, setIsLoadingEvents] = useState(true);
	const [holidaysError, setHolidaysError] = useState<string | null>(null);
	const [eventsError, setEventsError] = useState<string | null>(null);
	const [selectedEvent, setSelectedEvent] = useState<EventModalData | null>(
		null,
	);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isNewEvent, setIsNewEvent] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [holidaysInfo, setHolidaysInfo] = useState<string | null>(null);
	const [lawyers, setLawyers] = useState<Lawyer[]>([]);

	// Filtros por fuente
	const [sourceFilters, setSourceFilters] = useState<
		Record<EventSource, boolean>
	>({
		calendar: true,
		cases: true,
		crm: true,
	});

	const calendarRef = useRef<any>(null);
	const [eventsProcessed, setEventsProcessed] = useState(false);

	const authHeaders = useCallback(
		() => ({
			"Content-Type": "application/json",
			Authorization: `Bearer ${session?.user?.accessToken}`,
		}),
		[session?.user?.accessToken],
	);

	useEffect(() => {
		if (onDebugInfoChange) onDebugInfoChange(holidaysInfo);
	}, [holidaysInfo, onDebugInfoChange]);

	// Abrir modal de nuevo evento cuando el padre incrementa el trigger
	useEffect(() => {
		if (!triggerNewEvent) return;
		const today = new Date();
		const dateStr = today.toISOString().split("T")[0];
		const hh = String(today.getHours()).padStart(2, "0");
		const mm = String(today.getMinutes()).padStart(2, "0");
		setSelectedEvent({
			title: "",
			start: `${dateStr}T${hh}:${mm}`,
			allDay: true,
			color: "#3b82f6",
			source: "calendar",
		});
		setIsNewEvent(true);
		setDialogOpen(true);
	}, [triggerNewEvent]);

	const showError = (message: string) => {
		setErrorMessage(message);
		setTimeout(() => setErrorMessage(null), 3000);
	};

	// ── Verificar festivos ──────────────────────────────────────────────────

	const isHolidayDate = useCallback(
		(dateStr: string): boolean => {
			const formatted = formatDateForCalendar(dateStr);
			return holidays.some((h) => {
				const hDate =
					typeof h.start === "string"
						? formatDateForCalendar(h.start)
						: formatDateForCalendar((h.start as Date).toISOString());
				return hDate === formatted;
			});
		},
		[holidays],
	);

	const validateDate = useCallback(
		(date: string) => !isHolidayDate(date),
		[isHolidayDate],
	);

	const isHolidayEvent = (event: any): boolean => {
		if (event.extendedProps?.isHoliday !== undefined)
			return event.extendedProps.isHoliday;
		if (event.classNames?.includes("holiday-event")) return true;
		if (event.display === "background") return true;
		return false;
	};

	// ── Fetch eventos unificados ─────────────────────────────────────────

	const fetchEvents = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		setIsLoadingEvents(true);
		setEventsError(null);

		try {
			// Intentar endpoint unificado primero, fallback al original
			let apiResponse: any;
			let isUnified = false;

			try {
				const unifiedRes = await fetch(CALENDAR_UNIFIED_ENDPOINT, {
					headers: authHeaders(),
					cache: "no-store",
				});
				if (unifiedRes.ok) {
					apiResponse = await unifiedRes.json();
					isUnified = true;
				}
			} catch {
				// Si falla el unificado, usar el endpoint original
			}

			if (!isUnified) {
				const res = await fetch(CALENDARS_EVENTS_ENDPOINT, {
					headers: authHeaders(),
					cache: "no-store",
				});
				if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
				apiResponse = await res.json();
			}

			if (apiResponse.data && Array.isArray(apiResponse.data)) {
				const formatted: CalendarEvent[] = apiResponse.data.map((ev: any) => {
					const source: EventSource = ev.source || "calendar";
					const color =
						ev.backgroundColor ||
						ev.sourceColor ||
						SOURCE_COLORS[source].primary;
					const stripTZ = (d: string) =>
						d.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
					const startDate = ev.allDay
						? formatDateForCalendar(ev.start)
						: stripTZ(ev.start);
					const endDate = ev.end
						? ev.allDay
							? formatDateForCalendar(ev.end)
							: stripTZ(ev.end)
						: undefined;

					return {
						id: String(ev.id),
						title: ev.title,
						start: startDate,
						end: endDate,
						allDay: ev.allDay ?? true,
						backgroundColor: "transparent",
						borderColor: "transparent",
						textColor: "#ffffff",
						isHoliday: false,
						editable: source === "calendar",
						extendedProps: {
							color,
							source,
							meetLink: ev.meetLink ?? null,
							description: ev.description ?? null,
							responsibleId: ev.responsibleId ?? null,
							responsiblePerson: ev.responsiblePerson ?? null,
							isHoliday: false,
							meta: ev.meta ?? {},
						},
					};
				});

				setEvents(formatted);
				setEventsProcessed(true);

				if (calendarRef.current) {
					const api = calendarRef.current.getApi();
					api.removeAllEvents();
					formatted.forEach((ev) => api.addEvent(ev));
				}
			} else {
				setEventsError("Formato de respuesta inesperado");
			}
		} catch (err) {
			setEventsError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setIsLoadingEvents(false);
		}
	}, [session?.user?.accessToken, authHeaders]);

	// ── Fetch festivos ──────────────────────────────────────────────────────

	const fetchHolidays = useCallback(async () => {
		setIsLoadingHolidays(true);
		setHolidaysError(null);

		try {
			const res = await fetch(SETTINGS_HOLIDAY_ENDPOINT, {
				headers: authHeaders(),
				cache: "no-store",
			});
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

			const apiResponse: ApiResponse = await res.json();
			const formatted: CalendarEvent[] = apiResponse.data
				.filter((h) => h.date)
				.map((h) => ({
					id: String(h.id),
					title: h.title,
					start: formatDateForCalendar(h.date),
					allDay: true,
					className: "holiday-event",
					editable: false,
					display: "background",
					color: "#fecaca",
					textColor: "#b91c1c",
					isHoliday: true,
				}));

			setHolidaysInfo(
				`Días festivos: ${formatted.map((h) => `${h.title}: ${h.start}`).join(", ")}`,
			);
			setHolidays(formatted);
		} catch (err) {
			setHolidaysError(
				err instanceof Error ? err.message : "Error desconocido",
			);
			setHolidays([]);
		} finally {
			setIsLoadingHolidays(false);
		}
	}, [session?.user?.accessToken, authHeaders]);

	const fetchLawyers = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		try {
			const res = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
				headers: authHeaders(),
			});
			if (!res.ok) return;
			const json = await res.json();
			if (json.data && Array.isArray(json.data)) {
				setLawyers(
					json.data.map((l: any) => ({
						id: l.id,
						name: l.name,
						email: l.email,
						image: l.image,
					})),
				);
			}
		} catch {
			// No bloquear el calendario si falla el fetch de abogados
		}
	}, [session?.user?.accessToken, authHeaders]);

	useEffect(() => {
		if (session?.user?.accessToken) {
			fetchHolidays();
			fetchEvents();
			fetchLawyers();
		}
	}, [fetchHolidays, fetchEvents, fetchLawyers, session?.user?.accessToken]);

	// ── Handlers de clic ────────────────────────────────────────────────────

	const handleEventClick = (info: any) => {
		if (isHolidayEvent(info.event)) {
			showError("No se pueden editar los días festivos");
			return;
		}

		const source: EventSource = info.event.extendedProps?.source || "calendar";

		// Eventos de causas y CRM son solo lectura
		if (source !== "calendar") {
			setSelectedEvent({
				id: info.event.id ? String(info.event.id) : undefined,
				title: info.event.title,
				start: info.event.startStr,
				end: info.event.endStr,
				allDay: info.event.allDay,
				meetLink: info.event.extendedProps?.meetLink ?? "",
				description: info.event.extendedProps?.description ?? "",
				color: info.event.extendedProps?.color ?? SOURCE_COLORS[source].primary,
				source,
				sourceMeta: info.event.extendedProps?.meta ?? {},
			});
			setIsNewEvent(false);
			setDialogOpen(true);
			return;
		}

		setSelectedEvent({
			id: info.event.id ? String(info.event.id) : undefined,
			title: info.event.title,
			start: info.event.startStr,
			end: info.event.endStr,
			allDay: info.event.allDay,
			meetLink: info.event.extendedProps?.meetLink ?? "",
			description: info.event.extendedProps?.description ?? "",
			color: info.event.extendedProps?.color ?? "#3b82f6",
			responsibleId: info.event.extendedProps?.responsibleId ?? null,
			responsiblePerson: info.event.extendedProps?.responsiblePerson ?? null,
			source: "calendar",
		});
		setIsNewEvent(false);
		setDialogOpen(true);
	};

	const handleDateClick = (info: any) => {
		if (isHolidayDate(info.dateStr)) {
			showError("No se pueden crear eventos en días festivos");
			return;
		}

		const now = new Date();
		const hh = String(now.getHours()).padStart(2, "0");
		const mm = String(now.getMinutes()).padStart(2, "0");

		setSelectedEvent({
			title: "",
			start: `${info.dateStr}T${hh}:${mm}`,
			allDay: true,
			color: "#3b82f6",
			source: "calendar",
		});
		setIsNewEvent(true);
		setDialogOpen(true);
	};

	const handleSelect = (info: any) => {
		const current = new Date(info.startStr);
		const end = new Date(info.endStr);
		while (current < end) {
			if (isHolidayDate(current.toISOString().split("T")[0])) {
				showError("El rango incluye días festivos");
				return;
			}
			current.setDate(current.getDate() + 1);
		}

		setSelectedEvent({
			title: "",
			start: info.startStr,
			end: info.endStr,
			allDay: info.allDay,
			color: "#3b82f6",
			source: "calendar",
		});
		setIsNewEvent(true);
		setDialogOpen(true);
	};

	// ── Guardar evento (API) ────────────────────────────────────────────────

	const handleSaveEvent = async (updatedEvent: EventModalData) => {
		if (updatedEvent.start && isHolidayDate(updatedEvent.start)) {
			showError("No se pueden guardar eventos en días festivos");
			return;
		}

		const color = updatedEvent.color || "#3b82f6";

		const body = {
			title: updatedEvent.title,
			start: updatedEvent.allDay ? updatedEvent.start : updatedEvent.start,
			end: updatedEvent.end || null,
			allDay: updatedEvent.allDay ?? true,
			backgroundColor: color,
			borderColor: color,
			textColor: "#ffffff",
			meetLink: updatedEvent.meetLink || null,
			description: updatedEvent.description || null,
			responsibleId: updatedEvent.responsibleId || null,
		};

		try {
			let savedId = updatedEvent.id;

			if (isNewEvent) {
				const res = await fetch(CALENDARS_EVENTS_ENDPOINT, {
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify(body),
				});
				if (!res.ok) throw new Error("Error al crear evento");
				const json = await res.json();
				savedId = String(json.data.id);
			} else if (updatedEvent.id) {
				const rawId = updatedEvent.id.replace(/^cal-/, "");
				const res = await fetch(CALENDAR_EVENT_BY_ID_ENDPOINT(rawId), {
					method: "PUT",
					headers: authHeaders(),
					body: JSON.stringify(body),
				});
				if (!res.ok) throw new Error("Error al actualizar evento");
			}

			// Actualizar estado local
			const calendarEvent: CalendarEvent = {
				id: savedId,
				title: updatedEvent.title || "",
				start: updatedEvent.start || "",
				end: updatedEvent.end,
				allDay: updatedEvent.allDay,
				backgroundColor: "transparent",
				borderColor: "transparent",
				textColor: "#ffffff",
				isHoliday: false,
				editable: true,
				extendedProps: {
					color,
					source: "calendar",
					meetLink: updatedEvent.meetLink || null,
					description: updatedEvent.description || null,
					responsibleId: updatedEvent.responsibleId || null,
					responsiblePerson: updatedEvent.responsibleId
						? lawyers.find((l) => l.id === updatedEvent.responsibleId) || null
						: null,
					isHoliday: false,
					meta: {},
				},
			};

			setEvents((prev) =>
				isNewEvent
					? [...prev, calendarEvent]
					: prev.map((e) => (e.id === selectedEvent?.id ? calendarEvent : e)),
			);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Error al guardar evento");
		}

		setDialogOpen(false);
	};

	// ── Eliminar evento (API) ───────────────────────────────────────────────

	const handleDeleteEvent = async () => {
		if (!isNewEvent && selectedEvent?.id) {
			try {
				const rawId = selectedEvent.id.replace(/^cal-/, "");
				const res = await fetch(CALENDAR_EVENT_BY_ID_ENDPOINT(rawId), {
					method: "DELETE",
					headers: authHeaders(),
				});
				if (!res.ok) throw new Error("Error al eliminar evento");
				setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
			} catch (err) {
				showError(
					err instanceof Error ? err.message : "Error al eliminar evento",
				);
			}
		}
		setDialogOpen(false);
	};

	// ── Filtrar eventos por fuente ──────────────────────────────────────────

	const filteredEvents = events.filter((ev) => {
		const source =
			((ev.extendedProps as any)?.source as EventSource) || "calendar";
		return sourceFilters[source];
	});

	const toggleSourceFilter = (source: EventSource) => {
		setSourceFilters((prev) => ({ ...prev, [source]: !prev[source] }));
	};

	// Contar eventos por fuente
	const eventCounts = events.reduce(
		(acc, ev) => {
			const source =
				((ev.extendedProps as any)?.source as EventSource) || "calendar";
			acc[source] = (acc[source] || 0) + 1;
			return acc;
		},
		{} as Record<EventSource, number>,
	);

	// ── Render ──────────────────────────────────────────────────────────────

	const calendarEvents: EventSourceInput = [...filteredEvents, ...holidays];

	const SourceIcon = ({ source }: { source: EventSource }) => {
		const iconClass = "h-3 w-3";
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
		<Card className="w-full h-full p-4">
			{/* Barra de filtros por fuente */}
			<div className="flex items-center gap-2 mb-4 flex-wrap">
				<span className="text-xs font-medium text-muted-foreground mr-1">Fuentes:</span>
				{(Object.keys(SOURCE_COLORS) as EventSource[]).map((source) => {
					const { primary, label } = SOURCE_COLORS[source];
					const isActive = sourceFilters[source];
					const count = eventCounts[source] || 0;
					return (
						<button
							key={source}
							onClick={() => toggleSourceFilter(source)}
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
								isActive ? "shadow-sm" : "opacity-40 grayscale"
							}`}
							style={{
								backgroundColor: isActive ? `${primary}12` : "transparent",
								borderColor: isActive ? `${primary}40` : "#e2e8f0",
								color: isActive ? primary : "#94a3b8",
							}}
						>
							<span
								className="h-2 w-2 rounded-full shrink-0"
								style={{ backgroundColor: isActive ? primary : "#cbd5e1" }}
							/>
							<SourceIcon source={source} />
							<span>{label}</span>
							{count > 0 && (
								<span
									className="ml-0.5 px-1.5 py-0 rounded-full text-[0.65rem] font-semibold"
									style={{
										backgroundColor: isActive ? `${primary}20` : "#f1f5f9",
										color: isActive ? primary : "#94a3b8",
									}}
								>
									{count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Cargando */}
			{(isLoadingEvents || isLoadingHolidays) && (
				<div className="flex items-center gap-2 text-sm py-2 mb-3 px-3 bg-primary/10 text-primary rounded-lg">
					<div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
					Cargando calendario...
				</div>
			)}

			{eventsError && (
				<div className="flex items-center justify-between py-2 mb-3 px-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
					<span>Error al cargar eventos: {eventsError}</span>
					<button
						onClick={fetchEvents}
						className="underline ml-2 hover:text-red-900 dark:hover:text-red-200"
					>
						Reintentar
					</button>
				</div>
			)}

			{holidaysError && (
				<div className="flex items-center justify-between py-2 mb-3 px-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
					<span>Error al cargar días festivos: {holidaysError}</span>
					<button
						onClick={fetchHolidays}
						className="underline ml-2 hover:text-red-900 dark:hover:text-red-200"
					>
						Reintentar
					</button>
				</div>
			)}

			<FullCalendar
				ref={calendarRef}
				plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
				initialView="dayGridMonth"
				headerToolbar={{
					left: "prev,next today",
					center: "title",
					right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
				}}
				buttonText={{
					today: "Hoy",
					month: "Mes",
					week: "Semana",
					day: "Día",
					list: "Agenda",
				}}
				firstDay={0}
				fixedWeekCount={false}
				showNonCurrentDates={false}
				events={calendarEvents}
				selectAllow={(sel) => !isHolidayDate(sel.startStr)}
				editable={true}
				selectable={true}
				eventClick={handleEventClick}
				dateClick={handleDateClick}
				select={handleSelect}
				locales={[esLocale]}
				locale="es"
				timeZone="local"
				displayEventTime={false}
				eventClassNames={(arg) => {
					if (isHolidayEvent(arg.event)) return ["holiday-event"];
					const source = arg.event.extendedProps?.source as EventSource;
					if (source === "cases") return ["fc-custom-event", "fc-source-cases"];
					if (source === "crm") return ["fc-custom-event", "fc-source-crm"];
					return ["fc-custom-event", "fc-source-calendar"];
				}}
				dayCellClassNames={(arg) => {
					const d = arg.date.toISOString().split("T")[0];
					return isHolidayDate(d) ? ["holiday-cell"] : [];
				}}
				eventContent={(eventInfo) => {
					// Festivos — fondo gestionado por FullCalendar (display: background)
					if (isHolidayEvent(eventInfo.event)) {
						return (
							<div
								className="text-xs font-medium text-red-700 dark:text-red-300 truncate w-full px-1"
								title={eventInfo.event.title}
							>
								{eventInfo.event.title}
							</div>
						);
					}

					const { title, start, allDay } = eventInfo.event;
					const source =
						(eventInfo.event.extendedProps?.source as EventSource) ||
						"calendar";
					const color =
						eventInfo.event.extendedProps?.color ||
						SOURCE_COLORS[source].primary;
					const hasMeet = !!eventInfo.event.extendedProps?.meetLink;

					// Vista Agenda
					if (eventInfo.view.type === "listWeek") {
						return (
							<div className="flex items-center gap-2 py-1 w-full">
								<span
									className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-offset-1"
									style={
										{
											backgroundColor: color,
											"--tw-ring-color": `${color}30`,
										} as React.CSSProperties
									}
								/>
								<span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex-1">
									{title}
								</span>
								{source !== "calendar" && (
									<span
										className={`fc-source-badge fc-source-badge--${source}`}
									>
										{SOURCE_COLORS[source].label}
									</span>
								)}
								{hasMeet && (
									<Video className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
								)}
							</div>
						);
					}

					// Todo el día o con hora
					let timeStr = "";
					if (!allDay && start) {
						const d = start as Date;
						let h = d.getHours();
						const minutes = d.getMinutes();
						const ampm = h >= 12 ? "pm" : "am";
						h = h % 12 || 12;
						timeStr = minutes
							? `${h}:${String(minutes).padStart(2, "0")}${ampm}`
							: `${h}${ampm}`;
					}

					return (
						<div
							className="fc-event-row flex items-center gap-1 w-full px-1.5 py-0.5 rounded"
							title={timeStr ? `${timeStr} — ${title}` : title}
						>
							<span
								className="h-2 w-2 rounded-full shrink-0"
								style={{ backgroundColor: color }}
							/>
							<span className="text-xs font-medium truncate flex-1 text-gray-700 dark:text-gray-200">
								{timeStr && (
									<span className="text-gray-400 dark:text-gray-500 mr-1">{timeStr}</span>
								)}
								{title}
							</span>
							{source !== "calendar" && (
								<span className={`fc-source-badge fc-source-badge--${source}`}>
									{source === "cases" ? "C" : "CRM"}
								</span>
							)}
							{hasMeet && (
								<Video className="h-3 w-3 shrink-0 text-emerald-500 opacity-80" />
							)}
						</div>
					);
				}}
				dayMaxEvents={3}
				moreLinkContent={(arg) => (
					<span className="text-xs font-semibold px-1">+{arg.num} más</span>
				)}
				eventDragStart={(info) => {
					if (isHolidayEvent(info.event)) {
						info.jsEvent.preventDefault();
						showError("No se pueden mover los días festivos");
						return false;
					}
					const source = info.event.extendedProps?.source;
					if (source && source !== "calendar") {
						info.jsEvent.preventDefault();
						showError("Solo se pueden mover eventos del calendario");
						return false;
					}
					return true;
				}}
				eventDrop={(info) => {
					if (isHolidayDate(info.event.startStr)) {
						info.revert();
						showError("No se pueden mover eventos a días festivos");
					}
				}}
				datesSet={() => {
					if (eventsProcessed && calendarRef.current) {
						const api = calendarRef.current.getApi();
						api.removeAllEvents();
						filteredEvents.forEach((ev) => api.addEvent(ev));
						holidays.forEach((h) => api.addEvent(h));
					}
				}}
			/>

			<EventModal
				isOpen={dialogOpen}
				onClose={() => setDialogOpen(false)}
				event={selectedEvent}
				onSave={handleSaveEvent}
				onDelete={handleDeleteEvent}
				isNewEvent={isNewEvent}
				validateDate={validateDate}
				lawyers={lawyers}
			/>

			{/* Toast error */}
			{errorMessage && (
				<div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2.5 rounded-lg shadow-lg z-50 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
					<span className="h-2 w-2 rounded-full bg-white/70 shrink-0" />
					{errorMessage}
				</div>
			)}
		</Card>
	);
};

export default CalendarView;
