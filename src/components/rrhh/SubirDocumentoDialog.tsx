"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TIPO_DOCUMENTO_LABEL, type TipoDocumento } from "@/constant/rrhh";
import { formatTamanio, type SubirDocumentoCampos, subirDocumento } from "./api";

// Sube un archivo al legajo (MinIO rrhh/APELLIDO_NOMBRE_#id/<carpeta>/).
// Con `fijo` viene atado a un contrato, recibo o licencia y el tipo no se elige.

const ACEPTA = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv";
const MAX_BYTES = 25 * 1024 * 1024;
const CON_PERIODO: TipoDocumento[] = ["RECIBO", "ASISTENCIA"];

const mesActual = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function SubirDocumentoDialog({
	open,
	onOpenChange,
	userId,
	fijo,
	tipos,
	descripcion,
	onSubido,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: number;
	/** Documento atado a algo (tipo fijo, sin selector). */
	fijo?: SubirDocumentoCampos;
	/** Tipos para elegir si no viene `fijo`. */
	tipos?: TipoDocumento[];
	descripcion?: string;
	onSubido: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const inputRef = useRef<HTMLInputElement>(null);
	const opciones = tipos ?? (Object.keys(TIPO_DOCUMENTO_LABEL) as TipoDocumento[]);

	const [archivo, setArchivo] = useState<File | null>(null);
	const [tipo, setTipo] = useState<TipoDocumento>(fijo?.tipo ?? opciones[0]);
	const [titulo, setTitulo] = useState("");
	const [periodo, setPeriodo] = useState(fijo?.periodo ?? "");
	const [subiendo, setSubiendo] = useState(false);

	useEffect(() => {
		if (!open) return;
		setArchivo(null);
		setTipo(fijo?.tipo ?? opciones[0]);
		setTitulo(fijo?.titulo ?? "");
		setPeriodo(
			fijo?.periodo ?? (CON_PERIODO.includes(fijo?.tipo ?? opciones[0]) ? mesActual() : ""),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const elegir = (f: File | undefined) => {
		if (!f) return;
		if (f.size > MAX_BYTES) {
			toast.error("El archivo supera los 25 MB");
			return;
		}
		setArchivo(f);
	};

	const subir = async () => {
		if (!archivo) {
			toast.error("Elegí un archivo");
			return;
		}
		setSubiendo(true);
		try {
			await subirDocumento(token, userId, archivo, {
				...fijo,
				tipo,
				titulo: titulo.trim() || undefined,
				periodo: CON_PERIODO.includes(tipo) ? periodo || undefined : fijo?.periodo,
			});
			toast.success("Documento subido al legajo");
			onSubido();
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo subir el archivo");
		} finally {
			setSubiendo(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !subiendo && onOpenChange(o)}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{fijo ? `Adjuntar ${TIPO_DOCUMENTO_LABEL[fijo.tipo].toLowerCase()}` : "Subir al legajo"}
					</DialogTitle>
					<DialogDescription>
						{descripcion ??
							"PDF, foto, Word o Excel de hasta 25 MB. Queda en el legajo de la persona."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							e.preventDefault();
							elegir(e.dataTransfer.files?.[0]);
						}}
						className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border p-5 text-center hover:bg-muted/40"
					>
						<FileUp className="h-6 w-6 text-muted-foreground" />
						{archivo ? (
							<>
								<span className="text-sm font-medium break-all">{archivo.name}</span>
								<span className="text-xs text-muted-foreground">{formatTamanio(archivo.size)}</span>
							</>
						) : (
							<span className="text-sm text-muted-foreground">
								Tocá para elegir el archivo o arrastralo acá
							</span>
						)}
					</button>
					<input
						ref={inputRef}
						type="file"
						accept={ACEPTA}
						className="hidden"
						onChange={(e) => elegir(e.target.files?.[0])}
					/>

					{!fijo && (
						<div className="space-y-1.5">
							<Label className="text-xs">Tipo</Label>
							<Select
								value={tipo}
								onValueChange={(v) => {
									const t = v as TipoDocumento;
									setTipo(t);
									if (CON_PERIODO.includes(t) && !periodo) setPeriodo(mesActual());
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{opciones.map((t) => (
										<SelectItem key={t} value={t}>
											{TIPO_DOCUMENTO_LABEL[t]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{CON_PERIODO.includes(tipo) && !fijo?.periodo && (
						<div className="space-y-1.5">
							<Label className="text-xs">Mes</Label>
							<Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
						</div>
					)}

					<div className="space-y-1.5">
						<Label className="text-xs">Título (opcional)</Label>
						<Input
							value={titulo}
							onChange={(e) => setTitulo(e.target.value)}
							placeholder={archivo?.name ?? "Si lo dejás vacío, va el nombre del archivo"}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={subiendo}>
						Cancelar
					</Button>
					<Button onClick={subir} disabled={subiendo || !archivo}>
						{subiendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Subir
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
