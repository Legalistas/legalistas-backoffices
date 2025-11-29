"use client"
import type React from "react"
import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import Button from "../ui/button/Button"
import { Plus, Search, Filter } from "lucide-react"
import Input from "../ui/input/Input"
import { Pagination } from "../ui/pagination/Pagination"
import { useSession } from "next-auth/react"
import { USERS_ENDPOINT } from "@/constant/api-endpoints"
import type { User } from "@/types/users"
import { toast } from "sonner"
import MembersTable from "./MembersTable"
import RoleMultiSelect from "./RoleMultiSelect"

interface ApiResponse {
    data: User[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

export default function MembersContent() {
    const { data: session } = useSession()
    const [allMembers, setAllMembers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)
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

    const isInitialRender = useRef(true)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Filtrado local de miembros
    const filteredMembers = useMemo(() => {
        let filtered = [...allMembers]

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
    }, [allMembers, searchTerm, selectedRoles])

    // Determinar si usar paginación local o de API
    const hasActiveFilters = Boolean(searchTerm.trim() || selectedRoles.length > 0)

    // Paginación local para cuando hay filtros activos
    const localPaginatedMembers = useMemo(() => {
        if (!hasActiveFilters) return allMembers

        const itemsPerPage = 10
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return filteredMembers.slice(startIndex, endIndex)
    }, [filteredMembers, currentPage, hasActiveFilters, allMembers])

    // Calcular paginación basada en si hay filtros o no
    const paginationData = useMemo(() => {
        if (hasActiveFilters) {
            // Usar paginación local cuando hay filtros
            const itemsPerPage = 10
            const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
            return {
                page: currentPage,
                limit: itemsPerPage,
                total: filteredMembers.length,
                totalPages: totalPages || 1,
            }
        } else {
            // Usar paginación de API cuando no hay filtros
            return apiPagination
        }
    }, [filteredMembers.length, currentPage, hasActiveFilters, apiPagination])

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

    // Initial fetch on component mount
    useEffect(() => {
        if (isInitialRender.current && session?.user?.accessToken) {
            fetchAllMembers(currentPage)
            isInitialRender.current = false
        }
    }, [fetchAllMembers, session?.user?.accessToken, currentPage])

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedRoles])

    const handleDelete = useCallback(
        async (id: number) => {
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
                fetchAllMembers(currentPage)
            } catch (error) {
                console.error("Error al eliminar el miembro:", error)
                toast.error("Error al eliminar el miembro")
            }
        },
        [session?.user?.accessToken, fetchAllMembers, currentPage],
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

    const handleClientUpdated = (updatedClient: any) => {
        toast.success("Cliente actualizado correctamente")
        setEditingMember(null)
        setModalMode("create")
        fetchAllMembers(currentPage)
    }

    const refreshMembers = async () => {
        await fetchAllMembers(currentPage)
    }

    return (
        <div>
            <div className="flex flex-col gap-6 mb-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-black dark:text-gray-100">Miembros</h1>
                    <Button
                        variant="custom"
                        size="sm"
                        className="flex items-center gap-2 bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 hover:text-gray-dark p-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo miembro
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <form onSubmit={handleSearch} className="w-full">
                                <div className="relative">
                                    <div className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                                        <Search className="w-5 h-5 stroke-gray-500 dark:stroke-gray-400" />
                                    </div>
                                    <Input
                                        type="search"
                                        placeholder="Buscar miembro..."
                                        className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
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
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            <span className="sr-only">Clear search</span>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
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
                                className={`flex items-center gap-2 ${selectedRoles.length > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : ""
                                    }`}
                            >
                                <Filter className="h-4 w-4" />
                                Filtros
                                {selectedRoles.length > 0 && (
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                        {selectedRoles.length}
                                    </span>
                                )}
                            </Button>

                            {hasActiveFilters && (
                                <Button variant="outline" size="sm" onClick={handleClearSearch}>
                                    Limpiar filtros
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <RoleMultiSelect label="Filtrar por roles" defaultSelected={selectedRoles} onChange={handleRoleChange} />
                        </div>
                    )}
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
        </div>
    )
}
