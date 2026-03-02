"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { SESSION_END_ENDPOINT } from "@/constant/api-endpoints";

/**
 * Registra el fin de sesión cuando el usuario:
 * - Cierra el tab / navegador (beforeunload)
 * - Desmonta el AdminLayout (logout explícito)
 *
 * Usa navigator.sendBeacon para garantizar envío en beforeunload.
 */
export function useSessionTracker() {
  const { data: session } = useSession();
  const sentRef = useRef(false);

  useEffect(() => {
    const activityLogId = (session?.user as any)?.activityLogId;

    if (!activityLogId) return;

    // Reset cuando llega una nueva sesión
    sentRef.current = false;

    const sendSessionEnd = () => {
      if (sentRef.current) return;
      sentRef.current = true;

      const payload = JSON.stringify({ activityLogId });

      // sendBeacon garantiza el envío aunque el tab se cierre
      const beaconSent = navigator.sendBeacon(
        SESSION_END_ENDPOINT,
        new Blob([payload], { type: "application/json" })
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

    window.addEventListener("beforeunload", sendSessionEnd);

    return () => {
      window.removeEventListener("beforeunload", sendSessionEnd);
      // Al desmontar el layout (logout explícito) también cerramos sesión
      sendSessionEnd();
    };
  }, [(session?.user as any)?.activityLogId]);
}
