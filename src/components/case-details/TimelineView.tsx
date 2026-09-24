"use client";

import {
	Briefcase,
	CalendarClock,
	CalendarDays,
	FileSignature,
	FileText,
	FolderOpen,
	Handshake,
	Loader2,
	Mail,
	Send,
	StickyNote,
	type LucideIcon,
	Newspaper,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { CASE_TIMELINE_ENDPOINT } from "@/constant/api-endpoints";
import type { TimelineItem, TimelineKind } from "@/types/case-activity";

// Línea de tiempo de la causa (relevamiento 7): qué se hizo y cuándo — notas,
// plazos, eventos y confirmaciones, informes periódicos, escritos, cédulas,
// documentos, cambios de etapa y lo que vino del CRM.

const KINDS: Record<TimelineKind, { label: string; icon: LucideIcon; color: string }> = {
	caso: { label: "Causa", icon: Briefcase, color: "bg-slate-500" },
	nota: { label: "Notas", icon: StickyNote, color: "bg-amber-500" },
	plazo: { label: "Plazos", icon: CalendarClock, color: "bg-red-500" },
	evento: { label: "Eventos", icon: CalendarDays, color: "bg-blue-500" },
	informe: { label: "Informes", icon: Newspaper, color: "bg-teal-500" },
	escrito: { label: "Escritos", icon: FileSignature, color: "bg-indigo-500" },
	cedula: { label: "Cédulas", icon: Send, color: "bg-violet-500" },
	documento: { label: "Documentos", icon: FileText, color: "bg-stone-500" },
	expediente: { label: "Expedientes", icon: FolderOpen, color: "bg-emerald-600" },
	email: { label: "Emails", icon: Mail, color: "bg-sky-500" },
	crm: { label: "CRM", icon: Handshake, color: "bg-orange-500" },
};

const dia = (iso: string) =>
	new Date(iso).toLocaleDateString("es-AR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});

const hora = (iso: string) =>
	new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export function TimelineView({ caseId }: { caseId: string }) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [items, setItems] = useState<TimelineItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filtro, setFiltro] = useState<TimelineKind | null>(null);

	useEffect(() => {
		if (!token) return;
		fetch(CASE_TIMELINE_ENDPOINT(Number(caseId)), {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(async (res) => {
				if (!res.ok) throw new Error("No se pudo cargar la línea de tiempo");
				setItems(((await res.json()) as { items: TimelineItem[] }).items);
			})
			.catch((e: Error) => setError(e.message))
			.finally(() => setLoading(false));
	}, [caseId, token]);

	// Solo los tipos que aparecen en esta causa, con su cantidad.
	const conteo = useMemo(() => {
		const m = new Map<TimelineKind, number>();
		for (const i of items) m.set(i.kind, (m.get(i.kind) ?? 0) + 1);
		return m;
	}, [items]);

	const porDia = useMemo(() => {
		const grupos: Array<{ dia: string; items: TimelineItem[] }> = [];
		for (const i of items) {
			if (filtro && i.kind !== filtro) continue;
			const d = dia(i.date);
			const ultimo = grupos[grupos.length - 1];
			if (ultimo?.dia === d) ultimo.items.push(i);
			else grupos.push({ dia: d, items: [i] });
		}
		return grupos;
	}, [items, filtro]);

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Loader2 className="h-5 w-5 animate-spin" />
			</div>
		);
	}
	if (error) {
		return <p className="p-6 text-sm text-destructive">{error}</p>;
	}

	return (
		<div className="space-y-4 p-4">
			<div className="flex flex-wrap gap-1.5">
				<button
					type="button"
					onClick={() => setFiltro(null)}
					className={`rounded-full border px-3 py-1 text-xs ${
						filtro === null ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
					}`}
				>
					Todo ({items.length})
				</button>
				{[...conteo.entries()].map(([kind, n]) => (
					<button
						key={kind}
						type="button"
						onClick={() => setFiltro(filtro === kind ? null : kind)}
						className={`rounded-full border px-3 py-1 text-xs ${
							filtro === kind ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
						}`}
					>
						{KINDS[kind].label} ({n})
					</button>
				))}
			</div>

			{porDia.length === 0 ? (
				<p className="py-10 text-center text-sm text-muted-foreground">
					Todavía no hay actividad registrada.
				</p>
			) : (
				porDia.map((g) => (
					<section key={g.dia}>
						<h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{g.dia}
						</h4>
						<ol className="relative ml-3 space-y-3 border-l border-border pl-6">
							{g.items.map((i) => {
								const { icon: Icon, color } = KINDS[i.kind];
								return (
									<li key={i.id} className="relative">
										<span
											className={`absolute -left-[34px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ${color}`}
										>
											<Icon className="h-3 w-3 text-white" />
										</span>
										<div className="flex flex-wrap items-baseline gap-x-2">
											<span className="text-sm font-medium text-foreground">{i.title}</span>
											<span className="text-xs text-muted-foreground">
												{hora(i.date)}
												{i.user ? ` · ${i.user.name}` : ""}
											</span>
										</div>
										{i.detail && (
											<p className="mt-0.5 text-sm text-muted-foreground">{i.detail}</p>
										)}
									</li>
								);
							})}
						</ol>
					</section>
				))
			)}
		</div>
	);
}
