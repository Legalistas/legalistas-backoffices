"use client";

import { ArrowLeft, FilePlus2, Loader2, Pencil, Save, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EscritoEditor } from "@/components/escritos/EscritoEditor";
import { MEMBRETE_OPCIONES } from "@/components/escritos/Membrete";
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
import { Switch } from "@/components/ui/switch";
import {
	ESCRITOS_PLANTILLA_ENDPOINT,
	ESCRITOS_PLANTILLAS_ENDPOINT,
	ESCRITOS_VARIABLES_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import { escritosFetch } from "@/lib/escritos-api";
import type {
	MembreteEscrito,
	Plantilla,
	PlantillaListItem,
	VariableEscrito,
} from "@/types/escritos";

// Plantillas estándar reutilizables (acompaña cédula, sorteo de perito, anexos,
// pronto despacho…). Salen con el diseño Legalistas, salvo las de membrete RPU
// (encabezado del Poder Judicial). Acá se edita el texto, las variables y el
// membrete; no el resto del aspecto.

interface Borrador {
	id: number | null;
	nombre: string;
	categoria: string;
	descripcion: string;
	activa: boolean;
	contenidoHtml: string;
	membrete: MembreteEscrito;
}

const NUEVA: Borrador = {
	id: null,
	nombre: "",
	categoria: "",
	descripcion: "",
	activa: true,
	contenidoHtml: "<p></p>",
	membrete: "LEGALISTAS",
};

export default function PlantillasEscritosPage() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const { confirm, ConfirmationDialog } = useConfirm();

	const [plantillas, setPlantillas] = useState<PlantillaListItem[]>([]);
	const [variables, setVariables] = useState<VariableEscrito[]>([]);
	const [loading, setLoading] = useState(true);
	const [editando, setEditando] = useState<Borrador | null>(null);
	const [guardando, setGuardando] = useState(false);

	const cargar = useCallback(async () => {
		if (!token) return;
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
			toast.error((e as Error).message);
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
				id: data.id,
				nombre: data.nombre,
				categoria: data.categoria ?? "",
				descripcion: data.descripcion ?? "",
				activa: data.activa,
				contenidoHtml: data.contenidoHtml,
				membrete: data.membrete ?? "LEGALISTAS",
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
			const body = JSON.stringify({
				nombre: editando.nombre,
				categoria: editando.categoria,
				descripcion: editando.descripcion,
				activa: editando.activa,
				contenidoHtml: editando.contenidoHtml,
				membrete: editando.membrete,
			});
			await escritosFetch(
				editando.id ? ESCRITOS_PLANTILLA_ENDPOINT(editando.id) : ESCRITOS_PLANTILLAS_ENDPOINT,
				token,
				{ method: editando.id ? "PUT" : "POST", body },
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
		const map = new Map<string, PlantillaListItem[]>();
		for (const p of plantillas) {
			const cat = p.categoria || "Sin categoría";
			map.set(cat, [...(map.get(cat) ?? []), p]);
		}
		return [...map.entries()];
	}, [plantillas]);

	if (editando) {
		const set = (patch: Partial<Borrador>) => setEditando((b) => (b ? { ...b, ...patch } : b));
		return (
			<div className="mx-auto max-w-screen-lg space-y-4 p-6">
				<div className="flex items-center justify-between gap-2">
					<Button variant="ghost" size="sm" onClick={() => setEditando(null)}>
						<ArrowLeft className="mr-1 h-4 w-4" /> Plantillas
					</Button>
					<Button size="sm" onClick={guardar} disabled={guardando}>
						{guardando ? (
							<Loader2 className="mr-1 h-4 w-4 animate-spin" />
						) : (
							<Save className="mr-1 h-4 w-4" />
						)}
						Guardar plantilla
					</Button>
				</div>

				<div className="grid gap-3 md:grid-cols-2">
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
							placeholder="Ej: Notificaciones, Prueba…"
							maxLength={80}
						/>
					</div>
					<div className="space-y-1.5 md:col-span-2">
						<Label htmlFor="pl-desc">Descripción</Label>
						<Input
							id="pl-desc"
							value={editando.descripcion}
							onChange={(e) => set({ descripcion: e.target.value })}
							maxLength={255}
						/>
					</div>
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
					<label className="flex items-center gap-2 text-sm">
						<Switch
							checked={editando.activa}
							onCheckedChange={(v) => set({ activa: v })}
						/>
						Activa (se puede elegir al crear un escrito)
					</label>
				</div>

				<EscritoEditor
					value={editando.contenidoHtml}
					onChange={(html) => set({ contenidoHtml: html })}
					variables={variables}
					formato={{ membrete: editando.membrete }}
				/>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-screen-lg space-y-4 p-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h1 className="text-xl font-semibold">Plantillas de escritos</h1>
					<p className="text-sm text-muted-foreground">
						Se generan con el diseño Legalistas o, si la plantilla lo indica, con el
						membrete RPU del Poder Judicial. Las variables
						({"{{CARATULA}}"}, {"{{CUIJ}}"}…) se completan con el expediente del
						escrito.
					</p>
				</div>
				<Button size="sm" onClick={() => setEditando({ ...NUEVA })}>
					<FilePlus2 className="mr-1 h-4 w-4" />
					Nueva plantilla
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center py-10">
					<Loader2 className="h-5 w-5 animate-spin" />
				</div>
			) : plantillas.length === 0 ? (
				<div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
					No hay plantillas cargadas.
				</div>
			) : (
				porCategoria.map(([cat, items]) => (
					<section key={cat} className="rounded-md border">
						<div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">{cat}</div>
						<ul className="divide-y">
							{items.map((p) => (
								<li key={p.id} className="flex items-center gap-3 px-4 py-2">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => abrir(p.id)}
												className="truncate text-sm font-medium hover:underline"
											>
												{p.nombre}
											</button>
											{!p.activa && <Badge variant="secondary">Inactiva</Badge>}
											{p.membrete === "RPU" && <Badge variant="outline">RPU</Badge>}
										</div>
										<div className="truncate text-xs text-muted-foreground">
											{p.descripcion || "—"} · {p._count.escritos} escrito
											{p._count.escritos === 1 ? "" : "s"}
										</div>
									</div>
									<Button variant="ghost" size="sm" title="Editar" onClick={() => abrir(p.id)}>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										title="Eliminar"
										onClick={() => eliminar(p)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</li>
							))}
						</ul>
					</section>
				))
			)}

			{ConfirmationDialog}
		</div>
	);
}
