"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Autocomplete } from "@/components/shared/Autocomplete";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USERS_ENDPOINT } from "@/constant/api-endpoints";
import { isInternalTeamMember } from "@/constant/team";
import type { User } from "@/types/users";
import { cajaFetch } from "./api";

interface NuevaCajaMonotributoDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	/** Dueños que ya tienen caja de monotributo (no se ofrecen). */
	dueniosActuales: number[];
	onSaved: () => void;
}

/**
 * Alta de una caja de monotributo para alguien del equipo (mismo criterio
 * que la página Equipo: roles internos y no dado de baja). La persona la ve
 * en su dashboard y puede cargar ingresos y egresos.
 */
export default function NuevaCajaMonotributoDialog({
	open,
	onOpenChange,
	token,
	dueniosActuales,
	onSaved,
}: NuevaCajaMonotributoDialogProps) {
	const [equipo, setEquipo] = useState<User[]>([]);
	const [loadingEquipo, setLoadingEquipo] = useState(false);
	const [userId, setUserId] = useState<number | null>(null);
	const [nombre, setNombre] = useState("");
	const [nombreEditado, setNombreEditado] = useState(false);
	const [saldoInicial, setSaldoInicial] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setUserId(null);
		setNombre("");
		setNombreEditado(false);
		setSaldoInicial("");
		if (!token) return;
		setLoadingEquipo(true);
		fetch(`${USERS_ENDPOINT}?page=1&limit=1000`, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		})
			.then((r) => r.json())
			.then((r) => setEquipo((r.data ?? []) as User[]))
			.catch(() => toast.error("No se pudo cargar el equipo"))
			.finally(() => setLoadingEquipo(false));
	}, [open, token]);

	const opciones = useMemo(
		() =>
			equipo
				.filter((u) => isInternalTeamMember(u) && !u.isBlocked && !dueniosActuales.includes(u.id))
				.sort((a, b) => a.name.localeCompare(b.name)),
		[equipo, dueniosActuales],
	);

	const elegir = (id: number | null) => {
		setUserId(id);
		const user = opciones.find((u) => u.id === id);
		if (user && !nombreEditado) setNombre(`Monotributo ${user.name.split(" ")[0]}`);
	};

	const guardar = async () => {
		const saldo = Number(saldoInicial.replace(",", ".") || 0);
		if (!userId || !nombre.trim()) {
			toast.error("Elegí a la persona y el nombre de la caja");
			return;
		}
		if (!Number.isFinite(saldo)) {
			toast.error("Saldo inicial inválido");
			return;
		}
		setSaving(true);
		try {
			await cajaFetch("/cajas", token, {
				method: "POST",
				json: { nombre, grupo: "MONOTRIBUTO", ownerUserId: userId, saldoInicial: saldo },
			});
			toast.success(`Caja "${nombre}" creada`);
			onOpenChange(false);
			onSaved();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Nueva caja monotributo</DialogTitle>
					<DialogDescription>
						La persona elegida la va a ver en su dashboard y podrá cargar ingresos y egresos. Nadie
						más del equipo la ve, salvo los roles con acceso total a la Caja.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="mono-usuario">Persona del equipo</Label>
						{loadingEquipo ? (
							<div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" /> Cargando equipo…
							</div>
						) : (
							<Autocomplete
								id="mono-usuario"
								options={opciones}
								value={userId}
								onSelect={elegir}
								placeholder="Buscar por nombre…"
							/>
						)}
						<p className="text-xs text-muted-foreground">
							No aparecen quienes ya tienen caja de monotributo.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="mono-nombre">Nombre de la caja</Label>
						<Input
							id="mono-nombre"
							value={nombre}
							onChange={(e) => {
								setNombre(e.target.value);
								setNombreEditado(true);
							}}
							placeholder="Monotributo …"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="mono-saldo">Saldo inicial</Label>
						<Input
							id="mono-saldo"
							inputMode="decimal"
							placeholder="0,00"
							value={saldoInicial}
							onChange={(e) => setSaldoInicial(e.target.value.replace(/[^\d.,-]/g, ""))}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={saving || !userId}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Crear caja
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
