"use client";

import { ArrowLeft, LogIn, MousePointerClick, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pagination } from "@/components/shared/Pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUDITORIA_ENDPOINT } from "@/constant/api-endpoints";
import { SEGMENTO_LABEL, type Segmento } from "@/constant/rrhh";
import { apiErrorMessage } from "@/lib/api-error";
import { describirMovimiento } from "./describir";

// Auditoría del equipo (25/11/2026): quién entra al BO y qué cambia. Los
// ingresos salen de las sesiones; los movimientos, de cada cambio (crear,
// editar, borrar) que el backend graba desde ese día.

interface PersonaResumen {
	userId: number;
	nombre: string;
	email: string | null;
	image: string | null;
	rol: string | null;
	segmento: Segmento;
	ultimoIngreso: string | null;
	ingresos: number;
	movimientos: number;
	ultimoMovimiento: string | null;
}

interface Evento {
	tipo: "INGRESO" | "MOVIMIENTO";
	id: number;
	userId: number;
	nombre: string;
	fecha: string;
	metodo: string | null;
	ruta: string | null;
	ip: string | null;
	detalle: string | null;
}

interface Respuesta {
	resumen: PersonaResumen[];
	eventos: Evento[];
	total: number;
	page: number;
	limit: number;
}

type Tipo = "todo" | "ingresos" | "movimientos";
type Grupo = "INTERNO" | "REPRESENTANTE" | "TODOS";

const CUENTA_COMPARTIDA = "sistemas@legalistas.ar";

