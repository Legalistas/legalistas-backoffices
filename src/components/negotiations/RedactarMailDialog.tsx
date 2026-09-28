"use client";

import { AlertTriangle, Loader2, Mail } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NEGOTIATION_CASILLA_MAIL_ENDPOINT, NEGOTIATION_MAILS_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";
import { parseMonto } from "@/lib/monto";
import type { Negotiation } from "@/types/negotiations";

// Mail rápido desde la negociación (relevamiento 13): plantilla prearmada y
// editable, sale de la casilla del sistema como "Legalistas Acuerdos" y queda
// en la línea de tiempo. Si propone un monto, queda como oferta de Legalistas.

interface DatosPlantilla {
	saludo: string;
	referencia: string;
	incapacidad: string;
	monto: string;
	firma: string;
}

interface Plantilla {
	id: string;
	nombre: string;
	/** Pide el monto propuesto (queda como oferta de Legalistas). */
	conMonto?: boolean;
	asunto: (d: DatosPlantilla) => string;
	cuerpo: (d: DatosPlantilla) => string;
}

const PLANTILLAS: Plantilla[] = [
	{
		id: "seguimiento",
		nombre: "Seguimiento",
		asunto: (d) => `Seguimiento negociación — ${d.referencia}`,
		cuerpo: (d) =>
			`${d.saludo}:\n\nMe comunico en relación a la negociación del caso ${d.referencia}, a fin de consultar su estado y si cuentan con una propuesta.\n\nQuedamos a la espera de su respuesta.\n\nSaludos cordiales,\n${d.firma}`,
	},
	{
		id: "propuesta",
		nombre: "Propuesta de acuerdo",
		conMonto: true,
		asunto: (d) => `Propuesta de acuerdo — ${d.referencia}`,
		cuerpo: (d) =>
			`${d.saludo}:\n\nEn relación al caso ${d.referencia}${d.incapacidad ? `, con una incapacidad determinada del ${d.incapacidad}%` : ""}, les hacemos llegar nuestra propuesta de acuerdo por la suma de ${d.monto || "$ [MONTO]"}.\n\nQuedamos a la espera de su respuesta.\n\nSaludos cordiales,\n${d.firma}`,
	},
	{
		id: "recordatorio",
		nombre: "Recordatorio (sin respuesta)",
		asunto: (d) => `Recordatorio — ${d.referencia}`,
		cuerpo: (d) =>
			`${d.saludo}:\n\nRetomo nuestro último intercambio sobre el caso ${d.referencia}. Al no haber recibido respuesta, les solicitamos nos informen el estado de la negociación a la brevedad.\n\nSaludos cordiales,\n${d.firma}`,
	},
	{
		id: "blanco",
		nombre: "En blanco",
		asunto: () => "",
		cuerpo: (d) => `${d.saludo}:\n\n\n\nSaludos cordiales,\n${d.firma}`,
	},
];

const pesos = (n: number) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

interface Props {
	negotiation: Negotiation | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEnviado: () => void;
}

