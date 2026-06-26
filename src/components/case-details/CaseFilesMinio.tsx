"use client";

import {
	ChevronRight,
	Download,
	File as FileIcon,
	Folder,
	FolderPlus,
	Home,
	Loader2,
	RefreshCw,
	Trash2,
	UploadCloud,
} from "lucide-react";
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
import { API_BASE_URL } from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";

interface CaseFilesMinioProps {
	caseId: string | number;
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

export default function CaseFilesMinio({ caseId }: CaseFilesMinioProps) {
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

	const fetchList = useCallback(
		async (nextSubpath: string) => {
			if (!token) return;
			setLoading(true);
			setError(null);
			try {
				const url = `${API_BASE_URL}/cases/${caseId}/minio/list${nextSubpath ? `?subpath=${encodeURIComponent(nextSubpath)}` : ""}`;
				const res = await fetch(url, { headers: authHeaders });
				if (!res.ok) {
					const j = await res.json().catch(() => ({}));
					throw new Error(j.error || `HTTP ${res.status}`);
				}
				const json = (await res.json()) as ListResponse;
				setData(json);
			} catch (e) {
				setError((e as Error).message);
				setData(null);
			} finally {
				setLoading(false);
			}
		},
		[caseId, token, authHeaders],
	);

	useEffect(() => {
		fetchList(subpath);
	}, [subpath, fetchList]);

	const breadcrumbs = useMemo(() => {
		const parts = subpath.split("/").filter(Boolean);
		const acc: Array<{ label: string; subpath: string }> = [];
		let running = "";
		for (const p of parts) {
			running += `${p}/`;
			acc.push({ label: p, subpath: running });
		}
		return acc;
	}, [subpath]);

	const handleEnterFolder = (folder: FolderEntry) => {
		if (!data) return;
		// folder.key is absolute (rootKey + subpath + name + "/"); derive subpath relative to rootKey
		const rel = folder.key.slice(data.rootKey.length);
		setSubpath(rel);
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
					{breadcrumbs.map((bc) => (
						<span key={bc.subpath} className="flex items-center gap-1">
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

			{data && (data.folders.length > 0 || data.files.length > 0) && (
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
							{data.folders.map((folder) => (
								<tr key={folder.key} className="border-t hover:bg-muted/30">
									<td className="px-3 py-2">
										<button
											type="button"
											className="flex items-center gap-2 hover:underline"
											onClick={() => handleEnterFolder(folder)}
										>
											<Folder className="h-4 w-4 text-amber-500" />
											<span>{folder.name}</span>
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
							{data.files.map((file) => (
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
