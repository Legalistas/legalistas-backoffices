"use client";

import {
	AlertCircle,
	ArrowLeft,
	FilePlus2,
	FileText,
	Loader2,
	Pencil,
	Save,
	Search,
	Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EscritoEditor } from "@/components/escritos/EscritoEditor";
import { MEMBRETE_OPCIONES } from "@/components/escritos/Membrete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	ESCRITOS_PLANTILLA_ENDPOINT,
	ESCRITOS_PLANTILLAS_ENDPOINT,
	ESCRITOS_VARIABLES_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import { escritosFetch } from "@/lib/escritos-api";
import type {
	FormatoHoja,
	MembreteEscrito,
	Plantilla,
	PlantillaListItem,
	VariableEscrito,
} from "@/types/escritos";

// Plantillas reutilizables (acompaña cédula, sorteo de perito, RPU…). Cada una
// define el texto con variables y el diseño de la hoja: membrete (Legalistas o
// RPU del Poder Judicial), fuente, tamaño, interlineado, márgenes y numeración.
// El escrito copia todo eso al crearse.

const FUENTES = ["Times New Roman", "Arial", "Calibri", "Garamond"];
const TAMANOS = [8, 9, 10, 11, 12, 13, 14, 16];
const INTERLINEADOS = [1, 1.15, 1.5, 2];
const MARGENES = [
	{ campo: "margenSuperior", label: "Superior" },
	{ campo: "margenInferior", label: "Inferior" },
	{ campo: "margenIzquierdo", label: "Izquierdo" },
	{ campo: "margenDerecho", label: "Derecho" },
] as const;

interface Borrador extends Required<FormatoHoja> {
	id: number | null;
	nombre: string;
	categoria: string;
	descripcion: string;
	activa: boolean;
	contenidoHtml: string;
}

const NUEVA: Borrador = {
	id: null,
	nombre: "",
	categoria: "",
	descripcion: "",
	activa: true,
	contenidoHtml: "<p></p>",
	membrete: "LEGALISTAS",
	fuente: "Times New Roman",
	tamanoFuente: 12,
	interlineado: 1.5,
	margenSuperior: 25,
	margenInferior: 20,
	margenIzquierdo: 30,
	margenDerecho: 20,
	numerarPaginas: false,
};

