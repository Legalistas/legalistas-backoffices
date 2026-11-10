"use client";

import { ChevronLeft, ChevronRight, Loader2, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WHATSAPP_ENDPOINT } from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";
import { ESTADO, motivoTwilio } from "./twilio-errores";

// WhatsApp outbox, only for Sistemas: every message sent through Twilio, to
// find the stuck or undelivered ones and send them again (backend:
// whatsapp/salida.service.ts has the rules).

interface Fila {
	id: number;
	createdAt: string;
	body: string | null;
	status: string | null;
	errorCode: string | null;
	autoReply: string | null;
	sentBy: { name: string } | null;
	contact: { id: number; waId: string; profileName: string | null };
	plantilla: boolean;
	trabado: boolean;
	reenviadoId: number | null;
	puedeReenviar: boolean;
	/** Free text with the 24 h window closed: can't be resent as is. */
	ventanaCerrada: boolean;
}

interface Respuesta {
	total: number;
	porPagina: number;
	resumen: { fallidos: number; trabados: number };
	data: Fila[];
}

type Filtro = "problemas" | "fallidos" | "trabados" | "todos";

const fechaHora = (d: string) =>
	new Date(d).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

function origen(f: Fila) {
	if (f.autoReply === "CAMPANA") return `Campaña${f.sentBy ? ` de ${f.sentBy.name}` : ""}`;
	if (f.autoReply === "CRM") return "Automático del CRM";
	if (f.autoReply) return "Respuesta automática";
	return f.sentBy?.name ?? "Equipo";
}

