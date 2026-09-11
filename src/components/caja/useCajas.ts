"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { CajaRubro, CajasResponse } from "@/types/caja";
import { CajaApiError, cajaFetch } from "./api";

/** Cajas visibles para el usuario (todas si es admin, las propias si es dueño). */
export function useCajas() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [data, setData] = useState<CajasResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<CajaApiError | null>(null);

	const reload = useCallback(async () => {
		if (!token) return;
		try {
			const res = await cajaFetch<{ data: CajasResponse }>("/cajas", token);
			setData(res.data);
			setError(null);
		} catch (e) {
			setError(e instanceof CajaApiError ? e : new CajaApiError("Error al cargar las cajas", 500));
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		reload();
	}, [reload]);

	return { data, loading, error, reload, token, userId: Number(session?.user?.id) || null };
}

/** Rubros con sub-rubros. `incluirInactivos` solo tiene efecto para admins. */
export function useRubros(token: string | undefined, enabled = true, incluirInactivos = false) {
	const [rubros, setRubros] = useState<CajaRubro[]>([]);
	const [loading, setLoading] = useState(false);

	const reload = useCallback(async () => {
		if (!token || !enabled) return;
		setLoading(true);
		try {
			const res = await cajaFetch<{ data: CajaRubro[] }>(
				`/rubros${incluirInactivos ? "?incluirInactivos=true" : ""}`,
				token,
			);
			setRubros(res.data);
		} catch (e) {
			console.error("[Caja] Error cargando rubros:", e);
		} finally {
			setLoading(false);
		}
	}, [token, enabled, incluirInactivos]);

	useEffect(() => {
		reload();
	}, [reload]);

	return { rubros, loading, reload };
}
