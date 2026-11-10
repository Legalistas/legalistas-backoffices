"use client";

import { FileText, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/hooks/useConfirm";
import { type Contacto, useWhatsappApi } from "./agendas-api";

// "Enviar campaña": an approved template to every contact of an agenda. Each
// {{n}} of the template can mix fixed text with {nombre} and {vendedor}.

interface Plantilla {
	sid: string;
	nombre: string;
	categoria: string | null;
	texto: string;
	variables: { key: string; ejemplo: string }[];
}

const PLACEHOLDER = /\{\{\s*(\d+)\s*\}\}/g;
const TOKENS = [
	{ token: "{nombre}", label: "Nombre" },
	{ token: "{vendedor}", label: "Vendedor" },
];

/** Seller first name, as the backend fills {vendedor} (crm-whatsapp.ts nombreVendedor). */
const nombreVendedor = (nombre: string | null) => {
	const partes = nombre?.trim().split(/\s+/).filter(Boolean) ?? [];
	if (!partes.length || /^legalistas$/i.test(partes[0])) return "parte del equipo";
	return partes[1] ?? partes[0];
};

export default function CampanaDialog({
	open,
	onOpenChange,
	agenda,
	ejemplo,
	onLanzada,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** null id = the main agenda. */
	agenda: { id: number | null; nombre: string; contactos: number };
	/** First contact of the agenda, for the preview. */
	ejemplo: Contacto | null;
	onLanzada: (campanaId: number) => void;
}) {
	const { api, listo } = useWhatsappApi();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [plantillas, setPlantillas] = useState<Plantilla[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [nombre, setNombre] = useState("");
	const [sid, setSid] = useState("");
	const [valores, setValores] = useState<Record<string, string>>({});
	const [enviando, setEnviando] = useState(false);

	useEffect(() => {
		if (!open || !listo) return;
		setNombre(`${agenda.nombre} · ${new Date().toLocaleDateString("es-AR")}`);
		setSid("");
		setValores({});
		api<Plantilla[]>("/templates")
			.then(setPlantillas)
			.catch((err) => {
				setError((err as Error).message);
				setPlantillas([]);
			});
	}, [open, listo, api, agenda.nombre]);

	const elegida = plantillas?.find((p) => p.sid === sid) ?? null;
	const vista = useMemo(() => {
		if (!elegida) return "";
		const datos = { nombre: ejemplo?.nombre ?? "Juan Pérez", vendedor: nombreVendedor(ejemplo?.vendedor ?? null) };
		return elegida.texto.replace(PLACEHOLDER, (todo, key: string) => {
			const v = (valores[key] ?? "")
				.replace(/\{nombre\}/g, () => datos.nombre)
				.replace(/\{vendedor\}/g, () => datos.vendedor)
				.trim();
			return v || todo;
		});
	}, [elegida, valores, ejemplo]);
	const completa = !!elegida && !!nombre.trim() && elegida.variables.every((v) => valores[v.key]?.trim());

	const lanzar = async () => {
		if (!elegida || !completa || enviando) return;
		const ok = await confirm({
			title: "Enviar campaña",
			description: `Se manda la plantilla "${elegida.nombre}" a ${agenda.contactos} contacto${agenda.contactos === 1 ? "" : "s"} de "${agenda.nombre}". Cada mensaje tiene costo en Twilio y no se puede deshacer.`,
			confirmLabel: "Enviar",
		});
		if (!ok) return;
		setEnviando(true);
		try {
			const r = await api<{ id: number; destinatarios: number }>("/campanas", {
				method: "POST",
				body: JSON.stringify({ nombre: nombre.trim(), agendaId: agenda.id, contentSid: elegida.sid, variables: valores }),
			});
			toast.success(`Campaña en marcha: ${r.destinatarios} mensajes`);
			onOpenChange(false);
			onLanzada(r.id);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setEnviando(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Enviar campaña</DialogTitle>
					<DialogDescription>
						A {agenda.contactos} contacto{agenda.contactos === 1 ? "" : "s"} de "{agenda.nombre}". Solo se pueden
						usar plantillas aprobadas por Meta; los que pidieron la BAJA se saltean.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="campana-nombre">Nombre de la campaña</Label>
						<Input id="campana-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} />
					</div>

					{plantillas === null ? (
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					) : error ? (
						<p className="text-sm text-destructive">{error}</p>
					) : plantillas.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Todavía no hay plantillas aprobadas. Cuando Marketing las cree en Twilio y Meta las apruebe, aparecen acá.
						</p>
					) : (
						<div className="space-y-1.5">
							<Label>Plantilla</Label>
							<Select
								value={sid}
								onValueChange={(v) => {
									setSid(v);
									setValores({});
								}}
							>
								<SelectTrigger className="w-full" aria-label="Plantilla">
									<SelectValue placeholder="Elegí una plantilla" />
								</SelectTrigger>
								<SelectContent>
									{plantillas.map((p) => (
										<SelectItem key={p.sid} value={p.sid}>
											{p.nombre}
											{p.categoria ? ` · ${p.categoria.toLowerCase()}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{elegida && (
						<>
							{elegida.variables.map((v) => (
								<div key={v.key} className="space-y-1.5">
									<div className="flex items-center justify-between gap-2">
										<Label htmlFor={`var-${v.key}`}>{`{{${v.key}}}`}</Label>
										<div className="flex gap-1">
											{TOKENS.map((t) => (
												<Button
													key={t.token}
													type="button"
													variant="outline"
													size="sm"
													className="h-6 px-2 text-xs"
													onClick={() => setValores((prev) => ({ ...prev, [v.key]: `${prev[v.key] ?? ""}${t.token}` }))}
												>
													+ {t.label}
												</Button>
											))}
										</div>
									</div>
									<Input
										id={`var-${v.key}`}
										value={valores[v.key] ?? ""}
										onChange={(e) => setValores((prev) => ({ ...prev, [v.key]: e.target.value }))}
										placeholder={v.ejemplo || `Valor de {{${v.key}}}`}
										maxLength={1000}
									/>
								</div>
							))}
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">
									Así le llega a {ejemplo?.nombre ?? "un contacto"}:
								</p>
								<div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm">
									<FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
									<p className="whitespace-pre-wrap wrap-break-word text-foreground">{vista}</p>
								</div>
							</div>
						</>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
						Cancelar
					</Button>
					<Button onClick={lanzar} disabled={!completa || enviando || agenda.contactos === 0} className="gap-1.5">
						{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						Enviar a {agenda.contactos}
					</Button>
				</DialogFooter>
				{ConfirmationDialog}
			</DialogContent>
		</Dialog>
	);
}
