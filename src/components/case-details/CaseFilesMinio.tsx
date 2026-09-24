"use client";

import {
	ChevronRight,
	Download,
	File as FileIcon,
	FileText,
	Folder,
	FolderOpen,
	FolderPlus,
	Home,
	Loader2,
	Plus,
	RefreshCw,
	Trash2,
	UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	API_BASE_URL,
	CASE_EXPEDIENTE_FOLDER_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import { getExpedienteLabel } from "@/lib/expediente-label";

// Árbol interno del caso (backend: services/minio-paths.ts):
//   0_DOCUMENTOS/                          lo que no depende de un expediente
//   1_ADMINISTRATIVO_{carátula} nº {nro}/  una carpeta por expediente
//   2_JUDICIAL_… / 3_MEDIDA_CAUTELAR_… / 4_MEDIDA_ASEGURAMIENTO_PRUEBA_…
//     1_INICIO/ 2_CEDULAS/ 3_ESCRITOS/
//   5_LIQUIDACIONES/                       liquidaciones de la causa, por fecha
const DOCUMENTS_FOLDER = "0_DOCUMENTOS";
const LIQUIDACIONES_FOLDER = "5_LIQUIDACIONES";
const EXPEDIENTE_FOLDER_RE =
	/^[1-4]_(ADMINISTRATIVO|JUDICIAL|MEDIDA_CAUTELAR|MEDIDA_ASEGURAMIENTO_PRUEBA)_/;
const EXPEDIENTE_SUBFOLDER_LABELS: Record<string, string> = {
	"1_INICIO": "Inicio",
	"2_CEDULAS": "Cédulas",
	"3_ESCRITOS": "Escritos",
};

type Expediente = Parameters<typeof getExpedienteLabel>[0];

interface CaseFilesMinioProps {
	caseId: string | number;
	/** Expedientes del caso: cada uno tiene su carpeta de Escritos. */
	files?: Expediente[];
	customerName?: string;
}

interface FolderEntry {
	key: string;
	name: string;
}

interface FileEntry {
	key: string;
	name: string;
	size: number;
	lastModified: string | null;
}

interface ListResponse {
	caseId: number;
	rootKey: string;
	prefix: string;
	subpath: string;
	folders: FolderEntry[];
	files: FileEntry[];
}

function formatBytes(bytes: number): string {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default function CaseFilesMinio({
	caseId,
	files: expedientes = [],
	customerName,
}: CaseFilesMinioProps) {
	const { data: session } = useSession();
	const token = (session as any)?.user?.accessToken as string | undefined;
	const { confirm, ConfirmationDialog } = useConfirm();

	const [subpath, setSubpath] = useState("");
	const [data, setData] = useState<ListResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploadingCount, setUploadingCount] = useState(0);
	const [createFolderOpen, setCreateFolderOpen] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const authHeaders = useMemo(
		() => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
		[token],
	);

	// En la raíz no se sube nada suelto: hay que entrar a Documentos, a
	// Liquidaciones o a un expediente.
	const isRoot = subpath === "";
	const canWriteHere = !isRoot;

	const expedienteLabelById = useMemo(() => {
		const map = new Map<number, string>();
		for (const f of expedientes) {
			map.set(Number(f.id), getExpedienteLabel(f, customerName));
		}
		return map;
	}, [expedientes, customerName]);

	// Solo cuenta la respuesta del último pedido: si se entra a una carpeta
	// antes de que termine de cargar la anterior, la respuesta vieja llegaba
	// después y mostraba el contenido de otra carpeta.
	const requestIdRef = useRef(0);

	const fetchList = useCallback(
		async (nextSubpath: string) => {
			if (!token) return;
			const requestId = ++requestIdRef.current;
			setLoading(true);
			setError(null);
			setData(null);
			try {
				const url = `${API_BASE_URL}/cases/${caseId}/minio/list${nextSubpath ? `?subpath=${encodeURIComponent(nextSubpath)}` : ""}`;
				const res = await fetch(url, { headers: authHeaders });
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					throw new Error(j.error || `HTTP ${res.status}`);
				}
				const json = (await res.json()) as ListResponse;
				if (requestId !== requestIdRef.current) return;
				setData(json);
			} catch (e) {
				if (requestId !== requestIdRef.current) return;
				setError((e as Error).message);
				setData(null);
			} finally {
				if (requestId === requestIdRef.current) setLoading(false);
			}
		},
		[caseId, token, authHeaders],
	);

	useEffect(() => {
		fetchList(subpath);
	}, [subpath, fetchList]);

	// Nombre legible de cada segmento: "Documentos", "Liquidaciones" y, dentro
	// de un expediente, "Inicio" / "Cédulas" / "Escritos". La carpeta del
	// expediente ya se lee sola (categoría + carátula + nº).
	const segmentLabel = useCallback((segment: string, parent: string) => {
		if (parent === "" && segment === DOCUMENTS_FOLDER) return "Documentos";
		if (parent === "" && segment === LIQUIDACIONES_FOLDER) return "Liquidaciones";
		const parentName = parent.split("/").filter(Boolean).pop() ?? "";
		if (EXPEDIENTE_FOLDER_RE.test(parentName) && EXPEDIENTE_SUBFOLDER_LABELS[segment]) {
			return EXPEDIENTE_SUBFOLDER_LABELS[segment];
		}
		return segment;
	}, []);

	const breadcrumbs = useMemo(() => {
		const parts = subpath.split("/").filter(Boolean);
		const acc: Array<{ label: string; subpath: string }> = [];
		let running = "";
		for (const p of parts) {
			const label = segmentLabel(p, running);
			running += `${p}/`;
			acc.push({ label, subpath: running });
		}
		return acc;
	}, [subpath, segmentLabel]);

	const handleEnterFolder = (folder: FolderEntry) => {
		if (!data) return;
		// folder.key is absolute (rootKey + subpath + name + "/"); derive subpath relative to rootKey
		const rel = folder.key.slice(data.rootKey.length);
		setSubpath(rel);
	};

	// La carpeta del expediente la resuelve el backend (la crea si falta).
	const handleOpenExpediente = async (fileId: number) => {
		if (!token) return;
		setBusyKey(`exp-${fileId}`);
		try {
			const res = await fetch(CASE_EXPEDIENTE_FOLDER_ENDPOINT(Number(caseId), fileId), {
				headers: authHeaders,
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			const { subpath: expedienteSubpath } = (await res.json()) as { subpath: string };
			setSubpath(expedienteSubpath);
		} catch (e) {
			toast.error(`Error: ${(e as Error).message}`);
		} finally {
			setBusyKey(null);
		}
	};

	const handleUpload = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0 || !token) return;
		const fd = new FormData();
		if (subpath) fd.append("subpath", subpath);
		const arr = Array.from(files);
		for (const f of arr) fd.append("files", f, f.name);

		setUploadingCount(arr.length);
		try {
			const res = await fetch(`${API_BASE_URL}/cases/${caseId}/minio/upload`, {
				method: "POST",
				headers: authHeaders,
				body: fd,
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			toast.success(`${arr.length} archivo${arr.length > 1 ? "s" : ""} subido${arr.length > 1 ? "s" : ""}`);
			fetchList(subpath);
		} catch (e) {
			toast.error(`Error al subir: ${(e as Error).message}`);
		} finally {
			setUploadingCount(0);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleDownload = async (file: FileEntry) => {
		if (!token || !data) return;
		setBusyKey(file.key);
		try {
			const rel = file.key.slice(data.rootKey.length);
			const url = `${API_BASE_URL}/cases/${caseId}/minio/object?subpath=${encodeURIComponent(rel)}`;
			const res = await fetch(url, { headers: authHeaders });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			const { url: presigned } = (await res.json()) as { url: string };
			window.open(presigned, "_blank", "noopener,noreferrer");
		} catch (e) {
			toast.error(`Error: ${(e as Error).message}`);
		} finally {
			setBusyKey(null);
		}
	};

	const handleDeleteFile = async (file: FileEntry) => {
		if (!data) return;
		const ok = await confirm({
			title: "Borrar archivo",
			description: `¿Borrar "${file.name}"? Esta acción no se puede deshacer.`,
			confirmLabel: "Borrar",
			variant: "destructive",
		});
		if (!ok) return;
		setBusyKey(file.key);
		try {
			const rel = file.key.slice(data.rootKey.length);
			const res = await fetch(
				`${API_BASE_URL}/cases/${caseId}/minio/object?subpath=${encodeURIComponent(rel)}`,
				{ method: "DELETE", headers: authHeaders },
			);
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			toast.success("Archivo borrado");
			fetchList(subpath);
		} catch (e) {
			toast.error(`Error: ${(e as Error).message}`);
		} finally {
			setBusyKey(null);
		}
	};

	const handleDeleteFolder = async (folder: FolderEntry) => {
		if (!data) return;
		const ok = await confirm({
			title: "Borrar carpeta",
			description: `¿Borrar "${folder.name}" y todo su contenido? Esta acción no se puede deshacer.`,
			confirmLabel: "Borrar",
			variant: "destructive",
		});
		if (!ok) return;
		setBusyKey(folder.key);
		try {
			const rel = folder.key.slice(data.rootKey.length);
			const res = await fetch(
				`${API_BASE_URL}/cases/${caseId}/minio/folder?subpath=${encodeURIComponent(rel)}`,
				{ method: "DELETE", headers: authHeaders },
			);
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			toast.success("Carpeta borrada");
			fetchList(subpath);
		} catch (e) {
			toast.error(`Error: ${(e as Error).message}`);
		} finally {
			setBusyKey(null);
		}
	};

	const handleCreateFolder = async () => {
		const name = newFolderName.trim();
		if (!name) return;
		if (/[/\\]/.test(name)) {
			toast.error("El nombre no puede contener / ni \\");
			return;
		}
		try {
			const res = await fetch(`${API_BASE_URL}/cases/${caseId}/minio/folder`, {
				method: "POST",
				headers: { ...authHeaders, "Content-Type": "application/json" },
				body: JSON.stringify({ subpath, name }),
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			toast.success("Carpeta creada");
			setCreateFolderOpen(false);
			setNewFolderName("");
			fetchList(subpath);
		} catch (e) {
			toast.error(`Error: ${(e as Error).message}`);
		}
	};

	// En la raíz, lo que no es Documentos, Liquidaciones ni un expediente es del
	// árbol anterior (1_ESCRITOS/, …).
	const legacyFolders = isRoot
		? (data?.folders ?? []).filter(
				(f) =>
					f.name !== DOCUMENTS_FOLDER &&
					f.name !== LIQUIDACIONES_FOLDER &&
					!EXPEDIENTE_FOLDER_RE.test(f.name),
			)
		: [];

	const renderTable = (folders: FolderEntry[], files: FileEntry[]) => (
		<div className="rounded-md border overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/50">
					<tr className="text-left">
						<th className="px-3 py-2 font-medium">Nombre</th>
						<th className="px-3 py-2 font-medium w-32">Tamaño</th>
						<th className="px-3 py-2 font-medium w-44">Modificado</th>
						<th className="px-3 py-2 font-medium w-32 text-right">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{folders.map((folder) => (
						<tr key={folder.key} className="border-t hover:bg-muted/30">
							<td className="px-3 py-2">
								<button
									type="button"
									className="flex items-center gap-2 hover:underline"
									onClick={() => handleEnterFolder(folder)}
								>
									<Folder className="h-4 w-4 text-amber-500" />
									<span>{segmentLabel(folder.name, subpath)}</span>
								</button>
							</td>
							<td className="px-3 py-2 text-muted-foreground">—</td>
							<td className="px-3 py-2 text-muted-foreground">—</td>
							<td className="px-3 py-2 text-right">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDeleteFolder(folder)}
									disabled={busyKey === folder.key}
								>
									{busyKey === folder.key ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Trash2 className="h-4 w-4 text-destructive" />
									)}
								</Button>
							</td>
						</tr>
					))}
					{files.map((file) => (
						<tr key={file.key} className="border-t hover:bg-muted/30">
							<td className="px-3 py-2">
								<div className="flex items-center gap-2">
									<FileIcon className="h-4 w-4 text-muted-foreground" />
									<span>{file.name}</span>
								</div>
							</td>
							<td className="px-3 py-2 text-muted-foreground">
								{formatBytes(file.size)}
							</td>
							<td className="px-3 py-2 text-muted-foreground">
								{file.lastModified
									? new Date(file.lastModified).toLocaleString()
									: "—"}
							</td>
							<td className="px-3 py-2 text-right space-x-1">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDownload(file)}
									disabled={busyKey === file.key}
								>
									{busyKey === file.key ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Download className="h-4 w-4" />
									)}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDeleteFile(file)}
									disabled={busyKey === file.key}
								>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);

	const renderRoot = () => (
		<div className="space-y-6">
			{/* Documentos — a nivel caso */}
			<section className="space-y-2">
				<h3 className="text-sm font-semibold">Documentos</h3>
				<button
					type="button"
					onClick={() => setSubpath(`${DOCUMENTS_FOLDER}/`)}
					className="flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:bg-muted/40"
				>
					<FolderOpen className="h-5 w-5 shrink-0 text-amber-500" />
					<div className="min-w-0">
						<div className="text-sm font-medium">Documentos del caso</div>
						<div className="text-xs text-muted-foreground">
							Poder, DNI, denuncia y lo cargado por Ventas/CRM. No dependen de
							un expediente.
						</div>
					</div>
				</button>
			</section>

			{/* Expedientes — una carpeta por expediente */}
			<section className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<h3 className="text-sm font-semibold">Expedientes</h3>
					<Link href={`/admin/legal-cases/${caseId}/srt-forms/new`}>
						<Button size="sm" variant="outline">
							<Plus className="h-4 w-4 mr-1" />
							Generar formulario
						</Button>
					</Link>
				</div>
				<p className="text-xs text-muted-foreground">
					Cada expediente tiene Inicio, Cédulas y Escritos (demandas, formularios,
					RPU, anexos).
				</p>
				{expedientes.length === 0 ? (
					<div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
						El caso no tiene expedientes. Creá uno en la tab Expedientes.
					</div>
				) : (
					<div className="divide-y rounded-md border">
						{expedientes.map((f) => {
							const id = Number(f.id);
							return (
								<button
									key={id}
									type="button"
									onClick={() => handleOpenExpediente(id)}
									disabled={busyKey === `exp-${id}`}
									className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
								>
									{busyKey === `exp-${id}` ? (
										<Loader2 className="h-4 w-4 shrink-0 animate-spin" />
									) : (
										<FileText className="h-4 w-4 shrink-0 text-primary" />
									)}
									<span className="truncate text-sm">
										{expedienteLabelById.get(id)}
									</span>
									<ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
								</button>
							);
						})}
					</div>
				)}
			</section>

			{/* Liquidaciones — a nivel caso */}
			<section className="space-y-2">
				<h3 className="text-sm font-semibold">Liquidaciones</h3>
				<button
					type="button"
					onClick={() => setSubpath(`${LIQUIDACIONES_FOLDER}/`)}
					className="flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:bg-muted/40"
				>
					<FolderOpen className="h-5 w-5 shrink-0 text-amber-500" />
					<div className="min-w-0">
						<div className="text-sm font-medium">Liquidaciones de la causa</div>
						<div className="text-xs text-muted-foreground">
							Las que se van haciendo desde la calculadora, por fecha.
						</div>
					</div>
				</button>
			</section>

			{/* Lo que quedó del árbol anterior (1_ESCRITOS/, …) */}
			{data && (legacyFolders.length > 0 || data.files.length > 0) && (
				<section className="space-y-2">
					<h3 className="text-sm font-semibold text-muted-foreground">
						Carpetas de la estructura anterior
					</h3>
					{renderTable(legacyFolders, data.files)}
				</section>
			)}
		</div>
	);

	return (
		<div className="p-4 space-y-4">
			{/* Header: breadcrumbs + actions */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
					<button
						type="button"
						className="flex items-center gap-1 hover:text-foreground"
						onClick={() => setSubpath("")}
					>
						<Home className="h-4 w-4" />
						<span>Raíz del caso</span>
					</button>
					{breadcrumbs.map((bc, i) => (
						<span key={`${i}-${bc.subpath}`} className="flex items-center gap-1">
							<ChevronRight className="h-4 w-4" />
							<button
								type="button"
								className="hover:text-foreground"
								onClick={() => setSubpath(bc.subpath)}
							>
								{bc.label}
							</button>
						</span>
					))}
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => fetchList(subpath)}
						disabled={loading}
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					</Button>
					{canWriteHere && (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCreateFolderOpen(true)}
							>
								<FolderPlus className="h-4 w-4 mr-1" />
								Nueva carpeta
							</Button>
							<Button
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploadingCount > 0}
							>
								{uploadingCount > 0 ? (
									<>
										<Loader2 className="h-4 w-4 mr-1 animate-spin" />
										Subiendo {uploadingCount}…
									</>
								) : (
									<>
										<UploadCloud className="h-4 w-4 mr-1" />
										Subir archivos
									</>
								)}
							</Button>
						</>
					)}
					<input
						ref={fileInputRef}
						type="file"
						multiple
						hidden
						onChange={(e) => handleUpload(e.target.files)}
					/>
				</div>
			</div>

			{/* Body */}
			{error && (
				<div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{isRoot ? (
				renderRoot()
			) : (
				<>
					{loading && !data && (
						<div className="flex items-center justify-center py-12 text-muted-foreground">
							<Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
						</div>
					)}

					{data && !loading && data.folders.length === 0 && data.files.length === 0 && (
						<div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
							Esta carpeta está vacía. Subí archivos o creá una subcarpeta.
						</div>
					)}

					{data &&
						(data.folders.length > 0 || data.files.length > 0) &&
						renderTable(data.folders, data.files)}
				</>
			)}

			{ConfirmationDialog}

			{/* Create folder dialog */}
			<Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nueva carpeta</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="folder-name">Nombre</Label>
						<Input
							id="folder-name"
							value={newFolderName}
							onChange={(e) => setNewFolderName(e.target.value)}
							placeholder="Mi carpeta"
							onKeyDown={(e) => {
								if (e.key === "Enter") handleCreateFolder();
							}}
						/>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setCreateFolderOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
							Crear
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
