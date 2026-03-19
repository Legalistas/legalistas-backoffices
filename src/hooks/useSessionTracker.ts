"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import {
	SESSION_END_ENDPOINT,
	SESSION_PAUSE_ENDPOINT,
} from "@/constant/api-endpoints";

/**
 * Registra el tiempo de sesión activa:
 * - Pausa cuando ocultas la pestaña (visibilitychange -> hidden)
 * - Reanuda cuando vuelves a la pestaña (visibilitychange -> visible)
 * - Cierra definitivamente al cerrar el tab/navegador (beforeunload)
 *
 * Usa navigator.sendBeacon para garantizar envío en beforeunload.
 */
export function useSessionTracker() {
	const { data: session } = useSession();
	const sentRef = useRef(false);
	const pausedRef = useRef(false);

	useEffect(() => {
		const activityLogId = (session?.user as any)?.activityLogId;

		if (!activityLogId) return;

		// Reset cuando llega una nueva sesión
		sentRef.current = false;
		pausedRef.current = false;

		const sendSessionPause = async () => {
			if (sentRef.current || pausedRef.current) return;
			pausedRef.current = true;

			const payload = JSON.stringify({ activityLogId });

			try {
				await fetch(SESSION_PAUSE_ENDPOINT, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: payload,
					keepalive: true,
				});
			} catch (error) {
				console.error("Error al pausar sesión:", error);
			}
		};

		const handleVisibilityChange = () => {
			if (document.hidden) {
				// Pestaña oculta -> pausar sesión
				sendSessionPause();
			} else {
				// Pestaña visible -> reanudar (simplemente resetear el flag)
				pausedRef.current = false;
			}
		};

		const sendSessionEnd = () => {
			if (sentRef.current) return;
			sentRef.current = true;

			const payload = JSON.stringify({ activityLogId });

			// sendBeacon garantiza el envío aunque el tab se cierre
			const beaconSent = navigator.sendBeacon(
				SESSION_END_ENDPOINT,
				new Blob([payload], { type: "application/json" }),
			);

			// Fallback con keepalive para navegadores sin sendBeacon
			if (!beaconSent) {
				fetch(SESSION_END_ENDPOINT, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: payload,
					keepalive: true,
				}).catch(() => {});
			}
		};

		// Escuchar cambios de visibilidad
		document.addEventListener("visibilitychange", handleVisibilityChange);

		// Escuchar cierre de ventana/tab
		window.addEventListener("beforeunload", sendSessionEnd);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", sendSessionEnd);
			// Al desmontar el layout (logout explícito) también cerramos sesión
			sendSessionEnd();
		};
	}, [(session?.user as any)?.activityLogId]);
}
