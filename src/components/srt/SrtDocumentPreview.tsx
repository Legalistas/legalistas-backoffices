"use client";

import { Loader2, Printer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// =============================================================================
// Vista previa del formulario SRT.
//
// Los HTML de `public/srt/` ya son formularios reales, con <input name="...">.
// Así que no hace falta ningún motor de templates: cargamos el documento en un
// iframe y le escribimos los valores por `name`. Como se sirve del mismo
// origen, podemos tocar su DOM directamente.
// =============================================================================

/** Valores a volcar en el documento, indexados por el `name` del input. */
export type PreviewValues = Record<string, string | boolean | null | undefined>;

export function SrtDocumentPreview({
	src,
	values,
	onFieldChange,
	printRef,
}: {
	src: string;
	values: PreviewValues;
	/** Se dispara al editar directamente sobre el documento. */
	onFieldChange?: (name: string, value: string | boolean) => void;
	/**
	 * La página guarda acá la función de imprimir, para poder dispararla desde
	 * su propio botón de guardar. El PDF sale siempre de este iframe.
	 */
	printRef?: { current: (() => void) | null };
}) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [ready, setReady] = useState(false);

	// Nota: al cambiar de documento hay que remontar este componente
	// (`key={src}` en el padre), para que `ready` vuelva a false y se espere el
	// load del HTML nuevo antes de escribirle los valores.

	// Los HTML están pensados para verse como una hoja sobre un escritorio gris.
	// En la preview queremos solo la hoja: sacamos el fondo, el margen y la
	// sombra, igual que hace el @media print del propio documento.
	const trimToPaper = useCallback(() => {
		const doc = iframeRef.current?.contentDocument;
		if (!doc || doc.getElementById("preview-trim")) return;
		const style = doc.createElement("style");
		style.id = "preview-trim";
		style.textContent = `
			html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
			.page { margin: 0 auto !important; box-shadow: none !important; }
		`;
		doc.head.appendChild(style);
	}, []);

	const paint = useCallback(() => {
		const doc = iframeRef.current?.contentDocument;
		if (!doc) return;

		for (const [name, value] of Object.entries(values)) {
			// Los name pueden repetirse (checkbox de un mismo grupo), por eso va
			// querySelectorAll y no querySelector.
			const nodes = doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
				`[name="${CSS.escape(name)}"]`,
			);
			for (const node of nodes) {
				// Si se está escribiendo en ese mismo campo dentro del documento,
				// no lo pisamos: le movería el cursor al final en cada tecla.
				if (node === doc.activeElement) continue;

				// Nada de `instanceof HTMLInputElement`: los nodos del iframe son
				// de otro realm y su constructor no es el de esta ventana, así que
				// siempre daría false. Se mira el `type`, que es del propio nodo.
				if (node.type === "checkbox") {
					(node as HTMLInputElement).checked = value === true;
				} else {
					node.value = value == null || value === false ? "" : String(value);
				}
			}
		}
	}, [values]);

	// Repinta con cada tecla, y también apenas el documento termina de cargar.
	useEffect(() => {
		if (!ready) return;
		trimToPaper();
		paint();
	}, [ready, paint, trimToPaper]);

	// El documento también es editable: lo que se toca ahí vuelve al formulario.
	useEffect(() => {
		const doc = iframeRef.current?.contentDocument;
		if (!ready || !doc || !onFieldChange) return;

		const handler = (event: Event) => {
			// Mismo motivo que en `paint`: `instanceof` no cruza realms, hay que
			// mirar las propiedades del nodo.
			const el = event.target as HTMLInputElement | HTMLTextAreaElement | null;
			if (!el?.name) return;

			onFieldChange(
				el.name,
				el.type === "checkbox"
					? (el as HTMLInputElement).checked
					: el.value,
			);
		};

		doc.addEventListener("input", handler);
		doc.addEventListener("change", handler);
		return () => {
			doc.removeEventListener("input", handler);
			doc.removeEventListener("change", handler);
		};
	}, [ready, onFieldChange]);

	// Imprime el documento que está a la vista. Sale del mismo HTML que se ve
	// en pantalla, así que lo impreso es exactamente la previa.
	const print = useCallback(() => {
		const win = iframeRef.current?.contentWindow;
		if (!win) return;
		win.focus();
		win.print();
	}, []);

	// La página necesita poder imprimir desde su propio botón de guardar.
	useEffect(() => {
		if (!printRef) return;
		printRef.current = ready ? print : null;
		return () => {
			printRef.current = null;
		};
	}, [printRef, print, ready]);

	return (
		<div className="relative h-full w-full overflow-hidden rounded-lg border bg-white">
			{!ready && (
				<div className="absolute inset-0 flex items-center justify-center bg-muted">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			)}

			<Button
				type="button"
				size="sm"
				variant="secondary"
				onClick={print}
				disabled={!ready}
				className="absolute top-3 right-5 z-10 shadow-md"
			>
				<Printer className="mr-1.5 h-3.5 w-3.5" />
				Imprimir / PDF
			</Button>

			<iframe
				ref={iframeRef}
				src={src}
				title="Vista previa del formulario"
				onLoad={() => setReady(true)}
				className="h-full w-full border-0 bg-white"
			/>
		</div>
	);
}
