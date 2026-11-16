"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CONFIGURACION_ENDPOINT, SELLERS_ENDPOINT } from "@/constant/api-endpoints";

// Configuración del bot y de "Nuevo accidente" de la app (sprint 4.5): sin
// deploy. La valida el backend (modules/potenciales/config.ts). El orden de
// las preguntas está en el código (modules/potenciales/motor.ts).

type Resultado = "FACTIBLE" | "NO_FACTIBLE" | "DUDOSA";

interface Config {
	vendedoraId: number | null;
	plazoArtAnios: number;
	plazoTransitoAnios: number;
	montoDanos: number;
	patologias: { id: string; texto: string; resultado: Resultado }[];
	mensajes: { factible: string; dudosa: string; noFactible: string };
	bot: {
		activo: boolean;
		presentaComo: string;
		bienvenida: string;
		derivacion: string;
		fueraDeAlcance: string;
		dudosa: string;
		receso: { activo: boolean; texto: string; fechaRegreso: string };
	};
}

const RESULTADOS: { valor: Resultado; texto: string }[] = [
	{ valor: "FACTIBLE", texto: "Pasa al CRM" },
	{ valor: "DUDOSA", texto: "La revisa una vendedora" },
	{ valor: "NO_FACTIBLE", texto: "Se descarta" },
];

