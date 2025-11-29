"use client"

import type React from "react"
import type { ReactNode } from "react"

interface ButtonProps {
    children: ReactNode // Button text or content
    size?: "sm" | "md" | "icon" // Added "icon" size
    variant?: "primary" | "outline" | "custom" | "ghost" // Added "ghost" variant
    startIcon?: ReactNode // Icon before the text
    endIcon?: ReactNode // Icon after the text
    onClick?: () => void // Click handler
    disabled?: boolean // Disabled state
    className?: string // Custom classes
    title?: string
    type?: "submit" | "reset" | "button"
}

const Button: React.FC<ButtonProps> = ({
    children,
    size = "md",
    variant = "primary",
    startIcon,
    endIcon,
    onClick,
    className = "",
    disabled = false,
    title = "",
    type = "button",
}) => {
    // Size Classes
    const sizeClasses = {
        sm: "px-4 py-3 text-sm",
        md: "px-4 py-2.5 text-sm",
        icon: "h-9 w-9 p-0", // Tamaño cuadrado para iconos, sin padding interno
    }

    // Variant Classes
    const variantClasses = {
        primary: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
        outline:
            "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
        custom: "", // Empty string for custom variant to allow full control via className
        ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-400", // Variante ghost
    }

    return (
        <button
            className={`inline-flex items-center justify-center font-medium gap-2 rounded-lg transition ${variant !== "custom" ? sizeClasses[size] : ""
                } ${variantClasses[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
            type={type}
        >
            {startIcon && <span className="flex items-center">{startIcon}</span>}
            {children}
            {endIcon && <span className="flex items-center">{endIcon}</span>}
        </button>
    )
}

export default Button
