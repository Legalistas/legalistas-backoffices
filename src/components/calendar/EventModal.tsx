"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Modal } from "../ui/modal/Modal"
import { toDateTimeLocalFormat } from "@/constant/calendar"
import { Video, ExternalLink } from "lucide-react"

const EVENT_COLORS = [
    { label: "Azul", value: "#3b82f6" },
    { label: "Verde", value: "#10b981" },
    { label: "Morado", value: "#8b5cf6" },
    { label: "Rojo", value: "#ef4444" },
    { label: "Naranja", value: "#f97316" },
    { label: "Amarillo", value: "#f59e0b" },
    { label: "Rosa", value: "#ec4899" },
    { label: "Gris", value: "#6b7280" },
]

interface EventModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (eventData: any) => void
    onDelete?: () => void
    isNewEvent?: boolean
    validateDate?: (date: string) => boolean
    event: {
        title?: string
        start?: string
        end?: string
        allDay?: boolean
        meetLink?: string
        description?: string
        color?: string
    } | null
}

export const EventModal = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    event,
    isNewEvent = false,
    validateDate = () => true,
}: EventModalProps) => {
    const [title, setTitle] = useState("")
    const [start, setStart] = useState("")
    const [end, setEnd] = useState("")
    const [allDay, setAllDay] = useState(true)
    const [dateError, setDateError] = useState<string | null>(null)
    const [meetLink, setMeetLink] = useState("")
    const [description, setDescription] = useState("")
    const [color, setColor] = useState("#3b82f6")

    useEffect(() => {
        if (event) {
            setTitle(event.title || "")
            setMeetLink(event.meetLink || "")
            setDescription(event.description || "")
            setColor(event.color || "#3b82f6")

            if (event.start) {
                const startDateTime = toDateTimeLocalFormat(typeof event.start === "string" ? event.start : String(event.start))
                setStart(startDateTime)

                if (!validateDate(event.start)) {
                    setDateError("Esta fecha corresponde a un día festivo")
                } else {
                    setDateError(null)
                }
            } else {
                setStart("")
                setDateError(null)
            }

            if (event.end) {
                const endDateTime = toDateTimeLocalFormat(typeof event.end === "string" ? event.end : String(event.end))
                setEnd(endDateTime)
            } else {
                setEnd("")
            }

            setAllDay(event.allDay !== undefined ? event.allDay : true)
        } else {
            setTitle("")
            setStart("")
            setEnd("")
            setAllDay(true)
            setDateError(null)
            setMeetLink("")
            setDescription("")
            setColor("#3b82f6")
        }
    }, [event, validateDate])

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        setStart(newDate)
        const dateOnly = newDate.split("T")[0]
        if (!validateDate(dateOnly)) {
            setDateError("Esta fecha corresponde a un día festivo")
        } else {
            setDateError(null)
        }
    }

    const handleSubmit = () => {
        if (!title || !start) return

        const dateOnly = start.split("T")[0]
        if (!validateDate(dateOnly)) {
            setDateError("No se puede guardar en un día festivo")
            return
        }

        onSave({
            title,
            start: allDay ? start.split("T")[0] : start,
            end: end ? (allDay ? end.split("T")[0] : end) : undefined,
            allDay,
            meetLink: meetLink.trim() || undefined,
            description: description.trim() || undefined,
            color,
        })
    }

    const isSaveDisabled = !title || !start || !!dateError

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl mx-auto p-6">
            {/* Cabecera */}
            <div className="flex items-center gap-3 mb-5">
                <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {isNewEvent ? "Crear Nuevo Evento" : "Editar Evento"}
                </h2>
            </div>

            {/* Título */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               dark:bg-gray-700 dark:text-white"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título del evento"
                />
            </div>

            {/* Selector de color */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color del evento
                </label>
                <div className="flex gap-2 flex-wrap">
                    {EVENT_COLORS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setColor(c.value)}
                            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                                color === c.value
                                    ? "ring-2 ring-offset-2 ring-gray-500 scale-110"
                                    : ""
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                        />
                    ))}
                </div>
            </div>

            {/* Fecha inicio */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha y hora de inicio <span className="text-red-500">*</span>
                </label>
                <input
                    type={allDay ? "date" : "datetime-local"}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2
                                dark:bg-gray-700 dark:text-white ${
                                    dateError
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                                }`}
                    value={allDay ? start.split("T")[0] : start}
                    onChange={handleDateChange}
                />
                {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
            </div>

            {/* Fecha fin */}
            {!allDay && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha y hora de fin (opcional)
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                </div>
            )}

            {/* Todo el día */}
            <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={allDay}
                        onChange={(e) => {
                            setAllDay(e.target.checked)
                            if (e.target.checked) {
                                if (start) setStart(start.split("T")[0])
                                if (end) setEnd(end.split("T")[0])
                            }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Todo el día</span>
                </label>
            </div>

            {/* Meet Link */}
            <div className="mb-4">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Video className="h-4 w-4 text-green-600" />
                    Enlace de reunión (opcional)
                </label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        value={meetLink}
                        onChange={(e) => setMeetLink(e.target.value)}
                        placeholder="https://meet.google.com/..."
                    />
                    {meetLink.trim() && (
                        <a
                            href={meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm
                                       rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Unirse
                        </a>
                    )}
                </div>
            </div>

            {/* Descripción */}
            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción (opcional)
                </label>
                <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none
                               dark:bg-gray-700 dark:text-white"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Agregar una descripción..."
                    rows={3}
                />
            </div>

            {/* Botones */}
            <div className="flex gap-2 justify-end border-t border-gray-100 dark:border-gray-700 pt-4">
                {!isNewEvent && onDelete && (
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg
                                   hover:bg-red-600 hover:text-white transition-colors mr-auto text-sm font-medium"
                    >
                        Eliminar
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium
                               text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                        isSaveDisabled
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    disabled={isSaveDisabled}
                >
                    Guardar
                </button>
            </div>
        </Modal>
    )
}
