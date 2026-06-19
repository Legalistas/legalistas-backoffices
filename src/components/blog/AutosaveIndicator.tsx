"use client";

import { AlertCircle, Check, CloudOff, Loader2 } from "lucide-react";
import type { AutosaveState } from "@/hooks/useAutosave";
import { cn } from "@/lib/utils";

interface AutosaveIndicatorProps {
	state: AutosaveState;
	enabled: boolean;
}

function formatTime(d: Date): string {
	const hh = String(d.getHours()).padStart(2, "0");
	const mm = String(d.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}

export function AutosaveIndicator({ state, enabled }: AutosaveIndicatorProps) {
	if (!enabled) {
		return (
			<span
				className="flex items-center gap-1.5 text-xs text-gray-400"
				title="Completá título, slug y contenido para activar el autoguardado"
			>
				<CloudOff className="h-3.5 w-3.5" />
				<span>Autosave pausado</span>
			</span>
		);
	}

	switch (state.kind) {
		case "saving":
			return (
				<span className="flex items-center gap-1.5 text-xs text-gray-500">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					<span>Guardando...</span>
				</span>
			);
		case "saved":
			return (
				<span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
					<Check className="h-3.5 w-3.5" />
					<span>Guardado {formatTime(state.at)}</span>
				</span>
			);
		case "error":
			return (
				<span
					className={cn(
						"flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400",
					)}
					title={state.message}
				>
					<AlertCircle className="h-3.5 w-3.5" />
					<span>Error al guardar</span>
				</span>
			);
		default:
			return (
				<span className="flex items-center gap-1.5 text-xs text-gray-400">
					<span>Autosave activo</span>
				</span>
			);
	}
}
