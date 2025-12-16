"use client"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import type { User } from "@/types/users"
import { useSession } from "next-auth/react"
import Label from "../ui/label/Label"
import Button from "../ui/button/Button"
import Input from "../ui/input/Input"
import { toast } from "sonner"
import { SETTINGS_COUNTRIES_ENDPOINT, USERS_ENDPOINT } from "@/constant/api-endpoints"
import { Modal } from "../ui/modal/Modal"

interface CustomerRegistrationModalProps {
    isOpen: boolean
    onClose: () => void
    onCustomerCreated?: (customer: User) => void
    onCustomerUpdated?: (customer: User) => void
    onRefreshCustomers?: () => void
    editingCustomer?: User | null
    mode?: "create" | "edit"
}

interface Country {
    id: number
    name: string
    states?: State[]
}

interface State {
    id: number
    name: string
    countryId: number
}

interface CustomerForm {
    id?: number
    name: string
    email: string
    image?: string
    role: number
    userProfile: {
        id: number
        userId: number
        docType: number
        docNumber: string
        gender: number
        birthDate: string
        phone: string
    }
    userAddresses: {
        id: number
        userId: number
        countryId?: number
        stateId?: number
        city: string
        cp: string
        street: string
        streetNumber: string
        description: string
        isDefault: boolean
        state: {
            id: number
            name: string
            countryId: number
            country: {
                id: number
                name: string
                code: string
                phoneCode: string
            }
        }
    }[]
    roleUser: any[]
    street?: string
    streetNumber?: string
    selectedId?: number
}

export const genderType = [
    { id: 1, value: 1, label: "Masculino" },
    { id: 2, value: 2, label: "Femenino" },
    { id: 3, value: 3, label: "X" },
]

const CUSTOMER_ROLE_ID = 34

const formatDateForInput = (date: any): string => {
    if (!date) return ""

    try {
        let dateObj: Date

        if (typeof date === "string") {
            if (date.includes("T")) {
                dateObj = new Date(date)
            } else if (date.includes("-")) {
                dateObj = new Date(date + "T00:00:00")
            } else {
                dateObj = new Date(date)
            }
        } else if (date instanceof Date) {
            dateObj = date
        } else {
            return ""
        }

        if (isNaN(dateObj.getTime())) {
            console.warn("Invalid date provided:", date)
            return ""
        }

        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, "0")
        const day = String(dateObj.getDate()).padStart(2, "0")

        return `${year}-${month}-${day}`
    } catch (error) {
        console.error("Error formatting date:", error, "Original value:", date)
        return ""
    }
}

const parseDateFromInput = (dateString: string): Date | null => {
    if (!dateString) return null

    try {
        const [year, month, day] = dateString.split("-").map(Number)
        if (!year || !month || !day) return null

        const date = new Date(year, month - 1, day)

        if (isNaN(date.getTime())) return null

        return date
    } catch (error) {
        console.error("Error parsing date:", error)
        return null
    }
}