const fechaCorta = (iso: string) =>
	new Date(iso).toLocaleDateString("es-AR", {
		timeZone: "America/Argentina/Buenos_Aires",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

export default function PlantillasEscritosPage() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const { confirm, ConfirmationDialog } = useConfirm();

	const [plantillas, setPlantillas] = useState<PlantillaListItem[]>([]);
	const [variables, setVariables] = useState<VariableEscrito[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busqueda, setBusqueda] = useState("");
	const [editando, setEditando] = useState<Borrador | null>(null);
	const [guardando, setGuardando] = useState(false);

	const cargar = useCallback(async () => {
		if (!token) return;
		setError(null);
		try {
			const [lista, vars] = await Promise.all([
				escritosFetch<{ data: PlantillaListItem[] }>(
					`${ESCRITOS_PLANTILLAS_ENDPOINT}?incluirInactivas=true`,
					token,
				),
				escritosFetch<{ data: { variables: VariableEscrito[] } }>(
					ESCRITOS_VARIABLES_ENDPOINT,
					token,
				),
			]);
			setPlantillas(lista.data);
			setVariables(vars.data.variables);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const abrir = async (id: number) => {
		if (!token) return;
		try {
			const { data } = await escritosFetch<{ data: Plantilla }>(
				ESCRITOS_PLANTILLA_ENDPOINT(id),
				token,
			);
			setEditando({
				...NUEVA,
				id: data.id,
				nombre: data.nombre,
				categoria: data.categoria ?? "",
				descripcion: data.descripcion ?? "",
				activa: data.activa,
				contenidoHtml: data.contenidoHtml,
				membrete: data.membrete ?? "LEGALISTAS",
				fuente: data.fuente,
				tamanoFuente: data.tamanoFuente,
				interlineado: data.interlineado,
				margenSuperior: data.margenSuperior,
				margenInferior: data.margenInferior,
				margenIzquierdo: data.margenIzquierdo,
				margenDerecho: data.margenDerecho,
				numerarPaginas: data.numerarPaginas,
			});
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	const guardar = async () => {
		if (!token || !editando) return;
		if (!editando.nombre.trim()) {
			toast.error("El nombre es obligatorio");
			return;
		}
		setGuardando(true);
		try {
			const { id, ...datos } = editando;
			await escritosFetch(
				id ? ESCRITOS_PLANTILLA_ENDPOINT(id) : ESCRITOS_PLANTILLAS_ENDPOINT,
				token,
				{ method: id ? "PUT" : "POST", body: JSON.stringify(datos) },
			);
			toast.success("Plantilla guardada");
			setEditando(null);
			cargar();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setGuardando(false);
		}
	};

	const eliminar = async (p: PlantillaListItem) => {
		if (!token) return;
		const ok = await confirm({
			title: "Eliminar plantilla",
			description: `¿Eliminar "${p.nombre}"? Los escritos ya creados con ella no se modifican.`,
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			await escritosFetch(ESCRITOS_PLANTILLA_ENDPOINT(p.id), token, { method: "DELETE" });
			setPlantillas((prev) => prev.filter((x) => x.id !== p.id));
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	const porCategoria = useMemo(() => {
		const q = busqueda.trim().toLowerCase();
		const map = new Map<string, PlantillaListItem[]>();
		for (const p of plantillas) {
			if (
				q &&
				![p.nombre, p.categoria, p.descripcion].some((t) => t?.toLowerCase().includes(q))
			)
				continue;
			const cat = p.categoria || "Sin categoría";
			map.set(cat, [...(map.get(cat) ?? []), p]);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	}, [plantillas, busqueda]);

	// ── Editor de una plantilla ────────────────────────────────────────
	if (editando) {
		const set = (patch: Partial<Borrador>) => setEditando((b) => (b ? { ...b, ...patch } : b));
		return (
			<div className="mx-auto max-w-375 space-y-4 p-4 md:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2">
						<Button variant="ghost" size="sm" onClick={() => setEditando(null)}>
							<ArrowLeft className="mr-1 h-4 w-4" /> Plantillas
						</Button>
						<span className="text-muted-foreground">/</span>
						<h1 className="truncate text-lg font-semibold">
							{editando.nombre || (editando.id ? "Plantilla" : "Nueva plantilla")}
						</h1>
					</div>
					<Button onClick={guardar} disabled={guardando}>
						{guardando ? (
							<Loader2 className="mr-1 h-4 w-4 animate-spin" />
						) : (
							<Save className="mr-1 h-4 w-4" />
						)}
						Guardar plantilla
					</Button>
				</div>

				<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
					<EscritoEditor
						value={editando.contenidoHtml}
						onChange={(html) => set({ contenidoHtml: html })}
						variables={variables}
						formato={editando}
					/>

					<aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Datos</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="pl-nombre">Nombre</Label>
									<Input
										id="pl-nombre"
										value={editando.nombre}
										onChange={(e) => set({ nombre: e.target.value })}
										maxLength={150}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="pl-categoria">Categoría</Label>
									<Input
										id="pl-categoria"
										value={editando.categoria}
										onChange={(e) => set({ categoria: e.target.value })}
										placeholder="Ej: Notificaciones, Prueba, RPU…"
										maxLength={80}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="pl-desc">Descripción</Label>
									<Textarea
										id="pl-desc"
										rows={2}
										value={editando.descripcion}
										onChange={(e) => set({ descripcion: e.target.value })}
										maxLength={255}
									/>
								</div>
								<label className="flex items-center justify-between gap-2 text-sm">
									Activa (se puede elegir al crear un escrito)
									<Switch checked={editando.activa} onCheckedChange={(v) => set({ activa: v })} />
								</label>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Diseño de la hoja</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-1.5">
									<Label>Membrete</Label>
									<Select
										value={editando.membrete}
										onValueChange={(v) => set({ membrete: v as MembreteEscrito })}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MEMBRETE_OPCIONES.map((m) => (
												<SelectItem key={m.value} value={m.value}>
													{m.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label>Fuente</Label>
									<Select value={editando.fuente} onValueChange={(v) => set({ fuente: v })}>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FUENTES.map((f) => (
												<SelectItem key={f} value={f}>
													<span style={{ fontFamily: f }}>{f}</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-1.5">
										<Label>Tamaño</Label>
										<Select
											value={String(editando.tamanoFuente)}
											onValueChange={(v) => set({ tamanoFuente: Number(v) })}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{TAMANOS.map((t) => (
													<SelectItem key={t} value={String(t)}>
														{t} pt
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1.5">
										<Label>Interlineado</Label>
										<Select
											value={String(editando.interlineado)}
											onValueChange={(v) => set({ interlineado: Number(v) })}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[...new Set([...INTERLINEADOS, editando.interlineado])]
													.sort((a, b) => a - b)
													.map((i) => (
														<SelectItem key={i} value={String(i)}>
															{i.toLocaleString("es-AR")}
														</SelectItem>
													))}
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="space-y-1.5">
									<Label>Márgenes (mm)</Label>
									<div className="grid grid-cols-2 gap-2">
										{MARGENES.map(({ campo, label }) => (
											<div key={campo} className="space-y-1">
												<span className="text-xs text-muted-foreground">{label}</span>
												<Input
													type="number"
													min={5}
													max={60}
													value={editando[campo]}
													onChange={(e) =>
														set({ [campo]: Math.min(60, Math.max(5, Number(e.target.value) || 5)) })
													}
												/>
											</div>
										))}
									</div>
								</div>
								<label className="flex items-center justify-between gap-2 text-sm">
									Numerar páginas
									<Switch
										checked={editando.numerarPaginas}
										onCheckedChange={(v) => set({ numerarPaginas: v })}
									/>
								</label>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Variables</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-xs text-muted-foreground">
								<p>
									Se insertan desde "Insertar variable" en la barra del editor y se completan con el
									expediente del escrito. Lo que va entre [corchetes] se completa a mano.
								</p>
								<div className="flex flex-wrap gap-1">
									{variables.map((v) => (
										<code
											key={v.clave}
											title={v.etiqueta}
											className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
										>
											{`{{${v.clave}}}`}
										</code>
									))}
								</div>
							</CardContent>
						</Card>
					</aside>
				</div>
				{ConfirmationDialog}
			</div>
		);
	}

	// ── Listado ────────────────────────────────────────────────────────
	return (
		<div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<FileText className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h1 className="text-xl font-semibold">Plantillas de escritos</h1>
						<p className="max-w-2xl text-sm text-muted-foreground">
							Cada plantilla define el texto y el diseño de la hoja. Las variables (
							{"{{CARATULA}}"}, {"{{CUIJ}}"}…) se completan con el expediente del escrito.
						</p>
					</div>
				</div>
				<Button onClick={() => setEditando({ ...NUEVA })}>
					<FilePlus2 className="mr-1 h-4 w-4" />
					Nueva plantilla
				</Button>
			</div>

			{plantillas.length > 0 && (
				<div className="relative max-w-sm">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={busqueda}
						onChange={(e) => setBusqueda(e.target.value)}
						placeholder="Buscar plantilla…"
						className="pl-9"
					/>
				</div>
			)}

			{loading ? (
				<div className="flex justify-center py-16">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : error ? (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
					<AlertCircle className="h-8 w-8 text-destructive" />
					<div>
						<p className="font-medium">No se pudieron cargar las plantillas</p>
						<p className="text-sm text-muted-foreground">{error}</p>
					</div>
					<Button variant="outline" size="sm" onClick={cargar}>
						Reintentar
					</Button>
				</div>
			) : plantillas.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
					<FileText className="h-10 w-10 text-muted-foreground/60" />
					<div>
						<p className="font-medium">Todavía no hay plantillas</p>
						<p className="text-sm text-muted-foreground">
							Creá la primera: el texto, las variables y el diseño de la hoja.
						</p>
					</div>
					<Button onClick={() => setEditando({ ...NUEVA })}>
						<FilePlus2 className="mr-1 h-4 w-4" />
						Nueva plantilla
					</Button>
				</div>
			) : porCategoria.length === 0 ? (
				<p className="py-10 text-center text-sm text-muted-foreground">
					Ninguna plantilla coincide con "{busqueda}".
				</p>
			) : (
				porCategoria.map(([cat, items]) => (
					<section key={cat} className="space-y-3">
						<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							{cat} <span className="font-normal">({items.length})</span>
						</h2>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{items.map((p) => (
								<Card
									key={p.id}
									className="group cursor-pointer transition-shadow hover:shadow-md"
									onClick={() => abrir(p.id)}
								>
									<CardContent className="flex h-full flex-col gap-3 p-4">
										<div className="flex items-start justify-between gap-2">
											<p className="font-medium leading-snug">{p.nombre}</p>
											<div className="flex shrink-0 gap-0.5 opacity-60 group-hover:opacity-100">
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													title="Editar"
													onClick={(e) => {
														e.stopPropagation();
														abrir(p.id);
													}}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													title="Eliminar"
													onClick={(e) => {
														e.stopPropagation();
														eliminar(p);
													}}
												>
													<Trash2 className="h-3.5 w-3.5 text-destructive" />
												</Button>
											</div>
										</div>
										{p.descripcion && (
											<p className="line-clamp-2 text-sm text-muted-foreground">{p.descripcion}</p>
										)}
										<div className="mt-auto flex flex-wrap items-center gap-1.5">
											<Badge variant="outline">
												{p.membrete === "RPU" ? "Membrete RPU" : "Legalistas"}
											</Badge>
											{!p.activa && <Badge variant="secondary">Inactiva</Badge>}
											<span className="ml-auto text-xs text-muted-foreground">
												{p._count.escritos} escrito{p._count.escritos === 1 ? "" : "s"} ·{" "}
												{fechaCorta(p.updatedAt)}
											</span>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</section>
				))
			)}

			{ConfirmationDialog}
		</div>
	);
}
