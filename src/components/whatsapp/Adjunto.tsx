"use client";

import { Check, Download, Eye, FileText, FolderInput, Loader2, Paperclip, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// An attachment of a WhatsApp message: images as a thumbnail, audios with a
// player, PDF / Word / Excel / video with a viewer, plus download and "save to
// the lead's documentation". Links come from our MinIO copy and last 10 min,
// so they are asked for when needed.

export interface MediaAdjunto {
	contentType: string;
	objectKey: string | null;
	/** Already copied to the lead's documentation. */
	crmDocumentId?: number | null;
}

type Tipo = "imagen" | "audio" | "pdf" | "office" | "video" | "otro";

const OFFICE = /msword|officedocument|ms-excel|ms-powerpoint/;

function tipoDe(contentType: string): Tipo {
	const t = contentType.toLowerCase();
	if (t.startsWith("image/")) return "imagen";
	if (t.startsWith("audio/")) return "audio";
	if (t.startsWith("video/")) return "video";
	if (t.includes("pdf")) return "pdf";
	if (OFFICE.test(t)) return "office";
	return "otro";
}

const ETIQUETA: Record<Tipo, string> = {
	imagen: "Imagen",
	audio: "Audio",
	pdf: "PDF",
	office: "Documento de Office",
	video: "Video",
	otro: "Archivo",
};

export default function Adjunto({
	media,
	cargarUrl,
	esLead,
	onGuardarEnLead,
}: {
	media: MediaAdjunto;
	cargarUrl: (descargar?: boolean) => Promise<string | null>;
	esLead: boolean;
	onGuardarEnLead: () => Promise<void>;
}) {
	const tipo = tipoDe(media.contentType);
	const [vista, setVista] = useState<string | null>(null);
	const [ocupado, setOcupado] = useState<"ver" | "bajar" | "lead" | null>(null);

	if (!media.objectKey)
		return (
			<p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
				<Paperclip className="h-3.5 w-3.5" />
				Guardando adjunto…
			</p>
		);

	const ver = async () => {
		setOcupado("ver");
		setVista(await cargarUrl());
		setOcupado(null);
	};
	const descargar = async () => {
		setOcupado("bajar");
		const url = await cargarUrl(true);
		// The link answers "attachment": the browser saves it and stays on the page.
		if (url) window.location.href = url;
		setOcupado(null);
	};
	const guardar = async () => {
		setOcupado("lead");
		await onGuardarEnLead();
		setOcupado(null);
	};

	return (
		<div className="mt-1 space-y-1">
			{tipo === "imagen" ? (
				<Miniatura cargarUrl={cargarUrl} onAbrir={setVista} />
			) : tipo === "audio" ? (
				<AudioAdjunto cargarUrl={cargarUrl} />
			) : (
				<button
					type="button"
					onClick={tipo === "otro" ? descargar : ver}
					disabled={!!ocupado}
					className="flex w-56 max-w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-xs hover:bg-muted"
				>
					{ocupado === "ver" ? (
						<Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
					) : tipo === "video" ? (
						<Play className="h-5 w-5 shrink-0 text-primary" />
					) : (
						<FileText className="h-5 w-5 shrink-0 text-primary" />
					)}
					<span className="min-w-0">
						<span className="block font-medium text-foreground">{ETIQUETA[tipo]}</span>
						<span className="block truncate text-muted-foreground">
							{tipo === "otro" ? media.contentType : "Tocá para verlo"}
						</span>
					</span>
				</button>
			)}

			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				<button
					type="button"
					onClick={descargar}
					disabled={!!ocupado}
					className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-60"
				>
					{ocupado === "bajar" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
					Descargar
				</button>
				{esLead &&
					(media.crmDocumentId ? (
						<span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
							<Check className="h-3 w-3" />
							En la documentación del lead
						</span>
					) : (
						<button
							type="button"
							onClick={guardar}
							disabled={!!ocupado}
							className="inline-flex items-center gap-1 text-sky-700 hover:underline disabled:opacity-60 dark:text-sky-300"
						>
							{ocupado === "lead" ? (
								<Loader2 className="h-3 w-3 animate-spin" />
							) : (
								<FolderInput className="h-3 w-3" />
							)}
							Guardar en el lead
						</button>
					))}
			</div>

			<Dialog open={!!vista} onOpenChange={(o) => !o && setVista(null)}>
				<DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3 sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>{ETIQUETA[tipo]} de WhatsApp</DialogTitle>
					</DialogHeader>
					{vista && (
						<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
							{tipo === "imagen" ? (
								// biome-ignore lint/performance/noImgElement: short-lived signed MinIO link, not for next/image.
								<img src={vista} alt="Imagen enviada por WhatsApp" className="max-h-full max-w-full object-contain" />
							) : tipo === "video" ? (
								// biome-ignore lint/a11y/useMediaCaption: client videos have no captions.
								<video src={vista} controls autoPlay className="max-h-full max-w-full" />
							) : (
								<iframe
									title={ETIQUETA[tipo]}
									src={
										tipo === "office"
											? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(vista)}`
											: vista
									}
									className="h-full w-full bg-background"
								/>
							)}
						</div>
					)}
					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-muted-foreground">
							{tipo === "office" ? "Se ve con Office Online. Si no carga, descargalo." : ""}
						</p>
						<Button variant="outline" size="sm" onClick={descargar} disabled={!!ocupado}>
							<Download className="mr-1.5 h-4 w-4" />
							Descargar
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/** Thumbnail that asks for its link when shown; a click opens it big. */
function Miniatura({
	cargarUrl,
	onAbrir,
}: {
	cargarUrl: () => Promise<string | null>;
	onAbrir: (url: string) => void;
}) {
	const [url, setUrl] = useState<string | null>(null);
	const [fallo, setFallo] = useState(false);

	useEffect(() => {
		let vigente = true;
		cargarUrl().then((u) => {
			if (!vigente) return;
			if (u) setUrl(u);
			else setFallo(true);
		});
		return () => {
			vigente = false;
		};
		// Once per attachment: the link is not renewed on each poll of the thread.
	}, []);

	if (fallo) return <p className="text-xs text-muted-foreground">No se pudo cargar la imagen.</p>;
	if (!url)
		return (
			<div className="flex h-40 w-56 max-w-full items-center justify-center rounded-md bg-muted">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			</div>
		);
	return (
		<button type="button" onClick={() => onAbrir(url)} className="block" aria-label="Ver imagen">
			{/* biome-ignore lint/performance/noImgElement: short-lived signed MinIO link, not for next/image. */}
			<img
				src={url}
				alt="Imagen enviada por WhatsApp"
				className="max-h-60 w-56 max-w-full rounded-md object-cover"
				onError={() => setFallo(true)}
			/>
		</button>
	);
}

/** A voice note or audio from the client: asks for its link when played (it lasts 10 min). */
function AudioAdjunto({ cargarUrl }: { cargarUrl: () => Promise<string | null> }) {
	const [url, setUrl] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);

	if (url)
		return (
			// biome-ignore lint/a11y/useMediaCaption: client voice notes have no captions.
			<audio
				controls
				autoPlay
				src={url}
				aria-label="Audio del mensaje"
				className="h-10 w-72 max-w-full"
				onError={() => {
					setUrl(null);
					toast.error("No se pudo reproducir el audio. Probá de nuevo.");
				}}
			/>
		);
	return (
		<button
			type="button"
			disabled={cargando}
			onClick={async () => {
				setCargando(true);
				setUrl(await cargarUrl());
				setCargando(false);
			}}
			className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-muted disabled:opacity-60"
		>
			{cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
			Escuchar audio
		</button>
	);
}