export default function SalidaWhatsapp() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [filtro, setFiltro] = useState<Filtro>("problemas");
	const [search, setSearch] = useState("");
	const [q, setQ] = useState("");
	const [page, setPage] = useState(1);
	const [data, setData] = useState<Respuesta | null>(null);
	const [cargando, setCargando] = useState(true);
	const [accion, setAccion] = useState<number | "actualizar" | null>(null);

	const api = useCallback(
		async <T,>(path: string, init?: RequestInit): Promise<T> => {
			const res = await fetch(`${WHATSAPP_ENDPOINT}${path}`, {
				...init,
				headers: { Authorization: `Bearer ${token}` },
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			return body as T;
		},
		[token],
	);

	const cargar = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		try {
			const qs = new URLSearchParams({ filtro, page: String(page), ...(q ? { q } : {}) });
			setData(await api<Respuesta>(`/salida?${qs}`));
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setCargando(false);
		}
	}, [api, token, filtro, page, q]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	// Search: debounced, back to the first page.
	useEffect(() => {
		const t = setTimeout(() => {
			setQ(search.trim());
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [search]);

	const actualizar = async () => {
		setAccion("actualizar");
		try {
			const r = await api<{ revisados: number; actualizados: number; errores: number }>("/salida/actualizar", {
				method: "POST",
			});
			toast.success(
				r.revisados
					? `Twilio: ${r.revisados} revisados, ${r.actualizados} con estado nuevo${r.errores ? `, ${r.errores} sin respuesta` : ""}`
					: "No hay mensajes trabados",
			);
			await cargar();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setAccion(null);
		}
	};

	const reenviar = async (f: Fila) => {
		const nombre = f.contact.profileName || `+${f.contact.waId}`;
		if (!window.confirm(`¿Reenviar este mensaje a ${nombre}?`)) return;
		setAccion(f.id);
		try {
			await api(`/salida/${f.id}/reenviar`, { method: "POST" });
			toast.success("Mensaje reenviado");
			await cargar();
		} catch (err) {
			toast.error((err as Error).message);
			await cargar();
		} finally {
			setAccion(null);
		}
	};

	const filtros: { id: Filtro; label: string; n?: number }[] = [
		{ id: "problemas", label: "Con problemas", n: data ? data.resumen.fallidos + data.resumen.trabados : undefined },
		{ id: "fallidos", label: "No entregados", n: data?.resumen.fallidos },
		{ id: "trabados", label: "Trabados", n: data?.resumen.trabados },
		{ id: "todos", label: "Todos" },
	];
	const paginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Salida de WhatsApp</h1>
					<p className="text-sm text-muted-foreground">
						Todo lo que se mandó por Twilio. Los trabados y los no entregados se pueden reenviar.
					</p>
				</div>
				<Button variant="outline" onClick={actualizar} disabled={accion !== null}>
					{accion === "actualizar" ? (
						<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="mr-1.5 h-4 w-4" />
					)}
					Consultar trabados en Twilio
				</Button>
			</div>

			<div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
				<div className="relative min-w-64 flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar por nombre, número o texto..."
						aria-label="Buscar mensajes"
						className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
					/>
				</div>
			</div>

			<div className="rounded-xl border border-border bg-card">
				<div className="flex gap-1 overflow-x-auto border-b border-border px-3">
					{filtros.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => {
								setFiltro(t.id);
								setPage(1);
							}}
							className={cn(
								"whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
								filtro === t.id
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{t.label}
							{t.n !== undefined && (
								<span
									className={cn(
										"ml-1.5 rounded-full px-1.5 text-xs",
										t.n > 0 && t.id !== "todos"
											? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
											: "bg-muted text-muted-foreground",
									)}
								>
									{t.n}
								</span>
							)}
						</button>
					))}
				</div>

				{cargando && !data ? (
					<div className="flex justify-center py-16">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : !data?.data.length ? (
					<p className="py-16 text-center text-sm text-muted-foreground">
						{filtro === "todos" || q ? "No hay mensajes para este filtro." : "Nada trabado ni sin entregar. 👌"}
					</p>
				) : (
					<div className={cn("overflow-x-auto", cargando && "opacity-60")}>
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border text-xs text-muted-foreground">
									<th className="px-3 py-3 text-left font-medium">Fecha</th>
									<th className="px-3 py-3 text-left font-medium">Contacto</th>
									<th className="px-3 py-3 text-left font-medium">Origen</th>
									<th className="px-3 py-3 text-left font-medium">Mensaje</th>
									<th className="px-3 py-3 text-left font-medium">Estado</th>
									<th className="px-3 py-3 text-center font-medium">Acción</th>
								</tr>
							</thead>
							<tbody>
								{data.data.map((f) => (
									<tr key={f.id} className="border-b border-border/60 align-top last:border-0 hover:bg-muted/40">
										<td className="whitespace-nowrap px-3 py-3 tabular-nums">{fechaHora(f.createdAt)}</td>
										<td className="px-3 py-3">
											<span className="block font-medium text-foreground">
												{f.contact.profileName || "Sin nombre"}
											</span>
											<span className="text-xs text-muted-foreground">+{f.contact.waId}</span>
										</td>
										<td className="px-3 py-3 text-muted-foreground">
											{origen(f)}
											{f.plantilla && <span className="block text-xs">Plantilla</span>}
										</td>
										<td className="max-w-md px-3 py-3">
											<p className="line-clamp-2 whitespace-pre-wrap text-muted-foreground">{f.body || "—"}</p>
										</td>
										<td className="px-3 py-3">
											{f.trabado ? (
												<span className="font-medium text-amber-700 dark:text-amber-400">
													⏳ Trabado ({f.status ?? "sin estado"})
												</span>
											) : (
												<span className={cn("font-medium", f.status && ESTADO[f.status]?.clase)}>
													{(f.status && ESTADO[f.status]?.texto) || f.status || "—"}
												</span>
											)}
											{f.errorCode && (
												<span className="block text-xs text-muted-foreground">{motivoTwilio(f.errorCode)}</span>
											)}
										</td>
										<td className="px-3 py-3 text-center">
											{f.reenviadoId ? (
												<span className="text-xs text-green-700 dark:text-green-400">Reenviado</span>
											) : f.puedeReenviar ? (
												<>
													<Button
														size="sm"
														variant="outline"
														className="h-8"
														disabled={accion !== null || f.ventanaCerrada}
														onClick={() => reenviar(f)}
													>
														{accion === f.id ? (
															<Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
														) : (
															<RotateCcw className="mr-1.5 h-3 w-3" />
														)}
														Reenviar
													</Button>
													{f.ventanaCerrada && (
														<span className="mt-1 block max-w-40 text-[11px] text-muted-foreground">
															Texto libre y pasaron 24 h: mandale una plantilla desde la bandeja
														</span>
													)}
												</>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{data && data.total > data.porPagina && (
					<div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
						<span className="text-muted-foreground">
							Página {page} de {paginas} · {data.total} mensajes
						</span>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								disabled={page === 1}
								onClick={() => setPage((p) => p - 1)}
								aria-label="Página anterior"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="outline"
								disabled={page >= paginas}
								onClick={() => setPage((p) => p + 1)}
								aria-label="Página siguiente"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
