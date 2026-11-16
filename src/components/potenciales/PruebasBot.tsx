"use client";

import { Loader2, Power, RotateCcw, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CONFIGURACION_ENDPOINT, POTENCIALES_ENDPOINT } from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";

// Pruebas del bot (/admin/test/bot): el interruptor del bot y un chat donde se
// escribe como si fuera la persona. Corre el mismo turno que el bot real
// (backend potenciales/turno.ts) con la configuración guardada, pero no
// escribe por WhatsApp ni crea nada en el CRM.

interface Mensaje {
	de: "persona" | "bot";
	texto: string;
}
type Accion =
	| { tipo: "bienvenida" }
	| { tipo: "preguntar"; campo: string }
	| { tipo: "cerrar"; estado: string; regla: string; motivo: string };
interface Turno {
	texto: string | null;
	accion: Accion;
	estado: Record<string, unknown>;
	extraccion: Record<string, unknown>;
}

const RESULTADO: Record<string, { texto: string; clase: string }> = {
	FACTIBLE: { texto: "Factible: pasaría al CRM", clase: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200" },
	NO_FACTIBLE: { texto: "No factible: se descarta", clase: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
	FUERA_DE_ALCANCE: { texto: "Fuera de alcance", clase: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
	DUDOSA: { texto: "Dudosa: la revisa una vendedora", clase: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
};

export function PruebasBot() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [activo, setActivo] = useState<boolean | null>(null);
	const [cambiando, setCambiando] = useState(false);
	const [historial, setHistorial] = useState<Mensaje[]>([]);
	const [ultimo, setUltimo] = useState<Turno | null>(null);
	const [texto, setTexto] = useState("");
	const [pensando, setPensando] = useState(false);
	const finRef = useRef<HTMLDivElement>(null);
	const cerrada = ultimo?.accion.tipo === "cerrar" ? ultimo.accion : null;

	useEffect(() => {
		if (!token) return;
		fetch(`${CONFIGURACION_ENDPOINT}/potenciales`, { headers: { Authorization: `Bearer ${token}` } })
			.then((r) => (r.ok ? r.json() : null))
			.then((c) => setActivo(c ? Boolean(c.data.valor.bot.activo) : null))
			.catch(() => setActivo(null));
	}, [token]);

	useEffect(() => {
		finRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [historial, pensando]);

	const cambiarInterruptor = async (prender: boolean) => {
		setCambiando(true);
		try {
			const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
			// Se guarda la configuración entera: solo cambia el interruptor.
			const r = await fetch(`${CONFIGURACION_ENDPOINT}/potenciales`, { headers: h });
			const actual = await r.json();
			if (!r.ok) throw new Error(actual.error || "No pudimos leer la configuración");
			const valor = { ...actual.data.valor, bot: { ...actual.data.valor.bot, activo: prender } };
			const g = await fetch(`${CONFIGURACION_ENDPOINT}/potenciales`, { method: "PUT", headers: h, body: JSON.stringify({ valor }) });
			const cuerpo = await g.json().catch(() => ({}));
			if (!g.ok) throw new Error(cuerpo.error || `Error ${g.status}`);
			setActivo(prender);
			toast.success(prender ? "Bot prendido: atiende las consultas nuevas por WhatsApp." : "Bot apagado: WhatsApp funciona como siempre.");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setCambiando(false);
		}
	};

	const enviar = async () => {
		const mensaje = texto.trim();
		if (!mensaje || pensando || cerrada) return;
		const nuevo = [...historial, { de: "persona" as const, texto: mensaje }];
		setHistorial(nuevo);
		setTexto("");
		setPensando(true);
		try {
			const r = await fetch(`${POTENCIALES_ENDPOINT}/simular`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify({ historial: nuevo, estado: ultimo?.estado, previa: ultimo?.extraccion }),
			});
			const cuerpo = await r.json().catch(() => ({}));
			if (!r.ok) throw new Error(cuerpo.error || `Error ${r.status}`);
			const turno = cuerpo.data as Turno;
			setUltimo(turno);
			if (turno.texto) setHistorial([...nuevo, { de: "bot", texto: turno.texto }]);
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setPensando(false);
		}
	};

	const reiniciar = () => {
		setHistorial([]);
		setUltimo(null);
		setTexto("");
	};

	const entendido = ultimo
		? Object.entries(ultimo.extraccion).filter(([, v]) => v !== null && v !== undefined)
		: [];

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
					<div className="flex items-center gap-3">
						<Power className={cn("size-5", activo ? "text-emerald-600" : "text-muted-foreground")} />
						<div>
							<p className="font-semibold">
								{activo === null ? "Bot de WhatsApp" : activo ? "El bot está prendido" : "El bot está apagado"}
							</p>
							<p className="text-xs text-muted-foreground">
								Prendido, responde por WhatsApp a los números nuevos. Apagado, WhatsApp funciona como siempre.
							</p>
						</div>
					</div>
					{activo !== null ? (
						<Switch
							checked={activo}
							disabled={cambiando}
							onCheckedChange={cambiarInterruptor}
							aria-label="Prender o apagar el bot"
						/>
					) : null}
				</div>

				<div className="flex h-[calc(100vh-360px)] min-h-96 flex-col rounded-xl border bg-card">
					<div className="flex items-center justify-between border-b px-4 py-2">
						<p className="text-sm font-medium">Conversación de prueba</p>
						<Button variant="ghost" size="sm" onClick={reiniciar} disabled={pensando}>
							<RotateCcw className="size-4" /> Empezar de nuevo
						</Button>
					</div>
					<div className="flex-1 space-y-3 overflow-y-auto p-4">
						{historial.length === 0 ? (
							<p className="text-center text-sm text-muted-foreground">
								Escribí como si fueras alguien que consulta por WhatsApp. Por ejemplo: "hola, soy Juan de Rosario,
								me accidenté en el trabajo".
							</p>
						) : null}
						{historial.map((m, i) => (
							<div key={`${i}-${m.de}`} className={cn("flex", m.de === "persona" ? "justify-end" : "justify-start")}>
								<p
									className={cn(
										"max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
										m.de === "persona"
											? "bg-emerald-600 text-white"
											: "bg-muted text-foreground",
									)}
								>
									{m.texto}
								</p>
							</div>
						))}
						{pensando ? (
							<p className="flex items-center gap-2 text-xs text-muted-foreground">
								<Loader2 className="size-3.5 animate-spin" /> El bot está pensando…
							</p>
						) : null}
						{cerrada ? (
							<div className={cn("rounded-lg px-3 py-2 text-sm", RESULTADO[cerrada.estado]?.clase)}>
								<p className="font-semibold">{RESULTADO[cerrada.estado]?.texto ?? cerrada.estado}</p>
								<p className="text-xs">
									{cerrada.motivo} ({cerrada.regla})
									{ultimo?.texto ? "" : " · No se le manda ningún mensaje."}
								</p>
							</div>
						) : null}
						<div ref={finRef} />
					</div>
					<div className="flex gap-2 border-t p-3">
						<Textarea
							rows={2}
							value={texto}
							disabled={Boolean(cerrada)}
							placeholder={cerrada ? "La conversación terminó: empezá de nuevo para otra prueba" : "Escribí como la persona…"}
							onChange={(e) => setTexto(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									enviar();
								}
							}}
							aria-label="Mensaje de prueba"
						/>
						<Button onClick={enviar} disabled={!texto.trim() || pensando || Boolean(cerrada)} aria-label="Enviar">
							<Send className="size-4" />
						</Button>
					</div>
				</div>
				<p className="text-xs text-muted-foreground">
					Usa la IA y la configuración reales del bot, pero no manda nada por WhatsApp ni crea nada en el CRM.
				</p>
			</div>

			<aside className="space-y-2 rounded-lg border bg-card p-4 text-sm">
				<p className="font-semibold">Lo que entendió el bot</p>
				{entendido.length === 0 ? (
					<p className="text-xs text-muted-foreground">Todavía nada.</p>
				) : (
					<dl className="space-y-1">
						{entendido.map(([campo, valor]) => (
							<div key={campo}>
								<dt className="text-xs text-muted-foreground">{campo}</dt>
								<dd className="break-words font-mono text-xs">{typeof valor === "string" ? valor : JSON.stringify(valor)}</dd>
							</div>
						))}
					</dl>
				)}
				{ultimo?.accion.tipo === "preguntar" ? (
					<p className="pt-2 text-xs text-muted-foreground">Ahora pregunta: {ultimo.accion.campo}</p>
				) : null}
			</aside>
		</div>
	);
}
