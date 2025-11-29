import type React from "react"
import type { ReactNode } from "react"

// Props interfaces for Card components
interface CardProps {
    children?: ReactNode
    className?: string
    ref?: React.Ref<HTMLDivElement>
}

interface CardHeaderProps {
    children: ReactNode
    className?: string
}

interface CardTitleProps {
    children: ReactNode
    className?: string
}

interface CardDescriptionProps {
    children: ReactNode
    className?: string
}

interface CardContentProps {
    children: ReactNode
    className?: string
}

interface CardFooterProps {
    children: ReactNode
    className?: string
}

// Card Component
const Card: React.FC<CardProps> = ({ children, className = "", ref }) => {
    return (
        <div
            ref={ref} // Aquí se reenvía la ref
            className={`rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
        >
            {children}
        </div>
    )
}

// CardHeader Component
const CardHeader: React.FC<CardHeaderProps> = ({ children, className = "" }) => {
    return <div className={`px-4 py-3 ${className}`}>{children}</div>
}

// CardTitle Component
const CardTitle: React.FC<CardTitleProps> = ({ children, className = "" }) => {
    return <h4 className={`mb-1 font-medium text-gray-800 text-theme-xl dark:text-white/90 ${className}`}>{children}</h4>
}

// CardDescription Component
const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = "" }) => {
    return <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>
}

// CardContent Component
const CardContent: React.FC<CardContentProps> = ({ children, className = "" }) => {
    return <div className={`px-4 py-3 ${className}`}>{children}</div>
}

// CardFooter Component
const CardFooter: React.FC<CardFooterProps> = ({ children, className = "" }) => {
    return <div className={`px-4 py-3 flex items-center ${className}`}>{children}</div>
}

// Named exports for better flexibility
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
