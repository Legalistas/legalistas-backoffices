"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { Cases } from "@/types/cases"
import Button from "@/components/ui/button/Button"
import { servicesType, stageCases } from "@/lib/constant"
import { LAWYERS_ENDPOINT } from "@/constant/api-endpoints"
import { Role } from "@/constant/user"
import { useSession } from "next-auth/react"
import { Loader2, Save } from "lucide-react"

interface Lawyer {
    id: number
    name: string
    roleUser?: Array<{
        role?: {
            name: string
        }
    }>
}

interface CaseEditFormProps {
    caseData: Cases
    onSave: (updatedCase: Partial<Cases>) => void
    onCancel: () => void
}

export const CaseEditForm = ({ caseData, onSave, onCancel }: CaseEditFormProps) => {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: caseData.title,
        createdAt: caseData.createdAt ? new Date(caseData.createdAt).toISOString().split("T")[0] : "",
        number: caseData.number ? caseData.number.toString() : "",
        status: caseData.status || "IN_PROGRESS",
        isArchived: caseData.isArchived || false,
        servicesId: caseData.servicesId || undefined,
        stageId: caseData.stageId || 1,
        responsibleLawyerId: caseData.responsibleLawyerId || undefined,
        internalLawyerId: caseData.internalLawyerId || undefined,
    })

    // Estados para los abogados
    const [responsibleLawyers, setResponsibleLawyers] = useState<Lawyer[]>([])
    const [internalLawyers, setInternalLawyers] = useState<Lawyer[]>([])
    const [isLoadingLawyers, setIsLoadingLawyers] = useState(false)
    const [lawyersError, setLawyersError] = useState<string | null>(null)

    // Función para cargar abogados
    const fetchDataLawyer = useCallback(async () => {
        try {
            setIsLoadingLawyers(true)
            setLawyersError(null)
            const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()

            if (data && data.data) {
                // Separar abogados por rol
                const responsible = data.data.filter((lawyer: any) =>
                    lawyer.roleUser?.some(
                        (ru: any) =>
                            ru.role?.name === Role.DIRECTOR_GENERAL_CEO ||
                            ru.role?.name === Role.GERENTE_GENERAL_COO ||
                            ru.role?.name === Role.ABOGADO_REPRESENTANTE,
                    ),
                )

                const internal = data.data.filter((lawyer: any) =>
                    lawyer.roleUser?.some(
                        (ru: any) =>
                            ru.role?.name === Role.ASISTENTE_LEGAL ||
                            ru.role?.name === Role.GERENTE_GENERAL_COO ||
                            ru.role?.name === Role.ASISTENTE_LEGAL,
                    ),
                )

                setResponsibleLawyers(responsible)
                setInternalLawyers(internal)
            }
        } catch (error) {
            console.error("Error fetching lawyers:", error)
            setLawyersError("Error al cargar los datos de abogados")
        } finally {
            setIsLoadingLawyers(false)
        }
    }, [session?.user?.accessToken])

    // Cargar datos al montar el componente
    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchDataLawyer()
        }
    }, [fetchDataLawyer])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target

        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked
            setFormData((prev) => ({ ...prev, [name]: checked }))
        } else if (
            name === "servicesId" ||
            name === "responsibleLawyerId" ||
            name === "internalLawyerId" ||
            name === "stageId"
        ) {
            // Convertir a número o undefined si está vacío
            setFormData((prev) => ({
                ...prev,
                [name]: value === "" ? undefined : Number(value),
            }))
        } else {
            // Para todos los demás campos (string)
            setFormData((prev) => ({ ...prev, [name]: value }))
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Preparar datos para envío con tipos correctos
        const submitData: Partial<Cases> = {
            title: formData.title,
            // Convertir string de fecha a Date object
            createdAt: formData.createdAt ? new Date(formData.createdAt) : undefined,
            // Mantener number como string según el tipo Cases
            number: formData.number || undefined,
            // status: formData.status as "IN_PROGRESS" | "WON" | "LOST",
            // isArchived: formData.isArchived,
            servicesId: formData.servicesId,
            stageId: formData.stageId,
            responsibleLawyerId: formData.responsibleLawyerId,
            internalLawyerId: formData.internalLawyerId,
        }

        onSave(submitData)
    }

    return (
        <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">Editar caso</h2>
                <p className="mt-1 text-sm text-gray-500">Modificar la información del caso</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-6 px-6 py-6">
                    {/* Título del caso */}
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Título del caso
                        </label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            value={formData.title || ""}
                            onChange={handleChange}
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Grid para campos de fecha y número */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fecha de creación */}
                        <div className="space-y-2">
                            <label htmlFor="createdAt" className="block text-sm font-medium text-gray-700">
                                Fecha de creación
                            </label>
                            <input
                                id="createdAt"
                                name="createdAt"
                                type="date"
                                value={formData.createdAt}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Número de caso */}
                        <div className="space-y-2">
                            <label htmlFor="number" className="block text-sm font-medium text-gray-700">
                                Número de caso
                            </label>
                            <input
                                id="number"
                                name="number"
                                type="text"
                                value={formData.number}
                                onChange={handleChange}
                                placeholder="841"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Grid para selects principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Servicio - Select único */}
                        <div className="space-y-2">
                            <label htmlFor="servicesId" className="block text-sm font-medium text-gray-700">
                                Servicio
                            </label>
                            <select
                                id="servicesId"
                                name="servicesId"
                                value={formData.servicesId || ""}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar servicio</option>
                                {servicesType.map((service) => (
                                    <option key={service.id} value={service.value}>
                                        {service.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Estado del caso */}
                        {/* <div className="space-y-2">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                Estado del caso
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="IN_PROGRESS">En Progreso</option>
                                <option value="WON">Ganado</option>
                                <option value="LOST">Perdido</option>
                            </select>
                        </div> */}

                        {/* Etapa del caso */}
                        <div className="space-y-2">
                            <label htmlFor="stageId" className="block text-sm font-medium text-gray-700">
                                Etapa del caso
                            </label>
                            <select
                                id="stageId"
                                name="stageId"
                                value={formData.stageId}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {stageCases.map((stage) => (
                                    <option key={stage.id} value={stage.value}>
                                        {stage.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Grid para abogados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Abogado Responsable */}
                        <div className="space-y-2">
                            <label htmlFor="responsibleLawyerId" className="block text-sm font-medium text-gray-700">
                                Abogado Responsable
                            </label>
                            <select
                                id="responsibleLawyerId"
                                name="responsibleLawyerId"
                                value={formData.responsibleLawyerId || ""}
                                onChange={handleChange}
                                disabled={isLoadingLawyers}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {isLoadingLawyers ? "Cargando abogados..." : "Seleccionar abogado responsable"}
                                </option>
                                {responsibleLawyers.map((lawyer) => (
                                    <option key={lawyer.id} value={lawyer.id}>
                                        {lawyer.name}
                                    </option>
                                ))}
                            </select>
                            {lawyersError && <p className="text-xs text-red-500">Error al cargar abogados responsables</p>}
                        </div>

                        {/* Abogado Interno */}
                        <div className="space-y-2">
                            <label htmlFor="internalLawyerId" className="block text-sm font-medium text-gray-700">
                                Abogado Interno
                            </label>
                            <select
                                id="internalLawyerId"
                                name="internalLawyerId"
                                value={formData.internalLawyerId || ""}
                                onChange={handleChange}
                                disabled={isLoadingLawyers}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">{isLoadingLawyers ? "Cargando abogados..." : "Seleccionar abogado interno"}</option>
                                {internalLawyers.map((lawyer) => (
                                    <option key={lawyer.id} value={lawyer.id}>
                                        {lawyer.name}
                                    </option>
                                ))}
                            </select>
                            {lawyersError && <p className="text-xs text-red-500">Error al cargar abogados internos</p>}
                        </div>
                    </div>

                    {/* Checkbox para archivado */}
                    {/* <div className="flex items-center space-x-2">
                        <input
                            id="isArchived"
                            name="isArchived"
                            type="checkbox"
                            checked={formData.isArchived}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isArchived" className="text-sm font-medium text-gray-700">
                            Caso archivado
                        </label>
                    </div> */}
                </div>

                {/* Botones de acción */}
                <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <Button variant="custom" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button variant="custom" disabled={isLoadingLawyers || isLoading} className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-2 px-2">
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                <span>Guardando...</span>
                            </div>
                        ) : isLoadingLawyers ? (
                            <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                <span>Cargando...</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Save className="h-4 w-4 text-white" />
                                <span>Guardar cambios</span>
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
