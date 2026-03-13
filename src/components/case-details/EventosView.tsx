"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Calendar, ChevronDown, Clock, Loader2, MapPin, MessageCircle, Pencil, Plus, Search, Trash2, Users, FileText, X } from "lucide-react"
import type { CasesFiles, CaseEvent } from "@/types/cases"
import { getProcessTypeLabel } from "@/lib/functions"
import { Modal } from "@/components/ui/modal/Modal"
import Button from "@/components/ui/button/Button"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { CASE_EVENTS_ENDPOINT, CASE_EVENT_BY_ID_ENDPOINT } from "@/constant/api-endpoints"
import { CASE_EVENTS_TYPE } from "@/constant/causes"
import Switch from "@/components/ui/switch/Switch"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pendiente: { label: "Pendiente", color: "bg-amber-50 text-amber-700 border-amber-200" },
    completado: { label: "Completado", color: "bg-green-50 text-green-700 border-green-200" },
    cancelado: { label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
    reprogramado: { label: "Reprogramado", color: "bg-blue-50 text-blue-700 border-blue-200" },
}

const TYPE_CONFIG: Record<number, { label: string; icon: typeof FileText; color: string }> = {
    1: { label: "Audiencia", icon: Users, color: "bg-blue-50 text-blue-700 border-blue-200" },
    2: { label: "Pericia", icon: FileText, color: "bg-purple-50 text-purple-700 border-purple-200" },
}

interface LawyerInfo {
    id: number
    name: string
    image?: string | null
}

interface EventosViewProps {
    files: CasesFiles[]
    caseId: string
    responsibleLawyer?: LawyerInfo | null
    internalLawyer?: LawyerInfo | null
}

