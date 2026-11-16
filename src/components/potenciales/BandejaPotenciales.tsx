"use client";

import { ExternalLink, Hand, Loader2, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POTENCIALES_ENDPOINT } from "@/constant/api-endpoints";

// Bandeja de Potenciales (sprint 4.3): las consultas nuevas que atiende el bot
// de WhatsApp y las que entran por la app. Tomar = el bot deja de escribir.
// La conversación se abre en la bandeja de WhatsApp.

interface Potencial {
	id: number;
	creada: string;
	fuente: "PAGA" | "ORGANICA" | "APP";
	estado: "BOT" | "FACTIBLE" | "NO_FACTIBLE" | "FUERA_DE_ALCANCE" | "DUDOSA" | "TOMADA";
	rama: string | null;
	motivo: string | null;
	leadId: number | null;
	contactId: number | null;
	nombre: string | null;
	telefono: string | null;
	localidad: string | null;
	tomadaPor: string | null;
}

const ESTADOS: Record<Potencial["estado"], { texto: string; clase: string }> = {
	BOT: { texto: "Bot", clase: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
	FACTIBLE: { texto: "Factible", clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
	NO_FACTIBLE: { texto: "No factible", clase: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
	FUERA_DE_ALCANCE: { texto: "Fuera de alcance", clase: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
	DUDOSA: { texto: "Dudosa", clase: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
	TOMADA: { texto: "Tomada", clase: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
};
const FUENTES: Record<Potencial["fuente"], string> = { PAGA: "Paga", ORGANICA: "Orgánica", APP: "App" };
const RAMAS: Record<string, string> = {
	LABORAL: "Accidente de trabajo",
	ENFERMEDAD: "Enfermedad profesional",
	TRANSITO: "Accidente de tránsito",
	OTRA: "Otra consulta",
	CLIENTE: "Ya es cliente",
};

export function BandejaPotenciales() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [filas, setFilas] = useState<Potencial[] | null>(null);
	const [estado, setEstado] = useState("ABIERTAS");
	const [fuente, setFuente] = useState("TODAS");
	const [desde, setDesde] = useState("");
	const [hasta, setHasta] = useState("");
	const [ocupada, setOcupada] = useState<number | null>(null);
	const [eligiendoRama, setEligiendoRama] = useState<number | null>(null);

	const pedir = useCallback(
		async <T,>(ruta: string, init?: RequestInit): Promise<T> => {
			const res = await fetch(`${POTENCIALES_ENDPOINT}${ruta}`, {
				...init,
				headers: {
					Authorization: `Bearer ${token}`,
					...(init?.body ? { "Content-Type": "application/json" } : {}),
				},
			});
			const cuerpo = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(cuerpo.error || `Error ${res.status}`);
			return cuerpo.data as T;
		},
		[token],
	);

	const cargar = useCallback(async () => {
		if (!token) return;
		const q = new URLSearchParams();
		if (estado !== "ABIERTAS") q.set("estado", estado);
		if (fuente !== "TODAS") q.set("fuente", fuente);
		if (desde) q.set("desde", desde);
		if (hasta) q.set("hasta", hasta);
		try {
			setFilas(await pedir<Potencial[]>(`/?${q}`));
		} catch (e) {
			toast.error((e as Error).message);
		}
	}, [token, estado, fuente, desde, hasta, pedir]);

	useEffect(() => {
		cargar();
		const t = setInterval(cargar, 30_000);
		return () => clearInterval(t);
	}, [cargar]);

	const accion = async (id: number, ruta: string, cuerpo?: object, exito?: string) => {
		setOcupada(id);
		try {
			await pedir(`/${id}/${ruta}`, { method: "POST", body: cuerpo ? JSON.stringify(cuerpo) : undefined });
			if (exito) toast.success(exito);
			setEligiendoRama(null);
			await cargar();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setOcupada(null);
		}
	};

	const enviarAlCrm = (p: Potencial, rama?: string) =>
		accion(p.id, "crm", rama ? { rama } : undefined, "Listo: la consulta está en la primera columna del embudo.");

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end gap-3">
				<div className="space-y-1.5">
					<Label>Estado</Label>
					<Select value={estado} onValueChange={setEstado}>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ABIERTAS">Para atender</SelectItem>
							<SelectItem value="TODAS">Todas</SelectItem>
							{Object.entries(ESTADOS).map(([valor, e]) => (
								<SelectItem key={valor} value={valor}>
									{e.texto}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label>Fuente</Label>
					<Select value={fuente} onValueChange={setFuente}>
						<SelectTrigger className="w-36">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="TODAS">Todas</SelectItem>
							{Object.entries(FUENTES).map(([valor, texto]) => (
								<SelectItem key={valor} value={valor}>
									{texto}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="potenciales-desde">Desde</Label>
					<Input id="potenciales-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="potenciales-hasta">Hasta</Label>
					<Input id="potenciales-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
				</div>
			</div>

			{filas === null ? (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" /> Cargando…
				</p>
			) : filas.length === 0 ? (
				<p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
					No hay consultas con estos filtros.
				</p>
			) : (
				<div className="overflow-x-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead>Fecha</TableHead>
								<TableHead>Persona</TableHead>
								<TableHead>Fuente</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead>Consulta</TableHead>
								<TableHead className="text-right">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filas.map((p) => (
								<TableRow key={p.id}>
									<TableCell className="whitespace-nowrap text-xs text-muted-foreground">
										{new Date(p.creada).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
									</TableCell>
									<TableCell>
										<p className="font-medium">{p.nombre ?? "Sin nombre"}</p>
										<p className="text-xs text-muted-foreground">
											{[p.telefono, p.localidad].filter(Boolean).join(" · ")}
										</p>
									</TableCell>
									<TableCell>
										<Badge variant="outline">{FUENTES[p.fuente]}</Badge>
									</TableCell>
									<TableCell>
										<span className={`rounded px-2 py-0.5 text-xs font-semibold ${ESTADOS[p.estado].clase}`}>
											{ESTADOS[p.estado].texto}
										</span>
										{p.tomadaPor ? (
											<p className="mt-1 text-xs text-muted-foreground">por {p.tomadaPor}</p>
										) : null}
									</TableCell>
									<TableCell className="max-w-72">
										<p className="text-sm">{p.rama ? RAMAS[p.rama] : "—"}</p>
										{p.motivo ? <p className="text-xs text-muted-foreground">{p.motivo}</p> : null}
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap justify-end gap-1.5">
											{p.contactId ? (
												<Button variant="ghost" size="sm" asChild>
													<Link
														href={`/admin/whatsapp?contacto=${p.contactId}&bandeja=${p.fuente === "PAGA" ? "pauta" : "organicas"}`}
													>
														<MessageCircle className="size-4" /> Conversación
													</Link>
												</Button>
											) : null}
											{p.leadId ? (
												<Button variant="ghost" size="sm" asChild>
													<Link href={`/admin/crm/leads/${p.leadId}`}>
														<ExternalLink className="size-4" /> Ver en el CRM
													</Link>
												</Button>
											) : null}
											{p.estado === "BOT" || p.estado === "DUDOSA" ? (
												<Button
													variant="outline"
													size="sm"
													disabled={ocupada === p.id}
													onClick={() => accion(p.id, "tomar", undefined, "Tomada: el bot ya no escribe en esta conversación.")}
												>
													<Hand className="size-4" /> Tomar
												</Button>
											) : null}
											{!p.leadId && p.contactId ? (
												eligiendoRama === p.id ? (
													["LABORAL", "ENFERMEDAD", "TRANSITO"].map((r) => (
														<Button
															key={r}
															size="sm"
															variant="secondary"
															disabled={ocupada === p.id}
															onClick={() => enviarAlCrm(p, r)}
														>
															{RAMAS[r]}
														</Button>
													))
												) : (
													<Button
														size="sm"
														disabled={ocupada === p.id}
														onClick={() =>
															p.rama && p.rama !== "OTRA" && p.rama !== "CLIENTE"
																? enviarAlCrm(p)
																: setEligiendoRama(p.id)
														}
													>
														<Send className="size-4" /> Enviar al CRM
													</Button>
												)
											) : null}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
