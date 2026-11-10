"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { WHATSAPP_ENDPOINT } from "@/constant/api-endpoints";

// Agendas and campaigns of WhatsApp: shared API call and types
// (backend modules/whatsapp/agendas.routes.ts).

export interface Contacto {
	id: number;
	nombre: string;
	telefono: string;
	waId: string;
	leadId: number | null;
	vendedor: string | null;
	/** The client wrote BAJA: campaigns skip them. */
	baja: boolean;
	agendaIds: number[];
}

export interface Agenda {
	id: number;
	nombre: string;
	contactos: number;
}

export interface Resumen {
	total: number;
	pendientes: number;
	enviados: number;
	entregados: number;
	leidos: number;
	fallidos: number;
	omitidos: number;
}

export interface Campana {
	id: number;
	nombre: string;
	estado: "ENVIANDO" | "ENVIADA";
	plantillaNombre: string;
	variables: Record<string, string>;
	createdAt: string;
	enviadaAt: string | null;
	agenda: { id: number; nombre: string } | null;
	/** "No enviados · <campaña>": created when someone did not get it. */
	agendaNoEnviados: { id: number; nombre: string } | null;
	createdBy: { name: string };
	resumen: Resumen;
}

export interface Destinatario {
	id: number;
	nombre: string;
	waId: string;
	leadId: number | null;
	estado: "PENDIENTE" | "ENVIADO" | "OMITIDO" | "ERROR";
	detalle: string | null;
	enviadoAt: string | null;
	message: { status: string | null; errorCode: string | null; contactId: number } | null;
}

/** Fetch to /whatsapp with the session token; throws the backend message. */
export function useWhatsappApi() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const api = useCallback(
		async <T,>(path: string, init?: RequestInit): Promise<T> => {
			const res = await fetch(`${WHATSAPP_ENDPOINT}${path}`, {
				...init,
				headers: {
					Authorization: `Bearer ${token}`,
					...(init?.body ? { "Content-Type": "application/json" } : {}),
				},
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			return body.data as T;
		},
		[token],
	);
	return { api, listo: !!token };
}
