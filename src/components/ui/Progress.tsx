import type React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Valor actual del progreso (0-100)
     */
    value?: number

    /**
     * Valor máximo del progreso
     * @default 100
     */
    max?: number

    /**
     * Mostrar el valor como texto
     * @default false
     */
    showValue?: boolean

    /**
     * Formato del valor mostrado
     * @default "percent" - Muestra el valor como porcentaje
     */
    valueFormat?: "percent" | "raw" | "custom"

    /**
     * Función personalizada para formatear el valor
     */
    formatValue?: (value: number, max: number) => string

    /**
     * Variante de color
     * @default "default"
     */
    variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info"

    /**
     * Tamaño de la barra de progreso
     * @default "md"
     */
    size?: "xs" | "sm" | "md" | "lg"

    /**
     * Animación de la barra de progreso
     * @default false
     */
    animated?: boolean

    /**
     * Estilo de la barra de progreso
     * @default "solid"
     */
    progressStyle?: "solid" | "gradient"
}

export function Progress({
    value = 0,
    max = 100,
    showValue = false,
    valueFormat = "percent",
    formatValue,
    variant = "default",
    size = "md",
    animated = false,
    progressStyle = "solid",
    className,
    ...props
}: ProgressProps) {
    // Asegurar que el valor esté entre 0 y max
    const clampedValue = Math.max(0, Math.min(value, max))

    // Calcular el porcentaje
    const percentage = (clampedValue / max) * 100

    // Formatear el valor para mostrar
    const formattedValue = formatValue
        ? formatValue(clampedValue, max)
        : valueFormat === "percent"
            ? `${Math.round(percentage)}%`
            : `${clampedValue}`

    // Mapeo de tamaños a clases de Tailwind
    const sizeClasses = {
        xs: "h-1",
        sm: "h-2",
        md: "h-3",
        lg: "h-4",
    }

    // Mapeo de variantes de color a clases de Tailwind
    const backgroundClasses = {
        default: "bg-gray-200 dark:bg-gray-700",
        primary: "bg-gray-200 dark:bg-gray-700",
        secondary: "bg-gray-200 dark:bg-gray-700",
        success: "bg-gray-200 dark:bg-gray-700",
        warning: "bg-gray-200 dark:bg-gray-700",
        danger: "bg-gray-200 dark:bg-gray-700",
        info: "bg-gray-200 dark:bg-gray-700",
    }

    // Mapeo de variantes de color para la barra de progreso
    const barClasses = {
        default: progressStyle === "solid"
            ? "bg-blue-600 dark:bg-blue-500"
            : "bg-gradient-to-r from-blue-500 to-blue-600",
        primary: progressStyle === "solid"
            ? "bg-blue-600 dark:bg-blue-500"
            : "bg-gradient-to-r from-blue-500 to-blue-600",
        secondary: progressStyle === "solid"
            ? "bg-purple-600 dark:bg-purple-500"
            : "bg-gradient-to-r from-purple-500 to-purple-600",
        success: progressStyle === "solid"
            ? "bg-green-600 dark:bg-green-500"
            : "bg-gradient-to-r from-green-500 to-green-600",
        warning: progressStyle === "solid"
            ? "bg-amber-600 dark:bg-amber-500"
            : "bg-gradient-to-r from-amber-500 to-amber-600",
        danger: progressStyle === "solid"
            ? "bg-red-600 dark:bg-red-500"
            : "bg-gradient-to-r from-red-500 to-red-600",
        info: progressStyle === "solid"
            ? "bg-sky-600 dark:bg-sky-500"
            : "bg-gradient-to-r from-sky-500 to-sky-600",
    }

    // Clases para la animación
    const animationClass = animated ? "transition-all duration-500 ease-in-out" : ""

    return (
        <div className="relative">
            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={clampedValue}
                aria-valuetext={formattedValue}
                className={cn(
                    "w-full overflow-hidden rounded-full",
                    backgroundClasses[variant],
                    sizeClasses[size],
                    className
                )}
                {...props}
            >
                <div
                    className={cn(
                        "h-full rounded-full",
                        barClasses[variant],
                        animationClass
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {showValue && (
                <div className="mt-1 text-xs text-right font-medium">
                    {formattedValue}
                </div>
            )}
        </div>
    )
}

