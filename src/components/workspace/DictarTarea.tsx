"use client";

import { format } from "date-fns";
import { ChevronDown, Loader2, Mic, Square, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorMessage, workspaceUpload } from "@/lib/workspace-api";
import type { WorkCard } from "@/types/workspace";

// A dictation is a few sentences; this keeps the file well under the 25 MB upload limit.
const MAX_SEGUNDOS = 10 * 60;

/** What this browser can record, with the extension the backend accepts (Chrome: webm, Safari: mp4). */
const formatoDeGrabacion = () =>
	typeof MediaRecorder === "undefined"
		? undefined
		: [
				{ type: "audio/webm;codecs=opus", ext: "webm" },
				{ type: "audio/webm", ext: "webm" },
				{ type: "audio/mp4", ext: "m4a" },
			].find((f) => MediaRecorder.isTypeSupported(f.type));

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

interface Props {
	projectId: number;
	token: string | undefined;
	/** The card was made (it already has the audio attached): open it to review. */
	onCreated: (card: WorkCard) => void;
}

/** "Dictar": record or upload an audio and the backend turns it into a card (backend dictado.ts). */
export function DictarTarea({ projectId, token, onCreated }: Props) {
	const [estado, setEstado] = useState<"listo" | "grabando" | "enviando">("listo");
	const [segundos, setSegundos] = useState(0);
	const recorder = useRef<MediaRecorder | null>(null);
	const descartar = useRef(false);
	const selector = useRef<HTMLInputElement>(null);

	// Leaving the board mid-recording turns the mic off and sends nothing.
	useEffect(
		() => () => {
			descartar.current = true;
			recorder.current?.stop();
		},
		[],
	);

	useEffect(() => {
		if (estado !== "grabando") return;
		const t = setInterval(() => setSegundos((s) => s + 1), 1000);
		return () => clearInterval(t);
	}, [estado]);

	useEffect(() => {
		if (estado === "grabando" && segundos >= MAX_SEGUNDOS) recorder.current?.stop();
	}, [estado, segundos]);

	const enviar = async (file: File) => {
		setEstado("enviando");
		try {
			const card = await workspaceUpload<WorkCard & { audioGuardado: boolean }>(
				`/projects/${projectId}/tasks/audio`,
				token,
				file,
			);
			if (card.audioGuardado) toast.success("Tarea creada desde el audio. Revisala antes de seguir.");
			else toast.warning("Tarea creada, pero no se pudo guardar el audio en la tarjeta");
			onCreated(card);
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo armar la tarea con el audio"));
		} finally {
			setEstado("listo");
		}
	};

	const grabar = async () => {
		const formato = formatoDeGrabacion();
		if (!formato || !navigator.mediaDevices?.getUserMedia) {
			toast.error("Este navegador no puede grabar. Probá con Subir un audio.");
			return;
		}
		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch {
			toast.error("No hay permiso para usar el micrófono. Habilitalo en el candado de la barra de direcciones.");
			return;
		}
		const partes: Blob[] = [];
		const r = new MediaRecorder(stream, { mimeType: formato.type });
		r.ondataavailable = (e) => {
			if (e.data.size) partes.push(e.data);
		};
		r.onstop = () => {
			for (const track of stream.getTracks()) track.stop();
			recorder.current = null;
			if (descartar.current || !partes.length) {
				setEstado("listo");
				return;
			}
			const type = formato.type.split(";")[0];
			enviar(new File(partes, `dictado-${format(new Date(), "yyyy-MM-dd-HHmm")}.${formato.ext}`, { type }));
		};
		descartar.current = false;
		recorder.current = r;
		setSegundos(0);
		r.start();
		setEstado("grabando");
	};

	const terminar = (enviarlo: boolean) => {
		descartar.current = !enviarlo;
		recorder.current?.stop();
	};

	if (estado === "grabando") {
		return (
			<div className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 py-0.5 pr-0.5 pl-2.5 dark:border-red-900/60 dark:bg-red-950/40">
				<span className="size-2 animate-pulse rounded-full bg-red-600 motion-reduce:animate-none" aria-hidden />
				<span role="status" className="min-w-16 text-sm tabular-nums text-red-700 dark:text-red-300">
					Grabando {reloj(segundos)}
				</span>
				<Button size="sm" className="h-7" onClick={() => terminar(true)}>
					<Square className="size-3.5 fill-current" />
					Listo
				</Button>
				<Button
					size="icon"
					variant="ghost"
					className="size-7 text-muted-foreground"
					onClick={() => terminar(false)}
					aria-label="Cancelar la grabación"
				>
					<X className="size-4" />
				</Button>
			</div>
		);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="h-8" disabled={estado === "enviando"}>
						{estado === "enviando" ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Armando la tarea…
							</>
						) : (
							<>
								<Mic className="size-4" />
								Dictar
								<ChevronDown className="size-3.5 opacity-60" />
							</>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-64">
					<DropdownMenuItem onSelect={grabar}>
						<Mic className="size-4" />
						<span className="flex-1">Grabar con el micrófono</span>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => selector.current?.click()}>
						<Upload className="size-4" />
						<span className="flex-1">Subir un audio</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<input
				ref={selector}
				type="file"
				accept="audio/*,.mp3,.m4a,.ogg,.opus,.wav,.webm"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (file) enviar(file);
				}}
			/>
		</>
	);
}
