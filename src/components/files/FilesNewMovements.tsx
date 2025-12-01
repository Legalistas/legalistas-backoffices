"use client"

import React, { useEffect, useState } from 'react'
import { CasesFiles } from '@/types/cases'
import { Modal } from '../ui/modal/Modal'
import Button from '../ui/button/Button'
import { CalendarIcon, Loader2, UserIcon } from 'lucide-react'
import { FILES_MOVEMENTS_MODE, FILES_MOVEMENTS_SCHEDULE_OPTIONS, FILES_MOVEMENTS_STATUS_OPTIONS, FILES_MOVEMENTS_TYPE } from '@/constant/causes'
import Switch from '../ui/switch/Switch'
import TiptapEditor from '../tiptap-editor'
import { CASES_FILES_MOVEMENTS_CREATE_ENDPOINT } from '@/constant/api-endpoints'
import { useSession } from 'next-auth/react'

interface FilesNewMovementsProps {
    isOpen: boolean
    onClose: () => void
    file: CasesFiles
    onFileUpdate: (updatedFile: CasesFiles) => void
}

export default function FilesNewMovements({ isOpen, onClose, file, onFileUpdate }: FilesNewMovementsProps) {
    const { data: session } = useSession()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isJudicial, setIsJudicial] = useState(true) // Default to Judicial (value 1)
    const [selectedType, setSelectedType] = useState<number | null>(null)
    const [selectedSubType, setSelectedSubType] = useState<number | null>(null)
    const [hasSubTypes, setHasSubTypes] = useState(false)
    const [subTypes, setSubTypes] = useState<Array<{ id: number; value: number; label: string }>>([])
    const [responsiblePerson, setResponsiblePerson] = useState<string>("")
    const [observationAttachment, setObservationAttachment] = useState<string>("")

    // New state variables
    const [date, setDate] = useState<string>("")
    const [schedule, setSchedule] = useState<string>("no")
    const [status, setStatus] = useState<string>("pendiente")

    // Initialize date with current date and time
    // En el useEffect:
    useEffect(() => {
        const now = new Date()
        const formattedDate = formatDateForInput(now)
        setDate(formattedDate)

        // Debug: verifica qué valores tienes
        console.log("responsibleLawyer:", file?.case?.responsibleLawyer)
        console.log("internalLawyer:", file?.case?.internalLawyer)

        if (file?.case?.responsibleLawyer?.id) {
            console.log("Setting responsiblePerson to:", file.case.responsibleLawyer.id)
            setResponsiblePerson(String(file.case.responsibleLawyer.id))
        }
    }, [file])

    // Format date for the input field (YYYY-MM-DDThh:mm)
    const formatDateForInput = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        const hours = String(date.getHours()).padStart(2, "0")
        const minutes = String(date.getMinutes()).padStart(2, "0")

        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    // Reset subtype when type changes
    useEffect(() => {
        if (selectedType) {
            const typeObj = FILES_MOVEMENTS_TYPE.find((type) => type.value === selectedType)
            if (typeObj && typeObj.subType && typeObj.subType.length > 0) {
                setHasSubTypes(true)
                setSubTypes(typeObj.subType)
            } else {
                setHasSubTypes(false)
                setSubTypes([])
                setSelectedSubType(null)
            }
        } else {
            setHasSubTypes(false)
            setSubTypes([])
            setSelectedSubType(null)
        }
    }, [selectedType])

    const handleModeChange = (checked: boolean) => {
        setIsJudicial(checked)
    }

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = Number.parseInt(e.target.value)
        setSelectedType(value)
    }

    const handleSubTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = Number.parseInt(e.target.value)
        setSelectedSubType(value)
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(e.target.value)
    }

    const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSchedule(e.target.value)
    }

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatus(e.target.value)
    }

    const handleResponsibleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setResponsiblePerson(e.target.value)
    }

    const handleObservationChange = (content: string) => {
        setObservationAttachment(content)
    }

    const handleNewMovement = async () => {
        console.log("=== VALIDACIÓN GUARDAR MOVIMIENTO ===")
        console.log("selectedType:", selectedType)
        console.log("hasSubTypes:", hasSubTypes)
        console.log("selectedSubType:", selectedSubType)
        console.log("date:", date)
        console.log("responsiblePerson:", responsiblePerson)
        
        if (!selectedType) {
            alert("Por favor seleccione un tipo de movimiento")
            return
        }

        if (hasSubTypes && !selectedSubType) {
            alert("Por favor seleccione un subtipo de movimiento")
            return
        }

        if (!date) {
            alert("Por favor seleccione una fecha")
            return
        }

        if (!responsiblePerson) {
            alert("Por favor seleccione un responsable")
            console.log("ERROR: No hay responsable seleccionado")
            return
        }

        console.log("=== TODAS LAS VALIDACIONES PASARON ===")
        setIsSubmitting(true)
        try {
            // Get the selected mode
            const selectedMode = isJudicial
                ? FILES_MOVEMENTS_MODE.find((mode) => mode.value === 1)
                : FILES_MOVEMENTS_MODE.find((mode) => mode.value === 2)

            // Convertir la fecha a la zona horaria local antes de enviar
            const localDate = new Date(date)
            const offsetMinutes = localDate.getTimezoneOffset()
            const adjustedDate = new Date(localDate.getTime() - (offsetMinutes * 60000))

            const requestBody = {
                mode: selectedMode?.value,
                type: selectedType,
                subtype: selectedSubType,
                date: adjustedDate.toISOString(),
                schedule,
                status,
                responsibleId: Number(responsiblePerson),
                observation: observationAttachment,
                customerName: file.case.customer.name,
            }

            console.log("=== ENVIANDO REQUEST ===")
            console.log("URL:", CASES_FILES_MOVEMENTS_CREATE_ENDPOINT(file.case.id, Number(file.id)))
            console.log("Body:", requestBody)
            console.log("Token:", session?.user?.accessToken ? "Presente" : "Faltante")

            // Simulate API call
            const response = await fetch(
                CASES_FILES_MOVEMENTS_CREATE_ENDPOINT(file.case.id, Number(file.id)),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                    body: JSON.stringify(requestBody),
                }
            )

            console.log("=== RESPUESTA DEL SERVIDOR ===")
            console.log("Status:", response.status)
            console.log("Ok:", response.ok)

            if (!response.ok) {
                const errorText = await response.text()
                console.log("Error response:", errorText)
                throw new Error(`Error creating movement: ${response.status} - ${errorText}`)
            }

            const data = await response.json()
            console.log("Movement created successfully:", data)

            await new Promise((resolve) => setTimeout(resolve, 2000))
            // Update file with the new mode, type, and subtype
            const updatedFile = {
                ...file,
                movementMode: selectedMode?.value,
                movementType: selectedType,
                movementSubType: selectedSubType,
                movementDate: date,
                movementSchedule: schedule,
                movementStatus: status,
                movementResponsibleId: Number(responsiblePerson),
                movementObservation: observationAttachment,
            }

            onFileUpdate(updatedFile)
            onClose()
        } catch (error) {
            console.error("=== ERROR EN GUARDAR MOVIMIENTO ===")
            console.error("Error completo:", error)
            console.error("Mensaje:", error instanceof Error ? error.message : String(error))
            
            // Mostrar error específico al usuario
            const errorMessage = error instanceof Error ? error.message : "Error desconocido al guardar el movimiento"
            alert(`❌ Error: ${errorMessage}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Get lawyers from file data
    const responsibleLawyer = file?.case?.responsibleLawyer
    const internalLawyer = file?.case?.internalLawyer


    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Nuevo evento</h2>
                <p className="text-muted-foreground mb-6">
                    Agregar un evento al expediente <span className="font-medium text-foreground">{file?.title}</span>
                </p>

                <div className="space-y-4 mb-6">
                    {/* Mode Switch */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <span className="font-medium mb-1">Modo de movimiento</span>
                            <span className="text-sm text-gray-700">{isJudicial ? "Judicial" : "Extrajudicial"}</span>
                        </div>
                        <Switch id="switch-mode" label="" defaultChecked={isJudicial} onChange={handleModeChange} color="blue" />
                    </div>

                    {/* Selector de tipo y subtipo usando grid */}
                    <div className={`grid gap-4 ${hasSubTypes ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                        {/* Selector de tipo */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="movement-type" className="font-medium text-sm">
                                Tipo de movimiento
                            </label>
                            <select
                                id="movement-type"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedType || ""}
                                onChange={handleTypeChange}
                            >
                                <option value="" disabled>
                                    Seleccionar tipo
                                </option>
                                {FILES_MOVEMENTS_TYPE.map((type) => (
                                    <option key={type.id} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de subtipo, solo si hay subtipos */}
                        {hasSubTypes && (
                            <div className="flex flex-col space-y-2">
                                <label htmlFor="movement-subtype" className="font-medium text-sm">
                                    Subtipo de movimiento
                                </label>
                                <select
                                    id="movement-subtype"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedSubType || ""}
                                    onChange={handleSubTypeChange}
                                >
                                    <option value="" disabled>
                                        Seleccionar subtipo
                                    </option>
                                    {subTypes.map((subType) => (
                                        <option key={subType.id} value={subType.value}>
                                            {subType.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Date Field */}
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="movement-date" className="font-medium text-sm">
                            Fecha
                        </label>
                        <div className="relative">
                            <input
                                type="datetime-local"
                                id="movement-date"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={date}
                                onChange={handleDateChange}
                            />

                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Schedule Field */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="movement-schedule" className="font-medium text-sm">
                                Agendar
                            </label>
                            <select
                                id="movement-schedule"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={schedule}
                                onChange={handleScheduleChange}
                            >
                                {FILES_MOVEMENTS_SCHEDULE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Field */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="movement-status" className="font-medium text-sm">
                                Estado
                            </label>
                            <select
                                id="movement-status"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={status}
                                onChange={handleStatusChange}
                            >
                                {FILES_MOVEMENTS_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Selector de Responsable - Mejorado, sin avatares y más compacto */}
                    {(responsibleLawyer || internalLawyer) && (
                        <div className="flex flex-col space-y-1">
                            <label className="font-medium text-sm mb-1">Responsable</label>
                            <div className="flex gap-2">
                                {responsibleLawyer && (
                                    <label className="flex items-center px-2 py-1 border rounded-md cursor-pointer hover:bg-gray-50 text-sm w-full">
                                        <input
                                            type="radio"
                                            name="responsible"
                                            value={responsibleLawyer.id}
                                            checked={responsiblePerson === String(responsibleLawyer.id)}
                                            onChange={handleResponsibleChange}
                                            className="mr-2 h-4 w-4 text-blue-600"
                                        />
                                        <span className="font-medium">{responsibleLawyer.name}</span>
                                        <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">(Responsable)</span>
                                    </label>
                                )}

                                {internalLawyer && (
                                    <label className="flex items-center px-2 py-1 border rounded-md cursor-pointer hover:bg-gray-50 text-sm w-full">
                                        <input
                                            type="radio"
                                            name="responsible"
                                            value={internalLawyer.id}
                                            checked={responsiblePerson === String(internalLawyer.id)}
                                            onChange={handleResponsibleChange}
                                            className="mr-2 h-4 w-4 text-blue-600"
                                        />
                                        <span className="font-medium">{internalLawyer.name}</span>
                                        <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">(Interno)</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Observation Attachment - TiptapEditor */}
                    <div className="flex flex-col space-y-2 mt-4">
                        <label htmlFor="observation-attachment" className="font-medium text-sm">
                            Observaciones
                        </label>
                        <textarea
                            id="observation-attachment"
                            className="border rounded-md p-2 text-sm min-h-[80px] resize-vertical"
                            value={observationAttachment}
                            onChange={(e) => handleObservationChange(e.target.value)}
                            placeholder="Escribe una nota..."
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleNewMovement}
                        disabled={isSubmitting}
                        variant='custom'
                        className="bg-[#09A4B5] text-white px-4 py-2.5 text-sm hover:bg-[#09A4B5]/85 dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar cambios
                    </Button>
                </div>
            </div>
        </Modal>
    )
}