export function ConfiguracionBot() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [config, setConfig] = useState<Config | null>(null);
	const [vendedoras, setVendedoras] = useState<{ id: number; name: string }[]>([]);
	const [estado, setEstado] = useState<"cargando" | "listo" | "sin-permiso" | "error">("cargando");
	const [guardando, setGuardando] = useState(false);
	const [cambios, setCambios] = useState(false);

	useEffect(() => {
		if (!token) return;
		const h = { Authorization: `Bearer ${token}` };
		fetch(`${CONFIGURACION_ENDPOINT}/potenciales`, { headers: h })
			.then(async (r) => {
				if (r.status === 403) return setEstado("sin-permiso");
				if (!r.ok) return setEstado("error");
				setConfig((await r.json()).data.valor);
				setEstado("listo");
			})
			.catch(() => setEstado("error"));
		fetch(`${SELLERS_ENDPOINT}?limit=1000`, { headers: h })
			.then((r) => (r.ok ? r.json() : { data: [] }))
			.then(({ data }) => setVendedoras(data ?? []))
			.catch(() => setVendedoras([]));
	}, [token]);

	if (estado === "cargando") {
		return (
			<p className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="size-4 animate-spin" /> Cargando…
			</p>
		);
	}
	if (estado === "sin-permiso") {
		return <p className="text-sm text-muted-foreground">La configuración la editan dirección y la directora de Ventas.</p>;
	}
	if (estado === "error" || !config) {
		return <p className="text-sm text-destructive">No pudimos cargar la configuración. Probá recargar la página.</p>;
	}

	const cambiar = (nueva: Config) => {
		setConfig(nueva);
		setCambios(true);
	};
	const bot = (campos: Partial<Config["bot"]>) => cambiar({ ...config, bot: { ...config.bot, ...campos } });
	const receso = (campos: Partial<Config["bot"]["receso"]>) =>
		bot({ receso: { ...config.bot.receso, ...campos } });

	const guardar = async () => {
		setGuardando(true);
		try {
			const r = await fetch(`${CONFIGURACION_ENDPOINT}/potenciales`, {
				method: "PUT",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify({ valor: config }),
			});
			const cuerpo = await r.json().catch(() => ({}));
			if (!r.ok) throw new Error(cuerpo.error || `Error ${r.status}`);
			setCambios(false);
			toast.success("Configuración guardada. El bot la usa desde su próxima respuesta.");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setGuardando(false);
		}
	};

	const texto = (etiqueta: string, valor: string, alCambiar: (v: string) => void, ayuda?: string) => (
		<div className="space-y-1.5">
			<Label>{etiqueta}</Label>
			<Textarea rows={4} value={valor} onChange={(e) => alCambiar(e.target.value)} />
			{ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
		</div>
	);
	const numero = (etiqueta: string, valor: number, alCambiar: (v: number) => void) => (
		<div className="space-y-1.5">
			<Label>{etiqueta}</Label>
			<Input type="number" min={1} value={valor} onChange={(e) => alCambiar(Number(e.target.value))} />
		</div>
	);

	return (
		<div className="max-w-3xl space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
				<div className="flex items-center gap-3">
					<Switch id="bot-activo" checked={config.bot.activo} onCheckedChange={(activo) => bot({ activo })} />
					<div>
						<Label htmlFor="bot-activo" className="text-base">
							{config.bot.activo ? "El bot está prendido" : "El bot está apagado"}
						</Label>
						<p className="text-xs text-muted-foreground">
							Prendido, responde a los números que escriben por primera vez y no están en la base. Apagado,
							WhatsApp funciona como siempre.
						</p>
					</div>
				</div>
				<Button onClick={guardar} disabled={!cambios || guardando}>
					{guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
					Guardar cambios
				</Button>
			</div>

			<section className="grid gap-4 md:grid-cols-2">
				<div className="space-y-1.5">
					<Label>Se presenta como</Label>
					<Input value={config.bot.presentaComo} onChange={(e) => bot({ presentaComo: e.target.value })} />
				</div>
				<div className="space-y-1.5">
					<Label>Las factibles van a</Label>
					<Select
						value={config.vendedoraId ? String(config.vendedoraId) : ""}
						onValueChange={(v) => cambiar({ ...config, vendedoraId: Number(v) })}
					>
						<SelectTrigger>
							<SelectValue placeholder="Elegí la vendedora" />
						</SelectTrigger>
						<SelectContent>
							{vendedoras.map((v) => (
								<SelectItem key={v.id} value={String(v.id)}>
									{v.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</section>

			<section className="space-y-3 rounded-lg border p-4">
				<div className="flex items-center gap-3">
					<Switch id="receso" checked={config.bot.receso.activo} onCheckedChange={(activo) => receso({ activo })} />
					<Label htmlFor="receso">Modo receso: el mensaje de derivación avisa cuándo volvemos</Label>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Fecha de regreso</Label>
						<Input
							placeholder="11/01"
							value={config.bot.receso.fechaRegreso}
							onChange={(e) => receso({ fechaRegreso: e.target.value })}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Texto del receso</Label>
						<Input value={config.bot.receso.texto} onChange={(e) => receso({ texto: e.target.value })} />
						<p className="text-xs text-muted-foreground">{"{fecha}"} = la fecha de regreso.</p>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-semibold">Mensajes de WhatsApp</h2>
				{texto("Bienvenida (primer mensaje)", config.bot.bienvenida, (v) => bot({ bienvenida: v }), "{presentaComo} = el nombre de arriba.")}
				{texto(
					"Derivación al CRM (factibles)",
					config.bot.derivacion,
					(v) => bot({ derivacion: v }),
					"{nombre} = su nombre; {receso} = el texto del receso si está activo; {android} y {ios} = los links de la app.",
				)}
				{texto("Descarte (no factibles, también en la app)", config.mensajes.noFactible, (v) =>
					cambiar({ ...config, mensajes: { ...config.mensajes, noFactible: v } }),
				)}
				{texto("Fuera de alcance (otros temas)", config.bot.fueraDeAlcance, (v) => bot({ fueraDeAlcance: v }))}
				{texto("Dudosas", config.bot.dudosa, (v) => bot({ dudosa: v }), "Vacío = no se le manda nada: la ve una vendedora.")}
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-semibold">Plazos y montos</h2>
				<div className="grid gap-4 md:grid-cols-3">
					{numero("Plazo ART y enfermedad (años)", config.plazoArtAnios, (v) => cambiar({ ...config, plazoArtAnios: v }))}
					{numero("Plazo tránsito (años)", config.plazoTransitoAnios, (v) => cambiar({ ...config, plazoTransitoAnios: v }))}
					{numero("Monto de daños materiales ($)", config.montoDanos, (v) => cambiar({ ...config, montoDanos: v }))}
				</div>
			</section>

			<section className="space-y-3">
				<h2 className="text-sm font-semibold">Patologías (enfermedades profesionales)</h2>
				{config.patologias.map((p, i) => (
					<div key={p.id} className="flex flex-wrap items-center gap-2">
						<Input
							className="min-w-64 flex-1"
							value={p.texto}
							onChange={(e) =>
								cambiar({
									...config,
									patologias: config.patologias.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)),
								})
							}
						/>
						<Select
							value={p.resultado}
							onValueChange={(v) =>
								cambiar({
									...config,
									patologias: config.patologias.map((x, j) => (j === i ? { ...x, resultado: v as Resultado } : x)),
								})
							}
						>
							<SelectTrigger className="w-56">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{RESULTADOS.map((r) => (
									<SelectItem key={r.valor} value={r.valor}>
										{r.texto}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Quitar"
							disabled={p.id === "otra"}
							onClick={() => cambiar({ ...config, patologias: config.patologias.filter((_, j) => j !== i) })}
						>
							<Trash2 className="size-4 text-destructive" />
						</Button>
					</div>
				))}
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						cambiar({
							...config,
							patologias: [
								...config.patologias,
								{ id: `patologia-${Date.now().toString(36)}`, texto: "", resultado: "FACTIBLE" },
							],
						})
					}
				>
					<Plus className="size-4" /> Agregar patología
				</Button>
				<p className="text-xs text-muted-foreground">
					"Otra enfermedad o dolencia" no se puede quitar: es la que pasa al CRM cuando no coincide con ninguna.
				</p>
			</section>
		</div>
	);
}
