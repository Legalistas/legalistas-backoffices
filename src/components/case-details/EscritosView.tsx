"use client";

import {
	Download,
	FilePlus2,
	FileText,
	Loader2,
	Pencil,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
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
import {
	ESCRITO_ENDPOINT,
	ESCRITO_PDF_GUARDADO_ENDPOINT,
	ESCRITOS_ENDPOINT,
	ESCRITOS_PLANTILLAS_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import { escritosFetch } from "@/lib/escritos-api";
import { getExpedienteLabel } from "@/lib/expediente-label";
import type { EscritoListItem, PlantillaListItem } from "@/types/escritos";
import { ExpedienteSelect } from "./ExpedienteSelect";

type Expediente = Parameters<typeof getExpedienteLabel>[0];

interface EscritosViewProps {
	caseId: string;
	files?: Expediente[];
	customerName?: string;
}

const EN_BLANCO = "blank";

function fechaHora(iso: string): string {
	return new Date(iso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Escritos del caso agrupados por expediente, en orden cronológico — el mismo
 * orden en que quedan los PDFs en la carpeta del expediente.
 */
export function EscritosView({ caseId, files = [], customerName }: EscritosViewProps) {
	const router = useRouter();
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const { confirm, ConfirmationDialog } = useConfirm();

	const [escritos, setEscritos] = useState<EscritoListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<number | null>(null);

	const [nuevoOpen, setNuevoOpen] = useState(false);
	const [plantillas, setPlantillas] = useState<PlantillaListItem[]>([]);
	const [fileId, setFileId] = useState<number | null>(null);
	const [plantillaId, setPlantillaId] = useState<string>(EN_BLANCO);
	const [titulo, setTitulo] = useState("");
	const [creando, setCreando] = useState(false);

	const cargar = useCallback(async () => {
		if (!token) return;
		try {
			const res = await escritosFetch<{ data: EscritoListItem[] }>(
				`${ESCRITOS_ENDPOINT}?caseId=${caseId}&orden=cronologico&limit=100`,
				token,
			);
			setEscritos(res.data);
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setLoading(false);
		}
	}, [caseId, token]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const abrirNuevo = async () => {
		setNuevoOpen(true);
		setFileId(null);
		setPlantillaId(EN_BLANCO);
		setTitulo("");
		if (!token || plantillas.length) return;
		try {
			const res = await escritosFetch<{ data: PlantillaListItem[] }>(
				ESCRITOS_PLANTILLAS_ENDPOINT,
				token,
			);
			setPlantillas(res.data);
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	const elegirPlantilla = (id: string) => {
		setPlantillaId(id);
		const p = plantillas.find((x) => String(x.id) === id);
		if (p && !titulo.trim()) setTitulo(p.nombre);
	};

	const crear = async () => {
		if (!token) return;
		if (!fileId) {
			toast.error("Seleccioná el expediente al que corresponde el escrito");
			return;
		}
		if (!titulo.trim()) {
			toast.error("Poné un título");
			return;
		}
		setCreando(true);
		try {
			const res = await escritosFetch<{ data: { id: number } }>(ESCRITOS_ENDPOINT, token, {
				method: "POST",
				body: JSON.stringify({
					titulo: titulo.trim(),
					fileId,
					...(plantillaId !== EN_BLANCO ? { plantillaId: Number(plantillaId) } : {}),
				}),
			});
			router.push(`/admin/legal-cases/${caseId}/escritos/${res.data.id}`);
		} catch (e) {
			toast.error((e as Error).message);
			setCreando(false);
		}
	};

	const verPdf = async (e: EscritoListItem) => {
		if (!token) return;
		setBusyId(e.id);
		try {
			const res = await escritosFetch<{ data: { url: string } }>(
				ESCRITO_PDF_GUARDADO_ENDPOINT(e.id),
				token,
			);
			window.open(res.data.url, "_blank", "noopener,noreferrer");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setBusyId(null);
		}
	};

	const eliminar = async (e: EscritoListItem) => {
		if (!token) return;
		const ok = await confirm({
			title: "Eliminar escrito",
			description: `¿Eliminar "${e.titulo}"? Los PDF ya guardados en el expediente no se borran.`,
			confirmLabel: "Eliminar",
			variant: "destructive",
		});
		if (!ok) return;
		setBusyId(e.id);
		try {
			await escritosFetch(ESCRITO_ENDPOINT(e.id), token, { method: "DELETE" });
			setEscritos((prev) => prev.filter((x) => x.id !== e.id));
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setBusyId(null);
		}
	};

	// Un grupo por expediente, en el orden de la tab Expedientes. Los escritos
	// sin expediente (previos a que fuera obligatorio) van aparte al final.
	const grupos = useMemo(() => {
		const porExpediente = new Map<number, EscritoListItem[]>();
		const sinExpediente: EscritoListItem[] = [];
		for (const e of escritos) {
			if (e.fileId == null) sinExpediente.push(e);
			else porExpediente.set(e.fileId, [...(porExpediente.get(e.fileId) ?? []), e]);
		}
		const out = files.map((f) => ({
			key: String(f.id),
			label: getExpedienteLabel(f, customerName),
			items: porExpediente.get(Number(f.id)) ?? [],
		}));
		if (sinExpediente.length) {
			out.push({ key: "sin", label: "Sin expediente asignado", items: sinExpediente });
		}
		return out;
	}, [escritos, files, customerName]);

	return (
		<div className="space-y-4 p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="text-base font-semibold">Escritos</h2>
					<p className="text-xs text-muted-foreground">
						Por expediente y en orden cronológico. El PDF se guarda en la carpeta
						del expediente.
					</p>
				</div>
				<Button size="sm" onClick={abrirNuevo} disabled={files.length === 0}>
					<FilePlus2 className="mr-1 h-4 w-4" />
					Nuevo escrito
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center py-10">
					<Loader2 className="h-5 w-5 animate-spin" />
				</div>
			) : files.length === 0 && grupos.length === 0 ? (
				<div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
					El caso no tiene expedientes. Creá uno en la tab Expedientes para poder
					cargar escritos.
				</div>
			) : (
				grupos.map((g) => (
					<section key={g.key} className="rounded-md border">
						<div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
							{g.label}
						</div>
						{g.items.length === 0 ? (
							<p className="px-4 py-3 text-sm text-muted-foreground">
								Sin escritos todavía.
							</p>
						) : (
							<ol className="divide-y">
								{g.items.map((e, i) => (
									<li key={e.id} className="flex items-center gap-3 px-4 py-2">
										<span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
											{i + 1}.
										</span>
										<FileText className="h-4 w-4 shrink-0 text-primary" />
										<div className="min-w-0 flex-1">
											<Link
												href={`/admin/legal-cases/${caseId}/escritos/${e.id}`}
												className="block truncate text-sm font-medium hover:underline"
											>
												{e.titulo}
											</Link>
											<div className="text-xs text-muted-foreground">
												{fechaHora(e.createdAt)}
												{e.plantilla ? ` · ${e.plantilla.nombre}` : ""}
												{e.pdfGeneradoAt
													? ` · PDF guardado ${fechaHora(e.pdfGeneradoAt)}`
													: " · Sin PDF guardado"}
											</div>
										</div>
										<div className="flex shrink-0 items-center gap-1">
											{e.pdfObjectKey && (
												<Button
													variant="ghost"
													size="sm"
													title="Ver PDF guardado"
													onClick={() => verPdf(e)}
													disabled={busyId === e.id}
												>
													{busyId === e.id ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<Download className="h-4 w-4" />
													)}
												</Button>
											)}
											<Link href={`/admin/legal-cases/${caseId}/escritos/${e.id}`}>
												<Button variant="ghost" size="sm" title="Editar">
													<Pencil className="h-4 w-4" />
												</Button>
											</Link>
											<Button
												variant="ghost"
												size="sm"
												title="Eliminar"
												onClick={() => eliminar(e)}
												disabled={busyId === e.id}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</li>
								))}
							</ol>
						)}
					</section>
				))
			)}

			{ConfirmationDialog}

			<Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nuevo escrito</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label>
								Expediente <span className="text-destructive">*</span>
							</Label>
							<ExpedienteSelect
								files={files}
								value={fileId}
								onChange={setFileId}
								customerName={customerName}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Plantilla</Label>
							<Select value={plantillaId} onValueChange={elegirPlantilla}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={EN_BLANCO}>En blanco</SelectItem>
									{plantillas.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.categoria ? `${p.categoria} · ` : ""}
											{p.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Los datos del expediente ({"{{CARATULA}}"}, {"{{CUIJ}}"},{" "}
								{"{{JUZGADO}}"}…) se completan solos.
							</p>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="escrito-titulo">Título</Label>
							<Input
								id="escrito-titulo"
								value={titulo}
								onChange={(e) => setTitulo(e.target.value)}
								placeholder="Ej: Solicita pronto despacho"
								maxLength={200}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setNuevoOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={crear} disabled={creando || !fileId || !titulo.trim()}>
							{creando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
							Crear y editar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
