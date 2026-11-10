"use client";

import { CalendarClock, ExternalLink, Loader2, StickyNote } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LEADS_ENDPOINT } from "@/constant/api-endpoints";
import { CRM_COLUMNS, MEETING_TYPES, SOURCE_CHANNEL } from "@/constant/crm";
import type { Lead } from "@/types/crm";

// Side panel of the WhatsApp inbox: the CRM lead behind the number, read from
// the same endpoint as the lead page, so the conversation stays open.

type LeadDetalle = Lead & { firstName?: string | null; lastName?: string | null };

const ESTADO: Record<Lead["status"], string> = { IN_PROGRESS: "En curso", WON: "Ganado", LOST: "Perdido" };

/** MEETING_STATUSES in the backend (crm.schema.ts). */
const CONFIRMACION: Record<string, string> = {
	PENDING: "Sin confirmar",
	CONFIRMED: "Confirmada por el cliente",
	CANCELLED: "Cancelada",
	COMPLETED: "Realizada",
};

const fechaHora = (d: string | Date) =>
	new Date(d).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

/** The next meeting not held yet; otherwise the latest one. */
function reunionDe(lead: LeadDetalle) {
	const reuniones = [...(lead.crmMeetings ?? [])].sort((a, b) => +new Date(a.date) - +new Date(b.date));
	const proxima = reuniones.find(
		(m) => !m.realizada && m.confirmationStatus !== "CANCELLED" && +new Date(m.date) >= Date.now(),
	);
	return proxima ? { titulo: "Próxima reunión", m: proxima } : reuniones.length ? { titulo: "Última reunión", m: reuniones[reuniones.length - 1] } : null;
}

export default function LeadPanel({
	leadId,
	open,
	onOpenChange,
}: {
	leadId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [lead, setLead] = useState<LeadDetalle | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open || !leadId || !token) return;
		let vigente = true;
		setLead(null);
		setError(null);
		fetch(`${LEADS_ENDPOINT}/${leadId}`, { headers: { Authorization: `Bearer ${token}` } })
			.then(async (res) => {
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
				if (vigente) setLead(body as LeadDetalle);
			})
			.catch((e: Error) => vigente && setError(e.message));
		return () => {
			vigente = false;
		};
	}, [open, leadId, token]);

	const nombre =
		lead && (lead.user?.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Sin nombre");
	const reunion = lead && reunionDe(lead);
	const notas = [...(lead?.crmNotes ?? [])]
		.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
		.slice(0, 3);

	const datos: [string, string | null | undefined][] = lead
		? [
				["Etapa", CRM_COLUMNS.find((c) => Number(c.id) === lead.columnId)?.title],
				["Estado", ESTADO[lead.status]],
				["Vendedora", lead.seller?.name],
				["Abogado/a", lead.responsibleLawyer?.name],
				["Origen", SOURCE_CHANNEL.find((s) => s.id === lead.sourceChannelId)?.name],
				["Teléfono", lead.phone],
				["Email", lead.email || lead.user?.email],
				["Lesión", lead.injury],
				["Cargado", new Date(lead.createdAt).toLocaleDateString("es-AR")],
			]
		: [];

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{nombre ?? "Lead del CRM"}</SheetTitle>
					<SheetDescription>Lead del CRM con este número de WhatsApp</SheetDescription>
				</SheetHeader>

				{error ? (
					<p className="px-4 text-sm text-destructive">{error}</p>
				) : !lead ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-5 px-4 pb-6">
						<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
							{datos
								.filter(([, v]) => v)
								.map(([k, v]) => (
									<div key={k} className="contents">
										<dt className="text-muted-foreground">{k}</dt>
										<dd className="wrap-break-word text-foreground">{v}</dd>
									</div>
								))}
						</dl>

						<section className="rounded-lg border border-border p-3">
							<h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
								<CalendarClock className="h-3.5 w-3.5" />
								{reunion?.titulo ?? "Reuniones"}
							</h3>
							{reunion ? (
								<p className="text-sm">
									{MEETING_TYPES.find((t) => t.id === reunion.m.type)?.name ?? reunion.m.type} ·{" "}
									{fechaHora(reunion.m.date)}
									<span className="block text-xs text-muted-foreground">
										{reunion.m.realizada
											? "Realizada"
											: (CONFIRMACION[reunion.m.confirmationStatus ?? "PENDING"] ?? "Sin confirmar")}
									</span>
								</p>
							) : (
								<p className="text-sm text-muted-foreground">Sin reuniones.</p>
							)}
						</section>

						<section>
							<h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
								<StickyNote className="h-3.5 w-3.5" />
								Últimas notas
							</h3>
							{notas.length ? (
								<ul className="space-y-2">
									{notas.map((n) => (
										<li key={n.id} className="rounded-lg bg-muted/50 p-2.5 text-sm">
											<p className="line-clamp-4 whitespace-pre-wrap">{n.note}</p>
											<p className="mt-1 text-[11px] text-muted-foreground">
												{n.user?.name} · {fechaHora(n.createdAt)}
											</p>
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-muted-foreground">Sin notas.</p>
							)}
						</section>

						<Button asChild variant="outline" className="w-full">
							<Link href={`/admin/crm/leads/${lead.id}`} target="_blank" rel="noopener noreferrer">
								<ExternalLink className="mr-1.5 h-4 w-4" />
								Abrir el lead en el CRM
							</Link>
						</Button>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
