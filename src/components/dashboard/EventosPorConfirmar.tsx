"use client";

import { CalendarCheck, Check, Loader2, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DASHBOARD_EVENT_CONFIRM_ENDPOINT,
	DASHBOARD_EVENTS_TO_CONFIRM_ENDPOINT,
} from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";

// Seguimiento de Ventas (relevamiento 8.2): audiencias, pericias y reuniones de
// los próximos 30 días que el cliente todavía no confirmó. Ventas lo llama o le
// escribe; cuando confirma (app, email o acá) el evento desaparece del listado.

interface EventoPorConfirmar {
	id: number;
	caseId: number;
	label: string;
	date: string;
	time: string | null;
	location: string | null;
	expediente: string | null;
	responsibleLawyer: string | null;
	client: { id: number; name: string; email: string | null; phone: string | null };
}

/** `date` se guarda literal (UTC = hora de Argentina). */
function fechaLarga(date: string, time: string | null): string {
	const d = new Date(date);
	const dia = d.toLocaleDateString("es-AR", {
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	});
	return time ? `${dia} ${time}` : dia;
}

function diasHasta(date: string): number {
	const hoy = new Date().toLocaleDateString("en-CA", {
		timeZone: "America/Argentina/Buenos_Aires",
	});
	const ms = new Date(date.slice(0, 10)).getTime() - new Date(hoy).getTime();
	return Math.round(ms / 86_400_000);
}

function whatsappUrl(e: EventoPorConfirmar): string | null {
	const digits = (e.client.phone ?? "").replace(/\D/g, "");
	// Hay teléfonos cargados sin característica ("651524"): sin al menos 10
	// dígitos el link abriría otro número. Se muestra el teléfono, sin WhatsApp.
	if (digits.length < 10) return null;
	const phone = digits.startsWith("54") ? digits : `54${digits}`;
	const text = `Hola ${e.client.name}, te escribimos de Legalistas para confirmar tu ${e.label.toLowerCase()} del ${fechaLarga(e.date, e.time)}${e.location ? ` en ${e.location}` : ""}. ¿Nos confirmás que vas a asistir?`;
	return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function EventosPorConfirmar() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [events, setEvents] = useState<EventoPorConfirmar[] | null>(null);
	const [confirming, setConfirming] = useState<number | null>(null);

	const load = useCallback(async () => {
		if (!token) return;
		try {
			const res = await fetch(DASHBOARD_EVENTS_TO_CONFIRM_ENDPOINT, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al cargar los eventos"));
			const json = (await res.json()) as { data: EventoPorConfirmar[] };
			setEvents(json.data);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al cargar los eventos");
			setEvents([]);
		}
	}, [token]);

	useEffect(() => {
		load();
	}, [load]);

	const confirmar = async (e: EventoPorConfirmar) => {
		setConfirming(e.id);
		try {
			const res = await fetch(DASHBOARD_EVENT_CONFIRM_ENDPOINT(e.id), {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo confirmar"));
			setEvents((prev) => (prev ?? []).filter((x) => x.id !== e.id));
			toast.success(`Confirmado: ${e.client.name}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo confirmar");
		} finally {
			setConfirming(null);
		}
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<CalendarCheck className="h-5 w-5 text-primary" />
					Eventos por confirmar
					{events && events.length > 0 && (
						<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
							{events.length}
						</span>
					)}
				</CardTitle>
				<p className="text-xs text-muted-foreground">
					Próximos 30 días. Cuando el cliente confirma (app, email o acá), sale de la lista.
				</p>
			</CardHeader>
			<CardContent>
				{events === null ? (
					<div className="flex justify-center py-8">
						<Loader2 className="h-5 w-5 animate-spin text-primary" />
					</div>
				) : events.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No hay eventos pendientes de confirmar.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{events.map((e) => {
							const dias = diasHasta(e.date);
							const wa = whatsappUrl(e);
							return (
								<li key={e.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<Link
												href={`/admin/legal-cases/${e.caseId}`}
												className="truncate font-medium hover:underline"
											>
												{e.client.name}
											</Link>
											<span className="text-xs text-muted-foreground">{e.label}</span>
											<span
												className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
													dias <= 2 ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
												}`}
											>
												{dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias} días`} ·{" "}
												{fechaLarga(e.date, e.time)}
											</span>
										</div>
										<div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
											{e.location && (
												<span className="inline-flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													{e.location}
												</span>
											)}
											{e.client.phone && (
												<span className="inline-flex items-center gap-1">
													<Phone className="h-3 w-3" />
													{e.client.phone}
												</span>
											)}
											{e.responsibleLawyer && <span>Abogado: {e.responsibleLawyer}</span>}
										</div>
									</div>
									<div className="flex shrink-0 gap-2">
										{wa && (
											<Button asChild size="sm" variant="outline">
												<a href={wa} target="_blank" rel="noopener noreferrer">
													<MessageCircle className="mr-1 h-4 w-4" />
													WhatsApp
												</a>
											</Button>
										)}
										<Button size="sm" onClick={() => confirmar(e)} disabled={confirming === e.id}>
											{confirming === e.id ? (
												<Loader2 className="mr-1 h-4 w-4 animate-spin" />
											) : (
												<Check className="mr-1 h-4 w-4" />
											)}
											Confirmó
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
