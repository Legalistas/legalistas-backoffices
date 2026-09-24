"use client";

import { CalendarCheck2, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useCaseCrm } from "@/hooks/useCaseCrm";
import type { CaseCrmMeeting } from "@/types/case-activity";

// "Asistencia a la entrada" (nombre a confirmar con Julieta): la reunión de
// entrada que agendó Ventas en el CRM — si el cliente la confirmó y si
// efectivamente asistió.

// Mismos valores que el CRM (backend: crm/meetings.service.ts, crm.schema.ts).
const TIPO: Record<string, string> = {
	VIDEO_CALL: "Videollamada",
	IN_PERSON_MEETING: "Reunión a concretar",
	POWER_MEETING: "Reunión poder",
};

const CONFIRMACION: Record<string, { label: string; className: string }> = {
	CONFIRMED: { label: "Confirmó", className: "text-green-700 bg-green-50 border-green-200" },
	COMPLETED: { label: "Completada", className: "text-green-700 bg-green-50 border-green-200" },
	PENDING: { label: "Sin confirmar", className: "text-amber-700 bg-amber-50 border-amber-200" },
	CANCELLED: { label: "Canceló", className: "text-red-700 bg-red-50 border-red-200" },
};

const fechaHora = (iso: string) =>
	new Date(iso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

function Reunion({ m }: { m: CaseCrmMeeting }) {
	const conf = CONFIRMACION[m.confirmationStatus] ?? {
		label: m.confirmationStatus,
		className: "text-muted-foreground bg-muted border-border",
	};
	return (
		<li className="rounded-lg border p-4 space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-semibold">
					{TIPO[m.type] ?? m.type} · {fechaHora(m.date)}
				</span>
				<span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${conf.className}`}>
					{conf.label}
					{m.confirmedAt ? ` el ${fechaHora(m.confirmedAt)}` : ""}
				</span>
			</div>
			<div className="flex items-center gap-1.5 text-sm">
				{m.realizada ? (
					<>
						<CheckCircle2 className="h-4 w-4 text-green-600" />
						<span>
							Asistió
							{m.realizadaAt ? ` (marcada el ${fechaHora(m.realizadaAt)}` : ""}
							{m.realizadaBy ? ` por ${m.realizadaBy.name}` : ""}
							{m.realizadaAt ? ")" : ""}
						</span>
					</>
				) : new Date(m.date) > new Date() ? (
					<>
						<Clock className="h-4 w-4 text-amber-600" />
						<span>Pendiente</span>
					</>
				) : (
					<>
						<XCircle className="h-4 w-4 text-red-600" />
						<span>No se marcó como realizada</span>
					</>
				)}
			</div>
			<p className="text-xs text-muted-foreground">
				Abogado: {m.responsibleLawyer?.name ?? "—"} · Agendó: {m.user?.name ?? "—"}
			</p>
			{m.note && <p className="text-sm whitespace-pre-wrap">{m.note}</p>}
		</li>
	);
}

export function AsistenciaEntradaView({ caseId }: { caseId: string }) {
	const { crm, loading } = useCaseCrm(caseId);

	if (loading) {
		return (
			<div className="flex justify-center py-10">
				<Loader2 className="h-5 w-5 animate-spin" />
			</div>
		);
	}

	if (!crm?.lead) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				Esta causa no tiene un lead del CRM asociado.
			</p>
		);
	}

	return (
		<div className="space-y-3">
			<p className="text-xs text-muted-foreground">
				Lead #{crm.lead.id} · ingresó el {fechaHora(crm.lead.createdAt)}
				{crm.lead.seller ? ` · vendedor/a: ${crm.lead.seller.name}` : ""}
			</p>
			{crm.meetings.length === 0 ? (
				<p className="py-6 text-center text-sm text-muted-foreground">
					No hay reuniones de entrada registradas en el CRM.
				</p>
			) : (
				<ul className="space-y-3">
					{crm.meetings.map((m) => (
						<Reunion key={m.id} m={m} />
					))}
				</ul>
			)}
		</div>
	);
}
