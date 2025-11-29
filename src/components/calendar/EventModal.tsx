"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Modal } from "../ui/modal/Modal"
import { toDateTimeLocalFormat } from "@/constant/calendar"

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

    useEffect(() => {
        if (event) {
            // Set form values when event data is available
            setTitle(event.title || "")

            // Format dates for input fields
            if (event.start) {
                // Convertir a formato datetime-local
                const startDateTime = toDateTimeLocalFormat(typeof event.start === "string" ? event.start : String(event.start))
                setStart(startDateTime)

                // Validar la fecha al cargar
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
                // Convertir a formato datetime-local
                const endDateTime = toDateTimeLocalFormat(typeof event.end === "string" ? event.end : String(event.end))
                setEnd(endDateTime)
            } else {
                setEnd("")
            }

            setAllDay(event.allDay !== undefined ? event.allDay : true)
        } else {
            // Reset form if no event
            setTitle("")
            setStart("")
            setEnd("")
            setAllDay(true)
            setDateError(null)
        }
    }, [event, validateDate])

    // Validar la fecha cuando cambia
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        setStart(newDate)

        // Extraer solo la parte de la fecha para validación
        const dateOnly = newDate.split("T")[0]
        if (!validateDate(dateOnly)) {
            setDateError("Esta fecha corresponde a un día festivo")
        } else {
            setDateError(null)
        }
    }

    const handleSubmit = () => {
        if (!title || !start) {
            return
        }

        // Extraer solo la parte de la fecha para validación
        const dateOnly = start.split("T")[0]
        // Verificar nuevamente si la fecha es válida
        if (!validateDate(dateOnly)) {
            setDateError("No se puede guardar en un día festivo")
            return
        }

        const eventData = {
            title,
            // Si es todo el día, solo usamos la fecha sin la hora
            start: allDay ? start.split("T")[0] : start,
            end: end ? (allDay ? end.split("T")[0] : end) : undefined,
            allDay,
        }

        onSave(eventData)
    }

    // Determinar si el botón de guardar debe estar deshabilitado
    const isSaveDisabled = !title || !start || !!dateError

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl mx-auto p-6">
            <h2 className="text-xl font-semibold mb-4">{isNewEvent ? "Crear Nuevo Evento" : "Editar Evento"}</h2>
            <div className="mb-4">
                <label className="block mb-1">Título:</label>
                <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título del evento"
                />
            </div>
            <div className="mb-4">
                <label className="block mb-1">Fecha y hora de inicio:</label>
                <input
                    type={allDay ? "date" : "datetime-local"}
                    className={`w-full border rounded p-2 ${dateError ? "border-red-500" : ""}`}
                    value={allDay ? start.split("T")[0] : start}
                    onChange={handleDateChange}
                />
                {dateError && <p className="text-red-500 text-sm mt-1">{dateError}</p>}
            </div>
            {!allDay && (
                <div className="mb-4">
                    <label className="block mb-1">Fecha y hora de fin (opcional):</label>
                    <input
                        type="datetime-local"
                        className="w-full border rounded p-2"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                </div>
            )}
            <div className="mb-4">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={allDay}
                        onChange={(e) => {
                            setAllDay(e.target.checked)
                            // Si cambiamos a "todo el día", ajustamos los valores
                            if (e.target.checked) {
                                if (start) setStart(start.split("T")[0])
                                if (end) setEnd(end.split("T")[0])
                            }
                        }}
                        className="mr-2"
                    />
                    Todo el día
                </label>
            </div>
            <div className="flex gap-2 justify-end">
                {!isNewEvent && onDelete && (
                    <button onClick={onDelete} className="px-4 py-2 bg-red-600 text-white mr-auto">
                        Eliminar
                    </button>
                )}
                <button onClick={onClose} className="px-4 py-2 border">
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    className={`px-4 py-2 ${isSaveDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"} text-white`}
                    disabled={isSaveDisabled}
                >
                    Guardar
                </button>
            </div>
        </Modal>
    )
}
