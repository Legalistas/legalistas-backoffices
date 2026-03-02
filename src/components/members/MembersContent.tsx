"use client"
import type React from "react"
import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import Button from "../ui/button/Button"
import { Plus, Search, Filter, Users, Scale, Briefcase, UserCog, Activity } from "lucide-react"
import Input from "../ui/input/Input"
import { Pagination } from "../ui/pagination/Pagination"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { USERS_ENDPOINT, SETTINGS_ROLES_ENDPOINT, SETTINGS_COUNTRIES_ENDPOINT } from "@/constant/api-endpoints"
import type { User } from "@/types/users"
import { toast } from "sonner"
import MembersTable from "./MembersTable"
import RoleMultiSelect from "./RoleMultiSelect"
import { Modal } from "../ui/modal/Modal"

// Roles de clientes - NO son parte del equipo
const CLIENT_ROLES = [
    "cliente",
    "demandado",
    "interviniente_juicio",
    "abogado_contraparte",
    "reconociente",
    "oficiado"
]

// Roles legales/abogados
const LAWYER_ROLES = [
    "directora_area_legal",
    "coordinador_legal",
    "abogado_representante",
    "abogado_interno",
    "asistente_legal"
]

// Excluir de miembros del equipo (solo clientes)
const EXCLUDED_FROM_TEAM = CLIENT_ROLES

interface ApiResponse {
    data: User[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

type TabType = "all" | "lawyers" | "clients" | "staff"

interface MemberStats {
    total: number
    lawyers: number
    clients: number
    staff: number
}

export default function MembersContent() {
    const { data: session } = useSession()
    const router = useRouter()
    const [allMembers, setAllMembers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>("all")
    const [apiPagination, setApiPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    })
    const [hasSearched, setHasSearched] = useState(false)
    const [clientModalOpen, setClientModalOpen] = useState(false)
    const [editingMember, setEditingMember] = useState<User | null>(null)
    const [modalMode, setModalMode] = useState<"create" | "edit">("create")
    const [availableRoles, setAvailableRoles] = useState<any[]>([])
    const [availableCountries, setAvailableCountries] = useState<any[]>([])
    const [availableStates, setAvailableStates] = useState<any[]>([])
    const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null)

    const isInitialRender = useRef(true)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Calcular estadísticas de miembros
    const memberStats = useMemo<MemberStats>(() => {
        const stats = {
            total: 0, // Solo miembros del equipo (sin clientes)
            lawyers: 0,
            clients: 0,
            staff: 0,
        }

        allMembers.forEach((member) => {
            const roleSlug = member.roleUser?.[0]?.role?.slug?.toLowerCase() || ""
            const roleName = member.roleUser?.[0]?.role?.name?.toLowerCase() || ""
            
            // Verificar contra ambos campos para mayor compatibilidad
            const roleIdentifier = roleSlug || roleName

            // Contar clientes
            if (CLIENT_ROLES.includes(roleIdentifier)) {
                stats.clients++
            }
            // Contar miembros del equipo (no clientes)
            else {
                stats.total++

                // Contar abogados
                if (LAWYER_ROLES.includes(roleIdentifier)) {
                    stats.lawyers++
                }
                // El resto son staff
                else {
                    stats.staff++
                }
            }
        })

        return stats
    }, [allMembers])

    // Filtrado local de miembros
    const filteredMembers = useMemo(() => {
        let filtered = [...allMembers]

        // Filtrar por tab activo
        if (activeTab === "all") {
            // Solo miembros del equipo (excluir clientes)
            filtered = filtered.filter((member) => {
                const roleSlug = member.roleUser?.[0]?.role?.slug?.toLowerCase() || ""
                const roleName = member.roleUser?.[0]?.role?.name?.toLowerCase() || ""
                const roleIdentifier = roleSlug || roleName
                return !CLIENT_ROLES.includes(roleIdentifier)
            })
        } else {
            filtered = filtered.filter((member) => {
                const roleSlug = member.roleUser?.[0]?.role?.slug?.toLowerCase() || ""
                const roleName = member.roleUser?.[0]?.role?.name?.toLowerCase() || ""
                const roleIdentifier = roleSlug || roleName
                
                switch (activeTab) {
                    case "lawyers":
                        return LAWYER_ROLES.includes(roleIdentifier)
                    case "clients":
                        return CLIENT_ROLES.includes(roleIdentifier)
                    case "staff":
                        // Staff = miembros del equipo que no son abogados ni clientes
                        return !LAWYER_ROLES.includes(roleIdentifier) && !CLIENT_ROLES.includes(roleIdentifier)
                    default:
                        return true
                }
            })
        }

        // Filtrar por término de búsqueda
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim()
            filtered = filtered.filter((member) => {
                return (
                    member.name?.toLowerCase().includes(searchLower) ||
                    member.email?.toLowerCase().includes(searchLower) ||
                    member.roleUser?.[0]?.role?.displayName?.toLowerCase().includes(searchLower)
                )
            })
        }

        // Filtrar por roles seleccionados
        if (selectedRoles.length > 0) {
            filtered = filtered.filter((member) => {
                return member.roleUser?.some((roleUser: any) => {
                    return selectedRoles.includes(roleUser.roleId?.toString())
                })
            })
        }

        return filtered
    }, [allMembers, searchTerm, selectedRoles, activeTab])

