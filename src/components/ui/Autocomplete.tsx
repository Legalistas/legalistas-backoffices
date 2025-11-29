"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import Input from "@/components/ui/input/Input"
import { cn } from "@/lib/utils"
import type { User } from "@/types/users"

interface AutocompleteProps {
    options: User[]
    onSelect: (selectedUserId: number | null) => void
    placeholder?: string
    value?: number | null
    defaultValue?: number | null
    id?: string
    name?: string
    className?: string
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
    options,
    onSelect,
    placeholder = "Buscar usuario...",
    value,
    defaultValue,
    id,
    name,
    className,
}) => {
    const isControlled = value !== undefined
    const [inputValue, setInputValue] = useState<string>(() => {
        const initialId = isControlled ? value : defaultValue
        if (initialId !== null && initialId !== undefined) {
            const user = options.find((opt) => opt.id === initialId)
            return user ? user.name : ""
        }
        return ""
    })
    const [filteredSuggestions, setFilteredSuggestions] = useState<User[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isControlled) {
            const user = options.find((opt) => opt.id === value)
            setInputValue(user ? user.name : "")
        }
    }, [value, isControlled, options])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value
        setInputValue(input)
        if (input.length > 0) {
            const filtered = options.filter((user) => user.name.toLowerCase().includes(input.toLowerCase()))
            setFilteredSuggestions(filtered)
            setShowSuggestions(true)
            setActiveSuggestionIndex(-1)
        } else {
            setFilteredSuggestions([])
            setShowSuggestions(false)
            onSelect(null)
        }
    }

    const handleSelectSuggestion = useCallback(
        (user: User) => {
            setInputValue(user.name)
            onSelect(user.id)
            setShowSuggestions(false)
        },
        [onSelect],
    )

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveSuggestionIndex((prevIndex) => (prevIndex < filteredSuggestions.length - 1 ? prevIndex + 1 : prevIndex))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveSuggestionIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0))
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (activeSuggestionIndex !== -1 && filteredSuggestions[activeSuggestionIndex]) {
                handleSelectSuggestion(filteredSuggestions[activeSuggestionIndex])
            } else {
                const exactMatch = filteredSuggestions.find((user) => user.name.toLowerCase() === inputValue.toLowerCase())
                if (exactMatch) {
                    handleSelectSuggestion(exactMatch)
                } else {
                    onSelect(null)
                    setShowSuggestions(false)
                }
            }
        } else if (e.key === "Escape") {
            setShowSuggestions(false)
            setActiveSuggestionIndex(-1)
        }
    }

    // Maneja los clics fuera del componente para cerrar las sugerencias
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    // Maneja el evento onBlur para seleccionar una coincidencia exacta o limpiar la selección
    const handleBlur = () => {
        // Solo intenta seleccionar si el input no está vacío
        if (inputValue) {
            const exactMatch = options.find((user) => user.name.toLowerCase() === inputValue.toLowerCase())
            if (exactMatch) {
                handleSelectSuggestion(exactMatch)
            } else {
                // Si no hay coincidencia exacta, limpia la selección
                onSelect(null)
            }
        } else {
            // Si el input está vacío, asegura que no haya selección
            onSelect(null)
        }
        setShowSuggestions(false) // Siempre oculta las sugerencias al perder el foco
    }

    return (
        <div className={cn("relative", className)} ref={wrapperRef}>
            <Input
                id={id}
                name={name}
                type="text"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (inputValue.length > 0) {
                        const filtered = options.filter((user) => user.name.toLowerCase().includes(inputValue.toLowerCase()))
                        setFilteredSuggestions(filtered)
                        setShowSuggestions(true)
                    } else {
                        setFilteredSuggestions(options) // Show all options if input is empty on focus
                        setShowSuggestions(true)
                    }
                }}
                onBlur={handleBlur}
                placeholder={placeholder}
                autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto mt-1 dark:bg-gray-800 dark:border-gray-700">
                    {filteredSuggestions.map((user, index) => (
                        <li
                            key={user.id}
                            className={cn(
                                "px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                                index === activeSuggestionIndex && "bg-gray-100 dark:bg-gray-700",
                            )}
                            // Usar onMouseDown para prevenir que el input pierda el foco antes de que se procese el clic
                            onMouseDown={(e) => {
                                e.preventDefault() // Previene que el input pierda el foco
                                handleSelectSuggestion(user)
                            }}
                        >
                            {user.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
