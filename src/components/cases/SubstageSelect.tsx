"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Subetapas de la etapa Administrativo (relevamiento v1.1). Solo aplican a
// Accidente de Trabajo (SRT) y son también las carpetas de MinIO:
// 2_ADMINISTRATIVO/{1_INICIADO | 2_ESTUDIOS_MEDICOS | 3_RECHAZO | 4_PRONTO_DESPACHO}.
export const ADMINISTRATIVE_SUBSTAGES = [
	{ value: "INICIADO", label: "1. Iniciado" },
	{ value: "ESTUDIOS_MEDICOS", label: "2. Estudios médicos" },
	{ value: "RECHAZO", label: "3. Rechazo" },
	{ value: "PRONTO_DESPACHO", label: "4. Pronto despacho" },
] as const;

export type AdministrativeSubstage = (typeof ADMINISTRATIVE_SUBSTAGES)[number]["value"];

// Servicios que van por la ART (backend: constants/services.ts).
const SERVICIOS_ART = [1, 9, 10];
const ETAPA_ADMINISTRATIVO = 2;

export const aplicaSubetapa = (stageId?: number | null, servicesId?: number | null) =>
	stageId === ETAPA_ADMINISTRATIVO && SERVICIOS_ART.includes(servicesId ?? -1);

interface SubstageSelectProps {
	value: string | null | undefined;
	onChange: (value: AdministrativeSubstage) => void;
	disabled?: boolean;
	/** Para achicarlo (p. ej. en la tabla de casos). */
	className?: string;
}

export function SubstageSelect({ value, onChange, disabled, className }: SubstageSelectProps) {
	return (
		<Select
			// Sin subetapa cargada, el caso está (y su carpeta) en "Iniciado".
			value={value ?? "INICIADO"}
			onValueChange={(v) => onChange(v as AdministrativeSubstage)}
			disabled={disabled}
		>
			<SelectTrigger className={cn("h-8 w-[190px] text-xs", className)}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{ADMINISTRATIVE_SUBSTAGES.map((s) => (
					<SelectItem key={s.value} value={s.value} className="text-xs">
						{s.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
