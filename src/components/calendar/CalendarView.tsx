"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import esLocale from "@fullcalendar/core/locales/es"
import { Card } from "../ui/card/Card"
import { formatTime } from "@/constant/calendar"
import { EventModal } from "./EventModal"
import {
    CALENDARS_EVENTS_ENDPOINT,
    CALENDAR_EVENT_BY_ID_ENDPOINT,
    SETTINGS_HOLIDAY_ENDPOINT,
} from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import type { EventInput, EventSourceInput } from "@fullcalendar/core"
import { Video } from "lucide-react"

// ── Tipos ──────────────────────────────────────────────────────────────────

interface HolidayApiData {
    id: number
    title: string
    date: string
    createdAt: string
    updatedAt: string
}

interface ApiResponse {
    data: HolidayApiData[]
    meta: { total: number; page: number; limit: number; totalPages: number }
}

interface CalendarEvent extends EventInput {
    id?: string
    title: string
    start: string | Date
    end?: string | Date
    allDay?: boolean
    className?: string
    editable?: boolean
    display?: string
    color?: string
    textColor?: string
    backgroundColor?: string
    borderColor?: string
    isHoliday?: boolean
}

interface EventModalData {
    id?: string
    title?: string
    start?: string
    end?: string
    allDay?: boolean
    meetLink?: string
    description?: string
    color?: string
}

interface CalendarViewProps {
    onNewEvent?: () => void
    onDebugInfoChange?: (info: string | null) => void
    triggerNewEvent?: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateForCalendar(dateStr: string): string {
    if (!dateStr) return ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    try {
        return new Date(dateStr).toISOString().split("T")[0]
    } catch {
        return dateStr
    }
}

// ── Componente ─────────────────────────────────────────────────────────────

const CalendarView = ({ onDebugInfoChange, triggerNewEvent }: CalendarViewProps) => {
    const { data: session } = useSession()
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [holidays, setHolidays] = useState<CalendarEvent[]>([])
    const [isLoadingHolidays, setIsLoadingHolidays] = useState(true)
    const [isLoadingEvents, setIsLoadingEvents] = useState(true)
    const [holidaysError, setHolidaysError] = useState<string | null>(null)
    const [eventsError, setEventsError] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<EventModalData | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isNewEvent, setIsNewEvent] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [holidaysInfo, setHolidaysInfo] = useState<string | null>(null)

    const calendarRef = useRef<any>(null)
    const [eventsProcessed, setEventsProcessed] = useState(false)

    const authHeaders = useCallback(
        () => ({
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
        }),
        [session?.user?.accessToken]
    )

    useEffect(() => {
        if (onDebugInfoChange) onDebugInfoChange(holidaysInfo)
    }, [holidaysInfo, onDebugInfoChange])

    // Abrir modal de nuevo evento cuando el padre incrementa el trigger
    useEffect(() => {
        if (!triggerNewEvent) return
        const today = new Date()
        const dateStr = today.toISOString().split("T")[0]
        const hh = String(today.getHours()).padStart(2, "0")
        const mm = String(today.getMinutes()).padStart(2, "0")
        setSelectedEvent({
            title: "",
            start: `${dateStr}T${hh}:${mm}`,
            allDay: true,
            color: "#3b82f6",
        })
        setIsNewEvent(true)
        setDialogOpen(true)
    }, [triggerNewEvent])

    const showError = (message: string) => {
        setErrorMessage(message)
        setTimeout(() => setErrorMessage(null), 3000)
    }

    // ── Verificar festivos ──────────────────────────────────────────────────

    const isHolidayDate = useCallback(
        (dateStr: string): boolean => {
            const formatted = formatDateForCalendar(dateStr)
            return holidays.some((h) => {
                const hDate =
                    typeof h.start === "string"
                        ? formatDateForCalendar(h.start)
                        : formatDateForCalendar((h.start as Date).toISOString())
                return hDate === formatted
            })
        },
        [holidays]
    )

    const isHolidayEvent = (event: any): boolean => {
        if (event.extendedProps?.isHoliday !== undefined) return event.extendedProps.isHoliday
        if (event.classNames?.includes("holiday-event")) return true
        if (event.display === "background") return true
        return false
    }

    // ── Fetch eventos ───────────────────────────────────────────────────────

