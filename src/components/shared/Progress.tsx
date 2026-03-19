"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { Progress as ShadcnProgress } from "@/components/ui/progress";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Valor actual del progreso (0-100)
	 */
	value?: number;

	/**
	 * Valor máximo del progreso
	 * @default 100
	 */
	max?: number;

	/**
	 * Mostrar el valor como texto
	 * @default false
	 */
	showValue?: boolean;

	/**
	 * Formato del valor mostrado
	 * @default "percent" - Muestra el valor como porcentaje
	 */
	valueFormat?: "percent" | "raw" | "custom";

	/**
	 * Función personalizada para formatear el valor
	 */
	formatValue?: (value: number, max: number) => string;

	/**
	 * Variante de color
	 * @default "default"
	 */
	variant?:
		| "default"
		| "primary"
		| "secondary"
		| "success"
		| "warning"
		| "danger"
		| "info";

	/**
	 * Tamaño de la barra de progreso
	 * @default "md"
	 */
	size?: "xs" | "sm" | "md" | "lg";

	/**
	 * Animación de la barra de progreso
	 * @default false
	 */
	animated?: boolean;

	/**
	 * Estilo de la barra de progreso
	 * @default "solid"
	 */
	progressStyle?: "solid" | "gradient";
}

// Mapeo de tamaños a clases de Tailwind
const sizeClasses = {
	xs: "h-1",
	sm: "h-2",
	md: "h-3",
	lg: "h-4",
} as const;

// Mapeo de variantes de color para el indicador (barra)
const indicatorSolidClasses = {
	default: "bg-blue-600 dark:bg-blue-500",
	primary: "bg-blue-600 dark:bg-blue-500",
	secondary: "bg-purple-600 dark:bg-purple-500",
	success: "bg-green-600 dark:bg-green-500",
	warning: "bg-amber-600 dark:bg-amber-500",
	danger: "bg-red-600 dark:bg-red-500",
	info: "bg-sky-600 dark:bg-sky-500",
} as const;

const indicatorGradientClasses = {
	default: "bg-gradient-to-r from-blue-500 to-blue-600",
	primary: "bg-gradient-to-r from-blue-500 to-blue-600",
	secondary: "bg-gradient-to-r from-purple-500 to-purple-600",
	success: "bg-gradient-to-r from-green-500 to-green-600",
	warning: "bg-gradient-to-r from-amber-500 to-amber-600",
	danger: "bg-gradient-to-r from-red-500 to-red-600",
	info: "bg-gradient-to-r from-sky-500 to-sky-600",
} as const;

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
	const clampedValue = Math.max(0, Math.min(value, max));

	// Calcular el porcentaje
	const percentage = (clampedValue / max) * 100;

	// Formatear el valor para mostrar
	const formattedValue = formatValue
		? formatValue(clampedValue, max)
		: valueFormat === "percent"
			? `${Math.round(percentage)}%`
			: `${clampedValue}`;

	const indicatorClasses =
		progressStyle === "solid"
			? indicatorSolidClasses[variant]
			: indicatorGradientClasses[variant];

	return (
		<div className="relative" {...props}>
			<ShadcnProgress
				value={percentage}
				max={100}
				className={cn(
					"bg-gray-200 dark:bg-gray-700",
					sizeClasses[size],
					className,
				)}
				aria-valuetext={formattedValue}
				indicatorClassName={cn(
					indicatorClasses,
					animated && "transition-all duration-500 ease-in-out",
				)}
			/>

			{showValue && (
				<div className="mt-1 text-xs text-right font-medium">
					{formattedValue}
				</div>
			)}
		</div>
	);
}
