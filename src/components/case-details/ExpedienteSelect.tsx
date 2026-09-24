"use client";

import { useEffect } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getExpedienteLabel } from "@/lib/expediente-label";

type Expediente = Parameters<typeof getExpedienteLabel>[0];

interface ExpedienteSelectProps {
	files: Expediente[];
	value: number | null;
	onChange: (fileId: number) => void;
	customerName?: string;
	disabled?: boolean;
}

/**
 * Selector de expediente para todo lo que se genera como escrito
 * (formularios, escritos, anexos). Con un único expediente lo deja elegido;
 * con varios, obliga a elegir: no se asume ninguno.
 */
export function ExpedienteSelect({
	files,
	value,
	onChange,
	customerName,
	disabled,
}: ExpedienteSelectProps) {
	const onlyId = files.length === 1 ? Number(files[0].id) : null;
	useEffect(() => {
		if (onlyId != null && value == null) onChange(onlyId);
	}, [onlyId, value, onChange]);

	if (files.length === 0) {
		return (
			<p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
				El caso no tiene expedientes. Creá uno en la tab Expedientes antes de
				generar.
			</p>
		);
	}

	return (
		<Select
			value={value != null ? String(value) : ""}
			onValueChange={(v) => onChange(Number(v))}
			disabled={disabled}
		>
			<SelectTrigger>
				<SelectValue placeholder="Seleccioná el expediente…" />
			</SelectTrigger>
			<SelectContent>
				{files.map((f) => (
					<SelectItem key={f.id} value={String(f.id)}>
						{getExpedienteLabel(f, customerName)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
