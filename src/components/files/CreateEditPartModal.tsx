"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Modal } from "@/components/ui/modal/Modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/Tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card/Card"
import Button from "@/components/ui/button/Button"
import Label from "@/components/ui/label/Label"
import Input from "@/components/ui/input/Input"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { CASES_FILES_PARTS_CREATE_ENDPOINT, CASES_FILES_PARTS_UPDATE_ENDPOINT, CUSTOMERS_ENDPOINT, SETTINGS_COUNTRIES_ENDPOINT } from "@/constant/api-endpoints"
import { Loader2, Search, User, UserPlus } from "lucide-react"


export interface CaseParty {
    id?: number
    name: string
    email?: string
    phone?: string
    street?: string
    streetNumber?: string
    documentNumber?: string
    documentType?: string
    partyType: "DEMANDADO" | "DEMANDANTE" | "TERCERO" | "TESTIGO"
    role?: string
    notes?: string
    countryId?: number
    stateId?: number
    city?: string
}

interface Country {
    id: number
    name: string
    code?: string
    prefix?: string
    isActive?: boolean
    states?: State[]
}

interface State {
    id: number
    name: string
    countryId: number
}

interface CreateEditPartModalProps {
    open: boolean
    onClose: () => void
    part?: CaseParty | null
    onSave: (part: CaseParty) => void
    caseId: number
    fileId: number
}

