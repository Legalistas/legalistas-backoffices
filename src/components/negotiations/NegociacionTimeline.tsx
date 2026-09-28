"use client";

import { Loader2, Mail, Reply, Tag, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { NEGOTIATION_EVENTOS_ENDPOINT } from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import { apiErrorMessage } from "@/lib/api-error";
import type { NegociacionEvento, Oferta } from "@/types/negotiations";

// Línea de tiempo de la negociación (relevamiento 13): mails enviados desde
// la plataforma, respuestas de la contraparte (carga manual) y ofertas, con
// el monto de cada intercambio. La tarjeta de oferta (con aceptar / editar /
// borrar) la dibuja la tabla (`renderOferta`).

/** "28/09/2026 15:30" en hora argentina. */
const fechaHora = (iso: string) =>
	new Date(iso)
		.toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "America/Argentina/Buenos_Aires",
		})
		.replace(",", "");

interface Item {
	clave: string;
	fecha: string;
	evento?: NegociacionEvento;
	oferta?: Oferta;
}

interface Props {
	negotiationId: number;
	ofertas: Oferta[];
	/** Cambia al mandar un mail o registrar una respuesta: vuelve a cargar. */
	recargar: number;
	renderOferta: (oferta: Oferta) => ReactNode;
	/** Se borró una respuesta (y su oferta): la tabla actualiza las ofertas. */
	onCambio: () => void;
}

export default function NegociacionTimeline({ negotiationId, ofertas, recargar, renderOferta, onCambio }: Props) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const { confirm, ConfirmationDialog } = useConfirm();
	const [eventos, setEventos] = useState<NegociacionEvento[] | null>(null);
	const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

	// biome-ignore lint/correctness/useExhaustiveDependencies: `recargar` fuerza la recarga
	useEffect(() => {
		if (!token) return;
		let vigente = true;
		fetch(NEGOTIATION_EVENTOS_ENDPOINT(negotiationId), { headers: { Authorization: `Bearer ${token}` } })
			.then(async (res) => {
				if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo cargar el historial"));
				return res.json();
			})
			.then((j) => vigente && setEventos(j.data ?? []))
			.catch((e) => {
				if (vigente) {
					setEventos([]);
					toast.error(e instanceof Error ? e.message : "No se pudo cargar el historial");
				}
			});
		return () => {
			vigente = false;
		};
	}, [negotiationId, token, recargar]);

	const eliminar = async (evento: NegociacionEvento) => {
		if (
			!(await confirm({
				description: evento.offer
					? "¿Borrar esta respuesta? También se borra la oferta que tenía."
					: "¿Borrar esta respuesta del historial?",
				confirmLabel: "Borrar",
				variant: "destructive",
			}))
		)
			return;
		try {
			const res = await fetch(`${NEGOTIATION_EVENTOS_ENDPOINT(negotiationId)}/${evento.id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo borrar la respuesta"));
			setEventos((prev) => prev?.filter((e) => e.id !== evento.id) ?? null);
			toast.success("Respuesta borrada");
			onCambio();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudo borrar la respuesta");
		}
	};

	if (eventos === null) {
		return (
			<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" /> Cargando historial…
			</div>
		);
	}

	const vinculadas = new Set(eventos.map((e) => e.offer?.id).filter(Boolean));
	const items: Item[] = [
		...eventos.map((e) => ({
			clave: `e${e.id}`,
			fecha: e.fecha,
			evento: e,
			oferta: ofertas.find((o) => o.id === e.offer?.id),
		})),
		...ofertas
			.filter((o) => !vinculadas.has(o.id))
			.map((o) => ({ clave: `o${o.id}`, fecha: o.fechaIso, oferta: o })),
	].sort((a, b) => b.fecha.localeCompare(a.fecha));

	if (items.length === 0) {
		return (
			<p className="py-4 text-center text-xs text-muted-foreground">
				Todavía no hay mails, respuestas ni ofertas en esta negociación.
			</p>
		);
	}

	return (
		<>
			<ol className="relative space-y-4 border-l border-border pl-5">
				{items.map((item) => {
					const e = item.evento;
					const esMail = e?.tipo === "MAIL_ENVIADO";
					const Icono = !e ? Tag : esMail ? Mail : Reply;
					const color = !e ? "bg-primary" : esMail ? "bg-sky-500" : "bg-amber-500";
					const abierto = e ? abiertos.has(e.id) : false;
					return (
						<li key={item.clave} className="relative">
							<span
								className={`absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-4 ring-background ${color}`}
							>
								<Icono className="h-3 w-3" />
							</span>
							{e ? (
								<div className="space-y-2">
									<div className="rounded-lg border p-3">
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<p className="text-xs font-semibold">
													{esMail ? "Mail enviado" : "Respuesta recibida"}
													{e.contacto && (
														<span className="font-normal text-muted-foreground">
															{esMail ? " a " : " de "}
															{e.contacto}
														</span>
													)}
												</p>
												<p className="text-[11px] text-muted-foreground">
													{fechaHora(e.fecha)}
													{e.createdBy && ` · ${esMail ? "enviado" : "cargado"} por ${e.createdBy.name}`}
												</p>
											</div>
											{!esMail && (
												<button
													type="button"
													onClick={() => eliminar(e)}
													title="Borrar respuesta"
													className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											)}
										</div>
										{e.asunto && <p className="mt-2 text-sm font-medium">{e.asunto}</p>}
										{e.cuerpo && (
											<>
												<p
													className={`mt-1 whitespace-pre-line text-xs text-gray-600 dark:text-gray-300 ${abierto ? "" : "line-clamp-3"}`}
												>
													{e.cuerpo}
												</p>
												{e.cuerpo.split("\n").length > 3 || e.cuerpo.length > 240 ? (
													<button
														type="button"
														className="mt-1 text-[11px] font-medium text-primary hover:underline"
														onClick={() =>
															setAbiertos((prev) => {
																const next = new Set(prev);
																if (next.has(e.id)) next.delete(e.id);
																else next.add(e.id);
																return next;
															})
														}
													>
														{abierto ? "Ver menos" : esMail ? "Ver mail completo" : "Ver todo"}
													</button>
												) : null}
											</>
										)}
									</div>
									{item.oferta && renderOferta(item.oferta)}
								</div>
							) : (
								item.oferta && renderOferta(item.oferta)
							)}
						</li>
					);
				})}
			</ol>
			{ConfirmationDialog}
		</>
	);
}
