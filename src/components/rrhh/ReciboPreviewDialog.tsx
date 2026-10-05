"use client";

import { Download, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PAYROLL_RECIBO_ENDPOINT, PAYROLL_RECIBO_PDF_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";

// Vista previa del recibo de sueldo: el mismo HTML con el que el backend arma
// el PDF (templates/recibo-sueldo.ts), en una hoja A4 que se achica para
// entrar en la pantalla. "Descargar PDF" baja el PDF de verdad.

const ANCHO_A4 = 794; // 210 mm en px
const ALTO_A4 = 1123; // 297 mm en px

interface ReciboPreviewDialogProps {
	/** Recibo a mostrar; null = cerrado. */
	payrollId: number | null;
	/** "Septiembre de 2026", para el título. */
	periodo?: string;
	onClose: () => void;
}

export default function ReciboPreviewDialog({ payrollId, periodo, onClose }: ReciboPreviewDialogProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [html, setHtml] = useState<string | null>(null);
	const [fileName, setFileName] = useState("recibo.pdf");
	const [error, setError] = useState<string | null>(null);
	const [descargando, setDescargando] = useState(false);
	const [alto, setAlto] = useState(ALTO_A4);
	const [escala, setEscala] = useState(1);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		if (!payrollId || !token) return;
		const ctrl = new AbortController();
		setHtml(null);
		setError(null);
		setAlto(ALTO_A4);
		(async () => {
			try {
				const res = await fetch(PAYROLL_RECIBO_ENDPOINT(payrollId), {
					headers: { Authorization: `Bearer ${token}` },
					signal: ctrl.signal,
				});
				if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo armar el recibo"));
				const data: { html: string; fileName: string } = await res.json();
				setHtml(data.html);
				setFileName(data.fileName);
			} catch (e) {
				if ((e as Error).name !== "AbortError") {
					setError(e instanceof Error ? e.message : "No se pudo armar el recibo");
				}
			}
		})();
		return () => ctrl.abort();
	}, [payrollId, token]);

	// La hoja mide siempre 210 mm: se escala al ancho disponible (celular, diálogo angosto).
	const observador = useRef<ResizeObserver | null>(null);
	const medirContenedor = useCallback((nodo: HTMLDivElement | null) => {
		observador.current?.disconnect();
		if (!nodo) return;
		observador.current = new ResizeObserver(([entrada]) => {
			setEscala(Math.min(1, entrada.contentRect.width / ANCHO_A4));
		});
		observador.current.observe(nodo);
	}, []);

	// Si el recibo ocupa más de una hoja (observaciones largas), se ve entero.
	const medirHoja = () => {
		const doc = iframeRef.current?.contentDocument;
		if (doc) setAlto(Math.max(doc.documentElement.scrollHeight, ALTO_A4));
	};

	const descargar = async () => {
		if (!payrollId || !token) return;
		setDescargando(true);
		try {
			const res = await fetch(PAYROLL_RECIBO_PDF_ENDPOINT(payrollId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo generar el PDF"));
			const url = URL.createObjectURL(await res.blob());
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "No se pudo generar el PDF");
		} finally {
			setDescargando(false);
		}
	};

	return (
		<Dialog open={payrollId !== null} onOpenChange={(abierto) => !abierto && onClose()}>
			<DialogContent className="flex max-h-[94vh] max-w-[min(900px,96vw)] flex-col gap-3 sm:max-w-[min(900px,96vw)]">
				<DialogHeader>
					<div className="flex flex-wrap items-center justify-between gap-3 pr-8">
						<div className="min-w-0 text-left">
							<DialogTitle>Recibo de sueldo{periodo ? ` — ${periodo}` : ""}</DialogTitle>
							<DialogDescription>Vista previa: así sale el PDF.</DialogDescription>
						</div>
						<Button size="sm" onClick={descargar} disabled={!html || descargando}>
							{descargando ? (
								<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
							) : (
								<Download className="mr-1.5 h-4 w-4" />
							)}
							Descargar PDF
						</Button>
					</div>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-muted/60 p-3 sm:p-5">
					{error ? (
						<p className="py-16 text-center text-sm text-red-600">{error}</p>
					) : !html ? (
						<div className="flex items-center justify-center py-24">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div ref={medirContenedor}>
							{/* El alto del contenedor acompaña a la hoja escalada. */}
							<div className="mx-auto" style={{ width: ANCHO_A4 * escala, height: alto * escala }}>
								<iframe
									ref={iframeRef}
									title="Vista previa del recibo de sueldo"
									srcDoc={html}
									onLoad={medirHoja}
									// Sin scripts: el recibo lleva texto que escribe el equipo.
									sandbox="allow-same-origin"
									className="block origin-top-left border-0 bg-white shadow-md"
									style={{
										width: ANCHO_A4,
										height: alto,
										transform: `scale(${escala})`,
									}}
								/>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
