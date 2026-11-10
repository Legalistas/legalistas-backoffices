"use client";

import { BookUser, Loader2, Megaphone, Plus, Search, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import { type Agenda, type Contacto, useWhatsappApi } from "./agendas-api";
import CampanaDialog from "./CampanaDialog";

// Agendas of WhatsApp: the main one has every contact; the others are groups
// built from it. Contacts come in by pasting rows copied from a spreadsheet.

/** null = the main agenda. */
type Seleccion = number | null;

export default function AgendasPanel({ onCampanaLanzada }: { onCampanaLanzada: (id: number) => void }) {
	const { api, listo } = useWhatsappApi();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [agendas, setAgendas] = useState<Agenda[]>([]);
	const [totalPrincipal, setTotalPrincipal] = useState(0);
	const [actual, setActual] = useState<Seleccion>(null);
	const [contactos, setContactos] = useState<Contacto[] | null>(null);
	const [busqueda, setBusqueda] = useState("");
	const [marcados, setMarcados] = useState<Set<number>>(new Set());
	const [destino, setDestino] = useState("");
	const [nuevaAgenda, setNuevaAgenda] = useState("");
	const [ocupado, setOcupado] = useState(false);
	const [pegarAbierto, setPegarAbierto] = useState(false);
	const [lista, setLista] = useState("");
	const [invalidos, setInvalidos] = useState<string[]>([]);
	const [campanaAbierta, setCampanaAbierta] = useState(false);

	const cargarAgendas = useCallback(async () => {
		const r = await api<{ principal: { contactos: number }; agendas: Agenda[] }>("/agendas");
		setAgendas(r.agendas);
		setTotalPrincipal(r.principal.contactos);
	}, [api]);

	const cargarContactos = useCallback(async () => {
		const params = new URLSearchParams();
		if (actual) params.set("agendaId", String(actual));
		if (busqueda.trim()) params.set("q", busqueda.trim());
		setContactos(await api<Contacto[]>(`/agenda/contactos?${params}`));
	}, [api, actual, busqueda]);

	const recargar = useCallback(() => Promise.all([cargarAgendas(), cargarContactos()]), [cargarAgendas, cargarContactos]);

	useEffect(() => {
		if (listo) cargarAgendas().catch((err) => toast.error((err as Error).message));
	}, [listo, cargarAgendas]);

	useEffect(() => {
		if (!listo) return;
		setMarcados(new Set());
		const t = setTimeout(() => cargarContactos().catch((err) => toast.error((err as Error).message)), 250);
		return () => clearTimeout(t);
	}, [listo, cargarContactos]);

	const agendaActual = agendas.find((a) => a.id === actual) ?? null;
	const nombreActual = agendaActual?.nombre ?? "Agenda principal";
	const nombreDe = useMemo(() => new Map(agendas.map((a) => [a.id, a.nombre])), [agendas]);
	const todos = !!contactos?.length && contactos.every((c) => marcados.has(c.id));

	const correr = async (accion: () => Promise<unknown>, ok?: string) => {
		setOcupado(true);
		try {
			await accion();
			if (ok) toast.success(ok);
			await recargar();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setOcupado(false);
		}
	};

	const crearAgenda = () =>
		correr(async () => {
			const a = await api<{ id: number }>("/agendas", {
				method: "POST",
				body: JSON.stringify({ nombre: nuevaAgenda.trim() }),
			});
			setNuevaAgenda("");
			setActual(a.id);
		}, "Agenda creada");

	const borrarAgenda = async (a: Agenda) => {
		const ok = await confirm({
			title: "Eliminar agenda",
			description: `Se borra "${a.nombre}". Sus contactos siguen en la agenda principal y las campañas enviadas no se pierden.`,
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (!ok) return;
		await correr(async () => {
			await api(`/agendas/${a.id}`, { method: "DELETE" });
			if (actual === a.id) setActual(null);
		}, "Agenda eliminada");
	};

	const pegar = async () => {
		setOcupado(true);
		try {
			const r = await api<{ nuevos: number; yaEstaban: number; invalidos: string[] }>("/agenda/contactos", {
				method: "POST",
				body: JSON.stringify({ lista, agendaId: actual }),
			});
			toast.success(
				`${r.nuevos} contacto${r.nuevos === 1 ? "" : "s"} nuevo${r.nuevos === 1 ? "" : "s"}` +
					(r.yaEstaban ? `, ${r.yaEstaban} ya estaba${r.yaEstaban === 1 ? "" : "n"}` : ""),
			);
			setInvalidos(r.invalidos);
			setLista("");
			if (!r.invalidos.length) setPegarAbierto(false);
			await recargar();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setOcupado(false);
		}
	};

	const agregarAAgenda = () =>
		correr(async () => {
			const r = await api<{ agregados: number }>(`/agendas/${destino}/contactos`, {
				method: "POST",
				body: JSON.stringify({ contactoIds: [...marcados] }),
			});
			toast.success(`${r.agregados} agregado${r.agregados === 1 ? "" : "s"} a "${nombreDe.get(Number(destino))}"`);
			setMarcados(new Set());
		});

	const quitarDeAgenda = (ids: number[]) =>
		correr(async () => {
			for (const id of ids) await api(`/agendas/${actual}/contactos/${id}`, { method: "DELETE" });
			setMarcados(new Set());
		}, ids.length === 1 ? "Quitado de la agenda" : `${ids.length} quitados de la agenda`);

	const borrarContacto = async (c: Contacto) => {
		const ok = await confirm({
			title: "Eliminar contacto",
			description: `Se borra ${c.nombre || c.telefono} de la agenda principal y de todas las agendas.`,
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (ok) await correr(() => api(`/agenda/contactos/${c.id}`, { method: "DELETE" }), "Contacto eliminado");
	};

	const marcar = (id: number, si: boolean) =>
		setMarcados((prev) => {
			const next = new Set(prev);
			if (si) next.add(id);
			else next.delete(id);
			return next;
		});

	const itemClase = (activo: boolean) =>
		cn(
			"flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
			activo ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted",
		);

	return (
		<div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
			<aside className="space-y-3 rounded-xl border border-border p-3">
				<nav className="space-y-1" aria-label="Agendas">
					<button type="button" className={itemClase(actual === null)} onClick={() => setActual(null)}>
						<span className="flex items-center gap-2">
							<BookUser className="h-4 w-4" />
							Agenda principal
						</span>
						<span className="text-xs text-muted-foreground">{totalPrincipal}</span>
					</button>
					{agendas.map((a) => (
						<div key={a.id} className="group flex items-center gap-1">
							<button type="button" className={itemClase(actual === a.id)} onClick={() => setActual(a.id)}>
								<span className="truncate">{a.nombre}</span>
								<span className="text-xs text-muted-foreground">{a.contactos}</span>
							</button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
								onClick={() => borrarAgenda(a)}
								aria-label={`Eliminar ${a.nombre}`}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
				</nav>
				<form
					className="flex gap-2 border-t border-border pt-3"
					onSubmit={(e) => {
						e.preventDefault();
						if (nuevaAgenda.trim()) crearAgenda();
					}}
				>
					<Input
						value={nuevaAgenda}
						onChange={(e) => setNuevaAgenda(e.target.value)}
						placeholder="Nueva agenda"
						maxLength={150}
						aria-label="Nombre de la nueva agenda"
					/>
					<Button type="submit" size="icon" disabled={!nuevaAgenda.trim() || ocupado} aria-label="Crear agenda">
						<Plus className="h-4 w-4" />
					</Button>
				</form>
			</aside>

			<section className="min-w-0 space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<h2 className="mr-auto text-base font-semibold text-foreground">{nombreActual}</h2>
					<Button
						variant="outline"
						className="gap-1.5"
						onClick={() => {
							setInvalidos([]);
							setPegarAbierto(true);
						}}
					>
						<UserPlus className="h-4 w-4" />
						Agregar contactos
					</Button>
					<Button
						className="gap-1.5"
						onClick={() => setCampanaAbierta(true)}
						disabled={!(agendaActual ? agendaActual.contactos : totalPrincipal)}
					>
						<Megaphone className="h-4 w-4" />
						Enviar campaña
					</Button>
				</div>

				<div className="relative">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={busqueda}
						onChange={(e) => setBusqueda(e.target.value)}
						placeholder="Buscar por nombre o teléfono"
						className="pl-9"
						aria-label="Buscar contactos"
					/>
				</div>

				{marcados.size > 0 && (
					<div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
						<span className="mr-auto font-medium">
							{marcados.size} seleccionado{marcados.size === 1 ? "" : "s"}
						</span>
						{actual === null ? (
							agendas.length ? (
								<>
									<Select value={destino} onValueChange={setDestino}>
										<SelectTrigger className="h-8 w-52 bg-background" aria-label="Agenda destino">
											<SelectValue placeholder="Elegí una agenda" />
										</SelectTrigger>
										<SelectContent>
											{agendas.map((a) => (
												<SelectItem key={a.id} value={String(a.id)}>
													{a.nombre}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button size="sm" onClick={agregarAAgenda} disabled={!destino || ocupado}>
										Agregar a la agenda
									</Button>
								</>
							) : (
								<span className="text-xs text-muted-foreground">Creá una agenda para agregarlos.</span>
							)
						) : (
							<Button size="sm" variant="outline" onClick={() => quitarDeAgenda([...marcados])} disabled={ocupado}>
								Quitar de la agenda
							</Button>
						)}
					</div>
				)}

				<div className="overflow-x-auto rounded-xl border border-border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10">
									<Checkbox
										checked={todos}
										onCheckedChange={(v) =>
											setMarcados(v ? new Set(contactos?.map((c) => c.id)) : new Set())
										}
										aria-label="Seleccionar todos"
									/>
								</TableHead>
								<TableHead>Nombre</TableHead>
								<TableHead>Teléfono</TableHead>
								<TableHead>Vendedor</TableHead>
								{actual === null && <TableHead>Agendas</TableHead>}
								<TableHead className="w-12">
									<span className="sr-only">Acciones</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{contactos === null ? (
								[0, 1, 2].map((i) => (
									<TableRow key={i}>
										<TableCell colSpan={6}>
											<Skeleton className="h-5 w-full" />
										</TableCell>
									</TableRow>
								))
							) : contactos.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
										{busqueda
											? "No hay contactos con esa búsqueda."
											: actual === null
												? "La agenda está vacía. Pegá una lista con \"Agregar contactos\"."
												: "Esta agenda no tiene contactos: elegilos en la agenda principal o pegá una lista."}
									</TableCell>
								</TableRow>
							) : (
								contactos.map((c) => (
									<TableRow key={c.id} data-state={marcados.has(c.id) ? "selected" : undefined}>
										<TableCell>
											<Checkbox
												checked={marcados.has(c.id)}
												onCheckedChange={(v) => marcar(c.id, !!v)}
												aria-label={`Seleccionar ${c.nombre || c.telefono}`}
											/>
										</TableCell>
										<TableCell className="font-medium">
											{c.nombre || "—"}
											{c.baja && (
												<Badge variant="outline" className="ml-2 border-amber-300 text-amber-700">
													Pidió BAJA
												</Badge>
											)}
										</TableCell>
										<TableCell className="whitespace-nowrap tabular-nums">{c.telefono}</TableCell>
										<TableCell className="text-muted-foreground">{c.vendedor ?? "—"}</TableCell>
										{actual === null && (
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{c.agendaIds.map((id) => (
														<Badge key={id} variant="secondary" className="font-normal">
															{nombreDe.get(id)}
														</Badge>
													))}
												</div>
											</TableCell>
										)}
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-destructive"
												onClick={() => (actual === null ? borrarContacto(c) : quitarDeAgenda([c.id]))}
												disabled={ocupado}
												aria-label={actual === null ? `Eliminar ${c.nombre}` : `Quitar ${c.nombre} de la agenda`}
												title={actual === null ? "Eliminar de la agenda principal" : "Quitar de esta agenda"}
											>
												{actual === null ? <Trash2 className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</section>

			<Dialog open={pegarAbierto} onOpenChange={setPegarAbierto}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Agregar contactos</DialogTitle>
						<DialogDescription>
							Copiá las filas del Excel o Google Sheets (nombre y teléfono) y pegalas acá, una por línea.
							{actual !== null && ` Se agregan a la agenda principal y a "${nombreActual}".`}
						</DialogDescription>
					</DialogHeader>
					<Textarea
						value={lista}
						onChange={(e) => setLista(e.target.value)}
						rows={10}
						placeholder={"Alvarez Raul\t381 5153989\nMonjes Braian\t351 6572745"}
						className="font-mono text-xs"
						aria-label="Lista de contactos"
					/>
					{invalidos.length > 0 && (
						<div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
							<p className="font-medium">
								No se cargaron {invalidos.length} fila{invalidos.length === 1 ? "" : "s"}: el teléfono no es un
								celular argentino válido (falta la característica o sobran dígitos).
							</p>
							{invalidos.map((l) => (
								<p key={l} className="font-mono">
									{l}
								</p>
							))}
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setPegarAbierto(false)} disabled={ocupado}>
							{invalidos.length ? "Listo" : "Cancelar"}
						</Button>
						<Button onClick={pegar} disabled={!lista.trim() || ocupado} className="gap-1.5">
							{ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
							Agregar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<CampanaDialog
				open={campanaAbierta}
				onOpenChange={setCampanaAbierta}
				agenda={{
					id: actual,
					nombre: nombreActual,
					contactos: agendaActual ? agendaActual.contactos : totalPrincipal,
				}}
				ejemplo={contactos?.[0] ?? null}
				onLanzada={onCampanaLanzada}
			/>
			{ConfirmationDialog}
		</div>
	);
}
