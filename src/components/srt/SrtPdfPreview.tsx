"use client";

import type { DocumentProps } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// =============================================================================
// Visor del PDF real, hecho con @react-pdf/renderer.
//
// Lo que se ve acá y lo que se descarga salen del MISMO componente, así que no
// hay forma de que difieran.
//
// No usa <PDFViewer>: ese componente rearma su iframe en cada cambio de props
// y hace parpadear la pantalla con cada tecla. Acá se genera el Blob aparte y
// recién cuando está listo se cambia el `src` de un iframe que nunca se
// desmonta. Mientras tanto sigue viéndose el PDF anterior.
// =============================================================================

/** Genera el PDF como Blob. Sirve para mostrar, descargar y archivar. */
export async function renderPdfBlob(
	doc: ReactElement<DocumentProps>,
): Promise<Blob> {
	const { pdf } = await import("@react-pdf/renderer");
	return pdf(doc).toBlob();
}

export function SrtPdfPreview({
	doc,
	fileName,
	blobRef,
}: {
	doc: ReactElement<DocumentProps>;
	fileName: string;
	/** La página lo usa para obtener el PDF al guardar. */
	blobRef?: { current: (() => Promise<Blob>) | null };
}) {
	const [url, setUrl] = useState<string | null>(null);
	const [rendering, setRendering] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [downloading, setDownloading] = useState(false);
	const urlRef = useRef<string | null>(null);

	useEffect(() => {
		if (blobRef) blobRef.current = () => renderPdfBlob(doc);

		let cancelled = false;
		setRendering(true);

		renderPdfBlob(doc)
			.then((blob) => {
				if (cancelled) return;
				const next = URL.createObjectURL(blob);
				// Recién acá se reemplaza el PDF a la vista: el anterior siguió
				// visible todo el tiempo que tardó el nuevo en generarse.
				if (urlRef.current) URL.revokeObjectURL(urlRef.current);
				urlRef.current = next;
				setUrl(next);
				setError(null);
			})
			.catch((err: Error) => {
				if (!cancelled) setError(err.message);
			})
			.finally(() => {
				if (!cancelled) setRendering(false);
			});

		return () => {
			cancelled = true;
		};
	}, [doc, blobRef]);

	// Al desmontar, soltar el último objeto URL.
	useEffect(() => {
		return () => {
			if (urlRef.current) URL.revokeObjectURL(urlRef.current);
		};
	}, []);

	const handleDownload = async () => {
		setDownloading(true);
		try {
			const blob = await renderPdfBlob(doc);
			const href = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = href;
			a.download = fileName;
			a.click();
			URL.revokeObjectURL(href);
		} finally {
			setDownloading(false);
		}
	};

	return (
		<div className="relative h-full w-full overflow-hidden rounded-lg border bg-white">
			<div className="absolute top-3 right-5 z-10 flex items-center gap-2">
				{rendering && (
					<span className="flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
						<Loader2 className="h-3 w-3 animate-spin" />
						Actualizando
					</span>
				)}
				<Button
					type="button"
					size="sm"
					variant="secondary"
					onClick={handleDownload}
					disabled={downloading}
					className="shadow-md"
				>
					{downloading ? (
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
					) : (
						<Download className="mr-1.5 h-3.5 w-3.5" />
					)}
					Descargar PDF
				</Button>
			</div>

			{error && (
				<div className="absolute inset-x-0 top-0 z-10 bg-red-50 px-4 py-2 text-xs text-red-700">
					No se pudo generar el PDF: {error}
				</div>
			)}

			{url ? (
				<iframe
					src={`${url}#toolbar=0`}
					title="Vista previa del formulario"
					className="h-full w-full border-0"
				/>
			) : (
				<div className="flex h-full items-center justify-center">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			)}
		</div>
	);
}
