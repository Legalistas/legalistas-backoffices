"use client";

import { ArrowLeft, Loader2, MessageCircle, Paperclip, Search, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { WHATSAPP_ENDPOINT } from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";

// WhatsApp inbox: conversation list and thread (stage 2) and free-text replies
// inside the 24 h window (stage 3). New messages come in by polling.

interface Conversacion {
	id: number;
	waId: string;
	profileName: string | null;
	lastMessageAt: string | null;
	unreadCount: number;
	lastMessage: { body: string | null; direction: "INBOUND" | "OUTBOUND"; hasMedia: boolean } | null;
}

interface Mensaje {
	id: number;
	direction: "INBOUND" | "OUTBOUND";
	body: string | null;
	media: { contentType: string; objectKey: string | null }[] | null;
	status: string | null;
	errorCode: string | null;
	createdAt: string;
	sentBy: { name: string } | null;
}

/** Delivery status of a reply, WhatsApp style (Twilio status callbacks, stage 4). */
const ESTADO: Record<string, { texto: string; clase: string }> = {
	accepted: { texto: "Enviando…", clase: "text-muted-foreground" },
	queued: { texto: "Enviando…", clase: "text-muted-foreground" },
	sending: { texto: "Enviando…", clase: "text-muted-foreground" },
	sent: { texto: "✓ Enviado", clase: "text-muted-foreground" },
	delivered: { texto: "✓✓ Entregado", clase: "text-muted-foreground" },
	read: { texto: "✓✓ Leído", clase: "text-sky-600 dark:text-sky-400" },
	failed: { texto: "⚠ No se entregó", clase: "text-destructive" },
	undelivered: { texto: "⚠ No se entregó", clase: "text-destructive" },
};

interface Hilo {
	contact: { id: number; waId: string; profileName: string | null; lastInboundAt: string | null };
	messages: Mensaje[];
}

const LISTA_MS = 15_000;
const HILO_MS = 10_000;
const VENTANA_MS = 24 * 60 * 60 * 1000;

/** End of the 24 h free-text window, or null if it is closed. */
const finVentana = (lastInboundAt: string | null) => {
	if (!lastInboundAt) return null;
	const fin = new Date(new Date(lastInboundAt).getTime() + VENTANA_MS);
	return fin.getTime() > Date.now() ? fin : null;
};

const fechaHora = (d: string | Date) =>
	new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const nombre = (c: { profileName: string | null; waId: string }) => c.profileName || `+${c.waId}`;

/** Today: the time; otherwise dd/mm. */
const cuando = (iso: string | null) => {
	if (!iso) return "";
	const d = new Date(iso);
	return d.toDateString() === new Date().toDateString()
		? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
		: d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
};

export default function WhatsappInbox() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [conversaciones, setConversaciones] = useState<Conversacion[] | null>(null);
	const [busqueda, setBusqueda] = useState("");
	const [abierta, setAbierta] = useState<number | null>(null);
	const [hilo, setHilo] = useState<Hilo | null>(null);
	const [respuesta, setRespuesta] = useState("");
	const [enviando, setEnviando] = useState(false);
	const finRef = useRef<HTMLDivElement>(null);

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
			return body as T;
		},
		[token],
	);

	const cargarLista = useCallback(async () => {
		if (!token) return;
		try {
			const q = busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : "";
			const r = await api<{ data: Conversacion[] }>(`/conversations${q}`);
			setConversaciones(r.data);
		} catch (err) {
			setConversaciones((prev) => prev ?? []);
			toast.error((err as Error).message);
		}
	}, [api, token, busqueda]);

	const cargarHilo = useCallback(
		async (id: number) => {
			try {
				const r = await api<{ data: Hilo }>(`/conversations/${id}`);
				setHilo(r.data);
			} catch (err) {
				toast.error((err as Error).message);
			}
		},
		[api],
	);

	// List: on load, on search (debounced) and every 15 s.
	useEffect(() => {
		const t = setTimeout(cargarLista, 300);
		const i = setInterval(cargarLista, LISTA_MS);
		return () => {
			clearTimeout(t);
			clearInterval(i);
		};
	}, [cargarLista]);

	// Open thread: load, mark as read and refresh every 10 s.
	useEffect(() => {
		if (abierta === null || !token) return;
		setHilo(null);
		cargarHilo(abierta);
		api(`/conversations/${abierta}/read`, { method: "POST" })
			.then(() =>
				setConversaciones((cs) => cs?.map((c) => (c.id === abierta ? { ...c, unreadCount: 0 } : c)) ?? cs),
			)
			.catch(() => {});
		const i = setInterval(() => cargarHilo(abierta), HILO_MS);
		return () => clearInterval(i);
	}, [abierta, token, api, cargarHilo]);

	// Keep the newest message in view.
	const cantidad = hilo?.messages.length ?? 0;
	useEffect(() => {
		if (cantidad) finRef.current?.scrollIntoView({ block: "end" });
	}, [cantidad]);

	const enviar = async () => {
		const texto = respuesta.trim();
		if (!texto || abierta === null || enviando) return;
		setEnviando(true);
		try {
			const r = await api<{ data: Mensaje }>(`/conversations/${abierta}/messages`, {
				method: "POST",
				body: JSON.stringify({ body: texto }),
			});
			setHilo((h) => (h ? { ...h, messages: [...h.messages, r.data] } : h));
			setRespuesta("");
			cargarLista();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setEnviando(false);
		}
	};

	const abrirAdjunto = async (messageId: number, index: number) => {
		try {
			const r = await api<{ url: string }>(`/messages/${messageId}/media/${index}`);
			window.open(r.url, "_blank", "noopener,noreferrer");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-foreground">WhatsApp</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Mensajes de clientes al +54 9 11 2676-2939. Se responde dentro de las 24 horas del último mensaje del cliente.
				</p>
			</div>

			<div className="grid h-[calc(100vh-220px)] min-h-120 grid-cols-1 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[320px_1fr]">
				{/* Conversation list */}
				<div className={cn("flex min-h-0 flex-col border-border md:border-r", abierta !== null && "hidden md:flex")}>
					<div className="border-b border-border p-3">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={busqueda}
								onChange={(e) => setBusqueda(e.target.value)}
								placeholder="Buscar por nombre, número o palabra"
								className="pl-9"
								aria-label="Buscar conversaciones"
							/>
						</div>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{conversaciones === null ? (
							<div className="space-y-2 p-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<Skeleton key={i} className="h-14 w-full" />
								))}
							</div>
						) : conversaciones.length === 0 ? (
							<div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
								<MessageCircle className="h-8 w-8 opacity-40" />
								{busqueda.trim() ? "No hay conversaciones con esa búsqueda." : "Todavía no llegó ningún mensaje."}
							</div>
						) : (
							conversaciones.map((c) => (
								<button
									key={c.id}
									type="button"
									onClick={() => setAbierta(c.id)}
									className={cn(
										"flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50",
										abierta === c.id && "bg-muted",
									)}
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-baseline justify-between gap-2">
											<span className={cn("truncate text-sm", c.unreadCount ? "font-semibold" : "font-medium")}>
												{nombre(c)}
											</span>
											<span className="shrink-0 text-xs text-muted-foreground">{cuando(c.lastMessageAt)}</span>
										</div>
										<div className="mt-0.5 flex items-center justify-between gap-2">
											<span className="truncate text-xs text-muted-foreground">
												{c.lastMessage?.direction === "OUTBOUND" && "Vos: "}
												{c.lastMessage?.body || (c.lastMessage?.hasMedia ? "📎 Adjunto" : "")}
											</span>
											{c.unreadCount > 0 && (
												<span className="shrink-0 rounded-full bg-green-600 px-1.5 text-[11px] font-semibold text-white">
													{c.unreadCount}
												</span>
											)}
										</div>
									</div>
								</button>
							))
						)}
					</div>
				</div>

				{/* Thread */}
				<div className={cn("flex min-h-0 flex-col", abierta === null && "hidden md:flex")}>
					{abierta === null ? (
						<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
							Elegí una conversación.
						</div>
					) : !hilo ? (
						<div className="flex flex-1 items-center justify-center">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : (
						<>
							<div className="flex items-center gap-2 border-b border-border px-4 py-3">
								<Button
									variant="ghost"
									size="icon"
									className="md:hidden"
									aria-label="Volver a la lista"
									onClick={() => setAbierta(null)}
								>
									<ArrowLeft className="h-4 w-4" />
								</Button>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-foreground">{nombre(hilo.contact)}</p>
									<p className="text-xs text-muted-foreground">+{hilo.contact.waId}</p>
								</div>
								{(() => {
									const fin = finVentana(hilo.contact.lastInboundAt);
									return (
										<span
											className={cn(
												"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
												fin
													? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
													: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
											)}
										>
											{fin ? `Se puede responder hasta ${fechaHora(fin)}` : "Ventana de 24 h cerrada"}
										</span>
									);
								})()}
							</div>
							<div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/30 px-4 py-4">
								{hilo.messages.map((m) => (
									<div key={m.id} className={cn("flex", m.direction === "OUTBOUND" ? "justify-end" : "justify-start")}>
										<div
											className={cn(
												"max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
												m.direction === "OUTBOUND"
													? "bg-green-100 text-green-950 dark:bg-green-900/40 dark:text-green-50"
													: "bg-card text-foreground",
											)}
										>
											{m.body && <p className="whitespace-pre-wrap wrap-break-word">{m.body}</p>}
											{m.media?.map((a, i) => (
												<button
													key={i}
													type="button"
													onClick={() => abrirAdjunto(m.id, i)}
													disabled={!a.objectKey}
													className="mt-1 flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline disabled:text-muted-foreground disabled:no-underline"
												>
													<Paperclip className="h-3.5 w-3.5" />
													{a.objectKey ? `Ver adjunto (${a.contentType})` : "Guardando adjunto…"}
												</button>
											))}
											<p className="mt-1 text-right text-[11px] text-muted-foreground">
												{m.direction === "OUTBOUND" && m.sentBy && `${m.sentBy.name} · `}
												{fechaHora(m.createdAt)}
												{m.direction === "OUTBOUND" && m.status && ESTADO[m.status] && (
													<span
														className={cn("ml-1.5 font-medium", ESTADO[m.status].clase)}
														title={m.errorCode ? `Código de error de Twilio: ${m.errorCode}` : undefined}
													>
														{ESTADO[m.status].texto}
														{m.errorCode && ` (${m.errorCode})`}
													</span>
												)}
											</p>
										</div>
									</div>
								))}
								<div ref={finRef} />
							</div>
							{finVentana(hilo.contact.lastInboundAt) ? (
								<form
									className="flex items-end gap-2 border-t border-border p-3"
									onSubmit={(e) => {
										e.preventDefault();
										enviar();
									}}
								>
									<Textarea
										value={respuesta}
										onChange={(e) => setRespuesta(e.target.value)}
										onKeyDown={(e) => {
											// Enter sends, Shift+Enter adds a line.
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												enviar();
											}
										}}
										placeholder="Escribí una respuesta"
										aria-label="Respuesta"
										rows={2}
										maxLength={1600}
										className="min-h-0 resize-none"
									/>
									<Button type="submit" disabled={enviando || !respuesta.trim()} className="gap-1.5">
										{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
										Enviar
									</Button>
								</form>
							) : (
								<p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
									Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp solo deja escribirle con una
									plantilla aprobada (llega en la etapa 5).
								</p>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
