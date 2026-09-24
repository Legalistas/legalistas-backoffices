"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { USERS_ENDPOINT } from "@/constant/api-endpoints";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Baja de vendedora con redistribución de leads.
// KPIs de Ventas v1.1, punto 10.
//
// Reemplaza al "eliminar" para la gente de Ventas: borrar el usuario
// arrastraría todas sus oportunidades (FK con cascade) y con ellas los KPIs
// de cada mes en que trabajó. Acá la baja es lógica y las oportunidades
// abiertas cambian de dueña.

interface Candidate {
	id: number;
	name: string;
}

interface DeactivateSellerDialogProps {
	open: boolean;
	member: { id: number; name: string } | null;
	/** Posibles destinos: el resto del equipo de ventas. */
	candidates: Candidate[];
	onOpenChange: (open: boolean) => void;
	onDone: () => void;
}

type Mode = "single" | "roundRobin";

export default function DeactivateSellerDialog({
	open,
	member,
	candidates,
	onOpenChange,
	onDone,
}: DeactivateSellerDialogProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [openLeads, setOpenLeads] = useState<number | null>(null);
	const [totalLeads, setTotalLeads] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<Mode>("single");
	const [target, setTarget] = useState<string>("");
	// true = después de transferir, se borra el usuario.
	const [alsoDelete, setAlsoDelete] = useState(false);
	const [blockers, setBlockers] = useState<
		Array<{ tipo: string; cantidad: number }>
	>([]);

	const others = candidates.filter((c) => c.id !== member?.id);

	// Cuántas oportunidades hay que mover. Si son 0, no se pide destino.
	useEffect(() => {
		if (!open || !member || !token) return;
		let cancelled = false;
		setLoading(true);
		setOpenLeads(null);
		setTotalLeads(null);
		setTarget("");
		setMode("single");
		setAlsoDelete(false);
		setBlockers([]);

		(async () => {
			try {
				const res = await fetch(`${USERS_ENDPOINT}/${member.id}/open-leads`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error(String(res.status));
				const json = await res.json();
				if (!cancelled) {
					setOpenLeads(json.openLeads ?? 0);
					setTotalLeads(json.totalLeads ?? 0);
				}
			} catch {
				if (!cancelled) setOpenLeads(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [open, member, token]);

	// Con borrado siempre hace falta destino, aunque no tenga nada abierto:
	// hay que transferirle igual las cerradas, reuniones, notas e historial.
	const needsTarget = (openLeads ?? 0) > 0 || alsoDelete;
	const canSubmit =
		!loading &&
		!saving &&
		(!needsTarget || (mode === "roundRobin" ? others.length > 0 : !!target));

	const handleConfirm = useCallback(async () => {
		if (!member || !token) return;
		setSaving(true);
		try {
			const body: Record<string, unknown> = {};
			if (needsTarget || alsoDelete) {
				if (mode === "roundRobin") {
					body.distributeAmong = others.map((o) => o.id);
				} else {
					body.reassignTo = Number(target);
				}
			}
			if (alsoDelete) body.deleteAfterTransfer = true;

			const res = await fetch(`${USERS_ENDPOINT}/${member.id}/deactivate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});
			const json = await res.json().catch(() => ({}));

			// 409 con `blockers` = tiene datos que no se transfieren solos
			// (causas, caja, tareas). Se listan en vez de fallar a ciegas.
			if (res.status === 409 && Array.isArray(json.blockers)) {
				setBlockers(json.blockers);
				setAlsoDelete(false);
				return;
			}
			if (!res.ok) throw new Error(json.message || json.error || "Error");

			toast.success(json.message || `${member.name} dado/a de baja`);
			onOpenChange(false);
			onDone();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al dar de baja");
		} finally {
			setSaving(false);
		}
	}, [
		member,
		token,
		needsTarget,
		alsoDelete,
		mode,
		others,
		target,
		onOpenChange,
		onDone,
	]);

	return (
		<Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Dar de baja a {member?.name}</DialogTitle>
					<DialogDescription>
						{alsoDelete
							? "Se transfiere todo su rastro de ventas a otra persona y después se elimina el usuario. Los totales de meses pasados no cambian."
							: "Por defecto el usuario no se elimina: se bloquea y sus métricas históricas se conservan. Solo cambian de dueña las oportunidades abiertas."}
					</DialogDescription>
				</DialogHeader>

				{loading ? (
					<div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Revisando sus oportunidades…
					</div>
				) : (
					<div className="space-y-4">
						<div className="rounded-md border border-border p-3 text-sm">
							<p>
								<span className="font-semibold">{openLeads ?? "—"}</span>{" "}
								oportunidad(es) abierta(s) a reasignar.
							</p>
							<p className="text-muted-foreground text-xs mt-1">
								De un total de {totalLeads ?? "—"}. Las ganadas y perdidas no se
								tocan: quedan atribuidas a {member?.name} para que los meses
								históricos sigan cuadrando.
							</p>
						</div>

						{needsTarget && others.length === 0 && (
							<div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
								<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
								<span>
									No hay otras personas activas a quienes reasignar. Habilitá
									al menos una antes de dar de baja.
								</span>
							</div>
						)}

						{needsTarget && others.length > 0 && (
							<div className="space-y-3">
								<Label>¿A quién pasan las oportunidades?</Label>
								<RadioGroup
									value={mode}
									onValueChange={(v) => setMode(v as Mode)}
									className="gap-2"
								>
									<Label
										htmlFor="mode-single"
										className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
									>
										<RadioGroupItem
											id="mode-single"
											value="single"
											className="mt-0.5"
										/>
										<span className="text-sm font-normal">
											Todas a una sola persona
										</span>
									</Label>
									<Label
										htmlFor="mode-rr"
										className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
									>
										<RadioGroupItem
											id="mode-rr"
											value="roundRobin"
											className="mt-0.5"
										/>
										<span className="text-sm font-normal">
											Repartidas entre el equipo ({others.length} personas)
										</span>
									</Label>
								</RadioGroup>

								{mode === "single" && (
									<Select value={target} onValueChange={setTarget}>
										<SelectTrigger>
											<SelectValue placeholder="Seleccionar destino" />
										</SelectTrigger>
										<SelectContent>
											{others.map((o) => (
												<SelectItem key={o.id} value={String(o.id)}>
													{o.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>
						)}

						{/* Borrado físico. Solo es seguro porque antes se transfiere
						    TODO su rastro (leads cerrados incluidos, reuniones,
						    notas e historial). Si algo queda apuntándola, el
						    cascade lo destruye — por eso el backend valida antes. */}
						{others.length > 0 && (
							// El Checkbox de Radix es un <button>, no un input: si el
							// <label> lo envuelve Y le apunta con htmlFor, el click se
							// dispara dos veces y se destilda solo. Por eso el label va
							// al lado, no alrededor.
							<div className="flex items-start gap-3 rounded-md border border-border p-3">
								<Checkbox
									id="also-delete"
									checked={alsoDelete}
									onCheckedChange={(v) => {
										setAlsoDelete(v === true);
										setBlockers([]);
									}}
									className="mt-0.5"
								/>
								<Label
									htmlFor="also-delete"
									className="text-sm font-normal cursor-pointer block"
								>
									<span className="font-medium">
										Eliminar el usuario de la base
									</span>
									<span className="block text-xs text-muted-foreground mt-0.5 font-normal">
										Se transfiere TODO lo que en la base apunte a esta
										persona —oportunidades, reuniones, causas, expedientes,
										caja, tareas, cierres, notas e historial— y después se
										borra el registro. Sus datos personales (legajo, sueldos,
										licencias, sesiones) se eliminan con ella. Es
										irreversible.
									</span>
								</Label>
							</div>
						)}

						{/* Solo aplica a la baja lógica. Con "eliminar de la base"
						    no hay bloqueadores: se transfiere todo antes de borrar. */}
						{!alsoDelete && blockers.length > 0 && (
							<div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
								<div className="flex gap-2">
									<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
									<div>
										<p className="font-medium">No se puede eliminar todavía</p>
										<p className="text-xs mt-1">
											Está referenciada en registros sin destino automático.
											Borrarla los eliminaría:
										</p>
										<ul className="text-xs mt-1.5 list-disc pl-4">
											{blockers.map((b) => (
												<li key={b.tipo}>
													{b.cantidad} {b.tipo}
												</li>
											))}
										</ul>
										<p className="text-xs mt-1.5">
											Resolvelos primero, o dejá la baja sin eliminar.
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={saving}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={!canSubmit}
						variant={alsoDelete ? "destructive" : "default"}
					>
						{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						{alsoDelete ? "Transferir y eliminar" : "Dar de baja"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
