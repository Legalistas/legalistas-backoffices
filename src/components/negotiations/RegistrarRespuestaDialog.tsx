"use client";

import { Loader2, Reply } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { NEGOTIATION_RESPUESTAS_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";
import { parseMonto } from "@/lib/monto";
import type { Negotiation } from "@/types/negotiations";

// Respuesta de la contraparte, cargada a mano (no hay integración con la
// bandeja de entrada). Si trae un monto, queda como oferta de la aseguradora.

/** Hoy en Argentina, "AAAA-MM-DD" (el value de un input date). */
const hoyAR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

interface Props {
	negotiation: Negotiation | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRegistrada: () => void;
}

export default function RegistrarRespuestaDialog({ negotiation, open, onOpenChange, onRegistrada }: Props) {
	const { data: session } = useSession();
	const [fecha, setFecha] = useState(hoyAR());
	const [contacto, setContacto] = useState("");
	const [cuerpo, setCuerpo] = useState("");
	const [monto, setMonto] = useState("");
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (!open || !negotiation) return;
		const a = negotiation.abogadoContraparte;
		setFecha(hoyAR());
		setContacto(a ? [a.nombre, a.email].filter(Boolean).join(" · ") : (negotiation.contraparteLawyer ?? ""));
		setCuerpo("");
		setMonto("");
	}, [open, negotiation]);

	const guardar = async () => {
		if (!negotiation) return;
		const montoRecibido = parseMonto(monto);
		if (monto.trim() && !montoRecibido) {
			toast.error("El monto no es válido");
			return;
		}
		setGuardando(true);
		try {
			const res = await fetch(NEGOTIATION_RESPUESTAS_ENDPOINT(negotiation.id), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					fecha,
					contacto: contacto || null,
					cuerpo,
					montoRecibido: montoRecibido ?? undefined,
				}),
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo registrar la respuesta"));
			toast.success("Respuesta registrada");
			onOpenChange(false);
			onRegistrada();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudo registrar la respuesta");
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !guardando && onOpenChange(v)}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Reply className="h-5 w-5 text-amber-600" />
						Registrar respuesta
					</DialogTitle>
					<DialogDescription>
						Lo que contestó la contraparte (por mail, teléfono o en persona). Queda en la línea de
						tiempo de la negociación.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="resp-fecha">Fecha</Label>
							<Input
								id="resp-fecha"
								type="date"
								value={fecha}
								max={hoyAR()}
								onChange={(e) => setFecha(e.target.value)}
								disabled={guardando}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="resp-monto">Monto ofrecido (opcional)</Label>
							<Input
								id="resp-monto"
								inputMode="decimal"
								placeholder="Ej.: 1.800.000"
								value={monto}
								onChange={(e) => setMonto(e.target.value)}
								disabled={guardando}
							/>
							<p className="text-[11px] text-muted-foreground">Queda como oferta de la ART.</p>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="resp-contacto">De</Label>
						<Input
							id="resp-contacto"
							value={contacto}
							onChange={(e) => setContacto(e.target.value)}
							placeholder="Abogado contraparte"
							disabled={guardando}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="resp-cuerpo">Qué respondió</Label>
						<Textarea
							id="resp-cuerpo"
							rows={6}
							value={cuerpo}
							onChange={(e) => setCuerpo(e.target.value)}
							placeholder="Resumen o texto de la respuesta"
							disabled={guardando}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={guardando || !cuerpo.trim()}>
						{guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Registrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
