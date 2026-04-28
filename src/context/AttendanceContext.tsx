"use client";

import { useSession } from "next-auth/react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import {
	ME_ATTENDANCE_ACTION_ENDPOINT,
	ME_ATTENDANCE_STATUS_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	AttendanceAction,
	AttendanceRecord,
	AttendanceState,
	MyAttendanceStatus,
} from "@/types/attendance";

export function formatHMS(totalSecs: number): string {
	const s = Math.max(0, Math.floor(totalSecs));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatHM(totalSecs: number): string {
	const s = Math.max(0, Math.floor(totalSecs));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function computeWorkedSecs(record: AttendanceRecord): number {
	const start = new Date(record.checkIn).getTime();
	const end = record.checkOut
		? new Date(record.checkOut).getTime()
		: Date.now();
	const gross = Math.max(0, Math.floor((end - start) / 1000));
	let pause = record.pauseSecs ?? 0;
	if (record.pausedAt && !record.checkOut) {
		pause += Math.floor(
			(Date.now() - new Date(record.pausedAt).getTime()) / 1000,
		);
	}
	return Math.max(0, gross - pause);
}

export function computePauseSecs(record: AttendanceRecord): number {
	let pause = record.pauseSecs ?? 0;
	if (record.pausedAt && !record.checkOut) {
		pause += Math.floor(
			(Date.now() - new Date(record.pausedAt).getTime()) / 1000,
		);
	}
	return pause;
}

interface AttendanceContextValue {
	state: AttendanceState | null;
	record: AttendanceRecord | null;
	submitting: boolean;
	doAction: (action: AttendanceAction) => Promise<void>;
	fetchStatus: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({ children }: { children: ReactNode }) {
	const { data: session, status: sessionStatus } = useSession();
	const token = session?.user?.accessToken;

	const [state, setState] = useState<AttendanceState | null>(null);
	const [record, setRecord] = useState<AttendanceRecord | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [, setTick] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const fetchStatus = useCallback(async () => {
		if (!token) return;
		try {
			const res = await fetch(ME_ATTENDANCE_STATUS_ENDPOINT, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`Error ${res.status}`);
			const json = (await res.json()) as { data: MyAttendanceStatus };
			setState(json.data.state);
			setRecord(json.data.currentRecord);
		} catch (err) {
			console.error("Error fetching attendance status:", err);
		}
	}, [token]);

	useEffect(() => {
		if (sessionStatus !== "authenticated") return;
		fetchStatus();
	}, [fetchStatus, sessionStatus]);

	useEffect(() => {
		if (record && !record.checkOut) {
			intervalRef.current = setInterval(() => {
				setTick((t) => t + 1);
			}, 1000);
			return () => {
				if (intervalRef.current) clearInterval(intervalRef.current);
			};
		}
		if (intervalRef.current) clearInterval(intervalRef.current);
	}, [record]);

	const doAction = useCallback(
		async (action: AttendanceAction) => {
			if (!token || submitting) return;
			setSubmitting(true);
			try {
				const res = await fetch(ME_ATTENDANCE_ACTION_ENDPOINT, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ action }),
				});
				const json = await res.json();
				if (!res.ok) throw new Error(json?.message || `Error ${res.status}`);

				const messages: Record<AttendanceAction, string> = {
					"check-in": "Entrada registrada",
					pause: "Pausa iniciada",
					resume: "Pausa finalizada",
					"check-out": "Salida registrada",
				};
				toast.success(messages[action]);
				await fetchStatus();
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Error";
				toast.error(msg);
			} finally {
				setSubmitting(false);
			}
		},
		[token, submitting, fetchStatus],
	);

	return (
		<AttendanceContext.Provider
			value={{ state, record, submitting, doAction, fetchStatus }}
		>
			{children}
		</AttendanceContext.Provider>
	);
}

export function useAttendance() {
	const ctx = useContext(AttendanceContext);
	if (!ctx) {
		throw new Error("useAttendance must be used within AttendanceProvider");
	}
	return ctx;
}
