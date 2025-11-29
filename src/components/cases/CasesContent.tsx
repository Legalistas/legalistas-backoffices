"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { DataNotFound } from "../common/DataNotFound"
import { CasesHeader } from "./CasesHeader"
import { CasesFilters } from "./CasesFilters"
import { CasesCardView } from "./CasesCardView"
import { CasesListView } from "./CasesListView"
import type { Cases } from "@/types/cases"
import { CASES_ENDPOINT, LAWYERS_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import { Pagination } from "../ui/pagination/Pagination"
import { Role } from "@/constant/user"
import { useRouter, useSearchParams } from "next/navigation"

interface LawyerOption {
  id: string
  value: string
  label: string
}

interface ApiResponse {
  data: Cases[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function CasesContent() {
  const { data: session } = useSession()
  const [cases, setCases] = useState<Cases[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"card" | "list">("list")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedService, setSelectedService] = useState<number | undefined>(undefined)
  const [selectedStage, setSelectedStage] = useState<number | undefined>(undefined)
  const [selectedRepresentativeLawyer, setSelectedRepresentativeLawyer] = useState<string[]>([])
  const [selectedInternalLawyer, setSelectedInternalLawyer] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [showArchivedOnly, setShowArchivedOnly] = useState(false) // Renamed state

  // Lawyer states
  const [responsibleLawyerTypes, setResponsibleLawyerTypes] = useState<LawyerOption[]>([])
  const [lawyerInternalTypes, setLawyerInternalTypes] = useState<LawyerOption[]>([])

  // Use refs to track if this is the initial render
  const isInitialRender = useRef(true)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasLoadedFromStorage = useRef(false) // Nuevo ref para tracking

  const router = useRouter()
  const searchParams = useSearchParams()

  // Nuevas funciones para persistencia en localStorage
  const saveFiltersToStorage = useCallback((filters: {
    searchTerm: string
    selectedService?: number
    selectedStage?: number
    selectedRepresentativeLawyer: string[]
    selectedInternalLawyer: string[]
    dateFrom: string
    dateTo: string
    showArchivedOnly: boolean
    currentPage: number
  }) => {
    try {
      const filtersToSave = {
        ...filters,
        timestamp: Date.now(), // Agregar timestamp para validación
      }
      localStorage.setItem('casesFilters', JSON.stringify(filtersToSave))
    } catch (error) {
      console.warn('No se pudieron guardar los filtros en localStorage:', error)
    }
  }, [])

  const loadFiltersFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('casesFilters')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Verificar que los datos no sean muy antiguos (ej: más de 24 horas)
        const isRecent = parsed.timestamp && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000
        if (isRecent) {
          return parsed
        }
      }
    } catch (error) {
      console.warn('No se pudieron cargar los filtros desde localStorage:', error)
    }
    return null
  }, [])

  // Función para aplicar filtros desde storage o URL
  const applyFiltersFromSource = useCallback((source: 'storage' | 'url') => {
    let filters = null

    if (source === 'storage') {
      filters = loadFiltersFromStorage()
    }

    if (!filters) {
      // Cargar desde URL como respaldo
      filters = {
        searchTerm: searchParams.get("search") || "",
        selectedService: searchParams.get("service") ? Number.parseInt(searchParams.get("service")!) : undefined,
        selectedStage: searchParams.get("stage") ? Number.parseInt(searchParams.get("stage")!) : undefined,
        currentPage: searchParams.get("page") ? Number.parseInt(searchParams.get("page")!) : 1,
        selectedRepresentativeLawyer: searchParams.get("repLawyers") ? searchParams.get("repLawyers")!.split(",").filter(Boolean) : [],
        selectedInternalLawyer: searchParams.get("intLawyers") ? searchParams.get("intLawyers")!.split(",").filter(Boolean) : [],
        dateFrom: searchParams.get("dateFrom") || "",
        dateTo: searchParams.get("dateTo") || "",
        showArchivedOnly: searchParams.get("showArchivedOnly") === "true",
      }
    }

    if (filters) {
      // Validar que los IDs de abogados existan
      const validRepLawyers = filters.selectedRepresentativeLawyer?.filter((id: string) =>
        responsibleLawyerTypes.some((lawyer) => lawyer.value === id)
      ) || []
      const validIntLawyers = filters.selectedInternalLawyer?.filter((id: string) =>
        lawyerInternalTypes.some((lawyer) => lawyer.value === id)
      ) || []

      // Aplicar filtros al estado
      setSearchTerm(filters.searchTerm || "")
      setSelectedService(filters.selectedService)
      setSelectedStage(filters.selectedStage)
      setCurrentPage(filters.currentPage || 1)
      setSelectedRepresentativeLawyer(validRepLawyers)
      setSelectedInternalLawyer(validIntLawyers)
      setDateFrom(filters.dateFrom || "")
      setDateTo(filters.dateTo || "")
      setShowArchivedOnly(filters.showArchivedOnly || false)

      return filters
    }
    return null
  }, [searchParams, responsibleLawyerTypes, lawyerInternalTypes, loadFiltersFromStorage])

  // Fetch lawyers data
  useEffect(() => {
    const fetchLawyers = async () => {
      try {
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

        const { data } = await response.json()

        const responsibleLawyerRoles = [
          Role.DIRECTOR_GENERAL_CEO,
          Role.GERENTE_GENERAL_COO,
          Role.DIRECTORA_AREA_LEGAL,
          Role.COORDINADOR_LEGAL,
          Role.ABOGADO_REPRESENTANTE,
        ]

        // Responsible Lawyers
        const filteredResponsibleLawyers = data.filter((user: any) =>
          user.roleUser.some((ru: any) => responsibleLawyerRoles.includes(ru.role.name)),
        )

        const responsibleLawyers = filteredResponsibleLawyers.map((user: any) => ({
          id: user.id.toString(),
          value: user.id.toString(),
          label: user.name,
        }))

        // Filter and map in separate steps to avoid TypeScript errors
        // Internal Lawyers
        const filteredInternalLawyers = data.filter((user: any) =>
          user.roleUser.some(
            (ru: any) => ru.role.name === Role.ASISTENTE_LEGAL || ru.role.name === Role.GERENTE_GENERAL_COO,
          ),
        )

        const internalLawyers = filteredInternalLawyers.map((user: any) => ({
          id: user.id.toString(),
          value: user.id.toString(),
          label: user.name,
        }))

        setLawyerInternalTypes(internalLawyers)
        setResponsibleLawyerTypes(responsibleLawyers)
      } catch (error) {
        console.error("Error fetching lawyers:", error)
        setLawyerInternalTypes([])
        setResponsibleLawyerTypes([])
      }
    }

    if (session?.user?.accessToken) {
      fetchLawyers()
    }
  }, [session?.user?.accessToken])

  // Format date for API
  const formatDateForApi = useCallback((dateString: string) => {
    if (!dateString) return undefined
    const date = new Date(dateString)
    return date.toISOString().split("T")[0]
  }, [])

  // Memoize the fetch function to prevent unnecessary recreations
  const fetchCases = useCallback(
    async (
      page: number,
      search: string,
      serviceId?: number,
      stageId?: number,
      fromDate?: string,
      toDate?: string,
      representativeLawyerIds?: string[],
      internalLawyerIds?: string[],
      showArchivedCasesOnly?: boolean, // Updated parameter name
    ) => {
      try {
        setIsLoading(true)
        const url = new URL(`${CASES_ENDPOINT}`, window.location.origin)
        url.searchParams.append("page", page.toString())
        url.searchParams.append("limit", "10")

        if (search) {
          url.searchParams.append("search", search)
          setHasSearched(true)
        } else {
          setHasSearched(false)
        }

        if (serviceId !== undefined) {
          url.searchParams.append("servicesId", serviceId.toString())
        }

        if (stageId !== undefined) {
          // Si se seleccionó una etapa específica del dropdown, esa tiene prioridad.
          url.searchParams.append("stageId", stageId.toString())
        } else if (showArchivedCasesOnly) {
          // Si no se seleccionó una etapa específica Y el switch "Mostrar Archivados" está ON,
          // entonces se muestran SÓLO los casos con stageId 6 (Archivados/Cerrados).
          url.searchParams.append("stageId", "6")
        } else {
          // Si no se seleccionó una etapa específica Y el switch "Mostrar Archivados" está OFF,
          // entonces se EXCLUYEN los casos con stageId 6 (se muestran 1,2,3,4,5).
          // IMPORTANTE: Asegúrate de que tu backend soporta el parámetro 'excludeStageId'.
          // Si no lo soporta, necesitarás ajustar la lógica del backend o filtrar en el frontend.
          url.searchParams.append("excludeStageId", "6")
        }

        // Debug logs
        console.log("Frontend - Representative Lawyer IDs:", representativeLawyerIds)
        console.log("Frontend - Internal Lawyer IDs:", internalLawyerIds)

        // Fix: Handle both arrays and ensure they exist and have values
        if (representativeLawyerIds && representativeLawyerIds.length > 0) {
          // Ensure it's an array
          const repIds = Array.isArray(representativeLawyerIds) ? representativeLawyerIds : [representativeLawyerIds]
          repIds.forEach((id) => {
            if (id) {
              url.searchParams.append("representativeLawyerId", id.toString())
              console.log("Adding representativeLawyerId:", id)
            }
          })
        }

        if (internalLawyerIds && internalLawyerIds.length > 0) {
          // Ensure it's an array
          const intIds = Array.isArray(internalLawyerIds) ? internalLawyerIds : [internalLawyerIds]
          intIds.forEach((id) => {
            if (id) {
              url.searchParams.append("internalLawyerId", id.toString())
              console.log("Adding internalLawyerId:", id)
            }
          })
        }

        // Add date range parameters if they exist
        if (fromDate) {
          url.searchParams.append("fromDate", fromDate)
        }

        if (toDate) {
          url.searchParams.append("toDate", toDate)
        }

        console.log("Final URL:", url.toString())

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Error response:", errorData)
          throw new Error(errorData.message || "Failed to fetch cases")
        }

        const result: ApiResponse = await response.json()
        setCases(result.data)

        // 🔧 SOLUCIÓN TEMPORAL: Corregir metadatos incorrectos del backend
        const correctedPagination = {
          page: result.meta.page || page,
          limit: result.meta.limit || 10,
          total: result.meta.total,
          totalPages: result.meta.totalPages,
        }

        // Si los metadatos están mal (total = 0 pero hay datos), hacer una estimación
        if (correctedPagination.total === 0 && result.data.length > 0) {
          console.warn("⚠️ Backend devolvió metadatos incorrectos. Usando estimación temporal.")

          // Si tenemos datos completos en la página actual, probablemente hay más páginas
          if (result.data.length === correctedPagination.limit) {
            // Estimación conservadora: al menos hay una página más
            correctedPagination.total = page * correctedPagination.limit + 1
            correctedPagination.totalPages = page + 1
          } else {
            // Esta es probablemente la última página
            correctedPagination.total = (page - 1) * correctedPagination.limit + result.data.length
            correctedPagination.totalPages = page
          }
        }

        setPagination(correctedPagination)

        console.log("📊 Pagination state:", correctedPagination)
      } catch (error) {
        console.error("Error al cargar los casos:", error)
        toast.error(`Error al cargar los casos: ${(error as Error).message}`)
      } finally {
        setIsLoading(false)
      }
    },
    [session?.user?.accessToken],
  )

  // Load view mode preference once on component mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem("casosViewMode")
    if (savedViewMode === "card" || savedViewMode === "list") {
      setViewMode(savedViewMode as "card" | "list")
    }
  }, [])

  // Save view mode preference
  const handleViewModeChange = useCallback((mode: "card" | "list") => {
    setViewMode(mode)
    localStorage.setItem("casosViewMode", mode)
  }, [])

  // Function to update URL with current filters
  const updateURL = useCallback(
    (filters: {
      search?: string
      service?: number
      stage?: number
      page?: number
      repLawyers?: string[]
      intLawyers?: string[]
      dateFrom?: string
      dateTo?: string
      showArchivedOnly?: boolean
    }) => {
      const params = new URLSearchParams()

      if (filters.search) params.set("search", filters.search)
      if (filters.service !== undefined) params.set("service", filters.service.toString())
      if (filters.stage !== undefined) params.set("stage", filters.stage.toString())
      if (filters.page !== undefined && filters.page > 1) params.set("page", filters.page.toString())

      if (filters.repLawyers && Array.isArray(filters.repLawyers) && filters.repLawyers.length > 0) {
        params.set("repLawyers", filters.repLawyers.join(","))
      }

      if (filters.intLawyers && Array.isArray(filters.intLawyers) && filters.intLawyers.length > 0) {
        params.set("intLawyers", filters.intLawyers.join(","))
      }

      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)
      if (filters.showArchivedOnly) params.set("showArchivedOnly", "true")

      const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname
      router.replace(newURL, { scroll: false })

      // Guardar también en localStorage
      saveFiltersToStorage({
        searchTerm: filters.search || "",
        selectedService: filters.service,
        selectedStage: filters.stage,
        selectedRepresentativeLawyer: filters.repLawyers || [],
        selectedInternalLawyer: filters.intLawyers || [],
        dateFrom: filters.dateFrom || "",
        dateTo: filters.dateTo || "",
        showArchivedOnly: filters.showArchivedOnly || false,
        currentPage: filters.page || 1,
      })
    },
    [router, saveFiltersToStorage],
  )

  // Load filters from storage or URL when lawyers data is available
  useEffect(() => {
    // Solo cargar si tenemos datos de abogados y no hemos cargado desde storage
    if ((responsibleLawyerTypes.length > 0 || lawyerInternalTypes.length > 0) && !hasLoadedFromStorage.current) {
      // Intentar cargar desde localStorage primero, luego desde URL
      const appliedFilters = applyFiltersFromSource('storage')
      hasLoadedFromStorage.current = true

      // Si cargamos filtros, actualizar la URL para mantener sincronización
      if (appliedFilters) {
        updateURL({
          search: appliedFilters.searchTerm,
          service: appliedFilters.selectedService,
          stage: appliedFilters.selectedStage,
          page: appliedFilters.currentPage,
          repLawyers: appliedFilters.selectedRepresentativeLawyer,
          intLawyers: appliedFilters.selectedInternalLawyer,
          dateFrom: appliedFilters.dateFrom,
          dateTo: appliedFilters.dateTo,
          showArchivedOnly: appliedFilters.showArchivedOnly,
        })
      }
    }
  }, [responsibleLawyerTypes, lawyerInternalTypes, applyFiltersFromSource, updateURL])

  // Initial fetch after lawyers are loaded and filters are set
  useEffect(() => {
    if (isInitialRender.current && responsibleLawyerTypes.length > 0 && lawyerInternalTypes.length > 0 && hasLoadedFromStorage.current) {
      fetchCases(
        currentPage,
        searchTerm,
        selectedService,
        selectedStage,
        formatDateForApi(dateFrom),
        formatDateForApi(dateTo),
        selectedRepresentativeLawyer,
        selectedInternalLawyer,
        showArchivedOnly,
      )
      isInitialRender.current = false
    }
  }, [responsibleLawyerTypes, lawyerInternalTypes, hasLoadedFromStorage, currentPage, searchTerm, selectedService, selectedStage, dateFrom, dateTo, selectedRepresentativeLawyer, selectedInternalLawyer, showArchivedOnly, fetchCases, formatDateForApi])

  // Handle search term changes with debouncing - MEJORADO
  useEffect(() => {
    // Solo ejecutar si no es el renderizado inicial y ya hemos cargado desde storage
    if (isInitialRender.current || !hasLoadedFromStorage.current) return

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set a new timeout
    searchTimeoutRef.current = setTimeout(() => {
      // Update URL with current filters
      updateURL({
        search: searchTerm,
        service: selectedService,
        stage: selectedStage,
        page: 1, // Reset to page 1 when filters change
        repLawyers: selectedRepresentativeLawyer,
        intLawyers: selectedInternalLawyer,
        dateFrom: dateFrom,
        dateTo: dateTo,
        showArchivedOnly: showArchivedOnly,
      })

      fetchCases(
        1,
        searchTerm,
        selectedService,
        selectedStage,
        formatDateForApi(dateFrom),
        formatDateForApi(dateTo),
        selectedRepresentativeLawyer,
        selectedInternalLawyer,
        showArchivedOnly,
      )
      setCurrentPage(1) // Reset to first page when search term changes
    }, 500) // 500ms debounce

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [
    searchTerm,
    selectedService,
    selectedStage,
    selectedRepresentativeLawyer,
    selectedInternalLawyer,
    dateFrom,
    dateTo,
    showArchivedOnly,
    updateURL,
    fetchCases,
    formatDateForApi
  ])

  const handleClearSearch = useCallback(() => {
    setSearchTerm("")
    setSelectedService(undefined)
    setSelectedStage(undefined)
    setSelectedRepresentativeLawyer([])
    setSelectedInternalLawyer([])
    setHasSearched(false)
    setDateFrom("")
    setDateTo("")
    setShowArchivedOnly(false) // Reset the switch
    setCurrentPage(1) // Also reset current page

    // Limpiar localStorage también
    try {
      localStorage.removeItem('casesFilters')
    } catch (error) {
      console.warn('No se pudo limpiar localStorage:', error)
    }

    // Clear URL params
    router.replace(window.location.pathname, { scroll: false })
  }, [router])

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        const response = await fetch(`${CASES_ENDPOINT}/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to delete case")
        }

        toast.success("Caso eliminado correctamente")
        fetchCases(
          currentPage,
          searchTerm,
          selectedService,
          selectedStage,
          formatDateForApi(dateFrom),
          formatDateForApi(dateTo),
          selectedRepresentativeLawyer,
          selectedInternalLawyer,
          showArchivedOnly,
        )
      } catch (error) {
        console.error("Error al eliminar el caso:", error)
        toast.error("Error al eliminar el caso")
      }
    },
    [
      session?.user?.accessToken,
      currentPage,
      searchTerm,
      selectedService,
      selectedStage,
      selectedRepresentativeLawyer,
      selectedInternalLawyer,
      formatDateForApi,
      dateFrom,
      dateTo,
      showArchivedOnly,
      fetchCases
    ],
  )

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    // Update URL with new page number
    updateURL({
      search: searchTerm,
      service: selectedService,
      stage: selectedStage,
      page: page,
      repLawyers: selectedRepresentativeLawyer,
      intLawyers: selectedInternalLawyer,
      dateFrom: dateFrom,
      dateTo: dateTo,
      showArchivedOnly: showArchivedOnly,
    })
  }, [searchTerm, selectedService, selectedStage, selectedRepresentativeLawyer, selectedInternalLawyer, dateFrom, dateTo, showArchivedOnly, updateURL])

  // Agregar efecto para guardar filtros cuando cambien
  useEffect(() => {
    if (!isInitialRender.current && hasLoadedFromStorage.current) {
      saveFiltersToStorage({
        searchTerm,
        selectedService,
        selectedStage,
        selectedRepresentativeLawyer,
        selectedInternalLawyer,
        dateFrom,
        dateTo,
        showArchivedOnly,
        currentPage,
      })
    }
  }, [
    searchTerm,
    selectedService,
    selectedStage,
    selectedRepresentativeLawyer,
    selectedInternalLawyer,
    dateFrom,
    dateTo,
    showArchivedOnly,
    currentPage,
    saveFiltersToStorage
  ])

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedService !== undefined ||
    selectedStage !== undefined ||
    (selectedRepresentativeLawyer && selectedRepresentativeLawyer.length > 0) ||
    (selectedInternalLawyer && selectedInternalLawyer.length > 0) ||
    dateFrom ||
    dateTo ||
    showArchivedOnly,
  )

  // Loading state
  if (isLoading && cases.length === 0 && !hasSearched) {
    return (
      <div>
        <div className="flex h-full flex-1 flex-col justify-center items-center gap-4 rounded-xl p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Empty state - only show for initial load with no data and no search
  // if (cases.length === 0 && !hasActiveFilters && !isLoading) {
  //   return (
  //     <DataNotFound
  //       error={"No hay casos disponibles."}
  //       description={"No se encontraron casos en la base de datos."}
  //       buttonText={"Crear caso"}
  //       icon={<Plus className="mr-2 h-4 w-4" />}
  //       pathname="/admin/legal-cases/new"
  //     />
  //   )
  // }

  return (
    <div>
      <div className="flex flex-col gap-6 mb-2">
        <CasesHeader title="Gestor de casos" />

        <CasesFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          selectedStage={selectedStage}
          setSelectedStage={setSelectedStage}
          selectedRepresentativeLawyer={selectedRepresentativeLawyer}
          setSelectedRepresentativeLawyer={setSelectedRepresentativeLawyer}
          selectedInternalLawyer={selectedInternalLawyer}
          setSelectedInternalLawyer={setSelectedInternalLawyer}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          hasActiveFilters={hasActiveFilters}
          handleClearSearch={handleClearSearch}
          viewMode={viewMode}
          handleViewModeChange={handleViewModeChange}
          responsibleLawyerTypes={responsibleLawyerTypes}
          lawyerInternalTypes={lawyerInternalTypes}
          showArchivedOnly={showArchivedOnly} // Pass the updated prop
          setShowArchivedOnly={setShowArchivedOnly} // Pass the updated setter
        />
      </div>

      {/* Show loading overlay when refreshing data */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {viewMode === "card" ? (
        <CasesCardView cases={cases} hasActiveFilters={hasActiveFilters} handleClearSearch={handleClearSearch} />
      ) : (
        <CasesListView
          cases={cases}
          hasActiveFilters={hasActiveFilters}
          handleClearSearch={handleClearSearch}
          handleDelete={handleDelete}
        />
      )}

      {/* 🔧 Mostrar paginación mejorada */}
      {pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}
