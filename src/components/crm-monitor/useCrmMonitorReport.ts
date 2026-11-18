"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
	CRM_MONITOR_REPORT_ENDPOINT,
	CRM_MONITOR_REVISADA_ENDPOINT,
	CRM_MONITOR_RUN_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	EngineRunResult,
	MonitorReportResponse,
} from "@/types/crm-monitor";

interface UseCrmMonitorReportResult {
	data: MonitorReportResponse | null;
	loading: boolean;
	error: string | null;
	refresh: () => void;
	// Dispara el runner en el backend y luego refresca. Devuelve el resultado
	// para poder mostrar "N alertas nuevas detectadas" en la UI.
	runNow: () => Promise<EngineRunResult | null>;
	running: boolean;
	/** Marks an alert as reviewed (it leaves the monitor). Throws with the server's message. */
	marcarRevisada: (id: number) => Promise<void>;
}

// `weekOf` opcional — si no viene, el backend usa la semana actual.
export function useCrmMonitorReport(
	weekOf?: string,
): UseCrmMonitorReportResult {
	const { data: session } = useSession();
	const [data, setData] = useState<MonitorReportResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [running, setRunning] = useState(false);

	const load = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;

		setLoading(true);
		setError(null);
		try {
			const url = weekOf
				? `${CRM_MONITOR_REPORT_ENDPOINT}?weekOf=${weekOf}`
				: CRM_MONITOR_REPORT_ENDPOINT;
			const res = await fetch(url, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			setData((await res.json()) as MonitorReportResponse);
		} catch (err) {
			setError((err as Error).message);
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, weekOf]);

	useEffect(() => {
		void load();
	}, [load]);

	const runNow = useCallback(async (): Promise<EngineRunResult | null> => {
		const token = session?.user?.accessToken;
		if (!token) return null;

		setRunning(true);
		try {
			const res = await fetch(CRM_MONITOR_RUN_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const result = (await res.json()) as EngineRunResult;
			await load();
			return result;
		} catch (err) {
			setError((err as Error).message);
			return null;
		} finally {
			setRunning(false);
		}
	}, [session?.user?.accessToken, load]);

	const marcarRevisada = useCallback(
		async (id: number) => {
			const res = await fetch(CRM_MONITOR_REVISADA_ENDPOINT(id), {
				method: "POST",
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `HTTP ${res.status}`);
			// Out of the list and the counters right away, without reloading the whole report.
			setData((d) => {
				if (!d) return d;
				const [regla, alerta] =
					Object.entries(d.byRule)
						.map(([k, alerts]) => [k, alerts.find((a) => a.id === id)] as const)
						.find(([, a]) => a) ?? [];
				if (!regla || !alerta) return d;
				const sev = alerta.severity === "CRITICAL" ? "critical" : alerta.severity === "WARN" ? "warn" : "info";
				return {
					...d,
					byRule: { ...d.byRule, [regla]: d.byRule[regla].filter((a) => a.id !== id) },
					totals: {
						...d.totals,
						all: d.totals.all - 1,
						byRule: { ...d.totals.byRule, [regla]: (d.totals.byRule[regla] ?? 1) - 1 },
						bySeverity: { ...d.totals.bySeverity, [sev]: d.totals.bySeverity[sev] - 1 },
					},
				};
			});
		},
		[session?.user?.accessToken],
	);

	return { data, loading, error, refresh: load, runNow, running, marcarRevisada };
}