    // Determinar si usar paginación local o de API
    const hasActiveFilters = Boolean(searchTerm.trim() || selectedRoles.length > 0 || activeTab !== "all")

    // Paginación local - siempre usar filteredMembers que respeta activeTab
    const localPaginatedMembers = useMemo(() => {
        const itemsPerPage = 10
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return filteredMembers.slice(startIndex, endIndex)
    }, [filteredMembers, currentPage])

    // Calcular paginación basada en los miembros filtrados
    const paginationData = useMemo(() => {
        const itemsPerPage = 10
        const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
        return {
            page: currentPage,
            limit: itemsPerPage,
            total: filteredMembers.length,
            totalPages: totalPages || 1,
        }
    }, [filteredMembers.length, currentPage])

    const fetchAllMembers = useCallback(
        async (page = 1) => {
            try {
                setIsLoading(true)
                const url = new URL(`${USERS_ENDPOINT}`, window.location.origin)
                url.searchParams.append("page", page.toString())
                url.searchParams.append("limit", "100") // Aumentar el límite para ver más usuarios

                const response = await fetch(url.toString(), {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || "Failed to fetch members")
                }

                const result: ApiResponse = await response.json()

                console.log("👥 MEMBERS: Loaded members data:", {
                    total: result.meta.total,
                    page: result.meta.page,
                    totalPages: result.meta.totalPages,
                    usersInThisPage: result.data.length
                })

                setAllMembers(result.data)
                setApiPagination({
                    page: result.meta.page,
                    limit: result.meta.limit,
                    total: result.meta.total,
                    totalPages: result.meta.totalPages,
                })
            } catch (error) {
                console.error("Error fetching members:", error)
                toast.error("Error al cargar los miembros")
            } finally {
                setIsLoading(false)
            }
        },
        [session?.user?.accessToken],
    )

