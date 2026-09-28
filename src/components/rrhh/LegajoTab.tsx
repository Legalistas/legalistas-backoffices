"use client";

import { FileText, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TIPO_DOCUMENTO_LABEL, type TipoDocumento } from "@/constant/rrhh";
import {
	abrirDocumento,
	eliminarDocumento,
	formatPeriodo,
	formatTamanio,
	type RrhhDocumento,
	useDocumentos,
	useEsRrhhAdmin,
} from "./api";
import SubirDocumentoDialog from "./SubirDocumentoDialog";

// Legajo digital: todos los archivos de la persona (contratos, recibos,
// certificados, planillas de asistencia, sanciones, capacitaciones…).
// Quien administra RR.HH. sube y quita; cada persona ve los suyos.

const TODOS = "TODOS";
const TIPOS = Object.keys(TIPO_DOCUMENTO_LABEL) as TipoDocumento[];

const fecha = (iso: string) =>
	new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function LegajoTab({ userId }: { userId: number }) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const esAdmin = useEsRrhhAdmin();
	const { documentos, cargando, recargar } = useDocumentos(userId);
	const [filtro, setFiltro] = useState<string>(TODOS);
	const [subir, setSubir] = useState(false);

	const visibles = useMemo(
		() => (filtro === TODOS ? documentos : documentos.filter((d) => d.tipo === filtro)),
		[documentos, filtro],
	);
	const grupos = useMemo(() => {
		const m = new Map<TipoDocumento, RrhhDocumento[]>();
		for (const d of visibles) m.set(d.tipo, [...(m.get(d.tipo) ?? []), d]);
		return TIPOS.filter((t) => m.has(t)).map((t) => ({ tipo: t, docs: m.get(t) ?? [] }));
	}, [visibles]);

	const quitar = async (d: RrhhDocumento) => {
		if (!confirm(`¿Quitar "${d.titulo}" del legajo?`)) return;
		try {
			await eliminarDocumento(token, d.id);
			toast.success("Documento quitado");
			recargar();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo quitar");
		}
	};

	return (
		<div className="space-y-4 py-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p className="text-sm font-medium text-foreground">Legajo digital</p>
					<p className="text-xs text-muted-foreground">
						{documentos.length} documento{documentos.length === 1 ? "" : "s"}. Los recibos,
						contratos y certificados también se ven en su pestaña.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Select value={filtro} onValueChange={setFiltro}>
						<SelectTrigger className="h-8 w-[200px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={TODOS}>Todos los tipos</SelectItem>
							{TIPOS.map((t) => (
								<SelectItem key={t} value={t}>
									{TIPO_DOCUMENTO_LABEL[t]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{esAdmin && (
						<Button size="sm" onClick={() => setSubir(true)}>
							<Upload className="mr-1 h-4 w-4" />
							Subir
						</Button>
					)}
				</div>
			</div>

			{cargando ? (
				<div className="flex justify-center py-8">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : grupos.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
						<FolderOpen className="h-4 w-4 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">Todavía no hay documentos en el legajo</p>
				</div>
			) : (
				<div className="space-y-4">
					{grupos.map((g) => (
						<div key={g.tipo} className="space-y-1.5">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{TIPO_DOCUMENTO_LABEL[g.tipo]} ({g.docs.length})
							</p>
							{g.docs.map((d) => (
								<div
									key={d.id}
									className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/30"
								>
									<button
										type="button"
										onClick={() =>
											abrirDocumento(token, d.id).catch((err) => toast.error(err.message))
										}
										className="flex min-w-0 flex-1 items-center gap-3 text-left"
									>
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
											<FileText className="h-4 w-4 text-primary" />
										</div>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-foreground">{d.titulo}</p>
											<p className="truncate text-[11px] text-muted-foreground">
												{d.periodo ? `${formatPeriodo(d.periodo)} · ` : ""}
												{formatTamanio(d.tamanio)} · subido el {fecha(d.createdAt)} por{" "}
												{d.subidoPor.name}
											</p>
										</div>
									</button>
									{esAdmin && (
										<Button
											size="icon"
											variant="ghost"
											onClick={() => quitar(d)}
											title="Quitar del legajo"
											className="h-8 w-8 text-destructive hover:text-destructive"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									)}
								</div>
							))}
						</div>
					))}
				</div>
			)}

			<SubirDocumentoDialog
				open={subir}
				onOpenChange={setSubir}
				userId={userId}
				onSubido={recargar}
			/>
		</div>
	);
}