export default function CustomerRegistrationModal({
    isOpen,
    onClose,
    onCustomerCreated,
    onCustomerUpdated,
    onRefreshCustomers,
    editingCustomer = null,
    mode = "create",
}: CustomerRegistrationModalProps) {
    const { data: session } = useSession()
    const [newCustomer, setNewCustomer] = useState<CustomerForm>({
        name: "",
        email: "",
        image: "",
        role: CUSTOMER_ROLE_ID,
        userProfile: {
            id: 0,
            userId: 0,
            docType: 1,
            docNumber: "",
            gender: 1,
            birthDate: "",
            phone: "",
        },
        userAddresses: [],
        roleUser: [],
        street: "",
        streetNumber: "",
        selectedId: undefined,
    })

    const [countries, setCountries] = useState<Country[]>([])
    const [states, setStates] = useState<State[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [isLoadingCountries, setIsLoadingCountries] = useState(false)
    const [hasSetInitialState, setHasSetInitialState] = useState(false)

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

    useEffect(() => {
        if (isOpen) {
            fetchCountries()
        }
    }, [fetchCountries, isOpen])

    useEffect(() => {
        if (!isOpen) {
            setNewCustomer({
                name: "",
                email: "",
                image: "",
                role: CUSTOMER_ROLE_ID,
                userProfile: {
                    id: 0,
                    userId: 0,
                    docType: 1,
                    docNumber: "",
                    gender: 1,
                    birthDate: "",
                    phone: "",
                },
                userAddresses: [],
                roleUser: [],
                street: "",
                streetNumber: "",
                selectedId: undefined,
            })
            setHasSetInitialState(false)
        } else if (mode === "edit" && editingCustomer) {
            const formattedBirthDate = formatDateForInput(editingCustomer.userProfile?.birthDate)

            setNewCustomer({
                id: editingCustomer.id,
                name: editingCustomer.name || "",
                email: editingCustomer.email || "",
                image: editingCustomer.image || "",
                role: editingCustomer.role || CUSTOMER_ROLE_ID,
                userProfile: {
                    id: editingCustomer.userProfile?.id || 0,
                    userId: editingCustomer.id || 0,
                    docType: editingCustomer.userProfile?.docType || 1,
                    docNumber: editingCustomer.userProfile?.docNumber || "",
                    gender: editingCustomer.userProfile?.gender || 1,
                    birthDate: formattedBirthDate,
                    phone: editingCustomer.userProfile?.phone || "",
                },
                userAddresses: (editingCustomer.userAddresses || []).map(addr => ({
                    id: addr.id,
                    userId: addr.userId,
                    countryId: addr.countryId,
                    stateId: addr.stateId,
                    city: addr.city,
                    cp: addr.cp || "",
                    street: addr.street || "",
                    streetNumber: addr.streetNumber,
                    description: addr.description,
                    isDefault: addr.isDefault,
                    state: {
                        id: addr.state.id,
                        name: addr.state.name,
                        countryId: addr.state.countryId,
                        country: {
                            id: addr.country.id,
                            name: addr.country.name,
                            code: addr.country.code,
                            phoneCode: addr.country.prefix
                        }
                    }
                })),
                roleUser: editingCustomer.roleUser || [],
                street: editingCustomer.userAddresses?.[0]?.street || "",
                streetNumber: editingCustomer.userAddresses?.[0]?.streetNumber || "",
            })
        }
    }, [isOpen, mode, editingCustomer])

    useEffect(() => {
        const countryId = newCustomer.userAddresses?.[0]?.countryId
        if (countryId && countries.length > 0) {
            const selectedCountry = countries.find((country) => country.id === countryId)
            if (selectedCountry && selectedCountry.states) {
                setStates(selectedCountry.states)
            } else {
                setStates([])
            }
        }
    }, [newCustomer.userAddresses, countries])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target

        if (name === "street") {
            setNewCustomer((prev) => ({ ...prev, street: value }))
        } else if (name === "streetNumber") {
            setNewCustomer((prev) => ({ ...prev, streetNumber: value }))
        } else if (name === "city") {
            setNewCustomer((prev) => {
                const addresses = prev.userAddresses || []
                const firstAddress = addresses[0] || {
                    id: 0,
                    userId: prev.id || 0,
                    countryId: 1,
                    stateId: undefined,
                    city: "",
                    cp: "",
                    street: "",
                    streetNumber: "",
                    description: "",
                    isDefault: true,
                    state: {
                        id: 0,
                        name: "",
                        countryId: 1,
                        country: {
                            id: 1,
                            name: "",
                            code: "",
                            phoneCode: "",
                        },
                    },
                }

                const updatedAddress = {
                    ...firstAddress,
                    city: value,
                }

                const updatedAddresses = addresses.length > 0 ? [updatedAddress, ...addresses.slice(1)] : [updatedAddress]

                return {
                    ...prev,
                    userAddresses: updatedAddresses,
                }
            })
        } else if (name.startsWith("profile.")) {
            const profileField = name.replace("profile.", "")
            setNewCustomer((prev) => ({
                ...prev,
                userProfile: {
                    ...prev.userProfile!,
                    [profileField]: profileField === "docType" || profileField === "gender" ? Number(value) : value,
                },
            }))
        } else {
            setNewCustomer((prev) => ({ ...prev, [name]: value }))
        }
    }

    const handleSelectChange = (name: string, value: string) => {
        if (name === "stateId" || name === "countryId") {
            const numValue = value === "" ? undefined : Number.parseInt(value)

            setNewCustomer((prev) => {
                const addresses = prev.userAddresses || []
                const firstAddress = addresses[0] || {
                    id: 0,
                    userId: prev.id || 0,
                    countryId: 1,
                    stateId: undefined,
                    city: "",
                    cp: "",
                    street: "",
                    streetNumber: "",
                    description: "",
                    isDefault: true,
                    state: {
                        id: 0,
                        name: "",
                        countryId: 1,
                        country: {
                            id: 1,
                            name: "",
                            code: "",
                            phoneCode: "",
                        },
                    },
                }

                const updatedAddress = {
                    ...firstAddress,
                    [name]: numValue,
                    ...(name === "countryId" && { stateId: undefined }),
                }

                const updatedAddresses = addresses.length > 0 ? [updatedAddress, ...addresses.slice(1)] : [updatedAddress]

                return {
                    ...prev,
                    userAddresses: updatedAddresses,
                }
            })

            if (name === "countryId") {
                setHasSetInitialState(true)
            }
        }
    }

    const validateForm = (): boolean => {
        if (!newCustomer.name?.trim()) {
            toast.error("El nombre del cliente es obligatorio")
            return false
        }

        if (!newCustomer.email?.trim()) {
            toast.error("El email del cliente es obligatorio")
            return false
        }

        return true
    }

    const handleSaveClient = async () => {
        if (!validateForm()) {
            return
        }

        try {
            setIsCreating(true)

            const birthDate = parseDateFromInput(newCustomer.userProfile?.birthDate || "")

            const dataToSend = {
                ...(mode === "create" && { selectedId: newCustomer.selectedId || null }),
                name: newCustomer.name,
                email: newCustomer.email,
                image: newCustomer.image || "",
                role: newCustomer.role,
                userProfile: {
                    docType: newCustomer.userProfile?.docType || 1,
                    docNumber: newCustomer.userProfile?.docNumber || "",
                    gender: newCustomer.userProfile?.gender || 1,
                    birthDate: birthDate || new Date(),
                    phone: newCustomer.userProfile?.phone || "",
                },
                userAddresses: newCustomer.userAddresses?.length
                    ? [
                        {
                            countryId: newCustomer.userAddresses[0].countryId,
                            stateId: newCustomer.userAddresses[0].stateId,
                            city: newCustomer.userAddresses[0].city || "",
                            cp: newCustomer.userAddresses[0].cp || "",
                            street: newCustomer.street || "",
                            streetNumber: newCustomer.streetNumber || "",
                            description: newCustomer.userAddresses[0].description || "",
                            isDefault: true,
                        },
                    ]
                    : [],
            }

            const url = mode === "edit" && editingCustomer ? `${USERS_ENDPOINT}/${editingCustomer.id}` : USERS_ENDPOINT
            const method = mode === "edit" ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify(dataToSend),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `Error ${mode === "edit" ? "updating" : "creating"} contact`)
            }

            const savedClient = await response.json()

            toast.success(`Cliente ${mode === "edit" ? "actualizado" : "creado"} correctamente`)

            if (mode === "edit" && onCustomerUpdated) {
                onCustomerUpdated(savedClient)
            } else if (mode === "create" && onCustomerCreated) {
                onCustomerCreated(savedClient)
            }

            if (onRefreshCustomers) {
                onRefreshCustomers()
            }

            onClose()
        } catch (error) {
            console.error(`Failed to ${mode} contact:`, error)
            toast.error(`Error al ${mode === "edit" ? "actualizar" : "crear"} el cliente. Por favor, intenta nuevamente.`)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
            {/* Scrollable container for mobile */}
            <div className="max-h-[90vh] overflow-y-auto">
                <div className="p-3 sm:p-4 md:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
                        {mode === "edit" ? "Editar Cliente" : "Crear Nuevo Cliente"}
                    </h2>

                    <div className="space-y-4 sm:space-y-6">
                        {/* Información Personal */}
                        <div>
                            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 border-b pb-2">
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="clientName" className="text-sm">
                                        <span className="text-red-500 mr-1">*</span>
                                        Apellido & Nombre
                                    </Label>
                                    <Input
                                        id="clientName"
                                        name="name"
                                        value={newCustomer.name}
                                        onChange={handleInputChange}
                                        placeholder="Nombre completo del cliente"
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientEmail" className="text-sm">
                                        <span className="text-red-500 mr-1">*</span>
                                        Correo electrónico
                                    </Label>
                                    <Input
                                        id="clientEmail"
                                        name="email"
                                        type="email"
                                        value={newCustomer.email}
                                        onChange={handleInputChange}
                                        placeholder="cliente@ejemplo.com"
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientPhone" className="text-sm">
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="clientPhone"
                                        name="profile.phone"
                                        value={newCustomer.userProfile?.phone || ""}
                                        onChange={handleInputChange}
                                        placeholder="+54 11 1234-5678"
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="birthDate" className="text-sm">
                                        Fecha de Nacimiento
                                    </Label>
                                    <Input
                                        id="birthDate"
                                        name="profile.birthDate"
                                        type="date"
                                        value={newCustomer.userProfile?.birthDate || ""}
                                        onChange={handleInputChange}
                                        max={new Date().toISOString().split("T")[0]}
                                        className="w-full text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Documentación */}
                        <div>
                            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 border-b pb-2">
                                Documentación
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="docType" className="text-sm">
                                        Tipo de Documento
                                    </Label>
                                    <select
                                        id="docType"
                                        value={newCustomer.userProfile?.docType || 1}
                                        onChange={(e) =>
                                            handleInputChange({
                                                target: { name: "profile.docType", value: e.target.value },
                                            } as React.ChangeEvent<HTMLInputElement>)
                                        }
                                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value={1}>DNI</option>
                                        <option value={2}>Pasaporte</option>
                                        <option value={3}>CUIT/CUIL</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="docNumber" className="text-sm">
                                        Número de Documento
                                    </Label>
                                    <Input
                                        id="docNumber"
                                        name="profile.docNumber"
                                        value={newCustomer.userProfile?.docNumber || ""}
                                        onChange={handleInputChange}
                                        placeholder="Número de documento"
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="gender" className="text-sm">
                                        Género
                                    </Label>
                                    <select
                                        id="gender"
                                        value={newCustomer.userProfile?.gender || 1}
                                        onChange={(e) =>
                                            handleInputChange({
                                                target: { name: "profile.gender", value: e.target.value },
                                            } as React.ChangeEvent<HTMLInputElement>)
                                        }
                                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {genderType.map((gender) => (
                                            <option key={gender.id} value={gender.value}>
                                                {gender.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dirección */}
                        <div>
                            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-900 border-b pb-2">Dirección</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="clientStreet" className="text-sm">
                                        Calle
                                    </Label>
                                    <Input
                                        id="clientStreet"
                                        name="street"
                                        value={newCustomer.street || ""}
                                        onChange={handleInputChange}
                                        placeholder="Calle"
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientStreetNumber" className="text-sm">
                                        Número
                                    </Label>
                                    <Input
                                        id="clientStreetNumber"
                                        name="streetNumber"
                                        value={newCustomer.streetNumber || ""}
                                        onChange={handleInputChange}
                                        placeholder="Número"
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientCountry" className="text-sm">
                                        País
                                    </Label>
                                    <select
                                        id="clientCountry"
                                        value={newCustomer.userAddresses?.[0]?.countryId || ""}
                                        onChange={(e) => handleSelectChange("countryId", e.target.value)}
                                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={isLoadingCountries}
                                    >
                                        <option value="" disabled>
                                            {isLoadingCountries ? "Cargando países..." : "Seleccionar país"}
                                        </option>
                                        {countries.map((country) => (
                                            <option key={country.id} value={country.id}>
                                                {country.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientState" className="text-sm">
                                        Provincia/Estado
                                    </Label>
                                    <select
                                        id="clientState"
                                        value={newCustomer.userAddresses?.[0]?.stateId || ""}
                                        onChange={(e) => handleSelectChange("stateId", e.target.value)}
                                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={states.length === 0}
                                    >
                                        <option value="" disabled>
                                            {states.length === 0 ? "Selecciona un país primero" : "Seleccionar provincia"}
                                        </option>
                                        {states.map((state) => (
                                            <option key={state.id} value={state.id}>
                                                {state.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="clientCity" className="text-sm">
                                        Ciudad
                                    </Label>
                                    <Input
                                        id="clientCity"
                                        name="city"
                                        value={newCustomer.userAddresses?.[0]?.city || ""}
                                        onChange={handleInputChange}
                                        placeholder="Ciudad"
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 border-t">
                        <Button variant="outline" onClick={onClose} disabled={isCreating} className="w-full sm:w-auto text-sm">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveClient}
                            disabled={isCreating || !newCustomer.name?.trim()}
                            className="w-full sm:w-auto text-sm"
                        >
                            {isCreating
                                ? mode === "edit"
                                    ? "Actualizando..."
                                    : "Guardando..."
                                : mode === "edit"
                                    ? "Actualizar Cliente"
                                    : "Guardar Cliente"}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