    const fetchEvents = useCallback(async () => {
        if (!session?.user?.accessToken) return
        setIsLoadingEvents(true)
        setEventsError(null)

        try {
            const res = await fetch(CALENDARS_EVENTS_ENDPOINT, {
                headers: authHeaders(),
                cache: "no-store",
            })
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

            const apiResponse = await res.json()

            if (apiResponse.data && Array.isArray(apiResponse.data)) {
                const formatted: CalendarEvent[] = apiResponse.data.map((ev: any) => {
                    const color = ev.backgroundColor || "#3b82f6"
                    // Quitar Z/offset para que FullCalendar trate las horas como locales
                    const stripTZ = (d: string) => d.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "")
                    const startDate = ev.allDay
                        ? formatDateForCalendar(ev.start)
                        : stripTZ(ev.start)
                    const endDate = ev.end
                        ? ev.allDay
                            ? formatDateForCalendar(ev.end)
                            : stripTZ(ev.end)
                        : undefined

                    return {
                        id: String(ev.id),
                        title: ev.title,
                        start: startDate,
                        end: endDate,
                        allDay: ev.allDay ?? true,
                        // Fondo transparente → el eventContent controla el color
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                        textColor: ev.textColor || "#ffffff",
                        isHoliday: false,
                        editable: true,
                        extendedProps: {
                            color,
                            meetLink: ev.meetLink ?? null,
                            description: ev.description ?? null,
                            isHoliday: false,
                        },
                    }
                })

                setEvents(formatted)
                setEventsProcessed(true)

                if (calendarRef.current) {
                    const api = calendarRef.current.getApi()
                    api.removeAllEvents()
                    formatted.forEach((ev) => api.addEvent(ev))
                }
            } else {
                setEventsError("Formato de respuesta inesperado")
            }
        } catch (err) {
            setEventsError(err instanceof Error ? err.message : "Error desconocido")
        } finally {
            setIsLoadingEvents(false)
        }
    }, [session?.user?.accessToken, authHeaders])

    // ── Fetch festivos ──────────────────────────────────────────────────────

    const fetchHolidays = useCallback(async () => {
        setIsLoadingHolidays(true)
        setHolidaysError(null)

        try {
            const res = await fetch(SETTINGS_HOLIDAY_ENDPOINT, {
                headers: authHeaders(),
                cache: "no-store",
            })
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

            const apiResponse: ApiResponse = await res.json()
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
                }))

            setHolidaysInfo(
                `Días festivos: ${formatted.map((h) => `${h.title}: ${h.start}`).join(", ")}`
            )
            setHolidays(formatted)
        } catch (err) {
            setHolidaysError(err instanceof Error ? err.message : "Error desconocido")
            setHolidays([])
        } finally {
            setIsLoadingHolidays(false)
        }
    }, [session?.user?.accessToken, authHeaders])

    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchHolidays()
            fetchEvents()
        }
    }, [fetchHolidays, fetchEvents, session?.user?.accessToken])

    // ── Handlers de clic ────────────────────────────────────────────────────

    const handleEventClick = (info: any) => {
        if (isHolidayEvent(info.event)) {
            showError("No se pueden editar los días festivos")
            return
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
        })
        setIsNewEvent(false)
        setDialogOpen(true)
    }

    const handleDateClick = (info: any) => {
        if (isHolidayDate(info.dateStr)) {
            showError("No se pueden crear eventos en días festivos")
            return
        }

        const now = new Date()
        const hh = String(now.getHours()).padStart(2, "0")
        const mm = String(now.getMinutes()).padStart(2, "0")

        setSelectedEvent({
            title: "",
            start: `${info.dateStr}T${hh}:${mm}`,
            allDay: true,
            color: "#3b82f6",
        })
        setIsNewEvent(true)
        setDialogOpen(true)
    }

    const handleSelect = (info: any) => {
        const current = new Date(info.startStr)
        const end = new Date(info.endStr)
        while (current < end) {
            if (isHolidayDate(current.toISOString().split("T")[0])) {
                showError("El rango incluye días festivos")
                return
            }
            current.setDate(current.getDate() + 1)
        }

        setSelectedEvent({
            title: "",
            start: info.startStr,
            end: info.endStr,
            allDay: info.allDay,
            color: "#3b82f6",
        })
        setIsNewEvent(true)
        setDialogOpen(true)
    }

    // ── Guardar evento (API) ────────────────────────────────────────────────

    const handleSaveEvent = async (updatedEvent: EventModalData) => {
        if (updatedEvent.start && isHolidayDate(updatedEvent.start)) {
            showError("No se pueden guardar eventos en días festivos")
            return
        }

        const color = updatedEvent.color || "#3b82f6"

        const body = {
            title: updatedEvent.title,
            start: updatedEvent.allDay
                ? updatedEvent.start
                : updatedEvent.start,
            end: updatedEvent.end || null,
            allDay: updatedEvent.allDay ?? true,
            backgroundColor: color,
            borderColor: color,
            textColor: "#ffffff",
            meetLink: updatedEvent.meetLink || null,
            description: updatedEvent.description || null,
        }

        try {
            let savedId = updatedEvent.id

            if (isNewEvent) {
                const res = await fetch(CALENDARS_EVENTS_ENDPOINT, {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(body),
                })
                if (!res.ok) throw new Error("Error al crear evento")
                const json = await res.json()
                savedId = String(json.data.id)
            } else if (updatedEvent.id) {
                const res = await fetch(CALENDAR_EVENT_BY_ID_ENDPOINT(updatedEvent.id), {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify(body),
                })
                if (!res.ok) throw new Error("Error al actualizar evento")
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
                    meetLink: updatedEvent.meetLink || null,
                    description: updatedEvent.description || null,
                    isHoliday: false,
                },
            }

            setEvents((prev) =>
                isNewEvent
                    ? [...prev, calendarEvent]
                    : prev.map((e) => (e.id === selectedEvent?.id ? calendarEvent : e))
            )
        } catch (err) {
            showError(err instanceof Error ? err.message : "Error al guardar evento")
        }

        setDialogOpen(false)
    }

    // ── Eliminar evento (API) ───────────────────────────────────────────────

    const handleDeleteEvent = async () => {
        if (!isNewEvent && selectedEvent?.id) {
            try {
                const res = await fetch(CALENDAR_EVENT_BY_ID_ENDPOINT(selectedEvent.id), {
                    method: "DELETE",
                    headers: authHeaders(),
                })
                if (!res.ok) throw new Error("Error al eliminar evento")
                setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id))
            } catch (err) {
                showError(err instanceof Error ? err.message : "Error al eliminar evento")
            }
        }
        setDialogOpen(false)
    }

    // ── Render ──────────────────────────────────────────────────────────────

    const calendarEvents: EventSourceInput = [...events, ...holidays]

    return (
        <Card className="w-full h-full p-4">
            {/* Cargando */}
            {(isLoadingEvents || isLoadingHolidays) && (
                <div className="flex items-center gap-2 text-sm py-2 mb-3 px-3 bg-blue-50 text-blue-700 rounded-lg">
                    <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    Cargando calendario...
                </div>
            )}

            {eventsError && (
                <div className="flex items-center justify-between py-2 mb-3 px-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <span>Error al cargar eventos: {eventsError}</span>
                    <button onClick={fetchEvents} className="underline ml-2 hover:text-red-900">
                        Reintentar
                    </button>
                </div>
            )}

            {holidaysError && (
                <div className="flex items-center justify-between py-2 mb-3 px-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <span>Error al cargar días festivos: {holidaysError}</span>
                    <button onClick={fetchHolidays} className="underline ml-2 hover:text-red-900">
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
                eventClassNames={(arg) =>
                    isHolidayEvent(arg.event) ? ["holiday-event"] : ["fc-custom-event"]
                }
                dayCellClassNames={(arg) => {
                    const d = arg.date.toISOString().split("T")[0]
                    return isHolidayDate(d) ? ["holiday-cell"] : []
                }}
                eventContent={(eventInfo) => {
                    // Festivos — fondo gestionado por FullCalendar (display: background)
                    if (isHolidayEvent(eventInfo.event)) {
                        return (
                            <div
                                className="text-xs font-medium text-red-700 truncate w-full px-1"
                                title={eventInfo.event.title}
                            >
                                {eventInfo.event.title}
                            </div>
                        )
                    }

                    const { title, start, allDay } = eventInfo.event
                    const color =
                        eventInfo.event.extendedProps?.color ||
                        eventInfo.event.backgroundColor ||
                        "#3b82f6"
                    const hasMeet = !!eventInfo.event.extendedProps?.meetLink

                    // Vista Agenda
                    if (eventInfo.view.type === "listWeek") {
                        return (
                            <div className="flex items-center gap-2 py-0.5 w-full">
                                <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate flex-1">
                                    {title}
                                </span>
                                {hasMeet && <Video className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                            </div>
                        )
                    }

                    // Todo el día o con hora
                    let timeStr = ""
                    if (!allDay && start) {
                        const d = start as Date
                        let h = d.getHours()
                        const minutes = d.getMinutes()
                        const ampm = h >= 12 ? "pm" : "am"
                        h = h % 12 || 12
                        timeStr = minutes ? `${h}:${String(minutes).padStart(2, "0")}${ampm}` : `${h}${ampm}`
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
                            <span className="text-xs font-medium truncate flex-1 text-gray-700">
                                {timeStr && (
                                    <span className="text-gray-400 mr-1">{timeStr}</span>
                                )}
                                {title}
                            </span>
                            {hasMeet && (
                                <Video className="h-3 w-3 shrink-0 text-green-600 opacity-70" />
                            )}
                        </div>
                    )
                }}
                dayMaxEvents={3}
                moreLinkContent={(arg) => (
                    <span className="text-xs font-semibold text-blue-600 px-1">
                        +{arg.num} ver más
                    </span>
                )}
                eventDragStart={(info) => {
                    if (isHolidayEvent(info.event)) {
                        info.jsEvent.preventDefault()
                        showError("No se pueden mover los días festivos")
                        return false
                    }
                    return true
                }}
                eventDrop={(info) => {
                    if (isHolidayDate(info.event.startStr)) {
                        info.revert()
                        showError("No se pueden mover eventos a días festivos")
                    }
                }}
                datesSet={() => {
                    if (eventsProcessed && calendarRef.current) {
                        const api = calendarRef.current.getApi()
                        api.removeAllEvents()
                        events.forEach((ev) => api.addEvent(ev))
                        holidays.forEach((h) => api.addEvent(h))
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
                validateDate={(date) => !isHolidayDate(date)}
            />

            {/* Toast error */}
            {errorMessage && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2.5 rounded-lg shadow-lg z-50 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <span className="h-2 w-2 rounded-full bg-white/70 shrink-0" />
                    {errorMessage}
                </div>
            )}
        </Card>
    )
}

export default CalendarView
