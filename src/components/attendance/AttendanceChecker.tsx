"use client";

import {
	Coffee,
	Loader2,
	LogOut,
	Pause,
	Play,
	Timer,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

function formatHMS(totalSecs: number): string {
	const s = Math.max(0, Math.floor(totalSecs));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function computeWorkedSecs(record: AttendanceRecord): number {
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

function computePauseSecs(record: AttendanceRecord): number {
	let pause = record.pauseSecs ?? 0;
	if (record.pausedAt && !record.checkOut) {
		pause += Math.floor(
			(Date.now() - new Date(record.pausedAt).getTime()) / 1000,
		);
	}
	return pause;
}

export default function AttendanceChecker() {
	const { data: session, status: sessionStatus } = useSession();
	const token = session?.user?.accessToken;

	const [state, setState] = useState<AttendanceState | null>(null);
	const [record, setRecord] = useState<AttendanceRecord | null>(null);
	const [loading, setLoading] = useState(false);
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

	// Tick cada segundo mientras haya registro abierto (para timer en vivo)
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

	// No mostramos nada mientras cargamos la sesión o el estado
	if (sessionStatus !== "authenticated" || state === null) return null;
	if (state === "NO_EMPLOYMENT" || state === "COMPLETED") return null;

	// Modal bloqueante para check-in pendiente
	if (state === "NEEDS_CHECK_IN") {
		return (
			<Dialog open modal>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-md"
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Timer className="h-5 w-5 text-primary" />
							Registrar entrada
						</DialogTitle>
						<DialogDescription>
							Para empezar a trabajar, registrá tu entrada. Esto es obligatorio
							para continuar usando el sistema.
						</DialogDescription>
					</DialogHeader>

					<div className="py-4 flex items-center justify-center">
						<div className="text-center">
							<div className="text-4xl font-bold tabular-nums text-primary mb-1">
								{new Date().toLocaleTimeString("es-AR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</div>
							<div className="text-xs text-muted-foreground">
								{new Date().toLocaleDateString("es-AR", {
									weekday: "long",
									day: "numeric",
									month: "long",
								})}
							</div>
						</div>
					</div>

					<Button
						size="lg"
						className="w-full"
						disabled={submitting}
						onClick={() => doAction("check-in")}
					>
						{submitting ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Play className="h-4 w-4 mr-2" />
						)}
						Registrar entrada
					</Button>
				</DialogContent>
			</Dialog>
		);
	}

	// Modal bloqueante en pausa
	if (state === "PAUSED" && record) {
		const pauseSecs = computePauseSecs(record);
		return (
			<Dialog open modal>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-md"
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Coffee className="h-5 w-5 text-amber-600" />
							En pausa
						</DialogTitle>
						<DialogDescription>
							Estás en pausa. Cuando vuelvas al trabajo presioná Retomar para
							seguir usando el sistema.
						</DialogDescription>
					</DialogHeader>

					<div className="py-4 flex flex-col items-center justify-center gap-2">
						<div className="text-4xl font-bold tabular-nums text-amber-600">
							{formatHMS(pauseSecs)}
						</div>
						<div className="text-xs text-muted-foreground">
							Tiempo en pausa
						</div>
					</div>

					<Button
						size="lg"
						className="w-full"
						disabled={submitting}
						onClick={() => doAction("resume")}
					>
						{submitting ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Play className="h-4 w-4 mr-2" />
						)}
						Retomar
					</Button>
				</DialogContent>
			</Dialog>
		);
	}

	// Widget flotante mientras está trabajando
	if (state === "WORKING" && record) {
		const workedSecs = computeWorkedSecs(record);
		return (
			<div className="fixed bottom-4 right-4 z-40 rounded-lg border border-border bg-card shadow-lg p-3 flex items-center gap-3 min-w-60">
				<div className="flex items-center gap-2 flex-1">
					<div className="relative flex h-2.5 w-2.5">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
						<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
					</div>
					<div>
						<div className="text-xs text-muted-foreground leading-none">
							Trabajando
						</div>
						<div className="text-sm font-semibold tabular-nums">
							{formatHMS(workedSecs)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8"
						title="Pausar"
						disabled={submitting}
						onClick={() => doAction("pause")}
					>
						<Pause className="h-4 w-4" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
						title="Salir"
						disabled={submitting}
						onClick={() => {
							if (confirm("¿Registrar salida y cerrar el día?")) {
								doAction("check-out");
							}
						}}
					>
						<LogOut className="h-4 w-4" />
					</Button>
				</div>
			</div>
		);
	}

	return null;
}
