"use client";

import { ArrowLeft, Loader2, Megaphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type Campana, type Destinatario, type Resumen, useWhatsappApi } from "./agendas-api";

// Sent campaigns and, per recipient, whether it went out, arrived and was read
// (Twilio status callbacks). While one is sending, the screen refreshes itself.

const REFRESCO_MS = 4000;

const fecha = (iso: string) =>
	new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** What happened to one recipient, from its state and the message status. */
function estadoDestinatario(d: Destinatario): { texto: string; clase: string } {
	if (d.estado === "PENDIENTE") return { texto: "En cola", clase: "text-muted-foreground" };
	if (d.estado === "OMITIDO") return { texto: "Salteado", clase: "text-amber-700 dark:text-amber-400" };
	if (d.estado === "ERROR") return { texto: "No se envió", clase: "text-destructive" };
	switch (d.message?.status) {
		case "read":
			return { texto: "✓✓ Leído", clase: "text-sky-600 dark:text-sky-400" };
		case "delivered":
			return { texto: "✓✓ Entregado", clase: "text-foreground" };
		case "failed":
		case "undelivered":
			return { texto: "⚠ No se entregó", clase: "text-destructive" };
		default:
			return { texto: "✓ Enviado", clase: "text-foreground" };
	}
}

function Cifras({ r }: { r: Resumen }) {
	const items = [
		{ label: "Enviados", valor: r.enviados },
		{ label: "Entregados", valor: r.entregados },
		{ label: "Leídos", valor: r.leidos },
		{ label: "Fallidos", valor: r.fallidos, alerta: r.fallidos > 0 },
		{ label: "Salteados", valor: r.omitidos },
		...(r.pendientes ? [{ label: "En cola", valor: r.pendientes }] : []),
	];
	return (
		<dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
			{items.map((i) => (
				<div key={i.label} className="flex items-baseline gap-1.5">
					<dt className="text-muted-foreground">{i.label}</dt>
					<dd className={cn("font-semibold tabular-nums", i.alerta && "text-destructive")}>{i.valor}</dd>
				</div>
			))}
		</dl>
	);
}

export default function CampanasPanel({
	abierta,
	onAbrir,
}: {
	/** Campaign shown in detail (e.g. the one just launched). */
	abierta: number | null;
	onAbrir: (id: number | null) => void;
}) {
	const { api, listo } = useWhatsappApi();
	const [campanas, setCampanas] = useState<Campana[] | null>(null);
	const [detalle, setDetalle] = useState<(Campana & { destinatarios: Destinatario[] }) | null>(null);

	const cargar = useCallback(async () => {
		const [lista, uno] = await Promise.all([
			api<Campana[]>("/campanas"),
			abierta ? api<Campana & { destinatarios: Destinatario[] }>(`/campanas/${abierta}`) : Promise.resolve(null),
		]);
		setCampanas(lista);
		setDetalle(uno);
		return lista.some((c) => c.estado === "ENVIANDO") || uno?.estado === "ENVIANDO";
	}, [api, abierta]);

	useEffect(() => {
		if (!listo) return;
		let vigente = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const ciclo = async () => {
			try {
				const sigue = await cargar();
				// Delivery and read receipts keep arriving after sending: refresh while it is sending.
				if (vigente && sigue) timer = setTimeout(ciclo, REFRESCO_MS);
			} catch (err) {
				if (vigente) toast.error((err as Error).message);
			}
		};
		ciclo();
		return () => {
			vigente = false;
			clearTimeout(timer);
		};
	}, [listo, cargar]);

	if (abierta) {
		if (!detalle || detalle.id !== abierta) return <Skeleton className="h-64 w-full" />;
		return (
			<div className="space-y-4">
				<Button variant="ghost" size="sm" className="-ml-2 gap-1.5" onClick={() => onAbrir(null)}>
					<ArrowLeft className="h-4 w-4" />
					Todas las campañas
				</Button>
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="text-base font-semibold text-foreground">{detalle.nombre}</h2>
						{detalle.estado === "ENVIANDO" ? (
							<Badge className="gap-1">
								<Loader2 className="h-3 w-3 animate-spin" />
								Enviando
							</Badge>
						) : (
							<Badge variant="secondary">Enviada</Badge>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						Plantilla "{detalle.plantillaNombre}" a {detalle.agenda?.nombre ?? "la agenda principal"} ·{" "}
						{detalle.createdBy.name} · {fecha(detalle.createdAt)}
					</p>
					<Cifras r={detalle.resumen} />
				</div>
				<div className="overflow-x-auto rounded-xl border border-border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nombre</TableHead>
								<TableHead>Número</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead>Detalle</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{detalle.destinatarios.map((d) => {
								const e = estadoDestinatario(d);
								return (
									<TableRow key={d.id}>
										<TableCell className="font-medium">{d.nombre || "—"}</TableCell>
										<TableCell className="whitespace-nowrap tabular-nums">+{d.waId}</TableCell>
										<TableCell className={cn("whitespace-nowrap font-medium", e.clase)}>{e.texto}</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{d.detalle ?? (d.message?.errorCode ? `Código de Twilio ${d.message.errorCode}` : "")}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-xl border border-border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Campaña</TableHead>
						<TableHead>Agenda</TableHead>
						<TableHead>Fecha</TableHead>
						<TableHead className="text-right">Total</TableHead>
						<TableHead>Resultado</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{campanas === null ? (
						[0, 1].map((i) => (
							<TableRow key={i}>
								<TableCell colSpan={5}>
									<Skeleton className="h-5 w-full" />
								</TableCell>
							</TableRow>
						))
					) : campanas.length === 0 ? (
						<TableRow>
							<TableCell colSpan={5} className="py-12 text-center">
								<Megaphone className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									Todavía no se envió ninguna campaña. Elegí una agenda y tocá "Enviar campaña".
								</p>
							</TableCell>
						</TableRow>
					) : (
						campanas.map((c) => (
							<TableRow key={c.id} className="cursor-pointer" onClick={() => onAbrir(c.id)}>
								<TableCell>
									<button type="button" className="text-left font-medium text-foreground hover:underline">
										{c.nombre}
									</button>
									<p className="text-xs text-muted-foreground">{c.plantillaNombre}</p>
								</TableCell>
								<TableCell className="text-muted-foreground">{c.agenda?.nombre ?? "Principal"}</TableCell>
								<TableCell className="whitespace-nowrap text-muted-foreground">
									{fecha(c.createdAt)}
									<span className="block text-xs">{c.createdBy.name}</span>
								</TableCell>
								<TableCell className="text-right tabular-nums">{c.resumen.total}</TableCell>
								<TableCell>
									{c.estado === "ENVIANDO" ? (
										<span className="flex items-center gap-1.5 text-sm text-muted-foreground">
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
											Enviando {c.resumen.total - c.resumen.pendientes}/{c.resumen.total}
										</span>
									) : (
										<Cifras r={c.resumen} />
									)}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
