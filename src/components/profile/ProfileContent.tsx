"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { User, Lock, Bell, Globe, Loader2, ChevronRight, LogOut } from "lucide-react"
import { useSession } from "next-auth/react"
import ProfileGeneral from "./ProfileGeneral"
import { UPLOAD_ENDPOINT, USER_PROFILE_ENDPOINT } from "@/constant/api-endpoints"

export default function ProfileContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("general")
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingProfile, setIsLoadingProfile] = useState(true)
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [uploadProgress, setUploadProgress] = useState(0)

    // User data state
    const [userData, setUserData] = useState({
        name: session?.user?.name || "",
        email: session?.user?.email || "",
        image: session?.user?.image || null,
    })

    // User profile data
    const [profileData, setProfileData] = useState({
        docType: "",
        docNumber: "",
        gender: "",
        birthDate: "",
        phone: "",
    })

    // User address data
    const [addressData, setAddressData] = useState({
        countryId: 0,
        stateId: 0,
        city: "",
        cp: "",
        street: "",
        streetNumber: "",
        description: "",
        isDefault: true,
    })

    // Countries and states for address selection
    const [countries, setCountries] = useState<{ id: number; name: string }[]>([])
    const [states, setStates] = useState<{ id: number; name: string; countryId: number }[]>([])

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })

    // Notification preferences
    const [notificationPreferences, setNotificationPreferences] = useState({
        emailNotifications: true,
        pushNotifications: true,
        meetingReminders: true,
        leadUpdates: true,
        systemUpdates: false,
    })

    // Language settings
    const [language, setLanguage] = useState("es")

    // Fetch user profile data
    useEffect(() => {
        if (session?.user?.id && status === "authenticated") {
            const fetchUserProfile = async () => {
                setIsLoadingProfile(true)
                try {
                    const accessToken = session?.user?.accessToken
                    if (!accessToken) {
                        throw new Error("No se encontró el token de acceso")
                    }

                    const response = await fetch(`${USER_PROFILE_ENDPOINT}/${session?.user?.id}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${accessToken}`,
                        },
                    })

                    if (!response.ok) {
                        throw new Error(`Error al obtener el perfil: ${response.status} ${response.statusText}`)
                    }

                    const data = await response.json()

                    // Update user data if available
                    if (data.profile) {
                        setProfileData({
                            // Convert docType to string since our Select component expects string values
                            docType: data.profile.docType ? data.profile.docType.toString() : "",
                            docNumber: data.profile.docNumber || "",
                            gender: data.profile.gender ? data.profile.gender.toString() : "",
                            birthDate: data.profile.birthDate || "",
                            phone: data.profile.phone || "",
                        })
                    }

                    // Update address data if available
                    if (data.address) {
                        setAddressData({
                            countryId: data.address.countryId || 0,
                            stateId: data.address.stateId || 0,
                            city: data.address.city || "",
                            cp: data.address.cp || "",
                            street: data.address.street || "",
                            streetNumber: data.address.streetNumber || "",
                            description: data.address.description || "",
                            isDefault: data.address.isDefault !== undefined ? data.address.isDefault : true,
                        })
                    }

                    // Update countries and states if available
                    if (data.countries) {
                        setCountries(data.countries)
                    }

                    if (data.states) {
                        setStates(data.states)
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error)
                    setErrorMessage(error instanceof Error ? error.message : "Error al cargar el perfil")
                } finally {
                    setIsLoadingProfile(false)
                }
            }

            fetchUserProfile()
        }
    }, [session?.user?.id, session?.user?.accessToken, status, userData.name, userData.email, userData.image])

    // Handle name change
    const handleNameChange = (name: string) => {
        setUserData((prev) => ({
            ...prev,
            name,
        }))
    }

    // Handle email change
    const handleEmailChange = (email: string) => {
        setUserData((prev) => ({
            ...prev,
            email,
        }))
    }

    // Handle document number change
    const handleDocNumberChange = (value: string) => {
        setProfileData((prev) => ({
            ...prev,
            docNumber: value,
        }))
    }

    // Handle phone change
    const handlePhoneChange = (value: string) => {
        setProfileData((prev) => ({
            ...prev,
            phone: value,
        }))
    }

    // Añade esta función para manejar el cambio del tipo de documento
    const handleDocTypeChange = (value: string) => {
        setProfileData((prev) => ({
            ...prev,
            docType: value,
        }))
    }

    const handleGenderChange = (value: string) => {
        setProfileData((prev) => ({
            ...prev,
            gender: value,
        }))
    }

    const handleBirthDateChange = (value: string) => {
        console.log("Fecha de nacimiento seleccionada:", value) // Agregar log para depuración
        setProfileData((prev) => ({
            ...prev,
            birthDate: value, // Asegurarse de que se guarda en el formato correcto
        }))
    }

    // Handle profile update
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setSuccessMessage("")
        setErrorMessage("")

        try {
            const accessToken = session?.user?.accessToken
            if (!accessToken) throw new Error("No se encontró el token de acceso")

            // Prepare the data to update - ensure docType is included
            const profileUpdateData = {
                name: userData.name,
                email: userData.email,
                image: userData.image,
                // Enviar los campos directamente en el objeto principal, no dentro de profile
                docType: profileData.docType ? Number.parseInt(profileData.docType) : null,
                docNumber: profileData.docNumber,
                gender: profileData.gender ? Number.parseInt(profileData.gender) : null,
                birthDate: profileData.birthDate,
                phone: profileData.phone,
                address: addressData,
            }

            console.log("Enviando datos de perfil:", profileUpdateData) // Agregar log para depuración

            const response = await fetch(`${USER_PROFILE_ENDPOINT}/${session?.user?.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(profileUpdateData),
            })

            if (!response.ok) {
                throw new Error(`Error al actualizar el perfil: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()

            // Update local state with the returned data if needed
            if (data.profile) {
                setProfileData({
                    docType: data.profile.docType ? data.profile.docType.toString() : "",
                    docNumber: data.profile.docNumber || "",
                    gender: data.profile.gender ? data.profile.gender.toString() : "",
                    birthDate: data.profile.birthDate || "",
                    phone: data.profile.phone || "",
                })
            }

            if (data.address) {
                setAddressData({
                    countryId: data.address.countryId || 0,
                    stateId: data.address.stateId || 0,
                    city: data.address.city || "",
                    cp: data.address.cp || "",
                    street: data.address.street || "",
                    streetNumber: data.address.streetNumber || "",
                    description: data.address.description || "",
                    isDefault: data.address.isDefault !== undefined ? data.address.isDefault : true,
                })
            }

            setSuccessMessage("Perfil actualizado correctamente")
        } catch (error) {
            console.error("Error updating profile:", error)
            setErrorMessage(error instanceof Error ? error.message : "Error al actualizar el perfil")
        } finally {
            setIsLoading(false)
        }
    }

    // Handle password change
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setErrorMessage("Las contraseñas no coinciden")
            return
        }

        setIsLoading(true)
        setSuccessMessage("")
        setErrorMessage("")

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000))

            setSuccessMessage("Contraseña actualizada correctamente")
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            })
        } catch (error) {
            console.error("Error changing password:", error)
            setErrorMessage("Error al cambiar la contraseña")
        } finally {
            setIsLoading(false)
        }
    }

    // Handle file change with upload functionality
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsLoading(true)
        setSuccessMessage("")
        setErrorMessage("")

        try {
            const formData = new FormData()
            formData.append("image", file) // 👈 importante que sea "image" como espera multer

            const accessToken = session?.user?.accessToken
            if (!accessToken) throw new Error("No se encontró el token de acceso")

            const response = await fetch(`${UPLOAD_ENDPOINT}/profile_pic`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            })

            if (!response.ok) {
                throw new Error(`Error en la carga: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            const imageUrl = data.imageUrl || data.url || data.path || ""

            // Actualizar la imagen del usuario
            setUserData((prev) => ({
                ...prev,
                image: imageUrl,
            }))

            setSuccessMessage("Imagen de perfil actualizada correctamente")
        } catch (error) {
            console.error("Error uploading image:", error)
            setErrorMessage(error instanceof Error ? error.message : "Error al subir la imagen")
        } finally {
            setIsLoading(false)
        }
    }

    // Show success message for 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage("")
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [successMessage])

    const loading = status === "loading"

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-2">Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Configuración de perfil</h2>
            </div>

            {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">{successMessage}</div>}
            {errorMessage && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">{errorMessage}</div>}

            {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Subiendo imagen: {uploadProgress}%</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="w-full md:w-64 space-y-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`w-full flex items-center justify-between p-3 rounded-md text-left ${activeTab === "general"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <div className="flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            <span>Información general</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => setActiveTab("security")}
                        className={`w-full flex items-center justify-between p-3 rounded-md text-left ${activeTab === "security"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <div className="flex items-center">
                            <Lock className="h-5 w-5 mr-2" />
                            <span>Seguridad</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => setActiveTab("notifications")}
                        className={`w-full flex items-center justify-between p-3 rounded-md text-left ${activeTab === "notifications"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <div className="flex items-center">
                            <Bell className="h-5 w-5 mr-2" />
                            <span>Notificaciones</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => setActiveTab("language")}
                        className={`w-full flex items-center justify-between p-3 rounded-md text-left ${activeTab === "language"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <div className="flex items-center">
                            <Globe className="h-5 w-5 mr-2" />
                            <span>Idioma</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => router.push("/api/auth/signout")}
                            className="w-full flex items-center p-3 rounded-md text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            <LogOut className="h-5 w-5 mr-2" />
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    {activeTab === "general" && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Información general</h2>
                            <ProfileGeneral
                                userData={userData}
                                profileData={profileData}
                                handleFileChange={handleFileChange}
                                handleNameChange={handleNameChange}
                                handleEmailChange={handleEmailChange}
                                handleDocTypeChange={handleDocTypeChange}
                                handleDocNumberChange={handleDocNumberChange}
                                handlePhoneChange={handlePhoneChange}
                                handleBirthDateChange={handleBirthDateChange}
                                handleGenderChange={handleGenderChange}
                            />

                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={handleProfileUpdate}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>Guardar perfil</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    {activeTab === "security" && <div>{/* Security content */}</div>}
                    {activeTab === "notifications" && <div>{/* Notifications content */}</div>}
                    {activeTab === "language" && <div>{/* Language content */}</div>}
                </div>
            </div>
        </div>
    )
}