export const EventosView = ({ files, caseId, responsibleLawyer, internalLawyer }: EventosViewProps) => {
    const { data: session } = useSession()
    const [events, setEvents] = useState<CaseEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState<number | "all">("all")
    const [filterSubType, setFilterSubType] = useState<number | "all">("all")

    // ── Modal nuevo evento ──
    const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingEventId, setEditingEventId] = useState<number | null>(null)
    const [selectedType, setSelectedType] = useState<number>(1)
    const [selectedSubType, setSelectedSubType] = useState<number | null>(null)
    const [newEvent, setNewEvent] = useState({
        fileId: "" as string | number,
        title: "",
        date: "",
        time: "",
        location: "",
        observation: "",
        status: "pendiente",
        schedule: "si",
        responsibleId: "",
    })

    // ── SubTypes ──
    const subTypes = useMemo(() => {
        const typeObj = CASE_EVENTS_TYPE.find((t) => t.value === selectedType)
        return typeObj?.subType || []
    }, [selectedType])

    // ── Dropdown selector de expediente en el modal ──
    const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false)
    const [fileSearch, setFileSearch] = useState("")
    const fileDropdownRef = useRef<HTMLDivElement>(null)
    const fileSearchRef = useRef<HTMLInputElement>(null)

    const selectedFileLabel = useMemo(() => {
        const f = files.find((file) => String(file.id) === String(newEvent.fileId))
        if (!f) return "Seleccionar expediente"
        return `Exp. #${f.id} — ${f.title || getProcessTypeLabel(f.typeProcessId)}`
    }, [newEvent.fileId, files])

    const searchedFiles = useMemo(() => {
        if (!fileSearch) return files
        const q = fileSearch.toLowerCase()
        return files.filter((f) =>
            f.title?.toLowerCase().includes(q) ||
            f.id.toString().includes(q) ||
            getProcessTypeLabel(f.typeProcessId).toLowerCase().includes(q)
        )
    }, [files, fileSearch])

    // ── Fetch eventos del backend ──
    const fetchEvents = useCallback(async () => {
        try {
            const res = await fetch(CASE_EVENTS_ENDPOINT(Number(caseId)), {
                headers: {
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            if (!res.ok) throw new Error("Error al cargar eventos")
            const data = await res.json()
            setEvents(data.events || [])
        } catch (error) {
            console.error("Error fetching events:", error)
        } finally {
            setLoading(false)
        }
    }, [caseId, session?.user?.accessToken])

    useEffect(() => {
        if (session?.user?.accessToken) fetchEvents()
    }, [fetchEvents, session?.user?.accessToken])

    // Cerrar dropdown expediente al click fuera
    useEffect(() => {
        if (!isFileDropdownOpen) return
        const handle = (e: MouseEvent) => {
            if (fileDropdownRef.current?.contains(e.target as Node)) return
            setIsFileDropdownOpen(false)
        }
        document.addEventListener("mousedown", handle)
        return () => document.removeEventListener("mousedown", handle)
    }, [isFileDropdownOpen])

    useEffect(() => {
        if (isFileDropdownOpen) setTimeout(() => fileSearchRef.current?.focus(), 0)
    }, [isFileDropdownOpen])

    // Set responsible lawyer by default
    useEffect(() => {
        if (responsibleLawyer?.id) {
            setNewEvent((prev) => ({ ...prev, responsibleId: String(responsibleLawyer.id) }))
        }
    }, [responsibleLawyer])

    // Subtipos disponibles para el filtro según tipo seleccionado
    const filterSubTypes = useMemo(() => {
        if (filterType === "all") return []
        const typeObj = CASE_EVENTS_TYPE.find((t) => t.value === filterType)
        return typeObj?.subType || []
    }, [filterType])

    // ── Filtrar y ordenar eventos ──
    const filteredEvents = useMemo(() => {
        let filtered = events
        if (filterType !== "all") {
            filtered = filtered.filter((e) => e.type === filterType)
        }
        if (filterSubType !== "all") {
            filtered = filtered.filter((e) => e.subType === filterSubType)
        }
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }, [events, filterType])

    // ── Handlers ──
    const handleOpenNewEvent = useCallback(() => {
        setSelectedType(1)
        setSelectedSubType(null)
        setNewEvent({
            fileId: files[0]?.id || "",
            title: "",
            date: "",
            time: "",
            location: "",
            observation: "",
            status: "pendiente",
            schedule: "si",
            responsibleId: responsibleLawyer?.id ? String(responsibleLawyer.id) : "",
        })
        setEditingEventId(null)
        setIsNewEventModalOpen(true)
    }, [files, responsibleLawyer])

    const handleSaveEvent = async () => {
        if (!selectedType) {
            toast.error("Seleccioná un tipo de evento")
            return
        }
        if (subTypes.length > 0 && !selectedSubType) {
            toast.error("Seleccioná un subtipo")
            return
        }
        if (!newEvent.date || !newEvent.time) {
            toast.error("Completá la fecha y hora")
            return
        }
        if (!newEvent.responsibleId) {
            toast.error("Seleccioná un responsable")
            return
        }

        setIsSubmitting(true)
        try {
            const dateISO = new Date(`${newEvent.date}T${newEvent.time}`).toISOString()
            const isEditing = editingEventId !== null

            const url = isEditing
                ? CASE_EVENT_BY_ID_ENDPOINT(Number(caseId), editingEventId)
                : CASE_EVENTS_ENDPOINT(Number(caseId))

            const res = await fetch(url, {
                method: isEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    fileId: newEvent.fileId ? Number(newEvent.fileId) : null,
                    type: selectedType,
                    subType: selectedSubType,
                    title: newEvent.title || null,
                    date: dateISO,
                    time: newEvent.time,
                    location: newEvent.location || null,
                    observation: newEvent.observation || null,
                    status: newEvent.status,
                    schedule: newEvent.schedule,
                    responsibleId: Number(newEvent.responsibleId),
                }),
            })

            if (!res.ok) {
                const errorData = await res.text()
                throw new Error(errorData)
            }

            toast.success(isEditing ? "Evento actualizado correctamente" : "Evento creado correctamente")
            setIsNewEventModalOpen(false)
            setEditingEventId(null)
            await fetchEvents()
        } catch (error) {
            console.error("Error saving event:", error)
            toast.error(editingEventId ? "Error al actualizar el evento" : "Error al crear el evento")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteEvent = async (eventId: number) => {
        if (!confirm("¿Estás seguro de eliminar este evento?")) return

        try {
            const res = await fetch(CASE_EVENT_BY_ID_ENDPOINT(Number(caseId), eventId), {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            if (!res.ok) throw new Error("Error al eliminar")
            toast.success("Evento eliminado")
            await fetchEvents()
        } catch (error) {
            console.error("Error deleting event:", error)
            toast.error("Error al eliminar el evento")
        }
    }

    const handleEditEvent = (event: CaseEvent) => {
        setEditingEventId(event.id)
        setSelectedType(event.type)
        setSelectedSubType(event.subType ?? null)
        const eventDate = event.date ? new Date(event.date) : null
        const datePart = eventDate ? eventDate.toISOString().split("T")[0] : ""
        setNewEvent({
            fileId: event.fileId || "",
            title: event.title || "",
            date: datePart,
            time: event.time || "",
            location: event.location || "",
            observation: event.observation || "",
            status: event.status,
            schedule: event.schedule === 1 ? "si" : "no",
            responsibleId: String(event.responsibleId),
        })
        setIsNewEventModalOpen(true)
    }

    const handleUpdateStatus = async (eventId: number, newStatus: string) => {
        try {
            const res = await fetch(CASE_EVENT_BY_ID_ENDPOINT(Number(caseId), eventId), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error("Error al actualizar estado")
            toast.success("Estado actualizado")
            await fetchEvents()
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Error al actualizar el estado")
        }
    }

    const handleWhatsApp = (event: CaseEvent) => {
        const typeObj = CASE_EVENTS_TYPE.find((t) => t.value === event.type)
        const typeLabel = typeObj?.label || "Evento"
        const subLabel = getSubTypeLabel(event.type, event.subType)
        const eventDate = new Date(event.date)
        const dateStr = eventDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        const timeStr = event.time ? ` a las ${event.time} hs` : ""
        const locationStr = event.location ? `\nLugar: ${event.location}` : ""

        const message = `📋 *${typeLabel}${subLabel ? ` - ${subLabel}` : ""}*\n📅 ${dateStr}${timeStr}${locationStr}`
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`
        window.open(url, "_blank")
    }

    // ── Helpers para labels ──
    const getSubTypeLabel = (type: number, subType: number | null | undefined): string | null => {
        if (!subType) return null
        const typeObj = CASE_EVENTS_TYPE.find((t) => t.value === type)
        const sub = typeObj?.subType?.find((s) => s.value === subType)
        return sub?.label || null
    }

    // ── Responsables disponibles (vienen por props) ──

    // ── Render card ──
    const renderEventCard = (event: CaseEvent): React.JSX.Element => {
        const typeInfo = TYPE_CONFIG[event.type] || TYPE_CONFIG[1]
        const status = STATUS_CONFIG[event.status] || STATUS_CONFIG.pendiente
        const Icon = typeInfo.icon
        const eventDate = new Date(event.date)
        const now = new Date()
        const isPast = eventDate < now
        const diffMs = eventDate.getTime() - now.getTime()
        const isNear = !isPast && diffMs <= 2 * 24 * 60 * 60 * 1000 // 2 días
        const subTypeLabel = getSubTypeLabel(event.type, event.subType)

        const cardClass = isPast
            ? "bg-gray-50 border-gray-200 opacity-70"
            : isNear
                ? "bg-red-50 border-red-200"
                : "bg-white border-gray-200"

        return (
            <div
                key={event.id}
                className={`rounded-lg border p-5 ${cardClass}`}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                                <Icon className="h-3.5 w-3.5" />
                                {typeInfo.label}
                            </span>
                            {subTypeLabel && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                    {subTypeLabel}
                                </span>
                            )}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                                {status.label}
                            </span>
                        </div>

                        {/* Título */}
                        {event.title && (
                            <p className="text-base font-semibold text-gray-900 mb-2">{event.title}</p>
                        )}

                        {/* Info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{eventDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                            </div>
                            {event.time && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span>{event.time} hs</span>
                                </div>
                            )}
                            {event.location && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate max-w-xs">{event.location}</span>
                                </div>
                            )}
                        </div>

                        {/* Responsable */}
                        {event.responsiblePerson && (
                            <p className="mt-2 text-sm text-gray-400">
                                Responsable: {event.responsiblePerson.name}
                            </p>
                        )}

                        {/* Observaciones */}
                        {event.observation && (
                            <p className="mt-1.5 text-sm text-gray-600 italic line-clamp-2">{event.observation}</p>
                        )}

                        {/* Expediente */}
                        {event.file && (
                            <p className="mt-2 text-sm text-gray-400">
                                Exp. #{event.file.id} — {event.file.title || "Sin título"}
                            </p>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <select
                            value={event.status}
                            onChange={(e) => handleUpdateStatus(event.id, e.target.value)}
                            className="text-sm font-medium bg-white border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => handleWhatsApp(event)}
                            title="Enviar por WhatsApp"
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-green-50 text-green-600 transition-colors"
                        >
                            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.16 6.42 2.16 11.88c0 1.92.5 3.72 1.46 5.32L2 22l4.95-1.6c1.55.85 3.32 1.3 5.09 1.3h.01c5.46 0 9.88-4.42 9.88-9.88S17.5 2 12.04 2zm0 17.9c-1.63 0-3.23-.44-4.63-1.26l-.33-.19-2.94.95.96-2.86-.21-.34a7.8 7.8 0 01-1.2-4.12c0-4.32 3.52-7.84 7.85-7.84 2.09 0 4.05.81 5.53 2.29a7.78 7.78 0 012.3 5.55c0 4.33-3.52 7.82-7.83 7.82zm4.3-5.87c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.18-1.4-1.32-1.64-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28z"></path></svg>
                        </button>
                        <button
                            onClick={() => handleEditEvent(event)}
                            title="Editar evento"
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => handleDeleteEvent(event.id)}
                            title="Eliminar evento"
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-red-50 text-red-500 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <h3 className="text-md font-semibold text-gray-900">Eventos</h3>
                    {events.length > 0 && (
                        <span className="text-xs text-gray-400">
                            ({events.filter(e => e.status === "pendiente" || e.status === "reprogramado").length} activos, {events.filter(e => e.status === "completado").length} completados)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {events.length > 0 && (
                        <>
                            <div className="relative">
                                <select
                                    value={filterType}
                                    onChange={(e) => { setFilterType(e.target.value === "all" ? "all" : Number(e.target.value)); setFilterSubType("all") }}
                                    className="appearance-none text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md pl-3 pr-7 py-2 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                                >
                                    <option value="all">Todos los tipos</option>
                                    {CASE_EVENTS_TYPE.map((type) => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                            </div>
                            {filterType !== "all" && filterSubTypes.length > 0 && (
                                <div className="relative">
                                    <select
                                        value={filterSubType}
                                        onChange={(e) => setFilterSubType(e.target.value === "all" ? "all" : Number(e.target.value))}
                                        className="appearance-none text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md pl-3 pr-7 py-2 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                                    >
                                        <option value="all">Todos los subtipos</option>
                                        {filterSubTypes.map((sub) => (
                                            <option key={sub.value} value={sub.value}>{sub.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                </div>
                            )}
                            {(filterType !== "all" || filterSubType !== "all") && (
                                <button
                                    onClick={() => { setFilterType("all"); setFilterSubType("all") }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </>
                    )}
                    {files.length > 0 && (
                        <button
                            onClick={handleOpenNewEvent}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo evento
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-14">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">No hay eventos registrados</p>
                    <p className="text-xs text-gray-400 mb-3">Creá un evento para gestionar pericias y audiencias.</p>
                    {files.length > 0 && (
                        <button
                            onClick={handleOpenNewEvent}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#09A4B5] rounded-lg hover:bg-[#09A4B5]/85 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo evento
                        </button>
                    )}
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-10">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-0.5">Sin resultados</p>
                    <p className="text-xs text-gray-400 mb-3">No hay eventos del tipo seleccionado</p>
                    <button onClick={() => { setFilterType("all"); setFilterSubType("all") }} className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                        Limpiar filtro
                    </button>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {filteredEvents.map(renderEventCard)}
                </div>
            )}

            {/* ── Modal Nuevo Evento ── */}
            <Modal isOpen={isNewEventModalOpen} onClose={() => { setIsNewEventModalOpen(false); setEditingEventId(null) }} className="max-w-xl">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#09A4B5]/10">
                            <Calendar className="h-5 w-5 text-[#09A4B5]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{editingEventId ? "Editar evento" : "Nuevo evento"}</h2>
                            <p className="text-xs text-gray-500">Audiencia o pericia vinculada a un expediente</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* ── Sección: Expediente y tipo ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información del evento</h3>

                            {/* Expediente */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                                    Expediente
                                </label>
                                <div className="relative" ref={fileDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => { setIsFileDropdownOpen(!isFileDropdownOpen); setFileSearch("") }}
                                        className="w-full flex items-center justify-between text-sm text-left bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/20 focus:border-[#09A4B5] transition-colors"
                                    >
                                        <span className={`truncate ${!newEvent.fileId ? "text-gray-400" : "text-gray-900"}`}>
                                            {selectedFileLabel}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isFileDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {isFileDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                            <div className="p-2 border-b border-gray-100">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                                    <input
                                                        ref={fileSearchRef}
                                                        type="text"
                                                        value={fileSearch}
                                                        onChange={(e) => setFileSearch(e.target.value)}
                                                        placeholder="Buscar expediente..."
                                                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#09A4B5] focus:border-[#09A4B5]"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-44 overflow-y-auto">
                                                {searchedFiles.map((file) => (
                                                    <button
                                                        key={file.id}
                                                        type="button"
                                                        onClick={() => { setNewEvent({ ...newEvent, fileId: file.id }); setIsFileDropdownOpen(false) }}
                                                        className={`w-full flex flex-col px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${String(newEvent.fileId) === String(file.id) ? "bg-[#09A4B5]/5" : ""}`}
                                                    >
                                                        <span className="text-xs font-medium text-gray-900">Exp. #{file.id}</span>
                                                        <span className="text-[11px] text-gray-500 truncate">
                                                            {file.title || getProcessTypeLabel(file.typeProcessId)}
                                                        </span>
                                                    </button>
                                                ))}
                                                {searchedFiles.length === 0 && (
                                                    <p className="px-3 py-4 text-xs text-gray-400 text-center">Sin resultados</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tipo y Subtipo */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        Tipo <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => { setSelectedType(Number(e.target.value)); setSelectedSubType(null) }}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/20 focus:border-[#09A4B5] transition-colors"
                                    >
                                        {CASE_EVENTS_TYPE.map((type) => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        Subtipo {subTypes.length > 0 && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        value={selectedSubType || ""}
                                        onChange={(e) => setSelectedSubType(Number(e.target.value))}
                                        disabled={subTypes.length === 0}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/20 focus:border-[#09A4B5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="" disabled>{subTypes.length === 0 ? "Sin subtipos" : "Seleccionar subtipo"}</option>
                                        {subTypes.map((sub) => (
                                            <option key={sub.value} value={sub.value}>{sub.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Separador */}
                        <div className="border-t border-gray-100" />

                        {/* ── Sección: Fecha y configuración ── */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha y configuración</h3>

                            {/* Fecha/hora y Lugar */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                        Fecha y hora <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newEvent.date && newEvent.time ? `${newEvent.date}T${newEvent.time}` : ""}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            if (val) {
                                                const [datePart, timePart] = val.split("T")
                                                setNewEvent({ ...newEvent, date: datePart, time: timePart })
                                            } else {
                                                setNewEvent({ ...newEvent, date: "", time: "" })
                                            }
                                        }}
                                        required
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/20 focus:border-[#09A4B5] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                        Lugar
                                    </label>
                                    <input
                                        type="text"
                                        value={newEvent.location}
                                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                        placeholder="Juzgado, consultorio, etc."
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/20 focus:border-[#09A4B5] transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Separador */}
                        <div className="border-t border-gray-100" />

                        {/* ── Sección: Responsable ── */}
                        {(responsibleLawyer || internalLawyer) && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Responsable</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {responsibleLawyer && (
                                        <label
                                            className={`flex items-center gap-3 px-3 py-3 border rounded-lg cursor-pointer transition-all ${newEvent.responsibleId === String(responsibleLawyer.id)
                                                ? "border-[#09A4B5] bg-[#09A4B5]/5 ring-1 ring-[#09A4B5]/20"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="event-responsible"
                                                value={responsibleLawyer.id}
                                                checked={newEvent.responsibleId === String(responsibleLawyer.id)}
                                                onChange={(e) => setNewEvent({ ...newEvent, responsibleId: e.target.value })}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                                                {responsibleLawyer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{responsibleLawyer.name}</p>
                                                <p className="text-[11px] text-gray-500">Abogado responsable</p>
                                            </div>
                                        </label>
                                    )}
                                    {internalLawyer && (
                                        <label
                                            className={`flex items-center gap-3 px-3 py-3 border rounded-lg cursor-pointer transition-all ${newEvent.responsibleId === String(internalLawyer.id)
                                                ? "border-[#09A4B5] bg-[#09A4B5]/5 ring-1 ring-[#09A4B5]/20"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="event-responsible"
                                                value={internalLawyer.id}
                                                checked={newEvent.responsibleId === String(internalLawyer.id)}
                                                onChange={(e) => setNewEvent({ ...newEvent, responsibleId: e.target.value })}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
                                                {internalLawyer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{internalLawyer.name}</p>
                                                <p className="text-[11px] text-gray-500">Abogado interno</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Observaciones */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Observaciones</label>
                            <textarea
                                value={newEvent.observation}
                                onChange={(e) => setNewEvent({ ...newEvent, observation: e.target.value })}
                                placeholder="Notas adicionales..."
                                rows={2}
                                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/20 focus:border-[#09A4B5] transition-colors"
                            />
                        </div>

                        {/* Agendar al calendario */}
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Agendar al Calendario</p>
                                <p className="text-xs text-gray-400">Crear evento en el calendario del responsable</p>
                            </div>
                            <Switch
                                id="switch-schedule"
                                label=""
                                defaultChecked={true}
                                onChange={(checked) => setNewEvent((prev) => ({ ...prev, schedule: checked ? "si" : "no" }))}
                                color="blue"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => { setIsNewEventModalOpen(false); setEditingEventId(null) }} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button
                            variant="custom"
                            className="bg-[#09A4B5] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#09A4B5]/85 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSaveEvent}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingEventId ? "Actualizar evento" : "Guardar evento"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
