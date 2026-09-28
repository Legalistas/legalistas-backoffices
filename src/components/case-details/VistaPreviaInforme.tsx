"use client";

import { Eye, Loader2, Maximize2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CASE_INFORME_PREVIEW_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";

// Vista previa del informe periódico: el mismo HTML con el que el backend
// arma el PDF (templates/quarterly-report.ts), en una hoja A4 de tamaño real.
// "Ver PDF" abre el PDF de verdad en grande, con el zoom del navegador.

export interface DatosInforme {
	customerName: string;
	caseNumber: string;
	stageId: number;
	estadoActualHtml: string;
	incapacityPercentage: string;
}

const ALTO_A4 = 1123; // 297 mm en px

interface VistaPreviaInformeProps {
	caseId: number;
	datos: DatosInforme;
	generarPdf: () => Promise<Blob | null>;
}

export function VistaPreviaInforme({ caseId, datos, generarPdf }: VistaPreviaInformeProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [html, setHtml] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);
	const [alto, setAlto] = useState(ALTO_A4);
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [generandoPdf, setGenerandoPdf] = useState(false);

	// Se rearma al editar (con una pausa, para no pedirla en cada tecla).
	const cuerpo = JSON.stringify(datos);
	useEffect(() => {
		if (!token) return;
		const ctrl = new AbortController();
		const espera = setTimeout(async () => {
			setCargando(true);
			try {
				const res = await fetch(CASE_INFORME_PREVIEW_ENDPOINT(caseId), {
					method: "POST",
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
					body: cuerpo,
					signal: ctrl.signal,
				});
				if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo armar la vista previa"));
				setHtml((await res.json()).html);
			} catch (e) {
				if ((e as Error).name !== "AbortError") console.error("Vista previa del informe:", e);
			} finally {
				if (!ctrl.signal.aborted) setCargando(false);
			}
		}, 400);
		return () => {
			clearTimeout(espera);
			ctrl.abort();
		};
	}, [caseId, cuerpo, token]);

	// Alto del contenido: si el informe ocupa más de una hoja, se ve entero.
	const medir = () => {
		const doc = iframeRef.current?.contentDocument;
		if (doc) setAlto(Math.max(doc.documentElement.scrollHeight, ALTO_A4));
	};

	const verPdf = async () => {
		setGenerandoPdf(true);
		try {
			const blob = await generarPdf();
			if (!blob) throw new Error("No se pudo generar el PDF");
			setPdfUrl(URL.createObjectURL(blob));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudo generar el PDF");
		} finally {
			setGenerandoPdf(false);
		}
	};

	const cerrarPdf = () => {
		if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		setPdfUrl(null);
	};

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Eye className="h-4 w-4 text-muted-foreground" />
					<p className="text-sm font-semibold text-foreground">Vista previa</p>
					<span className="text-xs text-muted-foreground">— así lo recibe el cliente</span>
					{cargando && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
				</div>
				<Button size="sm" variant="outline" onClick={verPdf} disabled={generandoPdf}>
					{generandoPdf ? (
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
					) : (
						<Maximize2 className="mr-1.5 h-3.5 w-3.5" />
					)}
					Ver PDF en grande
				</Button>
			</div>

			<div className="overflow-x-auto rounded-lg bg-muted/50 p-4 sm:p-6">
				<iframe
					ref={iframeRef}
					title="Vista previa del informe"
					srcDoc={html ?? ""}
					onLoad={medir}
					// Sin scripts: el estado actual es HTML que escribe el equipo.
					sandbox="allow-same-origin"
					className="mx-auto block border-0 bg-white shadow-md"
					style={{ width: "210mm", height: `${alto}px` }}
				/>
			</div>

			<Dialog open={pdfUrl !== null} onOpenChange={(abierto) => !abierto && cerrarPdf()}>
				<DialogContent className="flex h-[92vh] max-w-[min(1100px,95vw)] flex-col gap-3 sm:max-w-[min(1100px,95vw)]">
					<DialogHeader>
						<DialogTitle>Informe periódico — PDF</DialogTitle>
					</DialogHeader>
					{pdfUrl && (
						<iframe title="PDF del informe" src={pdfUrl} className="min-h-0 w-full flex-1 rounded border" />
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
