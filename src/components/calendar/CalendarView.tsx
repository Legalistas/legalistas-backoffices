"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import { Card } from "../ui/card/Card"
import { formatTime } from "@/constant/calendar"
import { EventModal } from "./EventModal"
import { CALENDARS_EVENTS_ENDPOINT, SETTINGS_HOLIDAY_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import type { EventInput, EventSourceInput } from "@fullcalendar/core"
import { dot } from "node:test/reporters"
import { Dot } from "lucide-react"

// Interfaz para los días festivos de la API
interface HolidayApiData {
    id: number
    title: string
    date: string
    createdAt: string
    updatedAt: string
}

// Interfaz para la respuesta de la API
interface ApiResponse {
    data: HolidayApiData[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

// Interfaz para los eventos del calendario
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
    isHoliday?: boolean // Añadimos esta propiedad para identificar días festivos
}

// Interfaz para los eventos que se pasan al modal
interface EventModalData {
    id?: string
    title?: string
    start?: string
    end?: string
    allDay?: boolean
}

// Props para el componente CalendarView
interface CalendarViewProps {
    onNewEvent?: () => void
    onDebugInfoChange?: (info: string | null) => void
}

const CalendarView = ({ onNewEvent, onDebugInfoChange }: CalendarViewProps) => {
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
    const [rawApiResponse, setRawApiResponse] = useState<any>(null)

    // Referencia al componente FullCalendar
    const calendarRef = useRef<any>(null)

    // Estado para controlar si los eventos ya se han procesado
    const [eventsProcessed, setEventsProcessed] = useState(false)

    // Actualizar la información de depuración en el componente padre
    useEffect(() => {
        if (onDebugInfoChange) {
            onDebugInfoChange(holidaysInfo)
        }
    }, [holidaysInfo, onDebugInfoChange])

    // Función para mostrar mensajes de error
    const showError = (message: string) => {
        setErrorMessage(message)
        setTimeout(() => setErrorMessage(null), 3000)
    }

    // Función para convertir fechas ISO a formato YYYY-MM-DD
    const formatDateForCalendar = (dateStr: string): string => {
        if (!dateStr) return ""
        // Si la fecha ya está en formato YYYY-MM-DD, devolverla tal cual
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

        try {
            // Intentar crear un objeto Date y extraer solo la parte de la fecha
            const date = new Date(dateStr)
            return date.toISOString().split("T")[0]
        } catch (e) {
            console.error("Error al formatear fecha:", e)
            return dateStr
        }
    }

    // Función personalizada para verificar si una fecha es un día festivo
    const isHolidayDate = (dateStr: string): boolean => {
        // Convertir la fecha a formato YYYY-MM-DD para comparación
        const formattedDate = formatDateForCalendar(dateStr)

        // Verificar si la fecha coincide con algún día festivo
        return holidays.some((holiday) => {
            const holidayDate =
                typeof holiday.start === "string"
                    ? formatDateForCalendar(holiday.start)
                    : formatDateForCalendar(holiday.start.toISOString())
            return holidayDate === formattedDate
        })
    }

    // Función personalizada para verificar si un evento es un día festivo
    const isHolidayEvent = (event: any): boolean => {
        // Si el evento tiene la propiedad isHoliday, usarla directamente
        if (event.extendedProps && event.extendedProps.isHoliday !== undefined) {
            return event.extendedProps.isHoliday
        }

        // Si el evento tiene la propiedad className que incluye "holiday-event", es un día festivo
        if (event.classNames && event.classNames.includes("holiday-event")) {
            return true
        }

        // Si el evento tiene la propiedad display como "background", es un día festivo
        if (event.display === "background") {
            return true
        }

        // Por defecto, no es un día festivo
        return false
    }

    // Modifica la función fetchEvents para procesar correctamente los datos de la API
    const fetchEvents = useCallback(async () => {
        if (!session?.user?.accessToken) return

        setIsLoadingEvents(true)
        setEventsError(null)

        try {
            const response = await fetch(`${CALENDARS_EVENTS_ENDPOINT}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                // Añadir cache: 'no-store' para evitar problemas de caché
                cache: "no-store",
            })

            if (!response.ok) {
                throw new Error(`Error al obtener eventos: ${response.status} ${response.statusText}`)
            }

            const apiResponse = await response.json()
            console.log("Respuesta completa de la API:", apiResponse)
            setRawApiResponse(apiResponse)

            if (apiResponse.data && Array.isArray(apiResponse.data)) {
                // Procesar correctamente los eventos de la API
                const formattedEvents = apiResponse.data.map((event: any) => {
                    console.log("Procesando evento:", event)

                    // Para eventos de todo el día, usar solo la fecha sin la parte de tiempo
                    const startDate = event.allDay ? formatDateForCalendar(event.start) : event.start
                    const endDate = event.end ? (event.allDay ? formatDateForCalendar(event.end) : event.end) : undefined

                    return {
                        id: String(event.id),
                        title: event.title,
                        start: startDate,
                        end: endDate,
                        allDay: true, // Forzar allDay a true para todos los eventos
                        backgroundColor: event.backgroundColor || "transparent", // Fondo transparente
                        textColor: event.textColor || "#ffffff",
                        isHoliday: false, // Marcar explícitamente como NO día festivo
                        editable: true, // Hacer explícitamente editable
                    }
                })

                console.log("Eventos formateados para FullCalendar:", formattedEvents)

                // Guardar los eventos en el estado
                setEvents(formattedEvents)

                // Marcar que los eventos se han procesado
                setEventsProcessed(true)

                // Forzar la actualización del calendario si existe la referencia
                if (calendarRef.current) {
                    const calendarApi = calendarRef.current.getApi()
                    calendarApi.removeAllEvents()
                    formattedEvents.forEach((event: any) => {
                        calendarApi.addEvent(event)
                    })
                }
            } else {
                console.error("Formato de respuesta de API inesperado:", apiResponse)
                setEventsError("Formato de respuesta de API inesperado")
            }
        } catch (error) {
            console.error("Error al cargar eventos:", error)
            setEventsError(error instanceof Error ? error.message : "Error desconocido al cargar eventos")
        } finally {
            setIsLoadingEvents(false)
        }
    }, [session?.user?.accessToken])

    // Función para obtener los días festivos desde la API
    const fetchHolidays = useCallback(async () => {
        setIsLoadingHolidays(true)
        setHolidaysError(null)

        try {
            const response = await fetch(`${SETTINGS_HOLIDAY_ENDPOINT}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                // Añadir cache: 'no-store' para evitar problemas de caché
                cache: "no-store",
            })

            if (!response.ok) {
                throw new Error(`Error al obtener días festivos: ${response.status} ${response.statusText}`)
            }

            const apiResponse: ApiResponse = await response.json()

            // Transformar los datos de la API al formato que espera FullCalendar
            const formattedHolidays: CalendarEvent[] = apiResponse.data
                .filter((holiday) => holiday.date) // Asegurarse de que date existe
                .map((holiday) => {
                    // Asegurarse de que la fecha esté en formato YYYY-MM-DD
                    const holidayDate = formatDateForCalendar(holiday.date)

                    return {
                        id: String(holiday.id), // Convertir el ID numérico a string
                        title: holiday.title,
                        start: holidayDate, // Usar solo la parte de la fecha
                        allDay: true,
                        className: "holiday-event",
                        editable: false,
                        display: "background", // Mostrar como fondo
                        color: "#ffebee", // Fondo rojo claro
                        textColor: "#b71c1c", // Texto rojo oscuro
                        isHoliday: true, // Marcar explícitamente como día festivo
                    }
                })

            // Guardar información de depuración
            const holidaysInfo = formattedHolidays.map((h) => `${h.title}: ${h.start}`).join(", ")
            setHolidaysInfo(`Días festivos: ${holidaysInfo}`)

            console.log("Días festivos formateados:", formattedHolidays)
            setHolidays(formattedHolidays)
        } catch (error) {
            console.error("Error al cargar días festivos:", error)
            setHolidaysError(error instanceof Error ? error.message : "Error desconocido al cargar días festivos")
            setHolidays([])
        } finally {
            setIsLoadingHolidays(false)
        }
    }, [session?.user?.accessToken])

    // Cargar días festivos y eventos al montar el componente
    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchHolidays()
            fetchEvents()
        }
    }, [fetchHolidays, fetchEvents, session?.user?.accessToken])

    // Añade un useEffect para mostrar información de depuración sobre los eventos cargados
    useEffect(() => {
        if (events.length > 0) {
            console.log(`Se han cargado ${events.length} eventos:`, events)
        }
    }, [events])

    // Modifica la función handleEventClick para convertir Date a string si es necesario
    const handleEventClick = (info: any) => {
        console.log("Evento clickeado:", info.event)
        console.log("Es día festivo:", isHolidayEvent(info.event))
        console.log("Propiedades extendidas:", info.event.extendedProps)

        // Verificar si el evento es un día festivo
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
        })
        setIsNewEvent(false)
        setDialogOpen(true)
    }

    function handleDateClick(info: any) {
        // Verificar si la fecha es un día festivo
        if (isHolidayDate(info.dateStr)) {
            showError("No se pueden crear eventos en días festivos")
            return
        }

        // Crear fecha con hora actual para el datetime-local
        const now = new Date()
        const hours = String(now.getHours()).padStart(2, "0")
        const minutes = String(now.getMinutes()).padStart(2, "0")
        const dateWithTime = `${info.dateStr}T${hours}:${minutes}`

        setSelectedEvent({
            title: "",
            start: dateWithTime,
            allDay: true,
        })
        setIsNewEvent(true)
        setDialogOpen(true)
    }

    function handleSelect(info: any) {
        // Verificar si el rango seleccionado incluye un día festivo
        const startDate = new Date(info.startStr)
        const endDate = new Date(info.endStr)

        // Verificar cada día en el rango
        const currentDate = new Date(startDate)
        while (currentDate < endDate) {
            const dateStr = currentDate.toISOString().split("T")[0]
            if (isHolidayDate(dateStr)) {
                showError("El rango seleccionado incluye días festivos")
                return
            }
            currentDate.setDate(currentDate.getDate() + 1)
        }

        setSelectedEvent({
            title: "",
            start: info.startStr,
            end: info.endStr,
            allDay: info.allDay,
        })
        setIsNewEvent(true)
        setDialogOpen(true)
    }

    const createNewEvent = () => {
        const today = new Date()
        const dateStr = today.toISOString().split("T")[0]
        const hours = String(today.getHours()).padStart(2, "0")
        const minutes = String(today.getMinutes()).padStart(2, "0")
        const dateWithTime = `${dateStr}T${hours}:${minutes}`

        setSelectedEvent({
            title: "",
            start: dateWithTime,
            allDay: true,
        })
        setIsNewEvent(true)
        setDialogOpen(true)

        // Si hay un callback externo, también lo llamamos
        if (onNewEvent) {
            onNewEvent()
        }
    }

    const handleSaveEvent = (updatedEvent: EventModalData) => {
        // Verificar si la fecha del evento es un día festivo
        if (updatedEvent.start && isHolidayDate(updatedEvent.start)) {
            showError("No se pueden guardar eventos en días festivos")
            return
        }

        // Convertir el evento actualizado al formato CalendarEvent
        const calendarEvent: CalendarEvent = {
            id: updatedEvent.id,
            title: updatedEvent.title || "",
            start: updatedEvent.start || "",
            end: updatedEvent.end,
            allDay: updatedEvent.allDay,
            backgroundColor: "#3788d8",
            borderColor: "",
            textColor: "#ffffff",
            isHoliday: false, // Marcar explícitamente como NO día festivo
            editable: true, // Hacer explícitamente editable
        }

        setEvents((prev) => {
            if (isNewEvent) {
                // Add new event
                return [...prev, calendarEvent]
            } else {
                // Update existing event
                return prev.map((e) => (e.id === selectedEvent?.id ? calendarEvent : e))
            }
        })
        setDialogOpen(false)
    }

    const handleDeleteEvent = () => {
        if (!isNewEvent && selectedEvent?.id) {
            setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id))
        }
        setDialogOpen(false)
    }

    // Combinar eventos y días festivos para FullCalendar
    const calendarEvents: EventSourceInput = [...events, ...holidays]

    return (
        <Card className="w-full h-full p-4">
            {/* Mostrar mensaje de carga o error de eventos */}
            {isLoadingEvents && (
                <div className="text-center py-2 mb-4 bg-blue-50 text-blue-700 rounded">Cargando eventos...</div>
            )}

            {eventsError && (
                <div className="text-center py-2 mb-4 bg-red-50 text-red-700 rounded">
                    Error al cargar eventos: {eventsError}
                    <button onClick={fetchEvents} className="ml-2 underline">
                        Reintentar
                    </button>
                </div>
            )}

            {/* Mostrar mensaje de carga o error de días festivos */}
            {isLoadingHolidays && (
                <div className="text-center py-2 mb-4 bg-blue-50 text-blue-700 rounded">Cargando días festivos...</div>
            )}

            {holidaysError && (
                <div className="text-center py-2 mb-4 bg-red-50 text-red-700 rounded">
                    Error al cargar días festivos: {holidaysError}
                    <button onClick={fetchHolidays} className="ml-2 underline">
                        Reintentar
                    </button>
                </div>
            )}

            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                events={calendarEvents}
                selectAllow={(selectInfo) => {
                    return !isHolidayDate(selectInfo.startStr)
                }}

                editable={true}
                selectable={true}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                select={handleSelect}
                locales={[esLocale]}
                locale="es"
                timeZone="local" // Usar la zona horaria local
                eventClassNames={(arg) => {
                    // Verificar si el evento es un día festivo
                    if (isHolidayEvent(arg.event)) {
                        return ["holiday-event", "bg-red-100", "text-red-800", "border-red-300", "cursor-default"]
                    }
                    return []
                }}
                dayCellClassNames={(arg) => {
                    // Convertir la fecha de la celda a formato YYYY-MM-DD
                    const cellDateStr = arg.date.toISOString().split("T")[0]

                    // Verificar si la fecha es un día festivo
                    if (isHolidayDate(cellDateStr)) {
                        return ["holiday-cell", "bg-red-50", "cursor-not-allowed"]
                    }
                    return []
                }}
                // Personalizar el contenido de los eventos
                eventContent={(eventInfo) => {
                    // No personalizar eventos de días festivos
                    if (isHolidayEvent(eventInfo.event)) {
                        return (
                            <div
                                className="font-medium text-red-800 truncate w-full"
                                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
                                title={eventInfo.event.title} // Añadir tooltip
                            >
                                {eventInfo.event.title}
                            </div>
                        )
                    }

                    const { title, start, allDay, backgroundColor, textColor } = eventInfo.event

                    // Si es un evento de todo el día, no mostramos la hora
                    if (allDay) {
                        return (
                            <div
                                className="flex items-center font-normal truncate w-full text-gray-800 dark:text-white"
                                style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "100%",
                                    backgroundColor: backgroundColor || "transparent",
                                }}
                                title={title}
                            >
                                <Dot className="h-6 w-6 flex-shrink-0" style={{ color: textColor || "#3788d8" }} />
                                {title}
                            </div>
                        )
                    }

                    // Para eventos con hora específica
                    const timeStr = start ? formatTime(start.toISOString()) : ""
                    const fullTitle = timeStr ? `${timeStr} - ${title}` : title

                    return (
                        <div
                            className="flex items-center font-normal truncate w-full text-gray-800 dark:text-white"
                            style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "100%",
                                backgroundColor: backgroundColor || "transparent",
                            }}
                            title={fullTitle} // Añadir tooltip
                        >
                            <Dot className="h-6 w-6 flex-shrink-0" style={{ color: textColor || "#3788d8" }} />{fullTitle}
                        </div>
                    )
                }}
                // Configuración para evitar que los eventos se expandan horizontalmente
                dayMaxEventRows={true}
                dayMaxEvents={true}
                // Deshabilitar arrastrar y soltar para eventos de días festivos
                eventDragStart={(info) => {
                    if (isHolidayEvent(info.event)) {
                        info.jsEvent.preventDefault()
                        showError("No se pueden mover los días festivos")
                        return false
                    }
                    return true
                }}
                // Evitar que se puedan soltar eventos en días festivos
                eventDrop={(info) => {
                    if (isHolidayDate(info.event.startStr)) {
                        info.revert()
                        showError("No se pueden mover eventos a días festivos")
                    }
                }}
                // Evento que se dispara cuando el calendario está listo
                datesSet={() => {
                    // Si los eventos ya se han procesado, forzar la actualización del calendario
                    if (eventsProcessed && calendarRef.current) {
                        const calendarApi = calendarRef.current.getApi()
                        calendarApi.removeAllEvents()

                        // Añadir todos los eventos al calendario
                        events.forEach((event) => {
                            calendarApi.addEvent(event)
                        })

                        // Añadir los días festivos al calendario
                        holidays.forEach((holiday) => {
                            calendarApi.addEvent(holiday)
                        })
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

            {errorMessage && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50">
                    {errorMessage}
                </div>
            )}
        </Card>
    )
}

export default CalendarView