const diaLocal = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fechaHora = (iso: string) =>
	new Date(iso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function haceCuanto(iso: string | null): string {
	if (!iso) return "Nunca";
	const min = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
	if (min > -60) return rtf.format(min, "minute");
	if (min > -60 * 24) return rtf.format(Math.round(min / 60), "hour");
	return rtf.format(Math.round(min / (60 * 24)), "day");
}

const iniciales = (nombre: string) => {
	const p = nombre.trim().split(/\s+/).filter(Boolean);
	return ((p[0]?.[0] ?? "?") + (p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "")).toUpperCase();
};

export default function AuditoriaContent() {
	const router = useRouter();
	const { data: session } = useSession();
	const hoy = useMemo(() => new Date(), []);
	const [filtros, setFiltros] = useState<{
		desde: string;
		hasta: string;
		tipo: Tipo;
		userId: number | null;
	}>(() => ({
		desde: diaLocal(new Date(hoy.getTime() - 6 * 24 * 60 * 60 * 1000)),
		hasta: diaLocal(hoy),
		tipo: "todo",
		userId: null,
	}));
	const { desde, hasta, tipo, userId } = filtros;
	const [grupo, setGrupo] = useState<Grupo>("INTERNO");
	const [page, setPage] = useState(1);
	// Cambiar un filtro vuelve a la primera página.
	const filtrar = (cambio: Partial<typeof filtros>) => {
		setFiltros((f) => ({ ...f, ...cambio }));
		setPage(1);
	};
	const [data, setData] = useState<Respuesta | null>(null);
	const [loading, setLoading] = useState(false);

	const cargar = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;
		setLoading(true);
		try {
			const qs = new URLSearchParams({ desde, hasta, tipo, page: String(page) });
			if (userId) qs.set("userId", String(userId));
			const res = await fetch(`${AUDITORIA_ENDPOINT}?${qs}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo cargar la auditoría"));
			setData((await res.json()) as Respuesta);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo cargar la auditoría");
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, desde, hasta, tipo, userId, page]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const personas = useMemo(
		() =>
			(data?.resumen ?? [])
				.filter((p) => p.email?.trim().toLowerCase() !== CUENTA_COMPARTIDA)
				.filter((p) => grupo === "TODOS" || p.segmento === grupo)
				// Quien entró hace menos arriba; los que nunca entraron, al final.
				.sort((a, b) => (b.ultimoIngreso ?? "").localeCompare(a.ultimoIngreso ?? "")),
		[data, grupo],
	);
	const cuenta = (g: Segmento) =>
		(data?.resumen ?? []).filter(
			(p) => p.segmento === g && p.email?.trim().toLowerCase() !== CUENTA_COMPARTIDA,
		).length;
	const elegida = data?.resumen.find((p) => p.userId === userId);
	const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 50)));

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<Button
						variant="ghost"
						size="sm"
						className="-ml-2 mb-1 h-7 text-muted-foreground"
						onClick={() => router.push("/admin/teams")}
					>
						<ArrowLeft className="mr-1 h-3.5 w-3.5" />
						Equipo
					</Button>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">Auditoría</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Quién entra al BO y qué cambia: ingresos y movimientos de abogados y equipo interno.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={cargar} disabled={loading}>
					<RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
					Actualizar
				</Button>
			</div>

			{/* Filtros */}
			<div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
				<div className="flex flex-col gap-1">
					<Label htmlFor="aud-desde" className="text-xs">Desde</Label>
					<Input
						id="aud-desde"
						type="date"
						className="h-9 w-40"
						value={desde}
						max={hasta}
						onChange={(e) => e.target.value && filtrar({ desde: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="aud-hasta" className="text-xs">Hasta</Label>
					<Input
						id="aud-hasta"
						type="date"
						className="h-9 w-40"
						value={hasta}
						min={desde}
						onChange={(e) => e.target.value && filtrar({ hasta: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<Label className="text-xs">Persona</Label>
					<Select
						value={userId ? String(userId) : "todas"}
						onValueChange={(v) => filtrar({ userId: v === "todas" ? null : Number(v) })}
					>
						<SelectTrigger className="h-9 w-60">
							<SelectValue placeholder="Todas" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todas">Todas las personas</SelectItem>
							{[...(data?.resumen ?? [])]
								.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
								.map((p) => (
									<SelectItem key={p.userId} value={String(p.userId)}>
										{p.nombre}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-xs font-medium">Qué ver</span>
					<Tabs value={tipo} onValueChange={(v) => filtrar({ tipo: v as Tipo })}>
						<TabsList className="h-9">
							<TabsTrigger value="todo">Todo</TabsTrigger>
							<TabsTrigger value="ingresos">Ingresos al BO</TabsTrigger>
							<TabsTrigger value="movimientos">Movimientos</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>

			{/* Resumen por persona */}
			<section className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-base font-semibold text-foreground">Por persona</h2>
					<Tabs value={grupo} onValueChange={(v) => setGrupo(v as Grupo)}>
						<TabsList>
							<TabsTrigger value="INTERNO">
								{SEGMENTO_LABEL.INTERNO}
								<Badge variant="secondary" className="ml-2">{cuenta("INTERNO")}</Badge>
							</TabsTrigger>
							<TabsTrigger value="REPRESENTANTE">
								{SEGMENTO_LABEL.REPRESENTANTE}
								<Badge variant="secondary" className="ml-2">{cuenta("REPRESENTANTE")}</Badge>
							</TabsTrigger>
							<TabsTrigger value="TODOS">Todos</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
				<div className="max-h-105 overflow-y-auto rounded-lg border bg-card">
					<Table>
						<TableHeader className="sticky top-0 bg-card">
							<TableRow className="hover:bg-transparent [&>th]:h-9 [&>th]:text-[11px] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
								<TableHead className="pl-4">Persona</TableHead>
								<TableHead>Último ingreso</TableHead>
								<TableHead className="text-right">Ingresos</TableHead>
								<TableHead className="text-right">Movimientos</TableHead>
								<TableHead className="pr-4">Último movimiento</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{personas.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
										{loading ? "Cargando…" : "Sin personas en este grupo"}
									</TableCell>
								</TableRow>
							) : (
								personas.map((p) => (
									<TableRow
										key={p.userId}
										className={`cursor-pointer ${userId === p.userId ? "bg-primary/5" : ""}`}
										onClick={() => filtrar({ userId: userId === p.userId ? null : p.userId })}
										title="Ver solo la actividad de esta persona"
									>
										<TableCell className="py-2 pl-4">
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8">
													{p.image && <AvatarImage src={p.image} alt={p.nombre} />}
													<AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
														{iniciales(p.nombre)}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium text-foreground">{p.nombre}</p>
													<p className="truncate text-xs text-muted-foreground">{p.rol ?? "—"}</p>
												</div>
											</div>
										</TableCell>
										<TableCell className="py-2">
											<span
												className={`text-sm ${p.ultimoIngreso ? "text-foreground" : "font-medium text-amber-600 dark:text-amber-400"}`}
												title={p.ultimoIngreso ? new Date(p.ultimoIngreso).toLocaleString("es-AR") : undefined}
											>
												{haceCuanto(p.ultimoIngreso)}
											</span>
										</TableCell>
										<TableCell className="py-2 text-right text-sm tabular-nums">{p.ingresos}</TableCell>
										<TableCell className="py-2 text-right text-sm tabular-nums">{p.movimientos}</TableCell>
										<TableCell className="py-2 pr-4 text-sm text-muted-foreground">
											{p.ultimoMovimiento ? haceCuanto(p.ultimoMovimiento) : "—"}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
				<p className="text-xs text-muted-foreground">
					Ingresos y movimientos: dentro de las fechas elegidas. Último ingreso: desde siempre.
				</p>
			</section>

			{/* Actividad */}
			<section className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<h2 className="text-base font-semibold text-foreground">Actividad</h2>
					<Badge variant="secondary">{data?.total ?? 0}</Badge>
					{elegida && (
						<Badge variant="outline" className="gap-1">
							{elegida.nombre}
							<button
								type="button"
								onClick={() => filtrar({ userId: null })}
								aria-label="Quitar filtro de persona"
								className="ml-0.5 hover:text-foreground"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					)}
				</div>
				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent [&>th]:h-9 [&>th]:text-[11px] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
								<TableHead className="w-32 pl-4">Fecha y hora</TableHead>
								<TableHead>Persona</TableHead>
								<TableHead>Qué hizo</TableHead>
								<TableHead className="hidden pr-4 lg:table-cell">Detalle</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(data?.eventos ?? []).length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
										{loading ? "Cargando…" : "Sin actividad en estas fechas"}
									</TableCell>
								</TableRow>
							) : (
								data?.eventos.map((e) => {
									const mov = e.tipo === "MOVIMIENTO" ? describirMovimiento(e.metodo, e.ruta) : null;
									return (
										<TableRow key={`${e.tipo}-${e.id}`}>
											<TableCell className="py-2 pl-4 text-sm tabular-nums text-muted-foreground">
												{fechaHora(e.fecha)}
											</TableCell>
											<TableCell className="py-2 text-sm font-medium text-foreground">{e.nombre}</TableCell>
											<TableCell className="py-2">
												{mov ? (
													<span className="inline-flex items-center gap-2 text-sm">
														<MousePointerClick className="h-3.5 w-3.5 shrink-0 text-blue-500" />
														<span className="font-medium text-foreground">{mov.area}</span>
														<span className="text-muted-foreground">{mov.accion}</span>
													</span>
												) : (
													<span className="inline-flex items-center gap-2 text-sm">
														<LogIn className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
														<span className="font-medium text-foreground">Ingresó al BO</span>
													</span>
												)}
											</TableCell>
											<TableCell className="hidden max-w-90 py-2 pr-4 lg:table-cell">
												<span className="block truncate font-mono text-[11px] text-muted-foreground" title={e.ruta ?? e.detalle ?? ""}>
													{mov ? `${e.metodo} ${e.ruta}` : e.detalle || "—"}
													{e.ip ? ` · ${e.ip}` : ""}
												</span>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
				{(data?.total ?? 0) > (data?.limit ?? 50) && (
					<Pagination
						currentPage={page}
						totalPages={totalPages}
						totalItems={data?.total ?? 0}
						itemsPerPage={data?.limit ?? 50}
						onPageChange={setPage}
					/>
				)}
			</section>
		</div>
	);
}
