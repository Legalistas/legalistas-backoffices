"use client"
import React, { createContext, useContext, useState } from "react"

// Create context for tabs
type TabsContextType = {
    value: string
    onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

// Hook to use tabs context
function useTabsContext() {
    const context = useContext(TabsContext)
    if (!context) {
        throw new Error("Tabs components must be used within a Tabs component")
    }
    return context
}

// Main Tabs component
interface TabsProps {
    defaultValue: string
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
    className?: string
}

export function Tabs({
    defaultValue,
    value: controlledValue,
    onValueChange,
    children,
    className = "",
}: TabsProps) {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)

    // Determine if component is controlled or uncontrolled
    const isControlled = controlledValue !== undefined
    const value = isControlled ? controlledValue : uncontrolledValue

    const handleValueChange = (newValue: string) => {
        if (!isControlled) {
            setUncontrolledValue(newValue)
        }
        onValueChange?.(newValue)
    }

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={`tabs ${className}`}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

// TabsList component
interface TabsListProps {
    children: React.ReactNode
    className?: string
}

export function TabsList({ children, className = "" }: TabsListProps) {
    return (
        <div className={`p-3 border border-gray-200 rounded-t-xl dark:border-gray-800 ${className}`}>
            <nav className="flex overflow-x-auto space-x-2 rounded-lg bg-gray-100 p-2 dark:bg-gray-900
  [&::-webkit-scrollbar]:h-1.5
  [&::-webkit-scrollbar-track]:bg-white dark:[&::-webkit-scrollbar-track]:bg-transparent
  [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
                {children}
            </nav>
        </div>
    )
}

// TabsTrigger component
interface TabsTriggerProps {
    value: string
    children: React.ReactNode
    className?: string
}

export function TabsTrigger({ value, children, className = "" }: TabsTriggerProps) {
    const { value: selectedValue, onValueChange } = useTabsContext()
    const isActive = selectedValue === value

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(value)}
            className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ease-in-out ${isActive
                ? "bg-white text-gray-900 shadow-theme-xs dark:bg-white/[0.03] dark:text-white"
                : "bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                } ${className}`}
        >
            {children}
        </button>
    )
}

// TabsContent component
interface TabsContentProps {
    value: string
    children: React.ReactNode
    className?: string
}

export function TabsContent({ value, children, className = "" }: TabsContentProps) {
    const { value: selectedValue } = useTabsContext()
    const isActive = selectedValue === value

    if (!isActive) return null

    return (
        <div
            role="tabpanel"
            className={`p-2.5 pt-4 border border-t-0 border-gray-200 rounded-b-xl dark:border-gray-800 ${className}`}
        >
            {children}
        </div>
    )
}