    // Fetch roles
    const fetchRoles = useCallback(async () => {
        try {
            const response = await fetch(`${SETTINGS_ROLES_ENDPOINT}?limit=10000`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (response.ok) {
                const result = await response.json()
                setAvailableRoles(result.data || [])
            }
        } catch (error) {
            console.error("Error fetching roles:", error)
        }
    }, [session?.user?.accessToken])

    // Fetch countries
    const fetchCountries = useCallback(async () => {
        try {
            const response = await fetch(`${SETTINGS_COUNTRIES_ENDPOINT}?limit=10000`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (response.ok) {
                const result = await response.json()
                setAvailableCountries(result.data || [])
            }
        } catch (error) {
            console.error("Error fetching countries:", error)
        }
    }, [session?.user?.accessToken])

    // Fetch states by country
    const fetchStatesByCountry = useCallback(async (countryId: number) => {
        try {
            const response = await fetch(`${SETTINGS_COUNTRIES_ENDPOINT}/${countryId}/states?limit=10000`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (response.ok) {
                const result = await response.json()
                setAvailableStates(result.data || [])
            }
        } catch (error) {
            console.error("Error fetching states:", error)
            setAvailableStates([])
        }
    }, [session?.user?.accessToken])

    // Initial fetch on component mount
    useEffect(() => {
        if (isInitialRender.current && session?.user?.accessToken) {
            fetchAllMembers(currentPage)
            fetchRoles()
            fetchCountries()
            isInitialRender.current = false
        }
    }, [fetchAllMembers, fetchRoles, fetchCountries, session?.user?.accessToken, currentPage])

    // Fetch states when editing member or country changes
    useEffect(() => {
        if (editingMember?.userAddresses?.[0]?.countryId) {
            const countryId = editingMember.userAddresses[0].countryId
            setSelectedCountryId(countryId)
            fetchStatesByCountry(countryId)
        }
    }, [editingMember?.userAddresses, fetchStatesByCountry])

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedRoles, activeTab])

    const handleDelete = useCallback(
        async (id: number) => {
            if (!confirm("¿Estás seguro de que deseas eliminar este miembro?")) {
                return
            }

            try {
                const response = await fetch(`${USERS_ENDPOINT}/${id}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })

                if (!response.ok) {
                    throw new Error("Failed to delete user")
                }

                toast.success("Miembro eliminado correctamente")
                // Refrescar la lista de miembros
                await fetchAllMembers(currentPage)
            } catch (error) {
                console.error("Error al eliminar el miembro:", error)
                toast.error("Error al eliminar el miembro")
            }
        },
        [session?.user?.accessToken, fetchAllMembers, currentPage],
    )

    const handleToggleBlock = useCallback(
        async (userId: number, isBlocked: boolean) => {
            const action = isBlocked ? "bloquear" : "desbloquear"
            if (!confirm(`¿Estás seguro de que deseas ${action} este usuario?`)) {
                return
            }

            try {
                const response = await fetch(`${USERS_ENDPOINT}/${userId}/block`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                    body: JSON.stringify({ isBlocked }),
                })

                if (!response.ok) {
                    throw new Error(`Failed to ${action} user`)
                }

                const data = await response.json()
                toast.success(data.message || `Usuario ${isBlocked ? "bloqueado" : "desbloqueado"} correctamente`)
                
                // Actualizar la lista de miembros localmente
                setAllMembers(prev => 
                    prev.map(member => 
                        member.id === userId 
                            ? { ...member, isBlocked } 
                            : member
                    )
                )
            } catch (error) {
                console.error(`Error al ${action} el usuario:`, error)
                toast.error(`Error al ${action} el usuario`)
            }
        },
        [session?.user?.accessToken],
    )

    const handleClearSearch = useCallback(() => {
        setSearchTerm("")
        setSelectedRoles([])
        setHasSearched(false)
        setShowFilters(false)
        setCurrentPage(1)
    }, [])

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setHasSearched(e.target.value.trim().length > 0)
    }, [])

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        const inputValue = searchInputRef.current?.value || ""
        setSearchTerm(inputValue)
        setHasSearched(inputValue.trim().length > 0)
    }, [])

    const handlePageChange = useCallback(
        (page: number) => {
            setCurrentPage(page)

            // Si no hay filtros activos, hacer fetch de la API
            if (!hasActiveFilters) {
                fetchAllMembers(page)
            }
            // Si hay filtros activos, la paginación es local y no necesita fetch
        },
        [hasActiveFilters, fetchAllMembers],
    )

    const handleRoleChange = useCallback((roles: string[]) => {
        console.log("Roles selected:", roles)
        setSelectedRoles(roles)
        setCurrentPage(1)
    }, [])

    const handleEdit = useCallback((contact: User) => {
        setEditingMember(contact)
        setModalMode("edit")
        setClientModalOpen(true)
    }, [])

    const handleClientUpdated = useCallback(
        async (updatedMember: User | null) => {
            if (!updatedMember) {
                toast.error("No hay datos para actualizar")
                return
            }

            try {
                // Validar campos requeridos
                if (!updatedMember.name?.trim()) {
                    toast.error("El nombre es requerido")
                    return
                }
                if (!updatedMember.email?.trim()) {
                    toast.error("El email es requerido")
                    return
                }

                // Preparar datos para enviar
                const updateData = {
                    name: updatedMember.name,
                    email: updatedMember.email,
                    image: updatedMember.image,
                    role: updatedMember.roleUser?.[0]?.roleId,
                    userProfile: {
                        birthDate: updatedMember.userProfile?.birthDate || new Date().toISOString(),
                        docType: updatedMember.userProfile?.docType || 1,
                        docNumber: updatedMember.userProfile?.docNumber || "",
                        gender: updatedMember.userProfile?.gender || 1,
                        phone: updatedMember.userProfile?.phone || "",
                    },
                    userAddresses: updatedMember.userAddresses && updatedMember.userAddresses.length > 0 
                        ? updatedMember.userAddresses.map(addr => ({
                            street: addr.street || "",
                            streetNumber: addr.streetNumber || "",
                            city: addr.city || "",
                            stateId: addr.stateId,
                            countryId: addr.countryId,
                            cp: addr.cp || "",
                            description: addr.description || "",
                            isDefault: addr.isDefault
                        }))
                        : [{
                            street: "",
                            streetNumber: "",
                            city: "",
                            stateId: updatedMember.userAddresses?.[0]?.stateId || 1,
                            countryId: updatedMember.userAddresses?.[0]?.countryId || 1,
                            cp: "",
                            description: "",
                            isDefault: true
                        }]
                }

                const response = await fetch(`${USERS_ENDPOINT}/${updatedMember.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                    body: JSON.stringify(updateData),
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || "Error al actualizar el miembro")
                }

                toast.success("Miembro actualizado correctamente")
                setClientModalOpen(false)
                setEditingMember(null)
                setModalMode("create")
                await fetchAllMembers(currentPage)
            } catch (error) {
                console.error("Error updating member:", error)
                toast.error(error instanceof Error ? error.message : "Error al actualizar el miembro")
            }
        },
        [session?.user?.accessToken, fetchAllMembers, currentPage],
    )

    const refreshMembers = async () => {
        await fetchAllMembers(currentPage)
    }

    return (
        <div>
            <div className="flex flex-col gap-6 mb-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-black dark:text-gray-100">Miembros</h1>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/admin/activity-logs")}
                            className="flex items-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-50 p-2"
                        >
                            <Activity className="h-4 w-4" />
                            Historial de sesiones
                        </Button>
                        <Button
                            type="button"
                            variant="custom"
                            size="sm"
                            onClick={() => {
                                setEditingMember(null)
                                setModalMode("create")
                                setClientModalOpen(true)
                            }}
                            className="flex items-center gap-2 bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 hover:text-gray-dark p-2"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo miembro
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Miembros</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{memberStats.total}</p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Abogados</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{memberStats.lawyers}</p>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Scale className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{memberStats.clients}</p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Personal</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{memberStats.staff}</p>
                            </div>
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <UserCog className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs con diseño mejorado */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "all"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>Todos</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === "all"
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                                        }`}>
                                        {memberStats.total}
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab("lawyers")}
                                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "lawyers"
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Scale className="h-4 w-4" />
                                    <span>Abogados</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === "lawyers"
                                        ? "bg-purple-500 text-white"
                                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                        }`}>
                                        {memberStats.lawyers}
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab("clients")}
                                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "clients"
                                    ? "bg-green-600 text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    <span>Clientes</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === "clients"
                                        ? "bg-green-500 text-white"
                                        : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                        }`}>
                                        {memberStats.clients}
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab("staff")}
                                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "staff"
                                    ? "bg-orange-600 text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <UserCog className="h-4 w-4" />
                                    <span>Personal</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === "staff"
                                        ? "bg-orange-500 text-white"
                                        : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                                        }`}>
                                        {memberStats.staff}
                                    </span>
                                </div>
                            </button>
                        </div>
                        {/* Información de paginación en tabs */}
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {filteredMembers.length > 0 ? (
                                <span className="font-medium">
                                    Mostrando {((paginationData.page - 1) * paginationData.limit) + 1} - {Math.min(paginationData.page * paginationData.limit, paginationData.total)} de {paginationData.total}
                                </span>
                            ) : (
                                <span>Sin resultados</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filtros mejorados */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex flex-col gap-4">
                        {/* Barra de búsqueda y filtros */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative flex-1 min-w-[280px]">
                                <form onSubmit={handleSearch} className="w-full">
                                    <div className="relative">
                                        <div className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                                            <Search className="w-5 h-5 stroke-gray-400 dark:stroke-gray-500" />
                                        </div>
                                        <Input
                                            type="search"
                                            placeholder="Buscar por nombre, email o rol..."
                                            className="h-11 w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-12 pr-10 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            defaultValue={searchTerm}
                                            onChange={handleSearchChange}
                                            ref={searchInputRef}
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm("")
                                                    setHasSearched(false)
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            >
                                                <span className="sr-only">Limpiar búsqueda</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 h-11 transition-all ${selectedRoles.length > 0
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 shadow-sm"
                                        : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        }`}
                                >
                                    <Filter className="h-4 w-4" />
                                    <span>Filtros avanzados</span>
                                    {selectedRoles.length > 0 && (
                                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                            {selectedRoles.length}
                                        </span>
                                    )}
                                </Button>

                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearSearch}
                                        className="h-11 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        Limpiar todo
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Chips de filtros activos */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Filtros activos:</span>
                                {searchTerm && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                        <Search className="h-3 w-3" />
                                        <span>{searchTerm}</span>
                                        <button
                                            onClick={() => {
                                                setSearchTerm("")
                                                setHasSearched(false)
                                            }}
                                            className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                {selectedRoles.length > 0 && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                                        <Filter className="h-3 w-3" />
                                        <span>{selectedRoles.length} rol(es)</span>
                                        <button
                                            onClick={() => setSelectedRoles([])}
                                            className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Panel de filtros avanzados */}
                        {showFilters && (
                            <div className="p-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros Avanzados</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <RoleMultiSelect label="Filtrar por roles" defaultSelected={selectedRoles} onChange={handleRoleChange} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="w-full overflow-x-auto">
                        <MembersTable
                            members={localPaginatedMembers}
                            hasActiveFilters={hasActiveFilters}
                            handleClearSearch={handleClearSearch}
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            handleToggleBlock={handleToggleBlock}
                            isLoading={isLoading}
                        />
                    </div>
                </div>

                {/* Pagination - Siempre mostrar si hay datos */}
                {paginationData.total > 0 && (
                    <Pagination
                        currentPage={paginationData.page}
                        totalPages={paginationData.totalPages}
                        totalItems={paginationData.total}
                        itemsPerPage={paginationData.limit}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>

            {/* Modal para crear/editar miembro */}
            <Modal
                isOpen={clientModalOpen}
                onClose={() => {
                    setClientModalOpen(false)
                    setEditingMember(null)
                    setModalMode("create")
                }}
                className="max-w-2xl"
            >
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        {modalMode === "create" ? "Crear Nuevo Miembro" : `Editar Miembro: ${editingMember?.name || ""}`}
                    </h2>
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        handleClientUpdated(editingMember)
                    }} className="space-y-6">
                        {/* Grid de información básica */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Nombre - ocupa toda la fila */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre completo *
                                </label>
                                <Input
                                    type="text"
                                    value={editingMember?.name || ""}
                                    onChange={(e) => setEditingMember(prev => prev ? {...prev, name: e.target.value} : null)}
                                    className="w-full"
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email *
                                </label>
                                <Input
                                    type="email"
                                    value={editingMember?.email || ""}
                                    onChange={(e) => setEditingMember(prev => prev ? {...prev, email: e.target.value} : null)}
                                    className="w-full"
                                    placeholder="ejemplo@email.com"
                                />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Teléfono
                                </label>
                                <Input
                                    type="tel"
                                    value={editingMember?.userProfile?.phone || ""}
                                    onChange={(e) => setEditingMember(prev => {
                                        if (!prev) return null
                                        const currentProfile = prev.userProfile || {} as any
                                        return {
                                            ...prev, 
                                            userProfile: {...currentProfile, phone: e.target.value}
                                        }
                                    })}
                                    className="w-full"
                                    placeholder="+54 9 11 1234-5678"
                                />
                            </div>

                            {/* Rol - ocupa toda la fila */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Rol *
                                </label>
                                <select
                                    value={editingMember?.roleUser?.[0]?.roleId || ""}
                                    onChange={(e) => setEditingMember(prev => prev ? {
                                        ...prev,
                                        roleUser: [{...prev.roleUser?.[0], roleId: parseInt(e.target.value)}]
                                    } : null)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccionar rol...</option>
                                    {availableRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.displayName || role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Sección de ubicación */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                                Ubicación
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* País */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        País *
                                    </label>
                                    <select
                                        value={editingMember?.userAddresses?.[0]?.countryId || ""}
                                        onChange={(e) => {
                                            const countryId = parseInt(e.target.value)
                                            setSelectedCountryId(countryId)
                                            fetchStatesByCountry(countryId)
                                            setEditingMember(prev => {
                                                if (!prev || !prev.userAddresses || prev.userAddresses.length === 0) return prev
                                                const updatedAddresses = [...prev.userAddresses]
                                                updatedAddresses[0] = {
                                                    ...updatedAddresses[0], 
                                                    countryId: countryId,
                                                    stateId: 0 // Reset state when country changes
                                                }
                                                return {...prev, userAddresses: updatedAddresses}
                                            })
                                        }}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar país...</option>
                                        {availableCountries.map((country) => (
                                            <option key={country.id} value={country.id}>
                                                {country.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Provincia/Estado */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Provincia/Estado *
                                    </label>
                                    <select
                                        value={editingMember?.userAddresses?.[0]?.stateId || ""}
                                        onChange={(e) => {
                                            setEditingMember(prev => {
                                                if (!prev || !prev.userAddresses || prev.userAddresses.length === 0) return prev
                                                const updatedAddresses = [...prev.userAddresses]
                                                updatedAddresses[0] = {...updatedAddresses[0], stateId: parseInt(e.target.value)}
                                                return {...prev, userAddresses: updatedAddresses}
                                            })
                                        }}
                                        required
                                        disabled={!selectedCountryId}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Seleccionar provincia...</option>
                                        {availableStates.map((state) => (
                                            <option key={state.id} value={state.id}>
                                                {state.name}
                                            </option>
                                        ))}
                                    </select>
                                    {!selectedCountryId && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Primero selecciona un país
                                        </p>
                                    )}
                                </div>

                                {/* Dirección */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Dirección (Calle)
                                    </label>
                                    <Input
                                        type="text"
                                        value={editingMember?.userAddresses?.[0]?.street || ""}
                                        onChange={(e) => {
                                            setEditingMember(prev => {
                                                if (!prev || !prev.userAddresses || prev.userAddresses.length === 0) return prev
                                                const updatedAddresses = [...prev.userAddresses]
                                                updatedAddresses[0] = {...updatedAddresses[0], street: e.target.value}
                                                return {...prev, userAddresses: updatedAddresses}
                                            })
                                        }}
                                        className="w-full"
                                        placeholder="Calle y número"
                                    />
                                </div>

                                {/* Ciudad */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Ciudad
                                    </label>
                                    <Input
                                        type="text"
                                        value={editingMember?.userAddresses?.[0]?.city || ""}
                                        onChange={(e) => {
                                            setEditingMember(prev => {
                                                if (!prev || !prev.userAddresses || prev.userAddresses.length === 0) return prev
                                                const updatedAddresses = [...prev.userAddresses]
                                                updatedAddresses[0] = {...updatedAddresses[0], city: e.target.value}
                                                return {...prev, userAddresses: updatedAddresses}
                                            })
                                        }}
                                        className="w-full"
                                        placeholder="Ciudad"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setClientModalOpen(false)
                                    setEditingMember(null)
                                    setModalMode("create")
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="custom"
                                className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80"
                            >
                                {modalMode === "create" ? "Crear Miembro" : "Guardar Cambios"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    )
}
