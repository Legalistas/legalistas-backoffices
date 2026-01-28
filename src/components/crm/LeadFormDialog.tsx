"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Search, X, RefreshCw, Plus, Pencil, Loader2 } from "lucide-react"

import Label from "../ui/label/Label"
import Input from "../ui/input/Input"
import Button from "../ui/button/Button"
import { Modal } from "../ui/modal/Modal"
import type { Lead } from "@/types/crm"
import { CUSTOMERS_ENDPOINT, LAWYERS_ENDPOINT, LEADS_ENDPOINT, SELLERS_ENDPOINT, USERS_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import { Role } from "@/constant/user"
import { SERVICES_TYPE, SOURCE_CHANNEL } from "@/constant/crm"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { User } from "@/types/users"
import CustomerRegistrationModal from "../customers/CustomerRegistrationModal"

interface LeadFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    lead: Lead | null
}

interface Seller {
    id: number
    name: string
}

interface Customer {
    id: number
    name: string
    email: string
    userProfile: {
        phone: string
    }
    userAddresses: {
        city: string
        state: {
            name: string
        }
    }[]
    roleUser: any[]
}

export default function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
    const { data: session } = useSession()
    const [formData, setFormData] = useState({
        userId: 0,
        sellerId: 0,
        internalLawyerId: 0,
        responsibleLawyerId: 0,
        servicesId: 0,
        sourceChannelId: 0,
        status: "IN_PROGRESS",
        columnId: 1,
        notes: "",
        documentationComplete: false,
        referentId: null as number | null,
        accidentDate: ""
    })
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [customers, setCustomers] = useState<Customer[]>([])
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
    const [showResults, setShowResults] = useState(false)
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
    const [customersError, setCustomersError] = useState<string | null>(null)
    const [sellers, setSellers] = useState<Seller[]>([])
    const [isSellerLoading, setIsSellerLoading] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [responsibleLawyers, setResponsibleLawyers] = useState<any[]>([])
    const [referentLawyers, setReferentLawyers] = useState<any[]>([])
    const [internalLawyers, setInternalLawyers] = useState<any[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasSelectedCustomer, setHasSelectedCustomer] = useState(false)
    const [isRefreshingCustomers, setIsRefreshingCustomers] = useState(false)
    const [selectedCustomerName, setSelectedCustomerName] = useState("")
    const [customerModalOpen, setCustomerModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<User | null>(null)
    const [modalMode, setModalMode] = useState<"create" | "edit">("create")

    // Referencia para el input de búsqueda
    const searchInputRef = useRef<HTMLInputElement>(null)

    const fetchCustomers = useCallback(
        async (showLoading = true) => {
            if (showLoading) {
                setIsLoadingCustomers(true)
            } else {
                setIsRefreshingCustomers(true)
            }

            setCustomersError(null)
            try {
                const response = await fetch(`${CUSTOMERS_ENDPOINT}?limit=100000`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                    cache: "no-store",
                })
                if (!response.ok) {
                    throw new Error(`Error fetching customers: ${response.status}`)
                }
                const data = await response.json()

                // Filtrar solo usuarios con role ID 34 y eliminar duplicados
                const uniqueCustomers = Array.isArray(data.data)
                    ? data.data
                        .filter((customer: Customer) => customer.roleUser?.some((ru: any) => ru.role?.name === Role.CUSTOMER))
                        .filter(
                            (customer: Customer, index: number, self: Customer[]) =>
                                index === self.findIndex((c) => c.id === customer.id),
                        )
                    : []

                setCustomers(uniqueCustomers)
                setFilteredCustomers(uniqueCustomers)

                console.log(`Cargados ${uniqueCustomers.length} clientes con role ID 34`)
                return uniqueCustomers
            } catch (error) {
                console.error("Failed to fetch customers:", error)
                setCustomersError("Failed to load customers. Please try again.")
                return []
            } finally {
                if (showLoading) {
                    setIsLoadingCustomers(false)
                } else {
                    setIsRefreshingCustomers(false)
                }
            }
        },
        [session?.user?.accessToken],
    )

    const refreshCustomers = async () => {
        await fetchCustomers(false)
    }

    const fetchSellers = useCallback(async () => {
        setIsSellerLoading(true)
        try {
            const response = await fetch(`${SELLERS_ENDPOINT}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            if (!response.ok) {
                throw new Error(`Error fetching sellers: ${response.status}`)
            }
            const data = await response.json()
            setSellers(data.data)
        } catch (error) {
            console.error("Failed to fetch sellers:", error)
        } finally {
            setIsSellerLoading(false)
        }
    }, [session?.user?.accessToken])

    const fetchDataLawyer = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
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
            console.error("Error fetching data:", error)
            setCustomersError("Error al cargar los datos de abogados")
        } finally {
            setIsLoading(false)
        }
    }, [session?.user?.accessToken])


    const fetchReferentLawyers = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await fetch(`${USERS_ENDPOINT}?limit=100000`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            const data = await response.json()

            if (data && data.data) {
                // Separar abogados por rol
                const referents = data.data.filter((lawyer: any) =>
                    lawyer.roleUser?.some((ru: any) => ru.role?.name === Role.REFERENTES),
                )
                console.log("🚀 ~ LeadFormDialog ~ referents:", referents)



                setReferentLawyers(referents)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            setCustomersError("Error al cargar los datos de abogados")
        } finally {
            setIsLoading(false)
        }
    }, [session?.user?.accessToken])

    // Fetch data when modal opens
    useEffect(() => {
        if (open) {
            fetchCustomers()
            fetchSellers()
            fetchDataLawyer()
            fetchReferentLawyers()
        }
    }, [open, fetchCustomers, fetchSellers, fetchDataLawyer])

    useEffect(() => {
        if (lead) {
            setFormData({
                userId: lead.userId || 0,
                sellerId: lead.sellerId || 0,
                internalLawyerId: lead.internalLawyerId || 0,
                responsibleLawyerId: lead.responsibleLawyerId || 0,
                servicesId: lead.servicesId || 0,
                sourceChannelId: lead.sourceChannelId || 0,
                status: lead.status || "IN_PROGRESS",
                columnId: lead.columnId || 1,
                notes: lead.notes || "",
                documentationComplete: lead.documentationComplete || false,
                referentId: lead.referentId ?? null,
                accidentDate: lead.accidentDate ? lead.accidentDate.slice(0, 10) : ""
            })
            if (lead.user) {
                setSearchQuery(lead.user.name)
                setSelectedCustomerName(lead.user.name)
                setHasSelectedCustomer(true)
            }
        } else {
            setFormData({
                userId: 0,
                sellerId: 0,
                internalLawyerId: 0,
                responsibleLawyerId: 0,
                servicesId: 0,
                sourceChannelId: 0,
                status: "IN_PROGRESS",
                columnId: 1,
                notes: "",
                documentationComplete: false,
                referentId: null,
                accidentDate: ""
            })
            setSearchQuery("")
            setSelectedCustomerName("")
            setHasSelectedCustomer(false)
        }
    }, [lead, open])

    useEffect(() => {
        if (searchQuery) {
            const filtered = customers.filter(
                (customer) =>
                    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())),
            )
            const uniqueFiltered = filtered.filter(
                (customer, index, self) => index === self.findIndex((c) => c.id === customer.id),
            )
            setFilteredCustomers(uniqueFiltered)
        } else {
            setFilteredCustomers(customers)
        }
    }, [searchQuery, customers])

    // Manejar clics fuera del dropdown para cerrarlo
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: Number.parseInt(value) }))
    }

    const handleCustomerSelect = (customer: Customer) => {
        setFormData((prev) => ({
            ...prev,
            userId: customer.id,
        }))
        setSearchQuery(customer.name)
        setSelectedCustomerName(customer.name)
        setHasSelectedCustomer(true)
        setShowResults(false)
    }

    const handleEdit = useCallback((customer: any) => {
        setEditingCustomer(customer)
        setModalMode("edit")
        setCustomerModalOpen(true)
    }, [])

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        setShowResults(true)

        // Si se borra completamente el campo y hay un cliente seleccionado, resetear
        if (e.target.value === "" && hasSelectedCustomer) {
            resetCustomerSelection()
        }
    }

    const resetCustomerSelection = () => {
        setFormData((prev) => ({
            ...prev,
            userId: 0,
        }))
        setSelectedCustomerName("")
        setHasSelectedCustomer(false)

        setTimeout(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus()
            }
            setShowResults(true)
        }, 0)
    }

    const handleClearSearch = () => {
        setSearchQuery("")
        resetCustomerSelection()
        setTimeout(() => setShowResults(true), 0)
    }

    const handleCustomerCreated = (newCustomer: any) => {
        toast.success("Cliente creado correctamente")
        setCustomerModalOpen(false)
        setEditingCustomer(null)
        setModalMode("create")
        fetchCustomers() // Recargar datos después de crear
    }

    const handleCustomerUpdated = (updatedCustomer: any) => {
        toast.success("Cliente actualizado correctamente")
        setEditingCustomer(null)
        setModalMode("create")
        fetchCustomers() // Recargar datos después de actualizar
    }

    const handleSubmit = async () => {
        try {
            // Validar que el cliente esté seleccionado
            if (!formData.userId || formData.userId === 0) {
                toast.error("Por favor, selecciona un cliente")
                return
            }

            setIsSubmitting(true)

            const dataToSend = {
                userId: formData.userId,
                sellerId: formData.sellerId || (session?.user?.id ? Number(session.user.id) : 0),
                internalLawyerId: formData.internalLawyerId || 0,
                responsibleLawyerId: formData.responsibleLawyerId || 0,
                servicesId: formData.servicesId || 0,
                sourceChannelId: formData.sourceChannelId || 0,
                status: formData.status,
                columnId: formData.columnId,
                notes: formData.notes || "",
                documentationComplete: formData.documentationComplete || false,
                referentId: formData.referentId ?? null,
                accidentDate: formData.accidentDate || null,
            }

            console.log("Datos a enviar:", dataToSend)

            const endpoint = lead?.id ? `${LEADS_ENDPOINT}/${lead.id}` : `${LEADS_ENDPOINT}`
            const method = lead?.id ? "PUT" : "POST"

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify(dataToSend),
            })

            if (!response.ok) {
                throw new Error(`Error al guardar el lead: ${response.status}`)
            }

            toast.success(`Lead ${lead ? "actualizado" : "creado"} correctamente`)
            router.push("/admin/crm")
            onOpenChange(false)
        } catch (error) {
            console.error("Error al guardar el lead:", error)
            toast.error("Ocurrió un error al guardar el lead. Por favor, intenta nuevamente.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal isOpen={open} onClose={() => onOpenChange(false)} className="max-w-960 sm:max-w-2xl">
            <div className="p-6">
                <div className="mb-5">
                    <h2 className="text-xl font-semibold">{lead ? "Editar Lead" : "Crear lead"}</h2>
                </div>
                <div>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="client" className="flex items-center">
                                    <span className="text-red-500 mr-1">*</span> Cliente
                                </Label>
                                <button
                                    type="button"
                                    onClick={refreshCustomers}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                    disabled={isRefreshingCustomers}
                                >
                                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingCustomers ? "animate-spin" : ""}`} />
                                    Actualizar clientes
                                </button>
                            </div>
                            <div className="relative">
                                <div className="relative flex-1" ref={searchInputRef}>
                                    <Input
                                        id="customerSearch"
                                        placeholder="Busca un cliente"
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        onFocus={() => setShowResults(true)}
                                        onClick={() => setShowResults(true)}
                                        className="pl-10 pr-12"
                                        disabled={isLoadingCustomers}
                                    />
                                    {searchQuery ? (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                                            aria-label="Limpiar búsqueda"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    ) : (
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    )}

                                    {/* Botón de editar solo cuando hay un cliente seleccionado */}
                                    {hasSelectedCustomer && formData.userId > 0 && (
                                        <div className="absolute right-0 top-0 flex items-center h-full">
                                            <Button
                                                onClick={() => {
                                                    const selectedCustomer = customers.find((c) => c.id === formData.userId)
                                                    if (selectedCustomer) {
                                                        handleEdit(selectedCustomer)
                                                    }
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="mr-1"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Botón de agregar cliente cuando no hay búsqueda activa */}
                                    {!searchQuery && !hasSelectedCustomer && (
                                        <div className="absolute right-0 top-0 flex items-center h-full">
                                            <Button
                                                variant="custom"
                                                size="sm"
                                                className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 hover:text-gray-dark p-2 mr-1 text-[14px]"
                                                onClick={() => setCustomerModalOpen(true)}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Agregar cliente
                                            </Button>
                                        </div>
                                    )}

                                    {showResults && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {isLoadingCustomers ? (
                                                <div className="p-2 text-muted-foreground">Cargando clientes...</div>
                                            ) : customersError ? (
                                                <div className="p-2 text-red-500">{customersError}</div>
                                            ) : filteredCustomers.length > 0 ? (
                                                filteredCustomers.map((customer) => (
                                                    <div
                                                        key={customer.id}
                                                        className={`p-2 hover:bg-gray-100 cursor-pointer ${formData.userId === customer.id ? "bg-blue-50" : ""
                                                            }`}
                                                        onClick={() => {
                                                            handleCustomerSelect(customer)
                                                            console.log("Cliente seleccionado:", customer.name)
                                                        }}
                                                    >
                                                        <div className="font-medium">{customer.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {customer.email && `${customer.email} - `}
                                                            {customer.userAddresses?.[0]?.state?.name && `${customer.userAddresses[0].state.name}, `}
                                                            {customer.userAddresses?.[0]?.city}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-muted-foreground">No se encontraron clientes</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <CustomerRegistrationModal
                                    isOpen={customerModalOpen}
                                    onClose={() => {
                                        setCustomerModalOpen(false)
                                        setEditingCustomer(null)
                                        setModalMode("create")
                                    }}
                                    onCustomerCreated={handleCustomerCreated}
                                    onCustomerUpdated={handleCustomerUpdated}
                                    onRefreshCustomers={refreshCustomers}
                                    editingCustomer={editingCustomer}
                                    mode={modalMode}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="space-y-2">
                                <Label htmlFor="sellerId">Vendedor</Label>
                                <select
                                    id="sellerId"
                                    value={formData.sellerId || ""}
                                    onChange={(e) => handleSelectChange("sellerId", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    disabled={isSellerLoading}
                                >
                                    <option value="" disabled>
                                        Seleccionar vendedor
                                    </option>
                                    {sellers.map((seller) => (
                                        <option key={seller.id} value={seller.id}>
                                            {seller.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="internalLawyerId">Abogado Interno</Label>
                                <select
                                    id="internalLawyerId"
                                    value={formData.internalLawyerId || ""}
                                    onChange={(e) => handleSelectChange("internalLawyerId", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    disabled={isLoading}
                                >
                                    <option value="" disabled>
                                        Seleccionar abo. Interno
                                    </option>
                                    {internalLawyers.map((lawyer) => (
                                        <option key={lawyer.id} value={lawyer.id}>
                                            {lawyer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="referentLawyerId">Referente (opcional)</Label>
                                <select
                                    id="referentLawyerId"
                                    value={formData.referentId || ""}
                                    onChange={(e) => handleSelectChange("referentId", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    disabled={isLoading}
                                >
                                    <option value="">
                                        Sin referente
                                    </option>
                                    {referentLawyers.map((referent) => (
                                        <option key={referent.id} value={referent.id}>
                                            {referent.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="responsibleLawyerId">Abogado Responsable</Label>
                                <select
                                    id="responsibleLawyerId"
                                    value={formData.responsibleLawyerId || ""}
                                    onChange={(e) => handleSelectChange("responsibleLawyerId", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    disabled={isLoading}
                                >
                                    <option value="" disabled>
                                        Seleccionar abo. Responsable
                                    </option>
                                    {responsibleLawyers.map((lawyer) => (
                                        <option key={lawyer.id} value={lawyer.id}>
                                            {lawyer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="space-y-2">
                                <Label htmlFor="servicesId">Servicios</Label>
                                <select
                                    id="servicesId"
                                    value={formData.servicesId || ""}
                                    onChange={(e) => handleSelectChange("servicesId", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="" disabled>
                                        Seleccionar servicio
                                    </option>
                                    {SERVICES_TYPE.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sourceChannelId">Canal de Ingreso</Label>
                                <select
                                    id="sourceChannelId"
                                    value={formData.sourceChannelId || ""}
                                    onChange={(e) => handleSelectChange("sourceChannelId", e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="" disabled>
                                        Seleccionar canal de ingreso
                                    </option>
                                    {SOURCE_CHANNEL.map((channel) => (
                                        <option key={channel.id} value={channel.id}>
                                            {channel.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accidentDate">Fecha de accidente</Label>
                                <Input
                                    id="accidentDate"
                                    type="datetime-local"
                                    value={formData.accidentDate || ""}
                                    onChange={e => setFormData(prev => ({ ...prev, accidentDate: e.target.value }))}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <Button
                            onClick={() => handleSubmit()}
                            disabled={isSubmitting}
                            variant="custom"
                            className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-2 px-2 mt-2"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Guardando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Plus className="h-4 w-4" />
                                    <span>Guardar Lead</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
