"use client";

import { FileText, Loader2, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WHATSAPP_ENDPOINT } from "@/constant/api-endpoints";

// Template selector (stage 5): with the 24 h window closed WhatsApp only allows
// templates approved by Meta. They are created in Twilio (Content Template
// Builder); only the approved ones are listed.

interface Plantilla {
	sid: string;
	nombre: string;
	idioma: string;
	categoria: string | null;
	texto: string;
	variables: { key: string; ejemplo: string }[];
}

const PLACEHOLDER = /\{\{\s*(\d+)\s*\}\}/g;

export default function PlantillaForm<T>({
	contactId,
	telefono,
	onEnviado,
}: {
	/** Existing conversation; without it, the first message to `telefono`. */
	contactId?: number;
	telefono?: string;
	/** The saved outbound message (or, for a new number, { contactId, message }). */
	onEnviado: (resultado: T) => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [plantillas, setPlantillas] = useState<Plantilla[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [sid, setSid] = useState("");
	const [valores, setValores] = useState<Record<string, string>>({});
	const [enviando, setEnviando] = useState(false);

	useEffect(() => {
		if (!token) return;
		fetch(`${WHATSAPP_ENDPOINT}/templates`, { headers: { Authorization: `Bearer ${token}` } })
			.then(async (res) => {
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
				setPlantillas(body.data);
			})
			.catch((err) => {
				setError((err as Error).message);
				setPlantillas([]);
			});
	}, [token]);

	const elegida = plantillas?.find((p) => p.sid === sid) ?? null;
	const vista = useMemo(
		() => elegida?.texto.replace(PLACEHOLDER, (todo, key: string) => valores[key]?.trim() || todo) ?? "",
		[elegida, valores],
	);
	const completa =
		!!elegida && elegida.variables.every((v) => valores[v.key]?.trim()) && (!!contactId || !!telefono?.trim());

	const enviar = async () => {
		if (!elegida || !completa || enviando) return;
		setEnviando(true);
		try {
			const res = await fetch(
				contactId ? `${WHATSAPP_ENDPOINT}/conversations/${contactId}/template` : `${WHATSAPP_ENDPOINT}/conversations`,
				{
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ contentSid: elegida.sid, variables: valores, ...(contactId ? {} : { phone: telefono }) }),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			onEnviado(body.data as T);
			setSid("");
			setValores({});
			toast.success("Plantilla enviada");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setEnviando(false);
		}
	};

	return (
		<div className="space-y-3 border-t border-border p-3">
			<p className="text-xs text-muted-foreground">
				{contactId
					? "Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp solo deja escribirle con una plantilla aprobada por Meta."
					: "Para escribirle primero a un número, WhatsApp solo deja usar una plantilla aprobada por Meta."}
			</p>

			{plantillas === null ? (
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			) : error ? (
				<p className="text-sm text-destructive">{error}</p>
			) : plantillas.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Todavía no hay plantillas aprobadas. Cuando Marketing las cree en Twilio y Meta las apruebe, aparecen acá.
				</p>
			) : (
				<>
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

					{elegida && (
						<>
							<div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm">
								<FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
								<p className="whitespace-pre-wrap wrap-break-word text-foreground">{vista}</p>
							</div>
							{elegida.variables.length > 0 && (
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									{elegida.variables.map((v) => (
										<label key={v.key} className="space-y-1">
											<span className="text-xs text-muted-foreground">{`{{${v.key}}}`}</span>
											<Input
												value={valores[v.key] ?? ""}
												onChange={(e) => setValores((prev) => ({ ...prev, [v.key]: e.target.value }))}
												placeholder={v.ejemplo || `Valor de {{${v.key}}}`}
												maxLength={1000}
											/>
										</label>
									))}
								</div>
							)}
							<div className="flex justify-end">
								<Button onClick={enviar} disabled={!completa || enviando} className="gap-1.5">
									{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
									Enviar plantilla
								</Button>
							</div>
						</>
					)}
				</>
			)}
		</div>
	);
}
