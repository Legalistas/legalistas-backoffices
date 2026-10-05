"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { CotizacionDolar } from "@/types/caja";
import { formatARS } from "./api";

/** Valor del selector cuando la cotización se escribe a mano (o sale de los montos). */
export const A_MANO = "manual";

/**
 * De qué lado se mira la cotización: quien compra dólares paga el precio de
 * "venta" de la casa; quien vende recibe el de "compra".
 */
export type LadoCotizacion = "compra" | "venta";

/** Número → texto para un campo de monto ("1551,9"). */
export const aTexto = (n: number, decimales = 2) =>
	String(Math.round(n * 10 ** decimales) / 10 ** decimales).replace(".", ",");

interface CotizacionSelectProps {
	cotizaciones: CotizacionDolar[];
	/** `casa` elegida o A_MANO. */
	value: string;
	onChange: (casa: string) => void;
	lado: LadoCotizacion;
	disabled?: boolean;
}

/** Elegir con qué dólar se toma una operación: MEP, blue, oficial… o una a mano. */
export default function CotizacionSelect({
	cotizaciones,
	value,
	onChange,
	lado,
	disabled,
}: CotizacionSelectProps) {
	return (
		<Select value={value} onValueChange={onChange} disabled={disabled}>
			<SelectTrigger className="w-full">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{cotizaciones.map((c) => (
					<SelectItem key={c.casa} value={c.casa}>
						{c.nombre} · {formatARS(c[lado])}
					</SelectItem>
				))}
				<SelectItem value={A_MANO}>Otra (a mano)</SelectItem>
			</SelectContent>
		</Select>
	);
}
