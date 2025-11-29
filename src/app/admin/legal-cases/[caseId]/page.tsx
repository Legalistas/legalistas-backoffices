"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import type { Cases } from "@/types/cases"
import axios from "axios"
import { toast } from "sonner"
import { Loader2 } from 'lucide-react'
import { stageCases } from "@/lib/constant"

// Importamos los componentes que hemos creado
import { CaseHeader } from "@/components/case-details/CaseHeader"
import { CaseDetails } from "@/components/case-details/CaseDetails"
import { CaseEditForm } from "@/components/case-details/CaseEditForm"
import { FileFilters } from "@/components/case-details/FileFilters"
import { CaseTabs } from "@/components/case-details/CaseTabs"
import { DeleteConfirmationModal } from "@/components/case-details/DeleteConfirmationModal"
import { NewFileModal } from "@/components/case-details/NewFileModal"
import { CASES_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import { getCurrentMainStage, mainSteps } from "@/constant/stage-mapping"

export default function CasesDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [cases, setCases] = useState<Cases | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("files")

  const [fileTypeFilter, setFileTypeFilter] = useState(0) // 0 for "todos"
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [isFilterSelectOpen, setIsFilterSelectOpen] = useState(false)

  const [newFiles, setNewFiles] = useState({
    title: "",
    description: "",
    filetype: 1,
    proceduralStage: 1,
  })

  // Estado para la etapa procesal actual
  const [currentProceduralStage, setCurrentProceduralStage] = useState(1)

  // Calcula la etapa principal basada en la etapa procesal
  const currentMainStage = getCurrentMainStage(currentProceduralStage)

  // Check for edit mode from URL parameters
  useEffect(() => {
    const editParam = searchParams.get("edit")
    if (editParam === "true") {
      setEditMode(true)
      // Clean up the URL by removing the edit parameter
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("edit")
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    }
  }, [searchParams, router])

  // Obtener la etapa procesal más avanzada de todos los expedientes del caso
  useEffect(() => {
    if (cases?.files && cases.files.length > 0) {
      // Encuentra la etapa procesal más alta (más avanzada) entre todos los expedientes
      const maxStage = Math.max(...cases.files.map((file) => file.proceduralStageId || 1))
      setCurrentProceduralStage(maxStage)

      // Debug: mostrar información en consola
      console.log("🔍 Debug de etapas:")
      console.log("Expedientes del caso:", cases.files.map((f) => ({
        id: f.id,
        proceduralStageId: f.proceduralStageId,
        title: f.title
      })))
      console.log("Etapa procesal más avanzada:", maxStage)
      console.log("Etapa principal mapeada:", getCurrentMainStage(maxStage))
    }
  }, [cases?.files])

  const fetchCaseData = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log("Fetching case with ID:", params.caseId)
      console.log("Using token:", session?.user?.accessToken)

      const response = await axios.get(`${CASES_ENDPOINT}/${params.caseId}`, {
        headers: {
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      })

      // Check if the data is in the expected format
      if (response.data && response.data.data) {
        setCases(response.data.data)
      } else if (response.data) {
        // If the data is directly in response.data without a nested .data property
        setCases(response.data)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      console.error("Error fetching case:", err)
      if (axios.isAxiosError(err)) {
        console.error("Response data:", err.response?.data)
        console.error("Status code:", err.response?.status)
      }
      setError(`Failed to load case data: ${(err as Error).message || "Unknown error"}`)
      toast.error(`Error al cargar el caso: ${(err as Error).message || "Error desconocido"}`)
    } finally {
      setIsLoading(false)
    }
  }, [params.caseId, session?.user?.accessToken])

  useEffect(() => {
    fetchCaseData()
  }, [fetchCaseData])

  const handleDeleteCases = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${params.caseId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete case")
      }

      toast.success("Case deleted successfully")
      router.push("/admin/legal-cases")
    } catch (err) {
      console.error("Error deleting case:", err)
      toast.error("Failed to delete case")
    }
  }, [params.caseId, router])

  const filteredFiles = useCallback(() => {
    if (!cases?.files) return []
    return fileTypeFilter === 0 ? cases?.files : cases?.files.filter((exp) => exp.filetype === fileTypeFilter)
  }, [cases?.files, fileTypeFilter])

  const handleOpenDialog = useCallback(() => {
    // Preseleccionar el tipo de expediente según la selección actual
    // If filter is 0 (todos), default to 1 (Administrativo)
    const filter = fileTypeFilter !== 0 ? fileTypeFilter : 1

    setNewFiles((prev) => ({
      ...prev,
      filetype: filter,
      proceduralStage: 1,
    }))
    setDialogOpen(true)
  }, [fileTypeFilter])

  // Load view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem("expedientesViewMode")
    if (savedViewMode === "card" || savedViewMode === "list") {
      setViewMode(savedViewMode as "card" | "list")
    }
  }, [])

  // Save view mode preference
  const handleViewModeChange = useCallback((mode: "card" | "list") => {
    setViewMode(mode)
    localStorage.setItem("expedientesViewMode", mode)
  }, [])

  const handleSaveEdit = useCallback(
    async (updatedCase: Partial<Cases>) => {
      try {
        setIsLoading(true)

        const response = await fetch(`${CASES_ENDPOINT}/${params.caseId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
          body: JSON.stringify(updatedCase),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        console.log("Case updated successfully:", result)
        toast.success("Caso actualizado exitosamente")
        setDialogOpen(false)

        // Opcional: refrescar los datos del caso
        // router.push(`/admin/legal-cases/${params.caseId}`)
        fetchCaseData()
        window.location.reload()
      } catch (error) {
        console.error("Error updating case:", error)
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar el caso"
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [params.caseId, session?.user?.accessToken, CASES_ENDPOINT, setDialogOpen],
  )

  const handleSaveNewFile = useCallback((fileData: any) => {
    // Aquí iría la lógica para crear un nuevo expediente
    console.log("Creating new file:", fileData)
    toast.success("Nuevo expediente creado exitosamente")
    
    setDialogOpen(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  // Debug info - remover en producción
  console.log("📊 Estado actual:", {
    currentProceduralStage,
    currentMainStage,
    casesFiles: cases?.files?.length || 0
  })

  if (error || !cases) {
    console.error("Error or no cases data:", error)
    console.log("Cases data:", cases)
    toast.error(`No se pudo cargar el caso: ${error}`)
    router.push("/admin/legal-cases")
    return null
  }

  // Get the labels from your statusCase array
  const steps = stageCases.map((stage) => stage.label)
  const currentStep = cases?.stageId || 1

  return (
    <div>
      <CaseHeader
        title={cases.title}
        number={cases.number}
        currentStep={currentStep}
        steps={steps}
      />

      {editMode ? (
        <CaseEditForm caseData={cases} onSave={handleSaveEdit} onCancel={() => setEditMode(false)} />
      ) : (
        <CaseDetails caseData={cases} onEdit={() => setEditMode(true)} onDelete={() => setConfirmDeleteOpen(true)} />
      )}

      <FileFilters
        fileTypeFilter={fileTypeFilter}
        viewMode={viewMode}
        isFilterSelectOpen={isFilterSelectOpen}
        onFilterChange={(value) => {
          setFileTypeFilter(value)
          setIsFilterSelectOpen(false)
        }}
        onViewModeChange={handleViewModeChange}
        onToggleFilterSelect={() => setIsFilterSelectOpen(!isFilterSelectOpen)}
        onAddNewFile={handleOpenDialog}
      />

      <div className="mb-4">
        <CaseTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          files={cases.files || []}
          notes={cases.notes || []}
          consultation={cases.consultation || []}
          logs={cases.logs || []}
          caseId={params.caseId as string}
          viewMode={viewMode}
          fileTypeFilter={fileTypeFilter}
          filteredFiles={filteredFiles()}
          onAddNewFile={handleOpenDialog}
          onClearFilter={() => setFileTypeFilter(0)}
          customer={cases.customer}
          onNotesUpdated={fetchCaseData} // This should trigger a refetch of all case data
        />
      </div>

      <DeleteConfirmationModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteCases}
      />

      <NewFileModal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveNewFile}
        initialFileType={fileTypeFilter !== 0 ? fileTypeFilter : 1}
        caseId={cases.id}
        onStageChange={(newStage) => {
          // Aquí puedes actualizar el estado que controla el StatusProgressBar
          setCurrentProceduralStage(newStage)
        }}
      />
    </div>
  )
}