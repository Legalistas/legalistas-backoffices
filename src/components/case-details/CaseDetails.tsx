"use client"

import type React from "react"

import { Calendar, Edit, Trash2, User, Briefcase, Loader2 } from "lucide-react"
import Image from "next/image"
import Badge from "@/components/ui/badge/Badge"
import Button from "@/components/ui/button/Button"
import { getServiceName, getStatusColor } from "@/lib/functions"
import type { Cases } from "@/types/cases"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { CASES_ENDPOINT } from "@/constant/api-endpoints"
import { stageCases } from "@/lib/constant"
import { useRouter } from "next/navigation" // Import useRouter

interface CaseDetailsProps {
    caseData: Cases
    onEdit: () => void
    onDelete: () => void
    // Removed onCaseUpdated prop
}

export const CaseDetails = ({ caseData, onEdit, onDelete }: CaseDetailsProps) => {
    const { data: session } = useSession()
    const router = useRouter() // Initialize useRouter
    const [isUpdatingStage, setIsUpdatingStage] = useState(false)

    // The dropdown will directly reflect caseData.stageId.
    // When router.refresh() is called, caseData will be re-fetched and updated.

    const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStageId = Number(e.target.value)

        // Optimistic update for immediate feedback in the dropdown
        // This will be overwritten by the actual data from router.refresh()
        // if the API call is successful.
        // Note: We don't need a local `currentStageId` state anymore if we rely on router.refresh()
        // and the `caseData` prop for the dropdown's value.
        // However, to prevent the dropdown from visually "jumping back" on error,
        // we'll keep a temporary local state for the selected value during the API call.
        const originalStageId = caseData.stageId // Store original for potential revert
        // Temporarily update the dropdown's visual state
        e.target.value = newStageId.toString()

        setIsUpdatingStage(true)

        try {
            const response = await fetch(`${CASES_ENDPOINT}/${caseData.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({ stageId: newStageId }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || "Error al actualizar la etapa del caso")
            }

            toast.success("Etapa del caso actualizada exitosamente")
            router.refresh() // This will re-fetch the caseData prop from the parent
        } catch (error) {
            console.error("Error updating case stage:", error)
            toast.error("No se pudo actualizar la etapa del caso. Por favor, intenta de nuevo.")
        } finally {
            setIsUpdatingStage(false)
        }
    }

    return (
        <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header section with case title and badges */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-shrink-0">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{caseData.title}</h2>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="mr-1.5 h-4 w-4 flex-shrink-0" />
                            <span>Creado el {new Date(caseData?.createdAt ?? "-").toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge size="sm" color={getStatusColor(caseData?.stageId ?? "-")}>
                            Número de caso: {caseData.number ?? caseData.id ?? "-"}
                        </Badge>
                        <div className="flex items-center">
                            <Briefcase className="mr-1.5 h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                            <Badge size="sm" variant="light">
                                {getServiceName(caseData?.servicesId ?? "-")}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lawyers section */}
            <div className="px-6 py-5 bg-white dark:bg-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Abogados asignados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Responsible Lawyer */}
                    <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                            <User className="w-4 h-4 mr-1.5 text-blue-500" />
                            Abogado Responsable
                        </h4>
                        {caseData?.responsibleLawyer ? (
                            <div className="flex items-center gap-3">
                                {caseData?.responsibleLawyer?.image ? (
                                    <Image
                                        className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-gray-700"
                                        src={
                                            caseData?.responsibleLawyer?.image
                                                ? caseData.responsibleLawyer.image.startsWith("http")
                                                    ? caseData.responsibleLawyer.image
                                                    : `${process.env.NEXT_PUBLIC_BACKEND_URL}${caseData.responsibleLawyer.image}`
                                                : "/placeholder.svg"
                                        }
                                        alt={`${caseData?.responsibleLawyer?.name || "Lawyer"} profile`}
                                        width={40}
                                        height={40}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-medium">
                                        {caseData?.responsibleLawyer?.name ? caseData.responsibleLawyer.name.charAt(0).toUpperCase() : "L"}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {caseData?.responsibleLawyer?.name || "Sin asignar"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{caseData?.responsibleLawyer?.email || ""}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                </div>
                                <span className="text-sm">Sin asignar</span>
                            </div>
                        )}
                    </div>

                    {/* Internal Lawyer */}
                    <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                            <User className="w-4 h-4 mr-1.5 text-green-500" />
                            Abogado Interno
                        </h4>
                        {caseData?.internalLawyer ? (
                            <div className="flex items-center gap-3">
                                {caseData?.internalLawyer?.image ? (
                                    <Image
                                        className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-gray-700"
                                        src={
                                            caseData?.internalLawyer?.image
                                                ? caseData.internalLawyer.image.startsWith("http")
                                                    ? caseData.internalLawyer.image
                                                    : `${process.env.NEXT_PUBLIC_BACKEND_URL}${caseData.internalLawyer.image}`
                                                : "/placeholder.svg"
                                        }
                                        alt={`${caseData?.internalLawyer?.name || "Lawyer"} profile`}
                                        width={40}
                                        height={40}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 text-sm font-medium">
                                        {caseData?.internalLawyer?.name ? caseData.internalLawyer.name.charAt(0).toUpperCase() : "L"}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {caseData?.internalLawyer?.name || "Sin asignar"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{caseData?.internalLawyer?.email || ""}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                </div>
                                <span className="text-sm">Sin asignar</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 px-6 py-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={onEdit}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-650"
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                    <div className="relative w-[180px]">
                        <label htmlFor="stageId" className="sr-only">
                            Etapa del caso
                        </label>
                        <select
                            id="stageId"
                            name="stageId"
                            value={caseData.stageId || 1} // Use caseData.stageId directly
                            onChange={handleStageChange}
                            disabled={isUpdatingStage}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        >
                            {stageCases.map((stage) => (
                                <option key={stage.id} value={stage.value}>
                                    {stage.label}
                                </option>
                            ))}
                        </select>
                        {isUpdatingStage && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                            </div>
                        )}
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={onDelete}
                    className="bg-white dark:bg-gray-700 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                </Button>
            </div>
        </div>
    )
}