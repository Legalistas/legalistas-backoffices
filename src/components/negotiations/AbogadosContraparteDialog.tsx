"use client";

import { Loader2, Merge, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NEGOTIATION_ABOGADOS_CONTRAPARTE_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";
import type { AbogadoContraparte } from "@/types/negotiations";

// Editing the opposing lawyers list (Legales, 11/11/2026): rename (their
// negotiations follow), deactivate (no longer offered for new negotiations)
// and merge duplicates (the negotiations move to the one that stays).

export default function AbogadosContraparteDialog({
	open,
	onClose,
}: {
	open: boolean;
	/** `cambio`: something changed, the negotiations must be reloaded. */
	onClose: (cambio: boolean) => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [abogados, setAbogados] = useState<AbogadoContraparte[]>([]);
	const [nombres, setNombres] = useState<Record<number, string>>({});
	const [cargando, setCargando] = useState(false);
	const [ocupado, setOcupado] = useState<number | null>(null);
	const [cambio, setCambio] = useState(false);

	const cargar = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		try {
			const res = await fetch(`${NEGOTIATION_ABOGADOS_CONTRAPARTE_ENDPOINT}?incluirInactivos=true`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudieron cargar los abogados"));
			const data: AbogadoContraparte[] = (await res.json()).data ?? [];
			setAbogados(data);
			setNombres(Object.fromEntries(data.map((a) => [a.id, a.nombre])));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudieron cargar los abogados");
		} finally {
			setCargando(false);
		}
	}, [token]);

	useEffect(() => {
		if (open) {
			setCambio(false);
			cargar();
		}
	}, [open, cargar]);

	const enviar = async (a: AbogadoContraparte, path: string, method: string, body: object, ok: string) => {
		setOcupado(a.id);
		try {
			const res = await fetch(`${NEGOTIATION_ABOGADOS_CONTRAPARTE_ENDPOINT}/${a.id}${path}`, {
				method,
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo guardar"));
			toast.success(ok);
			setCambio(true);
			await cargar();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudo guardar");
		} finally {
			setOcupado(null);
		}
	};

	const fusionar = (a: AbogadoContraparte, destinoId: string) => {
		const destino = abogados.find((d) => String(d.id) === destinoId);
		if (!destino) return;
		const n = a._count?.negotiations ?? 0;
		if (
			!window.confirm(
				`¿Fusionar "${a.nombre}" en "${destino.nombre}"? ${
					n ? `Sus ${n} negociación${n === 1 ? "" : "es"} pasan a "${destino.nombre}" y ` : ""
				}"${a.nombre}" se borra del listado.`,
			)
		)
			return;
		enviar(a, "/fusionar", "POST", { destinoId: destino.id }, `"${a.nombre}" quedó dentro de "${destino.nombre}"`);
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose(cambio)}>
			<DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Abogados contraparte</DialogTitle>
					<DialogDescription>
						Corregí nombres, desactivá los que no van (no se ofrecen más en negociaciones nuevas) y fusioná los
						repetidos: sus negociaciones pasan al que queda.
					</DialogDescription>
				</DialogHeader>

				{cargando && !abogados.length ? (
					<div className="flex justify-center py-10">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="min-h-0 flex-1 overflow-y-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border text-xs text-muted-foreground">
									<th className="py-2 pr-2 text-left font-medium">Nombre</th>
									<th className="px-2 py-2 text-right font-medium">Negoc.</th>
									<th className="px-2 py-2 text-center font-medium">Activo</th>
									<th className="py-2 pl-2 text-left font-medium">Fusionar en…</th>
								</tr>
							</thead>
							<tbody>
								{abogados.map((a) => {
									const nombre = nombres[a.id] ?? a.nombre;
									const cambiado = nombre.trim() !== a.nombre && nombre.trim().length >= 2;
									return (
										<tr key={a.id} className="border-b border-border/60 last:border-0">
											<td className="py-2 pr-2">
												<div className="flex items-center gap-1.5">
													<Input
														value={nombre}
														onChange={(e) => setNombres((p) => ({ ...p, [a.id]: e.target.value }))}
														aria-label={`Nombre de ${a.nombre}`}
														className="h-8"
														disabled={ocupado !== null}
													/>
													{cambiado && (
														<Button
															size="icon"
															variant="outline"
															className="h-8 w-8 shrink-0"
															title="Guardar nombre"
															disabled={ocupado !== null}
															onClick={() =>
																enviar(a, "", "PUT", { nombre: nombre.trim() }, "Nombre actualizado")
															}
														>
															{ocupado === a.id ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<Save className="h-4 w-4" />
															)}
														</Button>
													)}
												</div>
											</td>
											<td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
												{a._count?.negotiations ?? 0}
											</td>
											<td className="px-2 py-2 text-center">
												<Switch
													checked={a.activo !== false}
													disabled={ocupado !== null}
													aria-label={`${a.nombre} activo`}
													onCheckedChange={(v) =>
														enviar(a, "", "PUT", { activo: v }, v ? "Activado" : "Desactivado")
													}
												/>
											</td>
											<td className="py-2 pl-2">
												<Select value="" onValueChange={(v) => fusionar(a, v)} disabled={ocupado !== null}>
													<SelectTrigger className="h-8 w-48" aria-label={`Fusionar ${a.nombre} en otro`}>
														<Merge className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
														<SelectValue placeholder="Elegí…" />
													</SelectTrigger>
													<SelectContent>
														{abogados
															.filter((d) => d.id !== a.id)
															.map((d) => (
																<SelectItem key={d.id} value={String(d.id)}>
																	{d.nombre}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
