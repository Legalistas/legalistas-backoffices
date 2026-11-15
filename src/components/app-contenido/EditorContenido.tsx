"use client";

import { ArrowDown, ArrowUp, FileUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { CONFIGURACION_ENDPOINT } from "@/constant/api-endpoints";

// Editor del contenido de la app de clientes (sprint 5.m): una lista de ítems
// por sección. Se guarda la lista entera y la app la toma al abrirse, sin
// publicar una versión. El backend valida cada campo (modules/app/contenido.service.ts).

export type ClaveContenido = "app_recursos" | "app_urgencias" | "app_faq";
type Item = Record<string, unknown>;

interface Campo {
	nombre: string;
	etiqueta: string;
	tipo: "texto" | "parrafo" | "lineas" | "opciones" | "pdf";
	opciones?: { valor: string; texto: string }[];
	ayuda?: string;
}

const id = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}`;

const SECCION_RECURSO = [
	{ valor: "transito", texto: "Tránsito" },
	{ valor: "art", texto: "ART (Trabajo)" },
	{ valor: "legal", texto: "Área legal" },
];

export const SECCIONES: Record<
	ClaveContenido,
	{ singular: string; campos: Campo[]; nuevo: () => Item; titulo: (i: Item) => string }
> = {
	app_recursos: {
		singular: "recurso",
		nuevo: () => ({ id: id("recurso"), seccion: "art", tipo: "guia", titulo: "", descripcion: "" }),
		titulo: (i) => String(i.titulo || "Recurso sin título"),
		campos: [
			{ nombre: "titulo", etiqueta: "Título", tipo: "texto" },
			{ nombre: "descripcion", etiqueta: "Descripción", tipo: "parrafo" },
			{ nombre: "seccion", etiqueta: "Sección", tipo: "opciones", opciones: SECCION_RECURSO },
			{
				nombre: "tipo",
				etiqueta: "Tipo",
				tipo: "opciones",
				opciones: [
					{ valor: "guia", texto: "Guía" },
					{ valor: "modelo", texto: "Modelo" },
					{ valor: "folleto", texto: "Folleto" },
				],
			},
			{ nombre: "archivo", etiqueta: "PDF", tipo: "pdf" },
		],
	},
	app_urgencias: {
		singular: "guía",
		nuevo: () => ({ seccion: "transito", titulo: "", pasos: [] }),
		titulo: (i) => String(i.titulo || "Guía sin título"),
		campos: [
			{
				nombre: "seccion",
				etiqueta: "Tipo de accidente",
				tipo: "opciones",
				opciones: [
					{ valor: "transito", texto: "Tránsito" },
					{ valor: "trabajo", texto: "Trabajo" },
				],
			},
			{ nombre: "titulo", etiqueta: "Título", tipo: "texto" },
			{
				nombre: "pasos",
				etiqueta: "Pasos",
				tipo: "lineas",
				ayuda: "Un paso por renglón. La app los numera.",
			},
			{ nombre: "archivo", etiqueta: "Guía de una página (PDF)", tipo: "pdf" },
		],
	},
	app_faq: {
		singular: "pregunta",
		nuevo: () => ({ id: id("pregunta"), seccion: "art", pregunta: "", respuesta: "" }),
		titulo: (i) => String(i.pregunta || "Pregunta sin texto"),
		campos: [
			{
				nombre: "seccion",
				etiqueta: "Sección",
				tipo: "opciones",
				opciones: [
					{ valor: "transito", texto: "Tránsito" },
					{ valor: "art", texto: "ART (Trabajo)" },
				],
			},
			{ nombre: "pregunta", etiqueta: "Pregunta", tipo: "texto" },
			{
				nombre: "respuesta",
				etiqueta: "Respuesta",
				tipo: "parrafo",
				ayuda: 'Separá los párrafos con un renglón vacío. Para una lista, empezá cada renglón con "- ".',
			},
			{
				nombre: "accion",
				etiqueta: "Botón al final (opcional)",
				tipo: "opciones",
				opciones: [
					{ valor: "ninguna", texto: "Sin botón" },
					{ valor: "nuevo_accidente", texto: "Nuevo accidente (cargar la consulta)" },
					{ valor: "calculadora", texto: "Calcular la indemnización" },
					{ valor: "urgencias", texto: "Urgencias" },
					{ valor: "whatsapp", texto: "Escribir por WhatsApp" },
				],
			},
		],
	},
};

export function EditorContenido({ clave }: { clave: ClaveContenido }) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const seccion = SECCIONES[clave];
	const [items, setItems] = useState<Item[]>([]);
	const [estado, setEstado] = useState<"cargando" | "listo" | "sin-permiso" | "error">("cargando");
	const [actualizado, setActualizado] = useState<string | null>(null);
	const [cambios, setCambios] = useState(false);
	const [guardando, setGuardando] = useState(false);

	const pedir = useCallback(
		async <T,>(ruta: string, init?: RequestInit): Promise<T> => {
			const res = await fetch(`${CONFIGURACION_ENDPOINT}${ruta}`, {
				...init,
				headers: {
					Authorization: `Bearer ${token}`,
					...(init?.body ? { "Content-Type": "application/json" } : {}),
				},
			});
			const cuerpo = await res.json().catch(() => ({}));
			if (res.status === 403) throw new Error("sin-permiso");
			if (!res.ok) throw new Error(cuerpo.error || `Error ${res.status}`);
			return cuerpo.data as T;
		},
		[token],
	);

	useEffect(() => {
		if (!token) return;
		pedir<{ valor: Item[]; updatedAt: string | null }>(`/${clave}`)
			.then((r) => {
				setItems(Array.isArray(r.valor) ? r.valor : []);
				setActualizado(r.updatedAt);
				setEstado("listo");
			})
			.catch((e: Error) => setEstado(e.message === "sin-permiso" ? "sin-permiso" : "error"));
	}, [token, clave, pedir]);

	const cambiar = (indice: number, campo: string, valor: unknown) => {
		setItems((lista) => lista.map((it, i) => (i === indice ? { ...it, [campo]: valor } : it)));
		setCambios(true);
	};
	const mover = (indice: number, hacia: -1 | 1) => {
		setItems((lista) => {
			const otra = [...lista];
			[otra[indice], otra[indice + hacia]] = [otra[indice + hacia], otra[indice]];
			return otra;
		});
		setCambios(true);
	};
	const quitar = (indice: number) => {
		setItems((lista) => lista.filter((_, i) => i !== indice));
		setCambios(true);
	};
	const agregar = () => {
		setItems((lista) => [...lista, seccion.nuevo()]);
		setCambios(true);
	};

	const guardar = async () => {
		setGuardando(true);
		try {
			// Sin botón = sin el campo; los textos vacíos opcionales y los renglones vacíos no se mandan.
			const valor = items.map((it) =>
				Object.fromEntries(
					Object.entries(it)
						.filter(([k, v]) => v !== "" && !(k === "accion" && v === "ninguna"))
						.map(([k, v]) => [k, Array.isArray(v) ? v.filter((l) => String(l).trim() !== "") : v]),
				),
			);
			const r = await pedir<{ updatedAt: string }>(`/${clave}`, {
				method: "PUT",
				body: JSON.stringify({ valor }),
			});
			setActualizado(r.updatedAt);
			setCambios(false);
			toast.success("Listo. La app lo muestra la próxima vez que se abra.");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setGuardando(false);
		}
	};

	const subirPdf = async (indice: number, archivo: File) => {
		try {
			const { subida, url } = await pedir<{ subida: string; url: string }>("/archivos", {
				method: "POST",
				body: JSON.stringify({ nombre: archivo.name }),
			});
			const res = await fetch(subida, {
				method: "PUT",
				body: archivo,
				headers: { "Content-Type": "application/pdf" },
			});
			if (!res.ok) throw new Error("No se pudo subir el PDF");
			cambiar(indice, "archivo", url);
			toast.success("PDF subido. Acordate de guardar los cambios.");
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	if (estado === "cargando") {
		return (
			<p className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="size-4 animate-spin" /> Cargando…
			</p>
		);
	}
	if (estado === "sin-permiso") {
		return <p className="text-sm text-muted-foreground">Tu rol no puede editar esta sección.</p>;
	}
	if (estado === "error") {
		return <p className="text-sm text-destructive">No pudimos cargar esta sección. Probá recargar la página.</p>;
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-xs text-muted-foreground">
					{actualizado
						? `Última actualización: ${new Date(actualizado).toLocaleString("es-AR")}`
						: "Todavía no se guardó nada."}
					{cambios ? " · Hay cambios sin guardar." : ""}
				</p>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={agregar}>
						<Plus className="size-4" /> Agregar {seccion.singular}
					</Button>
					<Button size="sm" onClick={guardar} disabled={!cambios || guardando}>
						{guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
						Guardar cambios
					</Button>
				</div>
			</div>

			{items.length === 0 ? (
				<p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
					No hay nada cargado. Mientras esté vacía, la app no muestra esta sección.
				</p>
			) : null}

			{items.map((item, indice) => (
				<div key={String(item.id ?? `${item.seccion}-${indice}`)} className="space-y-3 rounded-lg border bg-card p-4">
					<div className="flex items-center justify-between gap-2">
						<p className="truncate text-sm font-semibold text-foreground">{seccion.titulo(item)}</p>
						<div className="flex shrink-0 gap-1">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Subir"
								disabled={indice === 0}
								onClick={() => mover(indice, -1)}
							>
								<ArrowUp className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Bajar"
								disabled={indice === items.length - 1}
								onClick={() => mover(indice, 1)}
							>
								<ArrowDown className="size-4" />
							</Button>
							<Button variant="ghost" size="icon" aria-label="Quitar" onClick={() => quitar(indice)}>
								<Trash2 className="size-4 text-destructive" />
							</Button>
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						{seccion.campos.map((campo) => (
							<CampoItem
								key={campo.nombre}
								campo={campo}
								valor={item[campo.nombre]}
								alCambiar={(v) => cambiar(indice, campo.nombre, v)}
								alSubir={(archivo) => subirPdf(indice, archivo)}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function CampoItem({
	campo,
	valor,
	alCambiar,
	alSubir,
}: {
	campo: Campo;
	valor: unknown;
	alCambiar: (valor: unknown) => void;
	alSubir: (archivo: File) => void;
}) {
	const htmlId = useId();
	const ancho = campo.tipo === "parrafo" || campo.tipo === "lineas" ? "md:col-span-2" : "";
	return (
		<div className={`space-y-1.5 ${ancho}`}>
			<Label htmlFor={htmlId}>{campo.etiqueta}</Label>
			{campo.tipo === "texto" ? (
				<Input id={htmlId} value={String(valor ?? "")} onChange={(e) => alCambiar(e.target.value)} />
			) : campo.tipo === "parrafo" ? (
				<Textarea id={htmlId} rows={5} value={String(valor ?? "")} onChange={(e) => alCambiar(e.target.value)} />
			) : campo.tipo === "lineas" ? (
				<Textarea
					id={htmlId}
					rows={6}
					value={Array.isArray(valor) ? valor.join("\n") : ""}
					onChange={(e) => alCambiar(e.target.value.split("\n"))}
				/>
			) : campo.tipo === "opciones" ? (
				<Select value={String(valor ?? "ninguna")} onValueChange={alCambiar}>
					<SelectTrigger id={htmlId}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{campo.opciones?.map((o) => (
							<SelectItem key={o.valor} value={o.valor}>
								{o.texto}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : (
				<div className="flex flex-wrap items-center gap-2">
					{valor ? (
						<a href={String(valor)} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
							Ver el PDF
						</a>
					) : (
						<span className="text-sm text-muted-foreground">Sin PDF</span>
					)}
					<Button variant="outline" size="sm" asChild>
						<label htmlFor={htmlId} className="cursor-pointer">
							<FileUp className="size-4" /> {valor ? "Cambiar" : "Subir"} PDF
						</label>
					</Button>
					<input
						id={htmlId}
						type="file"
						accept="application/pdf"
						className="sr-only"
						onChange={(e) => {
							const archivo = e.target.files?.[0];
							if (archivo) alSubir(archivo);
							e.target.value = "";
						}}
					/>
					{valor ? (
						<Button variant="ghost" size="sm" onClick={() => alCambiar("")}>
							Quitar
						</Button>
					) : null}
				</div>
			)}
			{campo.ayuda ? <p className="text-xs text-muted-foreground">{campo.ayuda}</p> : null}
		</div>
	);
}
