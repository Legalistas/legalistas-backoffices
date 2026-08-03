"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import FilterCombobox from "@/components/crm/FilterCombobox";
import { SETTINGS_STATES_ENDPOINT } from "@/constant/api-endpoints";

// Desplegable de localidades dependiente de la provincia.
// KPIs Ventas v1.1, punto 7.2 — reemplaza el texto libre de la ciudad.
//
// Vive suelto (y no dentro de ProvinceCitySelect) porque el alta de cliente
// ya tiene su propio select de provincia atado al país, y solo necesita
// esta mitad.

interface LocalitySelectProps {
	stateId: number | null | undefined;
	cityId: number | null | undefined;
	/** `name` viene para poder seguir guardando el texto de la ciudad. */
	onSelect: (cityId: number | null, name?: string) => void;
	disabled?: boolean;
	className?: string;
	/** Aviso cuando la provincia no tiene localidades cargadas. */
	showEmptyHint?: boolean;
}

export default function LocalitySelect({
	stateId,
	cityId,
	onSelect,
	disabled = false,
	className,
	showEmptyHint = true,
}: LocalitySelectProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!token || !stateId) {
			setCities([]);
			return;
		}
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`${SETTINGS_STATES_ENDPOINT}/${stateId}/localities`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				if (!res.ok) throw new Error(String(res.status));
				const json = await res.json();
				if (!cancelled) setCities(json.data ?? []);
			} catch {
				if (!cancelled) setCities([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [token, stateId]);

	const placeholder = !stateId
		? "Elegí una provincia primero"
		: loading
			? "Cargando…"
			: cities.length === 0
				? "Sin localidades cargadas"
				: "Seleccionar localidad";

	return (
		<>
			<FilterCombobox
				placeholder={placeholder}
				searchPlaceholder="Buscar localidad..."
				options={cities.map((c) => ({ value: c.id, label: c.name }))}
				value={cityId ?? undefined}
				onSelect={
					disabled || !stateId
						? () => {}
						: (v) => {
								if (v === undefined) {
									onSelect(null);
									return;
								}
								const id = Number(v);
								onSelect(id, cities.find((c) => c.id === id)?.name);
							}
				}
				loading={loading}
				className={className ?? "w-full"}
			/>
			{showEmptyHint && stateId && !loading && cities.length === 0 && (
				<p className="mt-1.5 text-xs text-muted-foreground">
					Esta provincia todavía no tiene localidades cargadas — falta correr
					el seed del catálogo.
				</p>
			)}
		</>
	);
}
