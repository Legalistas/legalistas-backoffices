"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal/Modal"
import Button from "@/components/ui/button/Button"
import Radio from "@/components/ui/input/Radio"
import { useSession } from "next-auth/react"
import { CASES_ENDPOINT, SETTINGS_JURISDICTIONS_ENDPOINT } from "@/constant/api-endpoints"
import { STATUS_PROCESS, TYPES_PROCCESS } from "@/constant/causes"

interface NewFileModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (fileData: any) => void
    initialFileType: number
    caseId: number
    onStageChange?: (stage: number) => void
    fileToEdit?: any
    isEditMode?: boolean
}

interface Jurisdiction {
    id: number
    name: string
    status: boolean
    createdAt: string
    updatedAt: string
    courts: Court[]
}

interface Court {
    id: number
    jurisdictionId: number
    charter: string
    courtName: string
    secretary?: string
    type?: string
    key: string
    createdAt: string
    updatedAt: string
}

interface CourtOption {
    value: string
    label: string
}

export const NewFileModal = ({
    isOpen,
    onClose,
    onSave,
    initialFileType,
    caseId,
    onStageChange,
    fileToEdit,
    isEditMode = false,
}: NewFileModalProps) => {
    const { data: session } = useSession()
    const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
    const [courtOptions, setCourtOptions] = useState<CourtOption[]>([])
    const [newFile, setNewFile] = useState({
        title: "",
        description: "",
        filetype: initialFileType,
        proceduralStageId: 1,
        cuij: "",
        jurisdiction: "",
        court: "",
        typeProcess: "",
        statusProcess: "",
        startDate: "",
        accidentDate: "",
        instanceExpiration: "",
    })

    const fetchJurisdictions = useCallback(async () => {
        try {
            const response = await fetch(`${SETTINGS_JURISDICTIONS_ENDPOINT}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            if (!response.ok) throw new Error("Error fetching jurisdictions")
            const data = await response.json()
            setJurisdictions(data)
        } catch (error) {
            console.error("Error fetching jurisdictions:", error)
        }
    }, [session?.user?.accessToken])

    useEffect(() => {
        fetchJurisdictions()
    }, [fetchJurisdictions])

    useEffect(() => {
        if (fileToEdit && isEditMode) {
            setNewFile({
                title: fileToEdit.title || "",
                description: fileToEdit.observation || "",
                filetype: fileToEdit.filetype || initialFileType,
                proceduralStageId: fileToEdit.proceduralStageId || 1,
                cuij: fileToEdit.cuij || "",
                jurisdiction: fileToEdit.jurisdictionId?.toString() || "",
                court: fileToEdit.courtId?.toString() || "",
                typeProcess: fileToEdit.typeProcessId?.toString() || "",
                statusProcess: fileToEdit.statusProcessId?.toString() || "",
                startDate: fileToEdit.startDate || "",
                accidentDate: fileToEdit.accidentDate || "",
                instanceExpiration: fileToEdit.instanceExpiration || "",
            })
        }
    }, [fileToEdit, isEditMode])

    useEffect(() => {
        if (fileToEdit?.jurisdictionId && isEditMode) {
            const selectedJurisdiction = jurisdictions.find(
                (j) => j.id === fileToEdit.jurisdictionId
            )
            if (selectedJurisdiction) {
                const courtsList = selectedJurisdiction.courts.map((court) => ({
                    value: court.id.toString(),
                    label: `${court.charter} - ${court.courtName}`,
                }))
                setCourtOptions(courtsList)
            }
        }
    }, [jurisdictions, fileToEdit, isEditMode])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target

        if (name === "proceduralStage") {
            const stageValue = Number.parseInt(value)
            setNewFile((prev) => ({ ...prev, proceduralStageId: stageValue }))
            if (onStageChange) onStageChange(stageValue)
        } else {
            setNewFile((prev) => ({
                ...prev,
                [name]: name === "filetype" || name === "proceduralStageId" ? Number.parseInt(value) : value,
            }))
        }

        if (name === "jurisdiction") {
            setNewFile((prev) => ({ ...prev, court: "" }))
            if (value) {
                const selectedJurisdiction = jurisdictions.find((j) => j.id.toString() === value)
                if (selectedJurisdiction && selectedJurisdiction.courts.length > 0) {
                    const courtsList = selectedJurisdiction.courts.map((court) => ({
                        value: court.id.toString(),
                        label: `${court.charter} - ${court.courtName}`,
                    }))
                    setCourtOptions(courtsList)
                } else {
                    setCourtOptions([])
                }
            } else {
                setCourtOptions([])
            }
        }
    }

    const handleRadioChange = (value: string) => {
        setNewFile((prev) => ({ ...prev, filetype: Number.parseInt(value) }))
    }

    const handleSubmit = async () => {
        try {
            const method = isEditMode ? "PUT" : "POST"
            const endpoint = isEditMode
                ? `${CASES_ENDPOINT}/${caseId}/files/${fileToEdit.id}`
                : `${CASES_ENDPOINT}/${caseId}/files`

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    caseId,
                    title: newFile.title,
                    observation: newFile.description,
                    filetype: newFile.filetype,
                    proceduralStageId: 1,
                    cuij: newFile.cuij || null,
                    jurisdictionId: newFile.jurisdiction ? Number(newFile.jurisdiction) : null,
                    courtId: newFile.court ? Number(newFile.court) : null,
                    typeProcessId: newFile.typeProcess ? Number(newFile.typeProcess) : null,
                    statusProcessId: newFile.statusProcess ? Number(newFile.statusProcess) : null,
                    startDate: newFile.startDate || null,
                    accidentDate: newFile.accidentDate || null,
                    updatedByUserId: session?.user?.id || null,
                    instanceExpiration: newFile.instanceExpiration || null,
                }),
            })

            if (!response.ok) throw new Error("Error al guardar el expediente")

            const data = await response.json()
            console.log("Expediente guardado:", data)
            onSave(data)
            onClose()
        } catch (err) {
            console.error("Error al enviar el expediente:", err)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl p-6">
            <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                    {isEditMode ? "Editar Expediente" : "Nuevo Expediente"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                    {isEditMode
                        ? "Modifique la información del expediente."
                        : "Complete la información para agregar un nuevo expediente a este caso."}
                </p>
            </div>
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Título del Expediente
                        </label>
                        <input
                            id="title"
                            name="title"
                            placeholder="Ingrese el título del expediente"
                            value={newFile.title}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="cuij" className="block text-sm font-medium text-gray-700">
                            Cód. Úni. Identificación Judicial
                        </label>
                        <input
                            id="cuij"
                            name="cuij"
                            placeholder="Ingrese el código único"
                            value={newFile.cuij}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700">
                            Jurisdicción
                        </label>
                        <select
                            id="jurisdiction"
                            name="jurisdiction"
                            value={newFile.jurisdiction}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Seleccione jurisdicción</option>
                            {jurisdictions.map((jurisdiction) => (
                                <option key={jurisdiction.id} value={jurisdiction.id.toString()}>
                                    {jurisdiction.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="court" className="block text-sm font-medium text-gray-700">
                            Juzgado
                        </label>
                        <select
                            id="court"
                            name="court"
                            value={newFile.court}
                            onChange={handleChange}
                            disabled={!newFile.jurisdiction}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Seleccione juzgado</option>
                            {courtOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="typeProcess" className="block text-sm font-medium text-gray-700">
                            Tipo de Proceso
                        </label>
                        <select
                            id="typeProcess"
                            name="typeProcess"
                            value={newFile.typeProcess}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Seleccione el tipo de proceso</option>
                            {TYPES_PROCCESS.map((option, index) => (
                                <option key={index} value={option.id}>
                                    {option.value}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="statusProcess" className="block text-sm font-medium text-gray-700">
                            Estado del Proceso
                        </label>
                        <select
                            id="statusProcess"
                            name="statusProcess"
                            value={newFile.statusProcess}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Seleccione el estado del proceso</option>
                            {STATUS_PROCESS.map((option, index) => (
                                <option key={index} value={option.id}>
                                    {option.value}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Tipo de expediente</label>
                        <div className="flex space-x-4">
                            <Radio
                                id="filetype-1"
                                name="filetype"
                                value="1"
                                checked={newFile.filetype === 1}
                                onChange={() => handleRadioChange("1")}
                                label="Administrativo"
                            />
                            <Radio
                                id="filetype-2"
                                name="filetype"
                                value="2"
                                checked={newFile.filetype === 2}
                                onChange={() => handleRadioChange("2")}
                                label="Judicial"
                            />
                        </div>
                    </div>
                    {/* <div className="space-y-2">
                        <label htmlFor="proceduralStage" className="block text-sm font-medium text-gray-700">
                            Etapa Procesal
                        </label>
                        <select
                            id="proceduralStage"
                            name="proceduralStage"
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value={1}>DOCUMENTACIÓN PENDIENTE</option>
                            <option value={2}>POR INICIAR</option>
                            <option value={3}>EXPEDIENTE INICIADO</option>
                            {newFile.filetype === 1 ? (
                                <>
                                    <option value={4}>FECHA DE LA PRIMERA AUDIENCIA</option>
                                    <option value={5}>GESTIÓN DE ESTUDIOS MÉDICOS</option>
                                    <option value={6}>EN ESPERA DE RESOLUCIÓN</option>
                                    <option value={7}>FECHA DE LA AUDIENCIA DE HOMOLOGACIÓN</option>
                                </>
                            ) : (
                                <>
                                    <option value={4}>FECHA DEL DICTAMEN EXPERTO: JMP</option>
                                    <option value={5}>IMPULSO PROCESAL</option>
                                </>
                            )}
                            <option value={8}>NEGOCIACIÓN EN TRÁMITE</option>
                            <option value={9}>ACUERDO</option>
                            <option value={10}>RATIFICADO</option>
                            <option value={11}>ORDEN DE PAGO SOLICITADA</option>
                            <option value={12}>COBRO DE HONORARIOS</option>
                            <option value={13}>PRIMER MENSAJE DE SATISFACCIÓN</option>
                            <option value={14}>LINK</option>
                            <option value={15}>ARCHIVO</option>
                        </select>
                    </div> */}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="typeProcess" className="block text-sm font-medium text-gray-700">
                            Fecha del Accidente
                        </label>
                        <input
                            id="accidentDate"
                            name="accidentDate"
                            type="date"
                            value={newFile.accidentDate ? newFile.accidentDate.split('T')[0] : ""}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                            Caducidad de Instancia
                        </label>
                        <select
                            id="instanceExpiration"
                            name="instanceExpiration"
                            value={newFile.instanceExpiration}
                            onChange={handleChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value={0}>Seleccione la caducidad de instancia</option>
                            <option value={3}>3 meses</option>
                            <option value={6}>6 meses</option>
                            <option value={9}>9 meses</option>
                            <option value={12}>12 meses</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Descripción
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        placeholder="Describa el expediente"
                        value={newFile.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="custom"
                    className="bg-[#09A4B5] text-white px-4 py-2.5 text-sm hover:bg-[#09A4B5]/85 dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isEditMode ? "Guardar Cambios" : "Agregar Expediente"}
                </Button>
            </div>
        </Modal>
    )
}
