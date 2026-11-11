"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Subetapas de los casos (backend: cases-core.service updateCase).
// - Documentación (todos los servicios): Pendiente / Completada.
// - Administrativo (solo Accidente de Trabajo, SRT): son también las carpetas
//   de MinIO 2_ADMINISTRATIVO/{1_INICIADO | … | 5_RECIBOS_SUELDO}.
// - Cierre (todos los servicios): En cierre / Convenio (5_CIERRE/1_CONVENIO).
export const DOCUMENTATION_SUBSTAGES = [
	{ value: "PENDIENTE", label: "Pendiente" },
	{ value: "COMPLETADA", label: "Completada" },
] as const;

export const ADMINISTRATIVE_SUBSTAGES = [
	{ value: "INICIADO", label: "1. Iniciado" },
	{ value: "ESTUDIOS_MEDICOS", label: "2. Estudios médicos" },
	{ value: "RECHAZO", label: "3. Rechazo" },
	{ value: "PRONTO_DESPACHO", label: "4. Pronto despacho" },
	{ value: "RECIBOS_SUELDO", label: "5. Recibos de sueldos" },
] as const;

// Cierre (todos los servicios): Convenio = el acuerdo ya se presentó en el
// expediente; mueve la carpeta a 5_CIERRE/1_CONVENIO/.
export const CLOSING_SUBSTAGES = [
	{ value: "EN_CIERRE", label: "En cierre" },
	{ value: "CONVENIO", label: "Convenio" },
] as const;

export interface Subetapa {
	/** Campo del caso que la guarda. */
	campo: "documentationSubstage" | "administrativeSubstage" | "closingSubstage";
	opciones: readonly { value: string; label: string }[];
	/** Lo que vale mientras no se eligió ninguna (el backend la arranca ahí). */
	inicial: string;
	/** Cambiarla mueve la carpeta del caso en MinIO. */
	mueveCarpeta: boolean;
}

// Servicios que van por la ART (backend: constants/services.ts).
const SERVICIOS_ART = [1, 9, 10];
const ETAPA_DOCUMENTACION = 1;
const ETAPA_ADMINISTRATIVO = 2;
const ETAPA_CIERRE = 5;

/** La subetapa que tiene el caso en su etapa actual, o null si esa etapa no tiene. */
export function subetapaDe(stageId?: number | null, servicesId?: number | null): Subetapa | null {
	if (stageId === ETAPA_DOCUMENTACION) {
		return { campo: "documentationSubstage", opciones: DOCUMENTATION_SUBSTAGES, inicial: "PENDIENTE", mueveCarpeta: false };
	}
	if (stageId === ETAPA_ADMINISTRATIVO && SERVICIOS_ART.includes(servicesId ?? -1)) {
		return { campo: "administrativeSubstage", opciones: ADMINISTRATIVE_SUBSTAGES, inicial: "INICIADO", mueveCarpeta: true };
	}
	if (stageId === ETAPA_CIERRE) {
		return { campo: "closingSubstage", opciones: CLOSING_SUBSTAGES, inicial: "EN_CIERRE", mueveCarpeta: true };
	}
	return null;
}

interface SubstageSelectProps {
	subetapa: Subetapa;
	value: string | null | undefined;
	onChange: (value: string) => void;
	disabled?: boolean;
	/** Para achicarlo (p. ej. en la tabla de casos). */
	className?: string;
}

export function SubstageSelect({ subetapa, value, onChange, disabled, className }: SubstageSelectProps) {
	return (
		<Select value={value ?? subetapa.inicial} onValueChange={onChange} disabled={disabled}>
			<SelectTrigger className={cn("h-8 w-[190px] text-xs", className)} aria-label="Subetapa">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{subetapa.opciones.map((s) => (
					<SelectItem key={s.value} value={s.value} className="text-xs">
						{s.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
