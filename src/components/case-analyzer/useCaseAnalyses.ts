"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CASE_ANALYSIS_DETAIL_ENDPOINT,
	CASE_ANALYSIS_LIST_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	CaseAnalysisDetail,
	CaseAnalysisListItem,
	CreateAnalysisResponse,
} from "@/types/case-analyzer";

// Hook central del case-analyzer:
// - `analyses`: lista del caso (auto-refresh cada 20s si hay algún PENDING/PROCESSING)
// - `uploadPdf(file)`: sube + encola
// - `fetchDetail(id)`: pide el detalle completo (para el viewer)
// - `refresh()`: recarga manual

interface UseCaseAnalysesResult {
	analyses: CaseAnalysisListItem[];
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	uploadPdf: (file: File) => Promise<CreateAnalysisResponse | null>;
	uploading: boolean;
	uploadProgress: number; // 0-100
	fetchDetail: (analysisId: number) => Promise<CaseAnalysisDetail | null>;
}

const POLL_INTERVAL_MS = 20_000; // 20s — el backend polea cada 30s

export function useCaseAnalyses(caseId: number | string): UseCaseAnalysesResult {
	const { data: session } = useSession();
	const [analyses, setAnalyses] = useState<CaseAnalysisListItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

	const load = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(CASE_ANALYSIS_LIST_ENDPOINT(caseId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as {
				analyses: CaseAnalysisListItem[];
			};
			setAnalyses(data.analyses);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [caseId, session?.user?.accessToken]);

	useEffect(() => {
		void load();
	}, [load]);

	// Auto-poll cuando hay algún análisis en progreso.
	useEffect(() => {
		const hasInFlight = analyses.some(
			(a) => a.status === "PENDING" || a.status === "PROCESSING",
		);
		if (hasInFlight && !pollTimer.current) {
			pollTimer.current = setInterval(() => {
				void load();
			}, POLL_INTERVAL_MS);
		} else if (!hasInFlight && pollTimer.current) {
			clearInterval(pollTimer.current);
			pollTimer.current = null;
		}
		return () => {
			if (pollTimer.current) {
				clearInterval(pollTimer.current);
				pollTimer.current = null;
			}
		};
	}, [analyses, load]);

	// Upload con XHR para tener progreso real de subida (fetch no lo expone).
	const uploadPdf = useCallback(
		async (file: File): Promise<CreateAnalysisResponse | null> => {
			const token = session?.user?.accessToken;
			if (!token) return null;

			setUploading(true);
			setUploadProgress(0);
			try {
				const result = await new Promise<CreateAnalysisResponse>(
					(resolve, reject) => {
						const xhr = new XMLHttpRequest();
						xhr.open("POST", CASE_ANALYSIS_LIST_ENDPOINT(caseId));
						xhr.setRequestHeader("Authorization", `Bearer ${token}`);
						xhr.upload.onprogress = (e) => {
							if (e.lengthComputable) {
								setUploadProgress(Math.round((e.loaded / e.total) * 100));
							}
						};
						xhr.onload = () => {
							if (xhr.status >= 200 && xhr.status < 300) {
								try {
									resolve(JSON.parse(xhr.responseText) as CreateAnalysisResponse);
								} catch {
									reject(new Error("Respuesta inválida del servidor"));
								}
							} else {
								reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
							}
						};
						xhr.onerror = () => reject(new Error("Error de red"));

						const form = new FormData();
						form.append("pdf", file);
						xhr.send(form);
					},
				);
				await load();
				return result;
			} catch (err) {
				setError((err as Error).message);
				return null;
			} finally {
				setUploading(false);
				setUploadProgress(0);
			}
		},
		[caseId, session?.user?.accessToken, load],
	);

	const fetchDetail = useCallback(
		async (analysisId: number): Promise<CaseAnalysisDetail | null> => {
			const token = session?.user?.accessToken;
			if (!token) return null;
			try {
				const res = await fetch(
					CASE_ANALYSIS_DETAIL_ENDPOINT(caseId, analysisId),
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return (await res.json()) as CaseAnalysisDetail;
			} catch (err) {
				setError((err as Error).message);
				return null;
			}
		},
		[caseId, session?.user?.accessToken],
	);

	return {
		analyses,
		loading,
		error,
		refresh: load,
		uploadPdf,
		uploading,
		uploadProgress,
		fetchDetail,
	};
}
