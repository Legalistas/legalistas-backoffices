"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { NEGOTIATION_ABOGADOS_CONTRAPARTE_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";
import type { AbogadoContraparte } from "@/types/negotiations";

// Abogado de la contraparte en una negociación (relevamiento 13): se elige de
// una lista reutilizable (nombre, estudio/ART, teléfono, mail), así se puede
// filtrar por él y mandarle mails desde la negociación.

const SIN_ABOGADO = "none";

interface Props {
	value: number | null;
	onChange: (abogado: AbogadoContraparte | null) => void;
	disabled?: boolean;
}

export default function AbogadoContraparteSelect({ value, onChange, disabled }: Props) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [abogados, setAbogados] = useState<AbogadoContraparte[]>([]);
	const [cargando, setCargando] = useState(false);
	const [editando, setEditando] = useState<AbogadoContraparte | "nuevo" | null>(null);

	const cargar = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		try {
			const res = await fetch(NEGOTIATION_ABOGADOS_CONTRAPARTE_ENDPOINT, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudieron cargar los abogados"));
			setAbogados((await res.json()).data ?? []);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudieron cargar los abogados");
		} finally {
			setCargando(false);
		}
	}, [token]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const seleccionado = abogados.find((a) => a.id === value) ?? null;

	return (
		<div className="space-y-1.5">
			<div className="flex gap-2">
				<Select
					value={value ? String(value) : SIN_ABOGADO}
					onValueChange={(v) =>
						onChange(v === SIN_ABOGADO ? null : (abogados.find((a) => String(a.id) === v) ?? null))
					}
					disabled={disabled || cargando}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder={cargando ? "Cargando…" : "Elegí un abogado"} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={SIN_ABOGADO}>Sin abogado contraparte</SelectItem>
						{abogados.map((a) => (
							<SelectItem key={a.id} value={String(a.id)}>
								{a.nombre}
								{a.estudio ? <span className="text-muted-foreground"> — {a.estudio}</span> : null}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{seleccionado && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						title="Editar datos del abogado"
						onClick={() => setEditando(seleccionado)}
						disabled={disabled}
					>
						<Pencil className="h-4 w-4" />
					</Button>
				)}
				<Button
					type="button"
					variant="outline"
					size="icon"
					title="Nuevo abogado contraparte"
					onClick={() => setEditando("nuevo")}
					disabled={disabled}
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
			{seleccionado && (seleccionado.email || seleccionado.telefono) && (
				<p className="text-xs text-muted-foreground">
					{[seleccionado.email, seleccionado.telefono].filter(Boolean).join(" · ")}
				</p>
			)}
			{seleccionado && !seleccionado.email && (
				<p className="text-xs text-amber-600">Sin mail cargado: no se le pueden mandar mails.</p>
			)}

			<AbogadoContraparteDialog
				abierto={editando !== null}
				abogado={editando === "nuevo" ? null : editando}
				onCerrar={() => setEditando(null)}
				onGuardado={async (a) => {
					setEditando(null);
					await cargar();
					onChange(a);
				}}
			/>
		</div>
	);
}

interface DialogProps {
	abierto: boolean;
	/** null = alta. */
	abogado: AbogadoContraparte | null;
	onCerrar: () => void;
	onGuardado: (abogado: AbogadoContraparte) => void;
}

export function AbogadoContraparteDialog({ abierto, abogado, onCerrar, onGuardado }: DialogProps) {
	const { data: session } = useSession();
	const [form, setForm] = useState({ nombre: "", estudio: "", telefono: "", email: "" });
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (abierto) {
			setForm({
				nombre: abogado?.nombre ?? "",
				estudio: abogado?.estudio ?? "",
				telefono: abogado?.telefono ?? "",
				email: abogado?.email ?? "",
			});
		}
	}, [abierto, abogado]);

	const guardar = async () => {
		if (form.nombre.trim().length < 2) {
			toast.error("Ingresá el nombre");
			return;
		}
		setGuardando(true);
		try {
			const res = await fetch(
				abogado
					? `${NEGOTIATION_ABOGADOS_CONTRAPARTE_ENDPOINT}/${abogado.id}`
					: NEGOTIATION_ABOGADOS_CONTRAPARTE_ENDPOINT,
				{
					method: abogado ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify(form),
				},
			);
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo guardar el abogado"));
			toast.success(abogado ? "Abogado actualizado" : "Abogado contraparte creado");
			onGuardado((await res.json()).data);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudo guardar el abogado");
		} finally {
			setGuardando(false);
		}
	};

	const campo = (id: keyof typeof form, label: string, placeholder: string, type = "text") => (
		<div className="space-y-1.5">
			<Label htmlFor={`abogado-${id}`}>{label}</Label>
			<Input
				id={`abogado-${id}`}
				type={type}
				value={form[id]}
				placeholder={placeholder}
				onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
				disabled={guardando}
			/>
		</div>
	);

	return (
		<Dialog open={abierto} onOpenChange={(v) => !v && !guardando && onCerrar()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{abogado ? "Editar abogado contraparte" : "Nuevo abogado contraparte"}</DialogTitle>
					<DialogDescription>
						Se usa en todas las negociaciones donde participa. El mail es al que se
						mandan los mails de la negociación.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-1">
					{campo("nombre", "Nombre y apellido *", "Ej.: Pascual Andrea")}
					{campo("estudio", "Estudio o ART", "Ej.: Asociart ART")}
					{campo("telefono", "Teléfono", "Ej.: 3492 123456")}
					{campo("email", "Mail", "abogado@estudio.com", "email")}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onCerrar} disabled={guardando}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={guardando}>
						{guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Guardar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