export default function CreateEditPartModal({ open, onClose, part, onSave, caseId, fileId }: CreateEditPartModalProps) {
    const [activeTab, setActiveTab] = useState("search")
    const { data: session } = useSession()

    // Estados para el buscador de clientes
    const [clients, setClients] = useState<any[]>([])
    const [clientSearch, setClientSearch] = useState("")
    const [filteredClients, setFilteredClients] = useState<any[]>([])
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [isLoadingClients, setIsLoadingClients] = useState(false)

    // Estados para el formulario
    const [formData, setFormData] = useState<CaseParty>({
        name: "",
        email: "",
        phone: "",
        street: "",
        streetNumber: "",
        documentNumber: "",
        documentType: "DNI",
        partyType: "DEMANDADO",
        role: "",
        notes: "",
        countryId: undefined,
        stateId: undefined,
        city: "",
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [countries, setCountries] = useState<Country[]>([])
    const [states, setStates] = useState<State[]>([])
    const [isLoadingCountries, setIsLoadingCountries] = useState(false)

    // Fetch clients
    const fetchClients = useCallback(async () => {
        if (!session?.user?.accessToken) return

        try {
            setIsLoadingClients(true)
            const response = await fetch(`${CUSTOMERS_ENDPOINT}?limit=100000`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error(`Error fetching customers: ${response.status}`)
            }

            const data = await response.json()
            const customersWithRole35 = Array.isArray(data.data)
                ? data.data
                    .filter((customer: any) => customer.roleUser?.some((ru: any) => ru.role.id === 35))
                    .filter(
                        (customer: any, index: number, self: any[]) => index === self.findIndex((c) => c.id === customer.id),
                    )
                : []

            setClients(customersWithRole35)
            setFilteredClients(customersWithRole35)
        } catch (error) {
            console.error("Error fetching customers:", error)
            toast.error("Error al cargar los clientes")
        } finally {
            setIsLoadingClients(false)
        }
    }, [session?.user?.accessToken])

    // Fetch countries
    const fetchCountries = useCallback(async () => {
        try {
            setIsLoadingCountries(true)
            const response = await fetch(`${SETTINGS_COUNTRIES_ENDPOINT}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error(`Error fetching countries: ${response.status}`)
            }

            const data = await response.json()
            setCountries(data.data || [])
        } catch (error) {
            console.error("Failed to fetch countries:", error)
            toast.error("Error al cargar los países")
        } finally {
            setIsLoadingCountries(false)
        }
    }, [session?.user?.accessToken])

    // Filter clients based on search
    useEffect(() => {
        if (!clientSearch.trim()) {
            setFilteredClients(clients)
            return
        }

        const search = clientSearch.toLowerCase()
        setFilteredClients(
            clients.filter(
                (client: any) =>
                    (client.name && client.name.toLowerCase().includes(search)) ||
                    (client.email && client.email.toLowerCase().includes(search)) ||
                    (client.documentNumber && client.documentNumber.toLowerCase().includes(search)),
            ),
        )
    }, [clientSearch, clients])

    // Update states when country changes
    useEffect(() => {
        if (formData.countryId) {
            const selectedCountry = countries.find((country) => country.id === Number(formData.countryId))
            if (selectedCountry && selectedCountry.states) {
                setStates(selectedCountry.states)
            } else {
                setStates([])
            }
        } else {
            setStates([])
            setFormData((prev) => ({ ...prev, stateId: undefined }))
        }
    }, [formData.countryId, countries])

    // Initialize modal
    useEffect(() => {
        if (open) {
            fetchClients()
            fetchCountries()
            if (part) {
                // Editing existing part
                setFormData({
                    name: part.name || "",
                    email: part.email || "",
                    phone: part.phone || "",
                    street: part.street || "",
                    streetNumber: part.streetNumber || "",
                    documentNumber: part.documentNumber || "",
                    documentType: part.documentType || "DNI",
                    partyType: part.partyType,
                    role: part.role || "",
                    notes: part.notes || "",
                    countryId: part.countryId || undefined,
                    stateId: part.stateId || undefined,
                    city: part.city || "",
                    id: part.id,
                })
                setActiveTab("create")
            } else {
                // Creating new part
                setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    street: "",
                    streetNumber: "",
                    documentNumber: "",
                    documentType: "DNI",
                    partyType: "DEMANDADO",
                    role: "",
                    notes: "",
                    countryId: undefined,
                    stateId: undefined,
                    city: "",
                })
                setActiveTab("search")
            }
            setClientSearch("")
            setSelectedClient(null)
        }
    }, [open, part])

    const handleSelectClient = (client: any) => {
        setSelectedClient(client)
        setFormData((prev) => ({
            ...prev,
            name: client.name || "",
            email: client.email || "",
            phone: client.phone || "",
            street: client.street || "",
            streetNumber: client.streetNumber || "",
            documentNumber: client.documentNumber || "",
        }))
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        if (name === "countryId") {
            const countryId = value ? Number(value) : undefined
            setFormData((prev) => ({
                ...prev,
                countryId,
                stateId: undefined,
            }))
        } else if (name === "stateId") {
            const stateId = value ? Number(value) : undefined
            setFormData((prev) => ({ ...prev, stateId }))
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error("Por favor, ingrese el nombre de la parte")
            return
        }

        try {
            setIsSubmitting(true)

            const dataToSend = {
                name: formData.name,
                email: formData.email || "",
                phone: formData.phone || "",
                street: formData.street || "",
                streetNumber: formData.streetNumber || "",
                documentNumber: formData.documentNumber || "",
                documentType: formData.documentType || "DNI",
                partyType: formData.partyType,
                role: formData.role || "",
                notes: formData.notes || "",
                countryId: formData.countryId || null,
                stateId: formData.stateId || null,
                city: formData.city || "",
            }

            // You'll need to replace this with your actual API endpoint for parts
            const url = part
                ? CASES_FILES_PARTS_UPDATE_ENDPOINT(caseId, fileId, part.id!)
                : CASES_FILES_PARTS_CREATE_ENDPOINT(caseId, fileId)
            const method = part ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    parts: [dataToSend], // ✅ Envolvemos en `parts` y como array
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `Error ${part ? "updating" : "creating"} part`)
            }

            await response.json()

            toast.success(part ? "Parte actualizada exitosamente" : "Parte agregada exitosamente")

            // Call the callback with the saved data
            // onSave(savedPart)
            onClose()
        } catch (error) {
            console.error("Error saving part:", error)
            toast.error(`Error al ${part ? "actualizar" : "crear"} la parte. Por favor, intenta nuevamente.`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            onClose()
        }
    }

    const handleUseSelectedClient = async () => {
        if (!selectedClient) return

        try {
            setIsSubmitting(true)

            const partData = {
                name: selectedClient.name || "",
                email: selectedClient.email || "",
                phone: selectedClient.userProfile?.phone || "",
                street: selectedClient.userAddresses?.[0]?.street || "",
                streetNumber: selectedClient.userAddresses?.[0]?.streetNumber || "",
                documentNumber: selectedClient.userProfile?.docNumber || "",
                documentType:
                    selectedClient.userProfile?.docType === 1
                        ? "DNI"
                        : selectedClient.userProfile?.docType === 2
                            ? "PASAPORTE"
                            : selectedClient.userProfile?.docType === 3
                                ? "CUIT"
                                : "DNI",
                partyType: "TERCERO" as const, // ARTs suelen ser terceros en casos legales
                role: "ART", // Rol específico para identificar que es una ART
                notes: `ART seleccionada: ${selectedClient.name}`,
                 countryId: selectedClient.userAddresses?.[0]?.countryId || null,
                stateId: selectedClient.userAddresses?.[0]?.stateId || null,
                city: selectedClient.userAddresses?.[0]?.city || "",
            }

            const response = await fetch(CASES_FILES_PARTS_CREATE_ENDPOINT(caseId, fileId), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    parts: [partData], // Envolver en array como espera el backend
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || "Error al agregar el ART como parte del caso")
            }

            await response.json()

            toast.success(`ART "${selectedClient.name}" agregada exitosamente al caso`)

            onClose()
        } catch (error) {
            console.error("Error saving selected ART:", error)
            toast.error("Error al agregar el ART al caso. Por favor, intenta nuevamente.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={open}
            onClose={handleClose}
            className="w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto"
        >
            {/* Scrollable container for mobile */}
            <div className="max-h-[90vh] overflow-y-auto">
                <div className="p-3 sm:p-4 md:p-6">
                    <div className="mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {part ? "Editar Parte del Caso" : "Agregar Parte al Caso"}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {part ? "Modifique la información de la parte" : "Busque un ART existente o cree una nueva parte"}
                        </p>
                    </div>

                    <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                            <TabsTrigger value="search" className="flex items-center gap-2 text-xs sm:text-sm">
                                <Search className="h-4 w-4" />
                                <span className="hidden sm:inline">Buscar ART</span>
                                <span className="sm:hidden">Buscar</span>
                            </TabsTrigger>
                            <TabsTrigger value="create" className="flex items-center gap-2 text-xs sm:text-sm">
                                <UserPlus className="h-4 w-4" />
                                <span className="hidden sm:inline">{part ? "Editar Parte" : "Crear Nuevo"}</span>
                                <span className="sm:hidden">{part ? "Editar" : "Nuevo"}</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="search">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">
                                            Buscar Cliente Existente
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Busque y seleccione un cliente existente para agregarlo como parte del caso
                                        </p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder="Buscar por nombre, email o documento..."
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                        className="pl-10 text-sm"
                                    />
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>

                                {isLoadingClients ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span className="ml-2 text-sm">Cargando clientes...</span>
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-y-auto border rounded-lg">
                                        {filteredClients.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">
                                                {clientSearch ? "No se encontraron clientes" : "No hay clientes disponibles"}
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {filteredClients.map((client) => (
                                                    <div
                                                        key={client.id}
                                                        className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedClient?.id === client.id
                                                                ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                                                                : ""
                                                            }`}
                                                        onClick={() => handleSelectClient(client)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                                                                    {client.name}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{client.email}</p>
                                                                {client.userAddresses?.length && (
                                                                    <p className="text-xs text-gray-400 truncate">
                                                                        Dirección:{" "}
                                                                        {client.userAddresses[0].street + " " + client.userAddresses[0].streetNumber} -{" "}
                                                                        {client.userAddresses[0].city} - {client.userAddresses[0].state.name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {selectedClient?.id === client.id && (
                                                                <div className="text-blue-500 flex-shrink-0 ml-2">
                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path
                                                                            fillRule="evenodd"
                                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                            clipRule="evenodd"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedClient && (
                                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => setSelectedClient(null)}
                                            className="w-full sm:w-auto text-sm"
                                            disabled={isSubmitting}
                                        >
                                            Limpiar Selección
                                        </Button>
                                        <Button
                                            onClick={handleUseSelectedClient}
                                            className="w-full sm:w-auto text-sm"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Guardando ART...
                                                </>
                                            ) : (
                                                "Usar Cliente Seleccionado"
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="create">
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4 sm:space-y-6">
                                    {/* Información básica */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">
                                            {part ? "Editar Información de la Parte" : "Información de la Nueva Parte"}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="part-name" className="text-sm">
                                                    <span className="text-red-500 mr-1">*</span>
                                                    Nombre completo
                                                </Label>
                                                <Input
                                                    id="part-name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="Ingrese el nombre completo"
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="part-type" className="text-sm">
                                                    <span className="text-red-500 mr-1">*</span>
                                                    Tipo de Parte
                                                </Label>
                                                <select
                                                    id="part-type"
                                                    name="partyType"
                                                    value={formData.partyType}
                                                    onChange={handleInputChange}
                                                    disabled={isSubmitting}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                >
                                                    <option value="DEMANDADO">Demandado</option>
                                                    <option value="DEMANDANTE">Demandante</option>
                                                    <option value="TERCERO">Tercero</option>
                                                    <option value="TESTIGO">Testigo</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="part-role" className="text-sm">
                                                    Rol/Función
                                                </Label>
                                                <Input
                                                    id="part-role"
                                                    name="role"
                                                    value={formData.role}
                                                    onChange={handleInputChange}
                                                    placeholder="Ej: Representante legal, Apoderado, etc."
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Documentación */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">
                                            Documentación
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="part-documentType" className="text-sm">
                                                    Tipo de Documento
                                                </Label>
                                                <select
                                                    id="part-documentType"
                                                    name="documentType"
                                                    value={formData.documentType}
                                                    onChange={handleInputChange}
                                                    disabled={isSubmitting}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                >
                                                    <option value="DNI">DNI</option>
                                                    <option value="CUIT">CUIT</option>
                                                    <option value="CUIL">CUIL</option>
                                                    <option value="PASAPORTE">Pasaporte</option>
                                                    <option value="LC">Libreta Cívica</option>
                                                    <option value="LE">Libreta de Enrolamiento</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="part-documentNumber" className="text-sm">
                                                    Número de Documento
                                                </Label>
                                                <Input
                                                    id="part-documentNumber"
                                                    name="documentNumber"
                                                    value={formData.documentNumber}
                                                    onChange={handleInputChange}
                                                    placeholder="Número"
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Información de contacto */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">
                                            Información de Contacto
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="part-email" className="text-sm">
                                                    Email
                                                </Label>
                                                <Input
                                                    id="part-email"
                                                    name="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="ejemplo@correo.com"
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="part-phone" className="text-sm">
                                                    Teléfono
                                                </Label>
                                                <Input
                                                    id="part-phone"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    placeholder="11-1234-5678"
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ubicación */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">
                                            Ubicación
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="part-country" className="text-sm">
                                                    País
                                                </Label>
                                                <div className="relative">
                                                    <select
                                                        id="part-country"
                                                        name="countryId"
                                                        value={formData.countryId || ""}
                                                        onChange={handleInputChange}
                                                        disabled={isSubmitting || isLoadingCountries}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                    >
                                                        <option value="">Seleccionar país</option>
                                                        {countries.map((country) => (
                                                            <option key={country.id} value={country.id}>
                                                                {country.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {isLoadingCountries && (
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="part-state" className="text-sm">
                                                    Estado/Provincia
                                                </Label>
                                                <select
                                                    id="part-state"
                                                    name="stateId"
                                                    value={formData.stateId || ""}
                                                    onChange={handleInputChange}
                                                    disabled={isSubmitting || !formData.countryId}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
                                                >
                                                    <option value="">Seleccionar estado</option>
                                                    {states.map((state) => (
                                                        <option key={state.id} value={state.id}>
                                                            {state.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                                                <Label htmlFor="part-city" className="text-sm">
                                                    Ciudad
                                                </Label>
                                                <Input
                                                    id="part-city"
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleInputChange}
                                                    placeholder="Ciudad"
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dirección */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">
                                            Dirección
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="part-street" className="text-sm">
                                                    Calle
                                                </Label>
                                                <Input
                                                    id="part-street"
                                                    name="street"
                                                    value={formData.street}
                                                    onChange={handleInputChange}
                                                    placeholder="Av. Ejemplo, Calle Principal"
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="part-streetNumber" className="text-sm">
                                                    Número
                                                </Label>
                                                <Input
                                                    id="part-streetNumber"
                                                    name="streetNumber"
                                                    value={formData.streetNumber}
                                                    onChange={handleInputChange}
                                                    placeholder="123"
                                                    disabled={isSubmitting}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notas */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">
                                            Notas Adicionales
                                        </h3>
                                        <div className="space-y-2">
                                            <Label htmlFor="part-notes" className="text-sm">
                                                Información adicional
                                            </Label>
                                            <textarea
                                                id="part-notes"
                                                name="notes"
                                                value={formData.notes}
                                                onChange={handleInputChange}
                                                rows={3}
                                                disabled={isSubmitting}
                                                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                                placeholder="Información adicional relevante sobre esta parte"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto text-sm bg-transparent"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        disabled={isSubmitting || !formData.name.trim()}
                                        className="w-full sm:w-auto text-sm"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Guardando...
                                            </>
                                        ) : part ? (
                                            "Actualizar Parte"
                                        ) : (
                                            "Agregar Parte"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </Modal>
    )
}
