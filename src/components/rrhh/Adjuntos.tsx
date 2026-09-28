"use client";

import { FileText, Paperclip, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import {
	abrirDocumento,
	eliminarDocumento,
	formatPeriodo,
	type RrhhDocumento,
	type SubirDocumentoCampos,
} from "./api";
import SubirDocumentoDialog from "./SubirDocumentoDialog";

// Archivos de un contrato, recibo o licencia, en la misma fila: se abren con
// un clic y (según permisos) se adjunta otro o se quita.

export default function Adjuntos({
	userId,
	documentos,
	fijo,
	puedeSubir,
	puedeBorrar,
	textoBoton = "Adjuntar",
	onCambio,
}: {
	userId: number;
	documentos: RrhhDocumento[];
	fijo: SubirDocumentoCampos;
	puedeSubir: boolean;
	puedeBorrar: boolean;
	textoBoton?: string;
	onCambio: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [subir, setSubir] = useState(false);

	const abrir = (d: RrhhDocumento) =>
		abrirDocumento(token, d.id).catch((err) => toast.error(err.message));

	const quitar = async (d: RrhhDocumento) => {
		if (!confirm(`¿Quitar "${d.titulo}" del legajo?`)) return;
		try {
			await eliminarDocumento(token, d.id);
			toast.success("Documento quitado");
			onCambio();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo quitar");
		}
	};

	if (documentos.length === 0 && !puedeSubir) return null;

	return (
		<div className="flex flex-wrap items-center gap-1.5 mt-1.5">
			{documentos.map((d) => (
				<span
					key={d.id}
					className="inline-flex max-w-[16rem] items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs"
				>
					<button
						type="button"
						onClick={() => abrir(d)}
						className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
						title={d.nombreArchivo}
					>
						<FileText className="h-3 w-3 shrink-0" />
						<span className="truncate">
							{d.periodo && !d.titulo.includes(d.periodo) ? `${formatPeriodo(d.periodo)} · ` : ""}
							{d.titulo}
						</span>
					</button>
					{puedeBorrar && (
						<button
							type="button"
							onClick={() => quitar(d)}
							className="text-muted-foreground hover:text-destructive"
							title="Quitar"
						>
							<X className="h-3 w-3" />
						</button>
					)}
				</span>
			))}
			{puedeSubir && (
				<button
					type="button"
					onClick={() => setSubir(true)}
					className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
				>
					<Paperclip className="h-3 w-3" />
					{textoBoton}
				</button>
			)}
			<SubirDocumentoDialog
				open={subir}
				onOpenChange={setSubir}
				userId={userId}
				fijo={fijo}
				onSubido={onCambio}
			/>
		</div>
	);
}
