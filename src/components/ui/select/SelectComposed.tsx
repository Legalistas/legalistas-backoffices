"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

interface SelectContextValue {
    value: string
    onValueChange: (value: string, text?: string) => void
    open: boolean
    setOpen: (open: boolean) => void
    selectedText: string
    setSelectedText: (text: string) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

const useSelect = () => {
    const context = React.useContext(SelectContext)
    if (!context) {
        throw new Error("Select components must be used within Select")
    }
    return context
}

interface SelectProps {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
}

export const Select = ({ value, defaultValue = "", onValueChange, children }: SelectProps) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const [selectedText, setSelectedText] = React.useState("")
    const [open, setOpen] = React.useState(false)

    const isControlled = value !== undefined
    const currentValue = isControlled ? value : internalValue

    const handleValueChange = (newValue: string, text?: string) => {
        if (!isControlled) {
            setInternalValue(newValue)
        }
        if (text) {
            setSelectedText(text)
        }
        onValueChange?.(newValue)
        setOpen(false)
    }

    return (
        <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen, selectedText, setSelectedText }}>
            <div className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

interface SelectTriggerProps {
    children: React.ReactNode
    className?: string
}

export const SelectTrigger = ({ children, className = "" }: SelectTriggerProps) => {
    const { open, setOpen } = useSelect()

    return (
        <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:focus:ring-gray-300 ${className}`}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
        </button>
    )
}

interface SelectValueProps {
    placeholder?: string
}

export const SelectValue = ({ placeholder = "Seleccionar..." }: SelectValueProps) => {
    const { value, selectedText } = useSelect()

    return <span className="block truncate">{selectedText || value || placeholder}</span>
}

interface SelectContentProps {
    children: React.ReactNode
    className?: string
}

export const SelectContent = ({ children, className = "" }: SelectContentProps) => {
    const { open, setOpen } = useSelect()
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
                const trigger = (event.target as HTMLElement).closest('button')
                const parent = contentRef.current.parentElement
                if (trigger && parent && !parent.contains(trigger)) {
                    setOpen(false)
                }
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open, setOpen])

    if (!open) return null

    return (
        <div
            ref={contentRef}
            className={`absolute z-[100] mt-1 max-h-60 w-full min-w-[8rem] overflow-auto rounded-md border bg-white py-1 text-base shadow-lg dark:bg-gray-900 dark:border-gray-700 ${className}`}
        >
            {children}
        </div>
    )
}

interface SelectItemProps {
    value: string
    children: React.ReactNode
    className?: string
}

export const SelectItem = ({ value, children, className = "" }: SelectItemProps) => {
    const { value: selectedValue, onValueChange } = useSelect()
    const isSelected = selectedValue === value

    const handleClick = () => {
        const text = typeof children === 'string' ? children : String(children)
        onValueChange(value, text)
    }

    return (
        <div
            onClick={handleClick}
            className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-800 ${isSelected ? "bg-gray-100 dark:bg-gray-800" : ""
                } ${className}`}
        >
            {children}
        </div>
    )
}
