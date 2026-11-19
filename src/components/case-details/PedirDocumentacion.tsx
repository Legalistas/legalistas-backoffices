"use client";

import { FileQuestion, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CASES_ENDPOINT } from "@/constant/api-endpoints";

// "Documentación — Pendiente" (Legales, 19/11/2026): the lawyer writes what is
// missing and the client gets it by WhatsApp (template documentacion_pendiente,
// backend whatsapp/legales-whatsapp.ts). It stays in the case timeline.

export function PedirDocumentacion({ caseId }: { caseId: number }) {
	const { data: session } = useSession();
	const [abierto, setAbierto] = useState(false);
	const [faltante, setFaltante] = useState("");
	const [enviando, setEnviando] = useState(false);

	const enviar = async () => {
		if (faltante.trim().length < 3) return void toast.error("Escribí qué documentación falta");
		setEnviando(true);
		try {
			const res = await fetch(`${CASES_ENDPOINT}/${caseId}/whatsapp/documentacion-pendiente`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ faltante }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			if (body.enviado) {
				toast.success("Le pedimos la documentación por WhatsApp");
				setFaltante("");
				setAbierto(false);
			} else {
				toast.error(`No se envió: ${body.motivo ?? "motivo desconocido"}`);
			}
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setEnviando(false);
		}
	};

	return (
		<>
			<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAbierto(true)}>
				<FileQuestion className="h-3.5 w-3.5" />
				Pedir documentación
			</Button>
			<Dialog open={abierto} onOpenChange={(o) => !enviando && setAbierto(o)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Pedir documentación al cliente</DialogTitle>
						<DialogDescription>
							Le llega por WhatsApp: "necesitamos que nos envíes la siguiente documentación: …". Queda en la
							línea de tiempo de la causa.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="doc-faltante">¿Qué documentación falta?</Label>
						<Textarea
							id="doc-faltante"
							rows={3}
							maxLength={500}
							placeholder="DNI frente y dorso, últimos 3 recibos de sueldo"
							value={faltante}
							onChange={(e) => setFaltante(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAbierto(false)} disabled={enviando}>
							Cancelar
						</Button>
						<Button onClick={enviar} disabled={enviando}>
							{enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Enviar por WhatsApp
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
