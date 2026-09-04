"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/constant/api-endpoints";

// Doc "KPIs y Reportes de Ventas", punto 1 y 2: total de oportunidades
// activas en vivo + serie mensual histórica, ambos con los mismos filtros
// de Etapa/Canal/Provincia que ya usa el Kanban (Sección 1.2).
//
// Recibe los 3 filtros como primitivos sueltos (no un objeto) a propósito:
// un objeto `{ columnId, sourceChannelId, stateId }` armado inline en el
// componente que llama a este hook sería una referencia nueva en cada
// render, rompiendo la memoización de `refresh` y reintroduciendo el mismo
// bug de refetch-loop que ya se corrigió antes en KanbanBoard.tsx.

export interface ActiveOpportunitiesByColumn {
	columnId: number | null;
	title: string;
	count: number;
}

export interface ActiveOpportunitiesHistoryPoint {
	monthOf: string;
	count: number;
}

function buildQuery(
	columnId?: number,
	sourceChannelId?: number,
	stateId?: number,
): string {
	const qs = new URLSearchParams();
	if (columnId != null) qs.set("columnId", String(columnId));
	if (sourceChannelId != null) qs.set("sourceChannelId", String(sourceChannelId));
	if (stateId != null) qs.set("stateId", String(stateId));
	return qs.toString();
}

export function useActiveOpportunities(
	columnId?: number,
	sourceChannelId?: number,
	stateId?: number,
) {
	const { data: session } = useSession();
	const [total, setTotal] = useState(0);
	const [byColumn, setByColumn] = useState<ActiveOpportunitiesByColumn[]>([]);
	const [history, setHistory] = useState<ActiveOpportunitiesHistoryPoint[]>([]);
	const [loading, setLoading] = useState(false);

	const token = session?.user?.accessToken;

	const refresh = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const query = buildQuery(columnId, sourceChannelId, stateId);
			const headers = { Authorization: `Bearer ${token}` };

			const [totalRes, historyRes] = await Promise.all([
				fetch(`${API_BASE_URL}/kpis/sales/active-opportunities?${query}`, {
					headers,
				}),
				fetch(
					`${API_BASE_URL}/kpis/sales/active-opportunities-history?${query}`,
					{ headers },
				),
			]);

			if (totalRes.ok) {
				const json = await totalRes.json();
				setTotal(json.total ?? 0);
				setByColumn(json.byColumn ?? []);
			}
			if (historyRes.ok) {
				const json = await historyRes.json();
				setHistory(json.history ?? []);
			}
		} catch (error) {
			console.error("Error fetching active opportunities:", error);
		} finally {
			setLoading(false);
		}
	}, [token, columnId, sourceChannelId, stateId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { total, byColumn, history, loading, refresh };
}
