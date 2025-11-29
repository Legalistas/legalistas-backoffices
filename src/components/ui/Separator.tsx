import type React from "react"
import { cn } from "@/lib/utils"

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Orientación del separador
     * @default "horizontal"
     */
    orientation?: "horizontal" | "vertical"

    /**
     * Grosor del separador
     * @default "thin"
     */
    thickness?: "thin" | "medium" | "thick"

    /**
     * Espacio alrededor del separador
     * @default "normal"
     */
    spacing?: "none" | "small" | "normal" | "large"

    /**
     * Color del separador
     * @default "default"
     */
    variant?: "default" | "muted" | "primary" | "secondary" | "danger"
}

export function Separator({
    orientation = "horizontal",
    thickness = "thin",
    spacing = "normal",
    variant = "default",
    className,
    ...props
}: SeparatorProps) {
    // Mapeo de grosor a clases de Tailwind
    const thicknessClasses = {
        thin: orientation === "horizontal" ? "h-px" : "w-px",
        medium: orientation === "horizontal" ? "h-0.5" : "w-0.5",
        thick: orientation === "horizontal" ? "h-1" : "w-1",
    }

    // Mapeo de espaciado a clases de Tailwind
    const spacingClasses = {
        none: "my-0 mx-0",
        small: orientation === "horizontal" ? "my-1" : "mx-1",
        normal: orientation === "horizontal" ? "my-4" : "mx-4",
        large: orientation === "horizontal" ? "my-8" : "mx-8",
    }

    // Mapeo de variantes de color a clases de Tailwind
    const variantClasses = {
        default: "bg-gray-200 dark:bg-gray-700",
        muted: "bg-gray-100 dark:bg-gray-800",
        primary: "bg-primary-200 dark:bg-primary-800",
        secondary: "bg-secondary-200 dark:bg-secondary-800",
        danger: "bg-red-200 dark:bg-red-800",
    }

    return (
        <div
            role="separator"
            aria-orientation={orientation}
            className={cn(
                "flex-shrink-0",
                orientation === "horizontal" ? "w-full" : "h-full",
                thicknessClasses[thickness],
                spacingClasses[spacing],
                variantClasses[variant],
                className,
            )}
            {...props}
        />
    )
}