"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import LocalitySelect from "@/components/common/LocalitySelect";
import FilterCombobox from "@/components/crm/FilterCombobox";
import { Label } from "@/components/ui/label";
import { SETTINGS_COUNTRIES_ENDPOINT } from "@/constant/api-endpoints";

// Par provincia + ciudad, con la ciudad dependiente de la provincia.
// KPIs Ventas v1.1, punto 7.2: la ciudad era texto libre y por eso no se
// podía segmentar (ej. cuántas ventas de Rosario dentro de Santa Fe).

/** Argentina. El backend expone las provincias colgando del país. */
const DEFAULT_COUNTRY_ID = 1;

interface ProvinceCitySelectProps {
	stateId: number | null;
	cityId: number | null;
	/**
	 * Los nombres van además de los ids, para quien necesite guardar el texto
	 * (ej. la jurisdicción del colegio, que es un string suelto).
	 */
	onChange: (next: {
		stateId: number | null;
		cityId: number | null;
		stateName?: string | null;
		cityName?: string | null;
	}) => void;
	countryId?: number;
	disabled?: boolean;
	/** Etiquetas custom (ej. "Provincia del hecho"). */
	stateLabel?: string;
	cityLabel?: string;
	className?: string;
}

export default function ProvinceCitySelect({
	stateId,
	cityId,
	onChange,
	countryId = DEFAULT_COUNTRY_ID,
	disabled = false,
	stateLabel = "Provincia",
	cityLabel = "Ciudad / Localidad",
	className,
}: ProvinceCitySelectProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [states, setStates] = useState<Array<{ id: number; name: string }>>([]);
	const [loadingStates, setLoadingStates] = useState(false);

	useEffect(() => {
		if (!token) return;
		let cancelled = false;

		const load = async () => {
			setLoadingStates(true);
			try {
				// limit alto: el endpoint pagina de a 10 por default y las
				// provincias entran todas en una sola tanda.
				const res = await fetch(
					`${SETTINGS_COUNTRIES_ENDPOINT}/${countryId}/states?limit=200`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				if (!res.ok) throw new Error(String(res.status));
				const json = await res.json();
				const sorted = [...(json.data ?? [])].sort((a, b) =>
					a.name.localeCompare(b.name, "es"),
				);
				if (!cancelled) setStates(sorted);
			} catch {
				if (!cancelled) setStates([]);
			} finally {
				if (!cancelled) setLoadingStates(false);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [token, countryId]);

	const handleStateChange = useCallback(
		(value: string | number | undefined) => {
			// Cambiar de provincia invalida la ciudad: si no, queda un
			// Rosario colgado de Córdoba.
			const nextStateId = value === undefined ? null : Number(value);
			onChange({
				stateId: nextStateId,
				cityId: null,
				stateName: states.find((s) => s.id === nextStateId)?.name ?? null,
				cityName: null,
			});
		},
		[onChange, states],
	);

	const currentStateName = states.find((s) => s.id === stateId)?.name ?? null;

	return (
		<div className={className}>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label>{stateLabel}</Label>
					<FilterCombobox
						placeholder="Seleccionar provincia"
						searchPlaceholder="Buscar provincia..."
						options={states.map((s) => ({ value: s.id, label: s.name }))}
						value={stateId ?? undefined}
						onSelect={disabled ? () => {} : handleStateChange}
						loading={loadingStates}
						className="w-full"
					/>
				</div>
				<div className="space-y-2">
					<Label>{cityLabel}</Label>
					<LocalitySelect
						stateId={stateId}
						cityId={cityId}
						onSelect={(next, name) =>
							onChange({
								stateId,
								cityId: next,
								stateName: currentStateName,
								cityName: name ?? null,
							})
						}
						disabled={disabled}
					/>
				</div>
			</div>
		</div>
	);
}
