"use client";

import { ArrowLeft, Eye, FileCheck2, Loader2, Save, Wand2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EscritoEditor } from "@/components/escritos/EscritoEditor";
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
import {
	ESCRITO_DATOS_ENDPOINT,
	ESCRITO_ENDPOINT,
	ESCRITO_GUARDAR_PDF_ENDPOINT,
	ESCRITO_PDF_ENDPOINT,
	ESCRITOS_VARIABLES_ENDPOINT,
} from "@/constant/api-endpoints";
import { ESTADOS_CIVILES } from "@/constant/estado-civil";
import { abrirPdf, escritosFetch } from "@/lib/escritos-api";
import { getExpedienteLabel } from "@/lib/expediente-label";
import { parseMonto } from "@/lib/monto";
import type { Escrito, VariableEscrito } from "@/types/escritos";

const escapar = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Datos que, si faltan, se pueden cargar desde el escrito: se guardan en el
// cliente o en el caso (PUT /escritos/:id/datos) y quedan en el sistema.
const DATOS_EDITABLES = [
	{ clave: "CLIENTE_ESTADO_CIVIL", etiqueta: "Estado civil del cliente", tipo: "estadoCivil" },
	{ clave: "MONTO_RECLAMADO", etiqueta: "Monto reclamado ($)", tipo: "monto" },
	{ clave: "PORCENTAJE_INCAPACIDAD", etiqueta: "% de incapacidad", tipo: "porcentaje" },
] as const;

const usaVariable = (html: string, clave: string) =>
	new RegExp(`\\{\\{\\s*${clave}\\s*\\}\\}`).test(html);