export default function RedactarMailDialog({ negotiation, open, onOpenChange, onEnviado }: Props) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [casilla, setCasilla] = useState<{ configurada: boolean; direccion?: string } | null>(null);
	const [plantillaId, setPlantillaId] = useState("seguimiento");
	const [para, setPara] = useState("");
	const [cc, setCc] = useState("");
	const [asunto, setAsunto] = useState("");
	const [cuerpo, setCuerpo] = useState("");
	const [monto, setMonto] = useState("");
	// Si el texto se tocó a mano, cambiar el monto no lo pisa.
	const [editado, setEditado] = useState(false);
	const [enviando, setEnviando] = useState(false);

	const plantilla = PLANTILLAS.find((p) => p.id === plantillaId) ?? PLANTILLAS[0];

	const datos = (montoTexto: string): DatosPlantilla => {
		const abogado = negotiation?.abogadoContraparte;
		const cuij = negotiation?.caseFile?.cuij?.trim();
		const montoNum = parseMonto(montoTexto);
		return {
			saludo: abogado?.nombre ? `Estimado/a Dr./Dra. ${abogado.nombre}` : "Estimados/as",
			referencia: `${negotiation?.case.title || `Causa #${negotiation?.caseId}`}${cuij ? ` (Expte. ${cuij})` : ""}`,
			incapacidad: negotiation?.incLegalistas ? String(negotiation.incLegalistas) : "",
			monto: montoNum ? pesos(montoNum) : "",
			firma: `${session?.user?.name ?? ""}\nLegalistas`,
		};
	};

	const aplicar = (p: Plantilla, montoTexto: string) => {
		setAsunto(p.asunto(datos(montoTexto)));
		setCuerpo(p.cuerpo(datos(montoTexto)));
		setEditado(false);
	};

	// Al abrir: destinatario, plantilla por defecto y desde qué casilla sale.
	// biome-ignore lint/correctness/useExhaustiveDependencies: solo al abrir
	useEffect(() => {
		if (!open || !negotiation) return;
		setPara(negotiation.abogadoContraparte?.email ?? "");
		setCc("");
		setMonto("");
		setPlantillaId("seguimiento");
		aplicar(PLANTILLAS[0], "");
		if (token) {
			fetch(NEGOTIATION_CASILLA_MAIL_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } })
				.then((r) => (r.ok ? r.json() : null))
				.then((j) => setCasilla(j?.data ?? null))
				.catch(() => setCasilla(null));
		}
	}, [open, negotiation?.id]);

	const cambiarPlantilla = (id: string) => {
		const p = PLANTILLAS.find((x) => x.id === id) ?? PLANTILLAS[0];
		setPlantillaId(id);
		aplicar(p, monto);
	};

	const cambiarMonto = (valor: string) => {
		setMonto(valor);
		if (!editado) setCuerpo(plantilla.cuerpo(datos(valor)));
	};

	const enviar = async () => {
		if (!negotiation) return;
		const montoOfrecido = plantilla.conMonto ? parseMonto(monto) : null;
		if (plantilla.conMonto && monto.trim() && !montoOfrecido) {
			toast.error("El monto no es válido");
			return;
		}
		setEnviando(true);
		try {
			const res = await fetch(NEGOTIATION_MAILS_ENDPOINT(negotiation.id), {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					para,
					cc: cc || undefined,
					asunto,
					cuerpo,
					montoOfrecido: montoOfrecido ?? undefined,
				}),
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo enviar el mail"));
			toast.success(`Mail enviado a ${para}`);
			onOpenChange(false);
			onEnviado();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudo enviar el mail");
		} finally {
			setEnviando(false);
		}
	};

	const sinCasilla = casilla !== null && !casilla.configurada;

	return (
		<Dialog open={open} onOpenChange={(v) => !enviando && onOpenChange(v)}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5 text-primary" />
						Redactar mail
					</DialogTitle>
					<DialogDescription>
						{negotiation?.case.title || `Causa #${negotiation?.caseId}`} · Queda registrado en la
						línea de tiempo de la negociación.
						{casilla?.configurada && casilla.direccion && (
							<>
								{" "}
								Sale desde <strong>{casilla.direccion}</strong>.
							</>
						)}
					</DialogDescription>
				</DialogHeader>

				{sinCasilla && (
					<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						El envío de mails no está configurado en el servidor: el mail no se va a poder
						enviar.
					</div>
				)}

				<div className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Plantilla</Label>
							<Select value={plantillaId} onValueChange={cambiarPlantilla} disabled={enviando}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PLANTILLAS.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{plantilla.conMonto && (
							<div className="space-y-1.5">
								<Label htmlFor="mail-monto">Monto propuesto</Label>
								<Input
									id="mail-monto"
									inputMode="decimal"
									placeholder="Ej.: 2.500.000"
									value={monto}
									onChange={(e) => cambiarMonto(e.target.value)}
									disabled={enviando}
								/>
								<p className="text-[11px] text-muted-foreground">Queda como oferta de Legalistas.</p>
							</div>
						)}
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="mail-para">Para</Label>
							<Input
								id="mail-para"
								value={para}
								onChange={(e) => setPara(e.target.value)}
								placeholder="abogado@estudio.com"
								disabled={enviando}
							/>
							{!negotiation?.abogadoContraparte?.email && (
								<p className="text-[11px] text-amber-600">
									El abogado contraparte no tiene mail cargado (se completa en Editar).
								</p>
							)}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="mail-cc">CC (opcional)</Label>
							<Input
								id="mail-cc"
								value={cc}
								onChange={(e) => setCc(e.target.value)}
								placeholder="otro@mail.com, …"
								disabled={enviando}
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="mail-asunto">Asunto</Label>
						<Input
							id="mail-asunto"
							value={asunto}
							onChange={(e) => setAsunto(e.target.value)}
							disabled={enviando}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="mail-cuerpo">Mensaje</Label>
						<Textarea
							id="mail-cuerpo"
							rows={12}
							value={cuerpo}
							onChange={(e) => {
								setCuerpo(e.target.value);
								setEditado(true);
							}}
							disabled={enviando}
							className="font-sans text-sm"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
						Cancelar
					</Button>
					<Button
						onClick={enviar}
						disabled={enviando || sinCasilla || !para.trim() || !asunto.trim() || !cuerpo.trim()}
					>
						{enviando ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Mail className="mr-2 h-4 w-4" />
						)}
						Enviar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
