"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { leerNumero } from "@/components/caja/api";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLOSINGS_ENDPOINT } from "@/constant/api-endpoints";

// Finanzas → Aportes: an aporte loaded by hand (not from a closing): its amount,
// concept (Forense or Abogados), case and lawyer (Agustín or Julieta). Saving it
// leaves its payment in Gastos e Ingresos (backend: closings/aportes.service.ts).

export type Destino = "FORENSE" | "ABOGADOS";

/** What the dialog edits; without id it is a new one. */
export interface AporteManualForm {
	id?: number;
	titularId: number | null;
	/** YYYY-MM-DD */
	fecha: string;
	causa: string;
	responsable: string;
	/** Optional detail ("7 % Caja"); the backend saves "Aporte" when empty. */
	concepto: string;
	destino: Destino;
	monto: string;
}

export default function AporteManualDialog({
	aporte,
	personas,
	token,
	onClose,
	onSaved,
}: {
	aporte: AporteManualForm | null;
	personas: { id: number; name: string }[];
	token: string | undefined;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [form, setForm] = useState<AporteManualForm | null>(aporte);
	const [saving, setSaving] = useState(false);

	useEffect(() => setForm(aporte), [aporte]);

	const set = <K extends keyof AporteManualForm>(campo: K, valor: AporteManualForm[K]) =>
		setForm((f) => (f ? { ...f, [campo]: valor } : f));

	const guardar = async () => {
		if (!form) return;
		// Like the rest of Caja: comma or dot as decimal, no thousands separator.
		const monto = leerNumero(form.monto);
		if (!form.titularId) return void toast.error("Elegí el abogado");
		if (!form.fecha || !form.causa.trim()) return void toast.error("Completá la fecha y la causa");
		if (!Number.isFinite(monto) || monto <= 0) return void toast.error("Monto inválido");
		setSaving(true);
		try {
			const res = await fetch(`${CLOSINGS_ENDPOINT}/aportes/manuales${form.id ? `/${form.id}` : ""}`, {
				method: form.id ? "PUT" : "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					titularId: form.titularId,
					fecha: form.fecha,
					causa: form.causa,
					responsable: form.responsable || null,
					concepto: form.concepto || null,
					destino: form.destino,
					monto,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			toast.success(form.id ? "Aporte actualizado" : "Aporte cargado");
			onClose();
			onSaved();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={!!aporte} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{form?.id ? "Editar aporte" : "Cargar aporte"}</DialogTitle>
					<DialogDescription>
						Queda pendiente de pago en Gastos e Ingresos, como los aportes de los cierres.
					</DialogDescription>
				</DialogHeader>
				{form && (
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="aporte-abogado">Abogado</Label>
							<Select
								value={form.titularId ? String(form.titularId) : ""}
								onValueChange={(v) => set("titularId", Number(v))}
							>
								<SelectTrigger id="aporte-abogado" className="w-full">
									<SelectValue placeholder="Elegí" />
								</SelectTrigger>
								<SelectContent>
									{personas.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="aporte-concepto">Concepto</Label>
							<Select value={form.destino} onValueChange={(v) => set("destino", v as Destino)}>
								<SelectTrigger id="aporte-concepto" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="FORENSE">Caja Forense</SelectItem>
									<SelectItem value="ABOGADOS">Caja de Abogados</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="aporte-causa">Causa</Label>
							<Input
								id="aporte-causa"
								maxLength={191}
								value={form.causa}
								onChange={(e) => set("causa", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="aporte-monto">Monto</Label>
							<Input
								id="aporte-monto"
								inputMode="decimal"
								value={form.monto}
								onChange={(e) => set("monto", e.target.value.replace(/[^\d.,]/g, ""))}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="aporte-fecha">Fecha</Label>
							<Input
								id="aporte-fecha"
								type="date"
								value={form.fecha}
								onChange={(e) => set("fecha", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="aporte-responsable">Representante (opcional)</Label>
							<Input
								id="aporte-responsable"
								maxLength={191}
								value={form.responsable}
								onChange={(e) => set("responsable", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="aporte-detalle">Detalle (opcional)</Label>
							<Input
								id="aporte-detalle"
								maxLength={100}
								placeholder="7 % Caja"
								value={form.concepto}
								onChange={(e) => set("concepto", e.target.value)}
							/>
						</div>
					</div>
				)}
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
