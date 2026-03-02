"use client"

import type React from "react"

import { Camera, User } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import Input from "../ui/input/Input"
import Link from "next/link"
import Select from "../ui/select/Select"
import { docsType, genderType } from "@/lib/constant"

interface UserDataProps {
    userData: {
        image: string | null
        name: string
        email: string
    }
    profileData: {
        docType: string
        docNumber: string
        gender: string
        birthDate: string
        phone: string
    }
    handleNameChange: (name: string) => void
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
    handleEmailChange: (email: string) => void
    handleDocTypeChange: (docType: string) => void
    handleDocNumberChange: (docNumber: string) => void
    handlePhoneChange: (phone: string) => void
    handleBirthDateChange: (birthDate: string) => void
    handleGenderChange: (gender: string) => void
}

export default function ProfileGeneral({
    userData,
    profileData,
    handleFileChange,
    handleNameChange,
    handleEmailChange,
    handleDocTypeChange,
    handleDocNumberChange,
    handlePhoneChange,
    handleBirthDateChange,
    handleGenderChange
}: UserDataProps) {
    const [imageError, setImageError] = useState(false)
    // File input ref for avatar upload
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }

    // Handle image loading error
    const handleImageError = () => {
        setImageError(true)
    }

    return (
        <>
            <div className="mb-6 flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="relative">
                    <div
                        className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={handleAvatarClick}
                    >
                        {userData.image && !imageError ? (
                            <Image
                                src={
                                    userData.image.startsWith('http')
                                        ? userData.image
                                        : `${process.env.NEXT_PUBLIC_BACKEND_URL}${userData.image}`
                                }
                                alt={userData.name || "User Avatar"}
                                width={192}
                                height={192}
                                quality={100}
                                priority
                                className="h-full w-full object-cover"
                                onError={handleImageError}
                            />
                        ) : (
                            <User className="h-12 w-12 text-gray-500" />
                        )}
                    </div>
                    <div
                        className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 cursor-pointer"
                        onClick={handleAvatarClick}
                    >
                        <Camera className="h-4 w-4 text-white" />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Sube una foto para tu perfil. Recomendamos una imagen de al menos 400x400 píxeles.
                    </p>
                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline" onClick={handleAvatarClick}>
                        Subir nueva imagen
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre completo
                    </label>
                    <Input
                        type="text"
                        id="name"
                        defaultValue={userData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Nombre completo"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Correo electrónico
                    </label>
                    <Input
                        type="email"
                        id="email"
                        defaultValue={userData.email}
                        disabled
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Correo electrónico"
                    />
                    <small className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                        El correo electrónico no se puede modificar, <Link href="/admin/ticket">contacta a soporte</Link>.
                    </small>
                </div>
                <div>
                    <label htmlFor="docType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de documento
                    </label>

                    <Select
                        id="docType"
                        name="docType"
                        defaultValue={profileData.docType}
                        onValueChange={handleDocTypeChange}
                        className="w-full"
                        placeholder="Seleccione tipo de documento"
                        options={docsType.map((docType) => ({
                            value: docType.value.toString(),
                            label: docType.label,
                        }))}
                    />
                    <p className="mt-1 text-xs text-gray-500">Valor actual: {profileData.docType || "No seleccionado"}</p>
                </div>
                <div>
                    <label htmlFor="docNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número de documento
                    </label>
                    <Input
                        type="text"
                        id="docNumber"
                        defaultValue={profileData.docNumber}
                        onChange={(e) => handleDocNumberChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Teléfono
                    </label>
                    <Input
                        type="tel"
                        id="phone"
                        defaultValue={profileData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha de nacimiento
                    </label>
                    <input
                        type="date"
                        id="birthDate"
                        defaultValue={profileData.birthDate?.split("T")[0] || ""}
                        onChange={(e) => handleBirthDateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sexo
                    </label>
                    <Select
                        id="gender"
                        name="gender"
                        defaultValue={profileData.gender}
                        onValueChange={handleGenderChange}
                        className="w-full"
                        placeholder="Seleccione sexo"
                        options={genderType.map((gender) => ({
                            value: gender.value.toString(),
                            label: gender.label,
                        }))}
                    />
                    <p className="mt-1 text-xs text-gray-500">Valor actual: {profileData.gender || "No seleccionado"}</p>
                </div>
            </div>
        </>
    )
}
