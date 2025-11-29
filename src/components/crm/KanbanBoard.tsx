"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
    Plus,
    Search,
    X,
    ChevronUp,
    Users,
    Briefcase,
    ListFilterIcon as ListFilterPlus,
    SquareKanban,
    List,
    KanbanSquare,
} from "lucide-react"

import LeadCard from "@/components/crm/LeadCard"
import LeadFormDialog from "@/components/crm/LeadFormDialog"
import CrmMonthlyFilters from "@/components/crm/CrmMonthlyFilters"
import CrmStatisticsWidget from "@/components/crm/CrmStatisticsWidget"
import type { Lead } from "@/types/crm"
import Input from "../ui/input/Input"
import Button from "../ui/button/Button"
import Badge from "../ui/badge/Badge"

import { CRM_COLUMNS } from "@/constant/crm"

import { servicesType } from "@/lib/constant"
import { LEADS_ENDPOINT, LAWYERS_ENDPOINT, SELLERS_ENDPOINT, USERS_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
// Add this import at the top of the file
import { Role } from "@/constant/user"
import KanbanList from "./KanbanList"
import Switch from "../ui/switch/Switch"
import Can from "../auth/Can"

// Tipos para los filtros

type LawyerType = {
    id: string
    value: string
    label: string
}

export default function KanbanBoard() {
    const { data: session } = useSession()
    const [leads, setLeads] = useState<Lead[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [currentLead, setCurrentLead] = useState<Lead | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Dropdown states
    const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false)
    const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false)
    const [isLawyerInternalDropdownOpen, setIsLawyerInternalDropdownOpen] = useState(false)
    const [isResponsibleLawyerDropdownOpen, setIsResponsibleLawyerDropdownOpen] = useState(false)
    const [isReferentLawyerDropdownOpen, setIsReferentLawyerDropdownOpen] = useState(false)

    // Refs para los dropdowns
    const serviceDropdownRef = useRef<HTMLDivElement>(null)
    const sellerDropdownRef = useRef<HTMLDivElement>(null)
    const lawyerInternalDropdownRef = useRef<HTMLDivElement>(null)
    const responsibleLawyerDropdownRef = useRef<HTMLDivElement>(null)
    const referentLawyerDropdownRef = useRef<HTMLDivElement>(null)

    // Filter states
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedService, setSelectedService] = useState<number | undefined>(undefined)
    const [selectedSeller, setSelectedSeller] = useState<string | undefined>(undefined)
    const [selectedLawyerInternal, setSelectedLawyerInternal] = useState<string | undefined>(undefined)
    const [selectedResponsibleLawyer, setSelectedResponsibleLawyer] = useState<string | undefined>(undefined)
    const [selectedReferent, setSelectedReferent] = useState<string | undefined>(undefined)

    // Monthly filter states
    const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0"))
    const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))

    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingSeller, setIsLoadingSellers] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // And replace with this implementation:
    const [sellerTypes, setSellerTypes] = useState<LawyerType[]>([])
    const [lawyerInternalTypes, setLawyerInternalTypes] = useState<LawyerType[]>([])
    const [responsibleLawyerTypes, setResponsibleLawyerTypes] = useState<LawyerType[]>([])
    const [referentTypes, setReferentTypes] = useState<LawyerType[]>([])


    // Add a state to track the current user's roles
    const [userRoles, setUserRoles] = useState<string[]>([])

    const [view, setView] = useState<"kanban" | "list">("kanban")

    // Add after the existing state declarations
    const [showAllLeads, setShowAllLeads] = useState(false)
    const [hideFinalColumns, setHideFinalColumns] = useState(true)

    // Check if current user has seller roles that can see all leads
    const canViewAllLeads = useMemo(() => {
        if (!session?.user?.role) return false

        const sellerRoles = [
            Role.DIRECTORA_AREA_VENTAS,
            Role.DIRECTOR_GENERAL_CEO,
            Role.GERENTE_GENERAL_COO,
            Role.DIRECTORA_AREA_VENTAS,
            Role.COORDINADOR_VENTAS,
            Role.GERENTE_VENTAS,
            Role.EJECUTIVO_VENTAS,
            Role.REPRESENTANTE_VENTAS,
            Role.ANALISTA_VENTAS,
            Role.ASISTENTE_LEGAL,
            Role.COORDINADOR_LEGAL,
            Role.DIRECTOR_AREA_IT
        ]

        return sellerRoles.some((role) => role === session.user.role)
    }, [session?.user?.role])

    // Map status to columnId
    const getColumnIdFromStatus = (status: string): number => {
        switch (status) {
            case "IN_PROGRESS":
                return 1
            case "WON":
                return 2
            case "LOST":
                return 3
            default:
                return 1
        }
    }

    // Función para verificar si el usuario actual puede evitar la validación de documentación
    const canBypassDocumentationValidation = useMemo(() => {
        if (!session?.user?.role) return false

        const sellerRoles = [
            Role.DIRECTORA_AREA_VENTAS,
            Role.COORDINADOR_VENTAS,
            Role.GERENTE_VENTAS,
            Role.EJECUTIVO_VENTAS,
            Role.REPRESENTANTE_VENTAS,
            Role.ANALISTA_VENTAS,
        ]

        return sellerRoles.includes(session.user.role as Role)
    }, [session?.user?.role])

    // Add helper functions to map service IDs to labels and priorities
    const fetchLeads = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Construir URL con parámetros de filtro mensual
            const url = new URL(`${LEADS_ENDPOINT}`, window.location.origin)
            if (monthFilter && yearFilter) {
                url.searchParams.append("month", monthFilter)
                url.searchParams.append("year", yearFilter)
            }

            const response = await fetch(url.toString(), {
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

            // Replace the existing filteredLeads logic with this:
            let filteredLeads = data

            // Only apply user-based filtering if showAllLeads is false OR user doesn't have permission
            if (!showAllLeads || !canViewAllLeads) {
                const userId = Number(session?.user?.id)
                filteredLeads = data.filter((item: any) => {
                    return item.sellerId === userId || item.internalLawyerId === userId || item.responsibleLawyerId === userId || item.referentId === userId
                })
            }

            // Después mapeamos los leads filtrados
            const mappedLeads = filteredLeads.map((item: any) => {
                const columnId = item.columnId || getColumnIdFromStatus(item.status)

                return {
                    id: item.id.toString(),
                    name: item.user?.name || "", // Cambio: item.contact?.name -> item.user?.name
                    company: item.user?.userAddresses?.[0]?.city || "", // Cambio: item.contact?.city -> item.user?.userAddresses?.[0]?.city
                    email: item.user?.email || "", // Cambio: item.contact?.email -> item.user?.email
                    phone: item.user?.userProfile?.phone || "", // Cambio: item.user?.profile.phone -> item.user?.userProfile?.phone
                    userId: item.userId,
                    sellerId: item.sellerId,
                    internalLawyerId: item.internalLawyerId,
                    responsibleLawyerId: item.responsibleLawyerId,
                    servicesId: item.servicesId,
                    sourceChannelId: item.sourceChannelId,
                    status: item.status,
                    columnId: columnId,
                    notes: item.notes,
                    documentationComplete: item.documentationComplete,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    services: {
                        values: item.servicesId,
                        label: getServiceLabel(item.servicesId),
                    },
                    seller: item.seller,
                    user: item.user, // Agregar el objeto user completo
                    internalLawyer: item.internalLawyer,
                    responsibleLawyer: item.responsibleLawyer,
                    referent: item.referent,
                }
            })

            setLeads(mappedLeads)
        } catch (error) {
            console.error("Error fetching leads:", error)
            setError(error instanceof Error ? error.message : "Error desconocido al cargar los leads")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLeads()
    }, [session?.user?.accessToken, session?.user?.id, showAllLeads, canViewAllLeads, monthFilter, yearFilter])

    const getServiceLabel = (serviceId: number) => {
        const service = servicesType.find((s) => s.value === serviceId)
        return service ? service.label : "Servicio desconocido"
    }

    useEffect(() => {
        const fetchSellers = async () => {
            setIsLoadingSellers(true)
            try {
                const response = await fetch(SELLERS_ENDPOINT, {
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

                // Define the roles for each category
                const sellerRoles = [
                    Role.DIRECTORA_AREA_VENTAS,
                    Role.COORDINADOR_VENTAS,
                    Role.GERENTE_VENTAS,
                    Role.EJECUTIVO_VENTAS,
                    Role.REPRESENTANTE_VENTAS,
                    Role.ANALISTA_VENTAS,
                ]

                // Map sellers to the format we need
                // Sellers
                const filteredSellers = data.filter((user: any) =>
                    user.roleUser.some((ru: any) => sellerRoles.includes(ru.role.name)),
                )

                const sellers = filteredSellers.map((user: any) => ({
                    id: user.id.toString(),
                    value: user.id.toString(),
                    label: user.name,
                }))

                setSellerTypes(sellers)
            } catch (error) {
                console.error("Error fetching sellers:", error)
                // Fallback to hardcoded data in case of error
                setSellerTypes([])
            } finally {
                setIsLoadingSellers(false)
            }
        }

        if (session?.user?.accessToken) {
            fetchSellers()
        }
    }, [session?.user?.accessToken])

    // Add this useEffect to fetch lawyers data
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

                // Responsible Lawyers
                const filteredResponsibleLawyers = data.filter((user: any) =>
                    user.roleUser.some((ru: any) => responsibleLawyerRoles.includes(ru.role.name)),
                )

                const responsibleLawyers = filteredResponsibleLawyers.map((user: any) => ({
                    id: user.id.toString(),
                    value: user.id.toString(),
                    label: user.name,
                }))

                setLawyerInternalTypes(internalLawyers)
                setResponsibleLawyerTypes(responsibleLawyers)
            } catch (error) {
                console.error("Error fetching lawyers:", error)
            }
        }

        if (session?.user?.accessToken) {
            fetchLawyers()
        }
    }, [session?.user?.accessToken])

    useEffect(() => {
        const fetchReferents = async () => {
            try {
                const response = await fetch(`${USERS_ENDPOINT}?limit=100000`, {
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

                const filteredReferents = data.filter((user: any) =>
                    user.roleUser.some((ru: any) => ru.role.name === Role.REFERENTES),
                )

                const referents = filteredReferents.map((user: any) => ({
                    id: user.id.toString(),
                    value: user.id.toString(),
                    label: user.name,
                }))

                setReferentTypes(referents)
            } catch (error) {
                console.error("Error fetching referents:", error)
            }
        }

        if (session?.user?.accessToken) {
            fetchReferents()
        }
    }, [session?.user?.accessToken])

    // Efecto para cerrar dropdowns al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Cerrar dropdown de servicio si está abierto y se hace clic fuera
            if (
                isServiceDropdownOpen &&
                serviceDropdownRef.current &&
                !serviceDropdownRef.current.contains(event.target as Node)
            ) {
                setIsServiceDropdownOpen(false)
            }

            // Cerrar dropdown de vendedor si está abierto y se hace clic fuera
            if (
                isSellerDropdownOpen &&
                sellerDropdownRef.current &&
                !sellerDropdownRef.current.contains(event.target as Node)
            ) {
                setIsSellerDropdownOpen(false)
            }

            // Cerrar dropdown de abogado interno si está abierto y se hace clic fuera
            if (
                isLawyerInternalDropdownOpen &&
                lawyerInternalDropdownRef.current &&
                !lawyerInternalDropdownRef.current.contains(event.target as Node)
            ) {
                setIsLawyerInternalDropdownOpen(false)
            }

            // Cerrar dropdown de abogado responsable si está abierto y se hace clic fuera
            if (
                isResponsibleLawyerDropdownOpen &&
                responsibleLawyerDropdownRef.current &&
                !responsibleLawyerDropdownRef.current.contains(event.target as Node)
            ) {
                setIsResponsibleLawyerDropdownOpen(false)
            }

            // Cerrar dropdown de referente si está abierto y se hace clic fuera
            if (
                isReferentLawyerDropdownOpen &&
                referentLawyerDropdownRef.current &&
                !referentLawyerDropdownRef.current.contains(event.target as Node)
            ) {
                setIsReferentLawyerDropdownOpen(false)
            }
        }

        // Añadir el evento solo si algún dropdown está abierto
        if (
            isServiceDropdownOpen ||
            isSellerDropdownOpen ||
            isLawyerInternalDropdownOpen ||
            isResponsibleLawyerDropdownOpen ||
            isReferentLawyerDropdownOpen
        ) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isServiceDropdownOpen, isSellerDropdownOpen, isLawyerInternalDropdownOpen, isResponsibleLawyerDropdownOpen, isReferentLawyerDropdownOpen])

    // Funciones para manejar la selección en los dropdowns
    const handleServiceSelect = (value: number | undefined) => {
        setSelectedService(value)
        setIsServiceDropdownOpen(false)
    }

    const handleSellerSelect = (value: string | undefined) => {
        setSelectedSeller(value)
        setIsSellerDropdownOpen(false)
    }

    const handleLawyerInternalSelect = (value: string | undefined) => {
        setSelectedLawyerInternal(value)
        setIsLawyerInternalDropdownOpen(false)
    }

    const handleResponsibleLawyerSelect = (value: string | undefined) => {
        setSelectedResponsibleLawyer(value)
        setIsResponsibleLawyerDropdownOpen(false)
    }

    const handleReferentLawyerSelect = (value: string | undefined) => {
        setSelectedReferent(value)
        setIsReferentLawyerDropdownOpen(false)
    }

    // Funciones para obtener nombres a partir de valores
    const getServiceName = (value: number) => {
        const service = servicesType.find((s) => s.value === value)
        return service ? service.label : value
    }

    const getSellerName = (value: string) => {
        const seller = sellerTypes.find((s) => s.value === value)
        return seller ? seller.label : value
    }

    const getLawyerInternalName = (value: string) => {
        const lawyer = lawyerInternalTypes.find((l) => l.value === value)
        return lawyer ? lawyer.label : value
    }

    const getResponsibleLawyerName = (value: string) => {
        const lawyer = responsibleLawyerTypes.find((l) => l.value === value)
        return lawyer ? lawyer.label : value
    }

    const getReferentName = (value: string) => {
        const lawyer = referentTypes.find((l) => l.value === value)
        return lawyer ? lawyer.label : value
    }

    // Apply filters to leads - FIXED to match the actual data structure
    const filteredLeads = useMemo(() => {
        return leads.filter((lead) => {
            // Search filter - only apply if searchQuery is not empty
            if (searchQuery && lead.user && !lead.user.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false
            }

            // Service filter - only apply if selectedService is defined
            if (selectedService && lead.servicesId !== selectedService) {
                return false
            }

            // Seller filter - only apply if selectedSeller is defined
            if (selectedSeller && lead.sellerId !== Number(selectedSeller)) {
                return false
            }

            // Lawyer Internal filter - only apply if selectedLawyerInternal is defined
            if (selectedLawyerInternal && lead.internalLawyerId !== Number(selectedLawyerInternal)) {
                return false
            }

            // Responsible Lawyer filter - only apply if selectedResponsibleLawyer is defined
            if (selectedResponsibleLawyer && lead.responsibleLawyerId !== Number(selectedResponsibleLawyer)) {
                return false
            }

            // Referent filter - only apply if selectedReferent is defined
            if (selectedReferent && lead.referentId !== Number(selectedReferent)) {
                return false
            }

            return true
        })
    }, [leads, searchQuery, selectedService, selectedSeller, selectedLawyerInternal, selectedResponsibleLawyer, selectedReferent])

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        if (!destination) return

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return
        }

        const leadBeingDragged = leads.find((lead) => lead.id.toString() === draggableId)
        if (!leadBeingDragged) return

        // Solo aplicar la validación de documentación si el usuario NO tiene permisos de ventas
        if (
            destination.droppableId === "9" &&
            !leadBeingDragged.documentationComplete &&
            !canBypassDocumentationValidation
        ) {
            alert("Esta oportunidad no puede marcarse como ganada porque falta documentación requerida.")
            return
        }

        // Determinar el nuevo status
        let newStatus: "WON" | "LOST" | "IN_PROGRESS" = leadBeingDragged.status

        if (destination.droppableId === "9") {
            newStatus = "WON"
        } else if (destination.droppableId === "10") {
            newStatus = "LOST"
        } else if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(destination.droppableId)) {
            newStatus = "IN_PROGRESS"
        }

        const newColumnId = Number.parseInt(destination.droppableId)

        // Actualización visual inmediata
        const updatedLeads = leads.map((lead) =>
            lead.id.toString() === draggableId ? { ...lead, status: newStatus, columnId: newColumnId } : lead,
        )

        setLeads(updatedLeads)

        // Persistir cambio en backend
        try {
            await fetch(`${LEADS_ENDPOINT}/${draggableId}/column`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    columnId: newColumnId,
                    status: newStatus,
                    userId: session?.user?.id,
                }),
            })

            toast.success("Etapa actualizada correctamente")
        } catch (error) {
            console.error("Error actualizando lead en backend:", error)
            // Si querés, podrías volver atrás el cambio en caso de error
        }
    }

    const handleAddLead = () => {
        setCurrentLead(null)
        setIsFormOpen(true)
    }

    const handleEditLead = (lead: Lead) => {
        setCurrentLead(lead)
        setIsFormOpen(true)
    }

    const handleDeleteLead = async (id: string) => {
        try {
            const response = await fetch(`${LEADS_ENDPOINT}/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`)
            }

            // Recargar los datos después de eliminar exitosamente
            await fetchLeads()
            toast.success("Lead eliminado correctamente")
        } catch (error) {
            console.error("Error deleting lead:", error)
            toast.error("Error al eliminar el lead")
        }
    }

    const clearFilters = () => {
        setSearchQuery("")
        setSelectedService(undefined)
        setSelectedSeller(undefined)
        setSelectedLawyerInternal(undefined)
        setSelectedResponsibleLawyer(undefined)
        setSelectedReferent(undefined)
    }

    const handleChangeView = () => {
        // Toggle between grid and list views
        setView(view === "kanban" ? "list" : "kanban")
    }

    console.log(canViewAllLeads)

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                    <SquareKanban className="h-6 w-6 inline-block mr-2" />
                    Embudo
                </h2>
                <div className="flex items-center gap-4">
                    {canViewAllLeads && (
                        <Switch
                            id="show-all-leads"
                            label="Ver todas las oportunidades"
                            defaultChecked={showAllLeads}
                            onChange={(checked) => setShowAllLeads(checked)}
                            color="blue"
                        />
                    )}
                    <Can role="asistente_legal" inverse>
                        <Switch
                            id="hide-final-columns"
                            label="Ocultar columnas finales"
                            defaultChecked={hideFinalColumns}
                            onChange={(checked) => setHideFinalColumns(checked)}
                            color="blue"
                        />
                        <Button
                            onClick={handleAddLead}
                            variant="custom"
                            className="bg-brand-500 text-white hover:bg-brand-500/85 dark:text-gray-900 py-2 px-2 mt-2"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo Lead
                        </Button>
                    </Can>
                </div>
            </div>

            {/* Monthly Filters */}
            <div className="mb-6">
                <CrmMonthlyFilters
                    monthFilter={monthFilter}
                    setMonthFilter={setMonthFilter}
                    yearFilter={yearFilter}
                    setYearFilter={setYearFilter}
                    onFiltersChange={(filters) => {
                        // Los filtros ya se actualizan por useState
                        console.log("Filtros mensuales actualizados:", filters)
                    }}
                    className="flex-wrap"
                />
            </div>

            {/* Statistics Widget */}
            <div className="mb-6">
                <CrmStatisticsWidget
                    monthFilter={monthFilter}
                    yearFilter={yearFilter}
                    defaultCollapsed={false}
                />
            </div>

            {/* New search and filter bar */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-1" />
                    <Input
                        placeholder="Buscar caso..."
                        className="pl-10 h-10 w-full bg-white dark:bg-gray-800"
                        defaultValue={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap">
                    {/* Filtro de Tipo de servicio */}
                    <div className="relative" ref={serviceDropdownRef}>
                        <button
                            onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                            <span className="flex items-center gap-2 text-gray-700">
                                <ListFilterPlus className="h-4 w-4 text-gray-500" />
                                {selectedService !== undefined ? getServiceName(selectedService) : "Tipo de servicio"}
                            </span>
                            <ChevronUp
                                className={isServiceDropdownOpen ? "rotate-180 h-4 w-4 text-gray-500" : "h-4 w-4 text-gray-500"}
                            />
                        </button>

                        {isServiceDropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                <div
                                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                                    onClick={() => handleServiceSelect(undefined)}
                                >
                                    Todos los servicios
                                </div>
                                {servicesType.map((service) => (
                                    <div
                                        key={service.id}
                                        className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 ${selectedService === service.value ? "bg-gray-100 font-medium" : ""
                                            }`}
                                        onClick={() => handleServiceSelect(service.value)}
                                    >
                                        {service.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filtro de Vendedor */}
                    <div className="relative" ref={sellerDropdownRef}>
                        <button
                            onClick={() => setIsSellerDropdownOpen(!isSellerDropdownOpen)}
                            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                            <span className="flex items-center gap-2 text-gray-700">
                                <Users className="h-4 w-4 text-gray-500" />
                                {selectedSeller !== undefined ? getSellerName(selectedSeller) : "Vendedor"}
                            </span>
                            <ChevronUp
                                className={isSellerDropdownOpen ? "rotate-180 h-4 w-4 text-gray-500" : "h-4 w-4 text-gray-500"}
                            />
                        </button>

                        {isSellerDropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                <div
                                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                                    onClick={() => handleSellerSelect(undefined)}
                                >
                                    Todos los vendedores
                                </div>
                                {isLoadingSeller ? (
                                    <div className="px-3 py-1.5 text-sm text-gray-500">Cargando...</div>
                                ) : (
                                    sellerTypes.map((seller) => (
                                        <div
                                            key={seller.id}
                                            className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 ${selectedSeller === seller.value ? "bg-gray-100 font-medium" : ""
                                                }`}
                                            onClick={() => handleSellerSelect(seller.value)}
                                        >
                                            {seller.label}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filtro de Abogado Interno */}
                    <div className="relative" ref={lawyerInternalDropdownRef}>
                        <button
                            onClick={() => setIsLawyerInternalDropdownOpen(!isLawyerInternalDropdownOpen)}
                            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                            <span className="flex items-center gap-2 text-gray-700">
                                <Briefcase className="h-4 w-4 text-gray-500" />
                                {selectedLawyerInternal !== undefined
                                    ? getLawyerInternalName(selectedLawyerInternal)
                                    : "Abogado Interno"}
                            </span>
                            <ChevronUp
                                className={isLawyerInternalDropdownOpen ? "rotate-180 h-4 w-4 text-gray-500" : "h-4 w-4 text-gray-500"}
                            />
                        </button>

                        {isLawyerInternalDropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                <div
                                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                                    onClick={() => handleLawyerInternalSelect(undefined)}
                                >
                                    Todos los abogados internos
                                </div>
                                {lawyerInternalTypes.map((lawyer) => (
                                    <div
                                        key={lawyer.id}
                                        className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 ${selectedLawyerInternal === lawyer.value ? "bg-gray-100 font-medium" : ""
                                            }`}
                                        onClick={() => handleLawyerInternalSelect(lawyer.value)}
                                    >
                                        {lawyer.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filtro de Abogado Responsable */}
                    <div className="relative" ref={responsibleLawyerDropdownRef}>
                        <button
                            onClick={() => setIsResponsibleLawyerDropdownOpen(!isResponsibleLawyerDropdownOpen)}
                            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                            <span className="flex items-center gap-2 text-gray-700">
                                <Users className="h-4 w-4 text-gray-500" />
                                {selectedResponsibleLawyer !== undefined
                                    ? getResponsibleLawyerName(selectedResponsibleLawyer)
                                    : "Abo. Responsable"}
                            </span>
                            <ChevronUp
                                className={
                                    isResponsibleLawyerDropdownOpen ? "rotate-180 h-4 w-4 text-gray-500" : "h-4 w-4 text-gray-500"
                                }
                            />
                        </button>

                        {isResponsibleLawyerDropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                <div
                                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                                    onClick={() => handleResponsibleLawyerSelect(undefined)}
                                >
                                    Todos los abogados responsables
                                </div>
                                {responsibleLawyerTypes.map((lawyer) => (
                                    <div
                                        key={lawyer.id}
                                        className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 ${selectedResponsibleLawyer === lawyer.value ? "bg-gray-100 font-medium" : ""
                                            }`}
                                        onClick={() => handleResponsibleLawyerSelect(lawyer.value)}
                                    >
                                        {lawyer.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filtro de Referente */}
                    <Can role="asistente_legal" inverse>
                        <div className="relative" ref={referentLawyerDropdownRef}>
                            <button
                                onClick={() => setIsReferentLawyerDropdownOpen(!isReferentLawyerDropdownOpen)}
                                className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm"
                            >
                                <span className="flex items-center gap-2 text-gray-700">
                                    <Users className="h-4 w-4 text-gray-500" />
                                    {selectedReferent !== undefined
                                        ? getReferentName(selectedReferent)
                                        : "Referente"}
                                </span>
                                <ChevronUp
                                    className={
                                        isReferentLawyerDropdownOpen ? "rotate-180 h-4 w-4 text-gray-500" : "h-4 w-4 text-gray-500"
                                    }
                                />
                            </button>

                            {isReferentLawyerDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                    <div
                                        className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                                        onClick={() => handleReferentLawyerSelect(undefined)}
                                    >
                                        Todos los referentes
                                    </div>
                                    {referentTypes.map((ref) => (
                                        <div
                                            key={ref.id}
                                            className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 ${selectedReferent === ref.value ? "bg-gray-100 font-medium" : ""
                                                }`}
                                            onClick={() => handleReferentLawyerSelect(ref.value)}
                                        >
                                            {ref.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Can>

                    {/* Botón de vista de cuadrícula */}
                    <button
                        className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
                        onClick={handleChangeView}
                        aria-label="Toggle view"
                    >
                        {view === "kanban" ? <List className="h-5 w-5" /> : <KanbanSquare className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {isLoading && <div className="text-center py-4">Cargando leads...</div>}
            {error && <div className="text-red-500 text-center py-4">Error: {error}</div>}

            {/* Active filters display */}
            {(selectedService !== undefined ||
                selectedSeller !== undefined ||
                selectedLawyerInternal !== undefined ||
                selectedResponsibleLawyer !== undefined ||
                selectedReferent !== undefined ||
                searchQuery) && (
                    <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                            {searchQuery && (
                                <Badge variant="light" className="flex items-center gap-1 bg-gray-100/80 px-3 py-1">
                                    Búsqueda: {searchQuery}
                                    <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSearchQuery("")} />
                                </Badge>
                            )}

                            {selectedService !== undefined && (
                                <Badge variant="light" className="flex items-center gap-1 bg-gray-100/80 px-3 py-1">
                                    Servicio: {getServiceName(selectedService)}
                                    <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSelectedService(undefined)} />
                                </Badge>
                            )}

                            {selectedSeller !== undefined && (
                                <Badge variant="light" className="flex items-center gap-1 bg-gray-100/80 px-3 py-1">
                                    Vendedor: {getSellerName(selectedSeller)}
                                    <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSelectedSeller(undefined)} />
                                </Badge>
                            )}

                            {selectedLawyerInternal !== undefined && (
                                <Badge variant="light" className="flex items-center gap-1 bg-gray-100/80 px-3 py-1">
                                    Abogado Interno: {getLawyerInternalName(selectedLawyerInternal)}
                                    <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSelectedLawyerInternal(undefined)} />
                                </Badge>
                            )}

                            {selectedResponsibleLawyer !== undefined && (
                                <Badge variant="light" className="flex items-center gap-1 bg-gray-100/80 px-3 py-1">
                                    Abo. Responsable: {getResponsibleLawyerName(selectedResponsibleLawyer)}
                                    <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSelectedResponsibleLawyer(undefined)} />
                                </Badge>
                            )}

                            {selectedReferent !== undefined && (
                                <Badge variant="light" className="flex items-center gap-1 bg-gray-100/80 px-3 py-1">
                                    Referente: {getReferentName(selectedReferent)}
                                    <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => setSelectedReferent(undefined)} />
                                </Badge>
                            )}

                            {(selectedService !== undefined ||
                                selectedSeller !== undefined ||
                                selectedLawyerInternal !== undefined ||
                                selectedResponsibleLawyer !== undefined ||
                                selectedReferent !== undefined) && (
                                    <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 flex items-center">
                                        Limpiar filtros
                                    </button>
                                )}
                        </div>
                    </div>
                )}

            {view === "kanban" ? (
                <>
                    <DragDropContext onDragEnd={handleDragEnd}>
                        {/* Kanban board container with navigation buttons */}
                        <div className="relative flex-1 overflow-hidden">
                            {/* Scrollable container */}
                            <div ref={scrollContainerRef} className="flex gap-4 pb-4 overflow-x-auto scrollbar-hide h-full">
                                {CRM_COLUMNS.filter((column) => {
                                    const columnIdNum = Number.parseInt(column.id, 10)
                                    // Si hideFinalColumns está activo, ocultar columnas 9, 10 y 11
                                    if (hideFinalColumns && (columnIdNum === 9 || columnIdNum === 10 || columnIdNum === 11)) {
                                        return false
                                    }
                                    return true
                                }).map((column) => {
                                    const columnLeads = filteredLeads.filter((lead) => {
                                        // Convert column ID to number for comparison
                                        const columnIdNum = Number.parseInt(column.id, 10)

                                        // Si hideFinalColumns está activo, ocultar columnas 9, 10 y 11
                                        if (hideFinalColumns && (columnIdNum === 9 || columnIdNum === 10 || columnIdNum === 11)) {
                                            return false
                                        }

                                        // For columns 1-8 (IN_PROGRESS)
                                        if (columnIdNum >= 1 && columnIdNum <= 8) {
                                            // Only show leads with IN_PROGRESS status AND matching columnId
                                            return lead.status === "IN_PROGRESS" && lead.columnId === columnIdNum
                                        }
                                        // For column 9 (WON)
                                        else if (columnIdNum === 9) {
                                            return lead.status === "WON"
                                        }
                                        // For column 10 (LOST)
                                        else if (columnIdNum === 10) {
                                            return lead.status === "LOST"
                                        }
                                        // For column 11 (if exists)
                                        else if (columnIdNum === 11) {
                                            return lead.columnId === columnIdNum
                                        }

                                        return false
                                    })

                                    return (
                                        <div
                                            key={column.id}
                                            className="bg-white dark:bg-gray-800/30 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full min-w-[300px] shrink-0 flex flex-col"
                                        >
                                            <div className="p-2.5 py-3 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-medium text-gray-900 dark:text-white">{column.title}</h3>
                                                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xs px-2 py-0.5 text-xs">
                                                        {columnLeads.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <Droppable droppableId={column.id}>
                                                {(provided) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className="flex-1 overflow-y-auto p-4 space-y-3"
                                                    >
                                                        {columnLeads.map((lead, index) => (
                                                            <Draggable key={lead.id.toString()} draggableId={lead.id.toString()} index={index}>
                                                                {(provided) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                    >
                                                                        <LeadCard
                                                                            lead={lead}
                                                                            onEdit={() => handleEditLead(lead)}
                                                                            onDelete={() => handleDeleteLead(lead.id.toString())}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </DragDropContext>
                </>
            ) : (
                <>
                    <KanbanList leads={filteredLeads} onEditLead={handleEditLead} onDeleteLead={handleDeleteLead} />
                </>
            )}

            <LeadFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} lead={currentLead} />
        </div>
    )
}
