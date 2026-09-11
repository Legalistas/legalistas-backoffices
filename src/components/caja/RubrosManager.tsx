"use client";

import { Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CAJA_RUBRO_TIPO_LABEL } from "@/constant/caja";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import type { CajaRubro, CajaRubroTipo } from "@/types/caja";
import { cajaFetch } from "./api";
import { useRubros } from "./useCajas";

const TIPOS = Object.keys(CAJA_RUBRO_TIPO_LABEL) as CajaRubroTipo[];

const TIPO_BADGE: Record<CajaRubroTipo, string> = {
	INGRESO: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
	EGRESO: "border-red-300 text-red-700 dark:text-red-400",
	AMBOS: "border-sky-300 text-sky-700 dark:text-sky-400",
};

/** Crear/editar rubro o sub-rubro. `parent` = se está creando un sub-rubro. */
type Edicion = { modo: "crear"; parent: CajaRubro | null } | { modo: "editar"; rubro: CajaRubro };

function RubroDialog({
	edicion,
	onClose,
	token,
	onSaved,
}: {
	edicion: Edicion | null;
	onClose: () => void;
	token: string | undefined;
	onSaved: () => void;
}) {
	const [nombre, setNombre] = useState("");
	const [tipo, setTipo] = useState<CajaRubroTipo>("EGRESO");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!edicion) return;
		if (edicion.modo === "editar") {
			setNombre(edicion.rubro.nombre);
			setTipo(edicion.rubro.tipo);
		} else {
			setNombre("");
			setTipo(edicion.parent?.tipo ?? "EGRESO");
		}
	}, [edicion]);

	const esSub = edicion?.modo === "crear" ? !!edicion.parent : edicion?.rubro.parentId != null;

	const guardar = async () => {
		if (!edicion || !nombre.trim()) {
			toast.error("El nombre es obligatorio");
			return;
		}
		setSaving(true);
		try {
			if (edicion.modo === "crear") {
				await cajaFetch("/rubros", token, {
					method: "POST",
					json: { nombre, tipo, parentId: edicion.parent?.id ?? null },
				});
			} else {
				await cajaFetch(`/rubros/${edicion.rubro.id}`, token, {
					method: "PUT",
					json: esSub ? { nombre } : { nombre, tipo },
				});
			}
			toast.success("Guardado");
			onClose();
			onSaved();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	const titulo =
		edicion?.modo === "editar"
			? `Editar ${esSub ? "sub-rubro" : "rubro"}`
			: edicion?.parent
				? `Nuevo sub-rubro de ${edicion.parent.nombre}`
				: "Nuevo rubro";

	return (
		<Dialog open={!!edicion} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{titulo}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="rubro-nombre">Nombre</Label>
						<Input
							id="rubro-nombre"
							value={nombre}
							onChange={(e) => setNombre(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && guardar()}
							autoFocus
						/>
					</div>
					{!esSub && (
						<div className="space-y-2">
							<Label>Se usa en</Label>
							<Select value={tipo} onValueChange={(v) => setTipo(v as CajaRubroTipo)}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TIPOS.map((t) => (
										<SelectItem key={t} value={t}>
											{CAJA_RUBRO_TIPO_LABEL[t]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Guardar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default function RubrosManager({ token }: { token: string | undefined }) {
	const { rubros, loading, reload } = useRubros(token, true, true);
	const [edicion, setEdicion] = useState<Edicion | null>(null);
	const { confirm, ConfirmationDialog } = useConfirm();

	const toggleActivo = async (r: CajaRubro) => {
		try {
			await cajaFetch(`/rubros/${r.id}`, token, { method: "PUT", json: { activo: !r.activo } });
			toast.success(r.activo ? "Desactivado: ya no aparece al cargar movimientos" : "Activado");
			reload();
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	const eliminar = async (r: CajaRubro) => {
		const ok = await confirm({
			title: `Eliminar "${r.nombre}"`,
			description:
				"Solo se puede eliminar si nunca se usó y no tiene sub-rubros. Si no, desactivalo.",
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			await cajaFetch(`/rubros/${r.id}`, token, { method: "DELETE" });
			toast.success("Eliminado");
			reload();
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	const Acciones = ({ r }: { r: CajaRubro }) => (
		<div className="flex shrink-0 items-center gap-1">
			{r.parentId === null && (
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					title="Agregar sub-rubro"
					onClick={() => setEdicion({ modo: "crear", parent: r })}
				>
					<Plus className="h-4 w-4" />
				</Button>
			)}
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8"
				title="Editar"
				onClick={() => setEdicion({ modo: "editar", rubro: r })}
			>
				<Pencil className="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8"
				title={r.activo ? "Desactivar" : "Activar"}
				onClick={() => toggleActivo(r)}
			>
				<Power className={cn("h-4 w-4", r.activo ? "text-emerald-600" : "text-muted-foreground")} />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 hover:text-red-600"
				title="Eliminar"
				onClick={() => eliminar(r)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between gap-4">
				<div className="space-y-1.5">
					<CardTitle className="text-base">Rubros y sub-rubros</CardTitle>
					<CardDescription>
						Los rubros activos aparecen al registrar un movimiento, filtrados por ingreso o egreso.
					</CardDescription>
				</div>
				<Button size="sm" onClick={() => setEdicion({ modo: "crear", parent: null })}>
					<Plus className="mr-1 h-4 w-4" />
					Nuevo rubro
				</Button>
			</CardHeader>
			<CardContent>
				{loading && rubros.length === 0 ? (
					<div className="space-y-2">
						{Array.from({ length: 5 }, (_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : rubros.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Todavía no hay rubros. Creá el primero.
					</p>
				) : (
					<ul className="divide-y rounded-md border">
						{rubros.map((r) => (
							<li key={r.id} className={cn(!r.activo && "opacity-60")}>
								<div className="flex items-center justify-between gap-3 px-4 py-2">
									<div className="flex min-w-0 items-center gap-2">
										<span className="truncate font-medium">{r.nombre}</span>
										<Badge variant="outline" className={TIPO_BADGE[r.tipo]}>
											{CAJA_RUBRO_TIPO_LABEL[r.tipo]}
										</Badge>
										{!r.activo && <Badge variant="secondary">Inactivo</Badge>}
									</div>
									<Acciones r={r} />
								</div>
								{r.subRubros && r.subRubros.length > 0 && (
									<ul className="pb-2">
										{r.subRubros.map((s) => (
											<li
												key={s.id}
												className={cn(
													"flex items-center justify-between gap-3 py-1 pl-10 pr-4 text-sm",
													!s.activo && "opacity-60",
												)}
											>
												<span className="flex items-center gap-2 text-muted-foreground">
													› {s.nombre}
													{!s.activo && <Badge variant="secondary">Inactivo</Badge>}
												</span>
												<Acciones r={s} />
											</li>
										))}
									</ul>
								)}
							</li>
						))}
					</ul>
				)}
			</CardContent>

			<RubroDialog
				edicion={edicion}
				onClose={() => setEdicion(null)}
				token={token}
				onSaved={reload}
			/>
			{ConfirmationDialog}
		</Card>
	);
}