function fechaHora(iso: string): string {
	return new Date(iso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function EditarEscritoPage() {
	const params = useParams();
	const caseId = Number(params.caseId);
	const escritoId = Number(params.escritoId);
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [escrito, setEscrito] = useState<Escrito | null>(null);
	const [titulo, setTitulo] = useState("");
	const [contenido, setContenido] = useState("");
	const [variables, setVariables] = useState<VariableEscrito[]>([]);
	const [valores, setValores] = useState<Record<string, string | null>>({});
	const [dirty, setDirty] = useState(false);
	const [accion, setAccion] = useState<"guardar" | "preview" | "pdf" | "datos" | null>(null);
	const [datos, setDatos] = useState<Record<string, string>>({});

	const cargar = useCallback(async () => {
		if (!token) return;
		try {
			const { data } = await escritosFetch<{ data: Escrito }>(
				ESCRITO_ENDPOINT(escritoId),
				token,
			);
			setEscrito(data);
			setTitulo(data.titulo);
			setContenido(data.contenidoHtml);
			setDirty(false);

			const qs = new URLSearchParams();
			if (data.caseId) qs.set("caseId", String(data.caseId));
			if (data.fileId) qs.set("fileId", String(data.fileId));
			const vars = await escritosFetch<{
				data: { variables: VariableEscrito[]; valores: Record<string, string | null> };
			}>(`${ESCRITOS_VARIABLES_ENDPOINT}?${qs}`, token);
			setVariables(vars.data.variables);
			setValores(vars.data.valores);
		} catch (e) {
			toast.error((e as Error).message);
		}
	}, [escritoId, token]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	// Avisar antes de salir con cambios sin guardar.
	useEffect(() => {
		if (!dirty) return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [dirty]);

	const guardar = async (html: string = contenido): Promise<boolean> => {
		if (!token) return false;
		if (!titulo.trim()) {
			toast.error("El título es obligatorio");
			return false;
		}
		try {
			const { data } = await escritosFetch<{ data: Escrito }>(
				ESCRITO_ENDPOINT(escritoId),
				token,
				{ method: "PUT", body: JSON.stringify({ titulo, contenidoHtml: html }) },
			);
			setEscrito((prev) => (prev ? { ...prev, ...data } : data));
			setDirty(false);
			return true;
		} catch (e) {
			toast.error((e as Error).message);
			return false;
		}
	};

	const handleGuardar = async () => {
		setAccion("guardar");
		if (await guardar()) toast.success("Escrito guardado");
		setAccion(null);
	};

	// El PDF se arma con lo guardado: si hay cambios, se guardan primero.
	const handlePreview = async () => {
		if (!token) return;
		setAccion("preview");
		try {
			if (dirty && !(await guardar())) return;
			await abrirPdf(ESCRITO_PDF_ENDPOINT(escritoId), token);
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setAccion(null);
		}
	};

	const handleGuardarPdf = async () => {
		if (!token) return;
		setAccion("pdf");
		try {
			if (dirty && !(await guardar())) return;
			const res = await escritosFetch<{
				data: { url: string; pdfObjectKey: string; pdfGeneradoAt: string };
			}>(ESCRITO_GUARDAR_PDF_ENDPOINT(escritoId), token, { method: "POST" });
			setEscrito((prev) =>
				prev
					? {
							...prev,
							pdfObjectKey: res.data.pdfObjectKey,
							pdfGeneradoAt: res.data.pdfGeneradoAt,
						}
					: prev,
			);
			toast.success("PDF guardado en la carpeta del expediente");
			window.open(res.data.url, "_blank", "noopener,noreferrer");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setAccion(null);
		}
	};

	// Reemplaza los {{CLAVE}} que tienen dato con los valores del expediente.
	const completarVariables = () => {
		let reemplazos = 0;
		const html = contenido.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (match, clave: string) => {
			const valor = valores[clave];
			if (!valor) return match;
			reemplazos++;
			return escapar(valor);
		});
		if (!reemplazos) {
			toast.info("No hay variables con datos para completar");
			return;
		}
		setContenido(html);
		setDirty(true);
		toast.success(`${reemplazos} variable${reemplazos > 1 ? "s" : ""} completada${reemplazos > 1 ? "s" : ""}`);
	};

	// Variables editables que el escrito usa y todavía no tienen dato.
	const faltantes = DATOS_EDITABLES.filter(
		(d) => !valores[d.clave] && usaVariable(contenido, d.clave),
	);

	// Guarda los datos en el sistema, completa esas variables en el texto y
	// guarda el escrito.
	const guardarDatos = async () => {
		if (!token) return;
		const body: Record<string, string | number> = {};
		for (const d of faltantes) {
			const v = datos[d.clave]?.trim();
			if (!v) continue;
			if (d.tipo === "monto") {
				const n = parseMonto(v);
				if (n == null) return void toast.error("El monto reclamado no es un número");
				body[d.clave] = n;
			} else if (d.tipo === "porcentaje") {
				const n = Number(v.replace(",", "."));
				if (!Number.isFinite(n) || n < 0 || n > 100) {
					return void toast.error("El % de incapacidad va de 0 a 100");
				}
				body[d.clave] = n;
			} else {
				body[d.clave] = v;
			}
		}
		if (Object.keys(body).length === 0) return void toast.error("Completá al menos un dato");

		setAccion("datos");
		try {
			const res = await escritosFetch<{ data: { valores: Record<string, string | null> } }>(
				ESCRITO_DATOS_ENDPOINT(escritoId),
				token,
				{ method: "PUT", body: JSON.stringify(body) },
			);
			setValores(res.data.valores);
			const claves = Object.keys(body);
			const html = contenido.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (match, clave: string) => {
				const valor = res.data.valores[clave];
				return claves.includes(clave) && valor ? escapar(valor) : match;
			});
			setContenido(html);
			setDatos({});
			if (await guardar(html)) toast.success("Datos guardados en el sistema y completados en el escrito");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setAccion(null);
		}
	};

	if (!escrito) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
			<div className="flex flex-wrap items-center gap-2">
				<Link href={`/admin/legal-cases/${caseId}?tab=escritos`}>
					<Button variant="ghost" size="sm">
						<ArrowLeft className="mr-1 h-4 w-4" /> Escritos del caso
					</Button>
				</Link>
				<span className="text-sm text-muted-foreground">
					{escrito.file ? getExpedienteLabel(escrito.file) : "Sin expediente"}
				</span>
			</div>

			<div className="flex flex-wrap items-end gap-3">
				<div className="min-w-64 flex-1">
					<Input
						value={titulo}
						onChange={(e) => {
							setTitulo(e.target.value);
							setDirty(true);
						}}
						maxLength={200}
						className="text-lg font-semibold"
						aria-label="Título del escrito"
					/>
					<p className="mt-1 text-xs text-muted-foreground">
						{dirty ? "Cambios sin guardar" : "Guardado"}
						{escrito.pdfGeneradoAt
							? ` · Último PDF guardado ${fechaHora(escrito.pdfGeneradoAt)}`
							: " · Todavía sin PDF guardado"}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" size="sm" onClick={completarVariables}>
						<Wand2 className="mr-1 h-4 w-4" />
						Completar variables
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleGuardar}
						disabled={accion !== null || !dirty}
					>
						{accion === "guardar" ? (
							<Loader2 className="mr-1 h-4 w-4 animate-spin" />
						) : (
							<Save className="mr-1 h-4 w-4" />
						)}
						Guardar
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handlePreview}
						disabled={accion !== null}
					>
						{accion === "preview" ? (
							<Loader2 className="mr-1 h-4 w-4 animate-spin" />
						) : (
							<Eye className="mr-1 h-4 w-4" />
						)}
						Vista previa PDF
					</Button>
					<Button
						size="sm"
						onClick={handleGuardarPdf}
						disabled={accion !== null || !escrito.fileId}
						title={escrito.fileId ? undefined : "El escrito no tiene expediente"}
					>
						{accion === "pdf" ? (
							<Loader2 className="mr-1 h-4 w-4 animate-spin" />
						) : (
							<FileCheck2 className="mr-1 h-4 w-4" />
						)}
						Generar y guardar PDF
					</Button>
				</div>
			</div>

			{faltantes.length > 0 && (
				<div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
					<div className="mb-3">
						<p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
							Datos que faltan en el sistema
						</p>
						<p className="text-xs text-amber-800/80 dark:text-amber-300/80">
							Se guardan en el cliente o en el caso (quedan para los próximos escritos) y se
							completan en este escrito.
						</p>
					</div>
					<div className="flex flex-wrap items-end gap-3">
						{faltantes.map((d) => (
							<div key={d.clave} className="w-56 space-y-1">
								<Label className="text-xs">{d.etiqueta}</Label>
								{d.tipo === "estadoCivil" ? (
									<Select
										value={datos[d.clave] ?? ""}
										onValueChange={(v) => setDatos((prev) => ({ ...prev, [d.clave]: v }))}
									>
										<SelectTrigger className="bg-white dark:bg-background">
											<SelectValue placeholder="Elegí…" />
										</SelectTrigger>
										<SelectContent>
											{ESTADOS_CIVILES.map((e) => (
												<SelectItem key={e} value={e}>
													{e}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<Input
										inputMode="decimal"
										className="bg-white dark:bg-background"
										placeholder={d.tipo === "monto" ? "Ej: 11.804.857" : "Ej: 28"}
										value={datos[d.clave] ?? ""}
										onChange={(e) =>
											setDatos((prev) => ({
												...prev,
												[d.clave]: e.target.value.replace(/[^\d.,]/g, ""),
											}))
										}
									/>
								)}
							</div>
						))}
						<Button size="sm" onClick={guardarDatos} disabled={accion !== null}>
							{accion === "datos" ? (
								<Loader2 className="mr-1 h-4 w-4 animate-spin" />
							) : (
								<Save className="mr-1 h-4 w-4" />
							)}
							Guardar datos
						</Button>
					</div>
				</div>
			)}

			<EscritoEditor
				value={contenido}
				onChange={(html) => {
					setContenido(html);
					setDirty(true);
				}}
				formato={escrito}
				variables={variables}
			/>
		</div>
	);
}
