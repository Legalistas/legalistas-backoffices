"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
	CRM_MONITOR_REPORT_ENDPOINT,
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

	return { data, loading, error, refresh: load, runNow, running };
}
