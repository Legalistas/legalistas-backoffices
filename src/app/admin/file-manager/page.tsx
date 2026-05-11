"use client";

import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	CheckCircle2,
	ChevronRight,
	Download,
	File as FileIcon,
	FileImage,
	FileText,
	Folder,
	FolderPlus,
	HardDrive,
	Home,
	LayoutGrid,
	List,
	Loader2,
	Trash2,
	Upload,
	UploadCloud,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useConfirm } from "@/hooks/useConfirm";
import {
	SECTION_CASES,
	SECTION_CRM,
	STAGES_CASES,
	STAGES_CRM,
} from "@/constant/storage-structure";

interface FolderItem {
	key: string;
	name: string;
}

interface FileItem {
	key: string;
	name: string;
	size: number;
	lastModified: string | null;
}

interface ListResponse {
	prefix: string;
	folders: FolderItem[];
	files: FileItem[];
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif|svg)$/i;
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv)$/i;
const PDF_EXT = /\.pdf$/i;
const OFFICE_EXT = /\.(docx?|xlsx?|pptx?)$/i;

type PreviewType = "image" | "pdf" | "office" | null;

function getPreviewType(name: string): PreviewType {
	if (IMAGE_EXT.test(name)) return "image";
	if (PDF_EXT.test(name)) return "pdf";
	if (OFFICE_EXT.test(name)) return "office";
	return null;
}

function fileIcon(name: string) {
	if (IMAGE_EXT.test(name)) return FileImage;
	if (DOC_EXT.test(name)) return FileText;
	return FileIcon;
}

// ── Estilos por carpeta ────────────────────────────────────────────────
// Cada etapa tiene un color de acento (fondo del ícono + texto del ícono).

const DEFAULT_FOLDER_STYLE = {
	icon: "text-primary",
	bg: "bg-primary/10",
	ring: "ring-primary/20",
};

const FOLDER_STYLES: Record<string, { icon: string; bg: string; ring: string }> = {
	// Secciones raíz
	[SECTION_CRM]: { icon: "text-violet-600", bg: "bg-violet-100", ring: "ring-violet-200" },
	[SECTION_CASES]: { icon: "text-emerald-600", bg: "bg-emerald-100", ring: "ring-emerald-200" },
	// CRM etapas
	"nueva-consulta": { icon: "text-sky-600", bg: "bg-sky-100", ring: "ring-sky-200" },
	"reunion-a-concretar": { icon: "text-amber-600", bg: "bg-amber-100", ring: "ring-amber-200" },
	"reunion-coordinada": { icon: "text-orange-600", bg: "bg-orange-100", ring: "ring-orange-200" },
	"en-tratamiento": { icon: "text-blue-600", bg: "bg-blue-100", ring: "ring-blue-200" },
	telegramas: { icon: "text-rose-600", bg: "bg-rose-100", ring: "ring-rose-200" },
	"pendiente-de-confirmacion": { icon: "text-purple-600", bg: "bg-purple-100", ring: "ring-purple-200" },
	"coordinador-reunion-poder": { icon: "text-indigo-600", bg: "bg-indigo-100", ring: "ring-indigo-200" },
	"pendiente-de-poder": { icon: "text-cyan-600", bg: "bg-cyan-100", ring: "ring-cyan-200" },
	ganados: { icon: "text-emerald-600", bg: "bg-emerald-100", ring: "ring-emerald-200" },
	perdidos: { icon: "text-red-600", bg: "bg-red-100", ring: "ring-red-200" },
	archivados: { icon: "text-slate-600", bg: "bg-slate-100", ring: "ring-slate-200" },
	// Casos etapas
	documentacion: { icon: "text-sky-600", bg: "bg-sky-100", ring: "ring-sky-200" },
	administrativo: { icon: "text-amber-600", bg: "bg-amber-100", ring: "ring-amber-200" },
	judicial: { icon: "text-indigo-600", bg: "bg-indigo-100", ring: "ring-indigo-200" },
	incapacidad: { icon: "text-purple-600", bg: "bg-purple-100", ring: "ring-purple-200" },
	cierre: { icon: "text-teal-600", bg: "bg-teal-100", ring: "ring-teal-200" },
	experiencia: { icon: "text-emerald-600", bg: "bg-emerald-100", ring: "ring-emerald-200" },
	archivado: { icon: "text-slate-600", bg: "bg-slate-100", ring: "ring-slate-200" },
};

interface FolderMeta {
	label: string;
	description: string | null;
	style: { icon: string; bg: string; ring: string };
}

function getFolderMeta(folderKey: string, fallbackName: string): FolderMeta {
	const parts = folderKey.replace(/\/$/, "").split("/");

	// Carpeta raíz (crm, casos)
	if (parts.length === 1) {
		if (parts[0] === SECTION_CRM) {
			return {
				label: "CRM",
				description: "Leads activos organizados por etapa",
				style: FOLDER_STYLES[SECTION_CRM],
			};
		}
		if (parts[0] === SECTION_CASES) {
			return {
				label: "Casos",
				description: "Expedientes judiciales por etapa",
				style: FOLDER_STYLES[SECTION_CASES],
			};
		}
	}

	// Etapa dentro de CRM o Casos
	if (parts.length === 2) {
		const [section, slug] = parts;
		if (section === SECTION_CRM) {
			const stage = STAGES_CRM.find((s) => s.slug === slug);
			if (stage) {
				return {
					label: stage.label,
					description: stage.description,
					style: FOLDER_STYLES[slug] ?? DEFAULT_FOLDER_STYLE,
				};
			}
		}
		if (section === SECTION_CASES) {
			const stage = STAGES_CASES.find((s) => s.slug === slug);
			if (stage) {
				return {
					label: stage.label,
					description: stage.description,
					style: FOLDER_STYLES[slug] ?? DEFAULT_FOLDER_STYLE,
				};
			}
		}
	}

	// Carpeta libre (creada por el usuario)
	return {
		label: fallbackName,
		description: null,
		style: DEFAULT_FOLDER_STYLE,
	};
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function buildBreadcrumb(prefix: string): { label: string; prefix: string }[] {
	if (!prefix) return [];
	const parts = prefix.replace(/\/$/, "").split("/");
	return parts.map((label, i) => ({
		label,
		prefix: `${parts.slice(0, i + 1).join("/")}/`,
	}));
}

type ViewMode = "list" | "grid";
const VIEW_MODE_KEY = "fileManager.viewMode";

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface UploadItem {
	file: File;
	preview: string | null;
	status: UploadStatus;
	progress: number;
	error?: string;
}

function createPreview(file: File): Promise<string | null> {
	return new Promise((resolve) => {
		if (!file.type.startsWith("image/")) {
			resolve(null);
			return;
		}
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => resolve(null);
		reader.readAsDataURL(file);
	});
}

function uploadOne(
	file: File,
	prefix: string,
	onProgress: (pct: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const fd = new FormData();
		fd.append("prefix", prefix);
		fd.append("files", file);
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) {
				onProgress(Math.round((e.loaded / e.total) * 100));
			}
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) resolve();
			else reject(new Error(`HTTP ${xhr.status}`));
		};
		xhr.onerror = () => reject(new Error("Network error"));
		xhr.open("POST", "/api/storage/upload");
		xhr.send(fd);
	});
}

export default function FileManagerPage() {
	const { confirm, ConfirmationDialog } = useConfirm();
	const [prefix, setPrefix] = useState("");
	const [data, setData] = useState<ListResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("list");
	const [createFolderOpen, setCreateFolderOpen] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
	const [detailFolder, setDetailFolder] = useState<FolderItem | null>(null);
	const [detailFile, setDetailFile] = useState<FileItem | null>(null);
	const [detailPreviewUrl, setDetailPreviewUrl] = useState<string | null>(null);
	const [sortBy, setSortBy] = useState<"name" | "modified" | "size">("name");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const dropInputRef = useRef<HTMLInputElement>(null);

	const toggleSort = (column: "name" | "modified" | "size") => {
		if (sortBy === column) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortBy(column);
			setSortDir("asc");
		}
	};

	useEffect(() => {
		const saved = localStorage.getItem(VIEW_MODE_KEY);
		if (saved === "list" || saved === "grid") setViewMode(saved);
	}, []);

	const changeViewMode = (mode: ViewMode) => {
		setViewMode(mode);
		localStorage.setItem(VIEW_MODE_KEY, mode);
	};

	const breadcrumb = useMemo(() => buildBreadcrumb(prefix), [prefix]);

	const fetchList = useCallback(async (targetPrefix: string) => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/storage/list?prefix=${encodeURIComponent(targetPrefix)}`,
			);
			if (!res.ok) throw new Error("Error al listar el bucket");
			const json = (await res.json()) as ListResponse;
			setData(json);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchList(prefix);
	}, [prefix, fetchList]);

	// Resetear selección al cambiar de carpeta
	useEffect(() => {
		setSelectedKeys(new Set());
	}, [prefix]);

	const toggleSelected = (key: string) => {
		setSelectedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const clearSelection = () => setSelectedKeys(new Set());

	const toggleSelectAll = () => {
		if (!data) return;
		const allKeys = [
			...data.folders.map((f) => f.key),
			...data.files.map((f) => f.key),
		];
		if (allKeys.length === 0) return;
		const allSelected = allKeys.every((k) => selectedKeys.has(k));
		setSelectedKeys(allSelected ? new Set() : new Set(allKeys));
	};

	const openFolderDetail = (folder: FolderItem) => {
		setDetailFile(null);
		setDetailPreviewUrl(null);
		setDetailFolder(folder);
	};

	const openFileDetail = async (file: FileItem) => {
		setDetailFolder(null);
		setDetailFile(file);
		setDetailPreviewUrl(null);
		// Si es previsualizable, generar presigned URL
		if (getPreviewType(file.name)) {
			try {
				const res = await fetch(
					`/api/storage/object?key=${encodeURIComponent(file.key)}`,
				);
				if (res.ok) {
					const { url } = await res.json();
					setDetailPreviewUrl(url);
				}
			} catch {
				// silent
			}
		}
	};

	const closeDetail = () => {
		setDetailFolder(null);
		setDetailFile(null);
		setDetailPreviewUrl(null);
	};

	const handleDeleteSelected = async () => {
		if (selectedKeys.size === 0) return;
		const total = selectedKeys.size;
		if (
			!(await confirm({
				description: `¿Eliminar ${total} elemento${total > 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
				confirmLabel: "Eliminar",
				variant: "destructive",
			}))
		)
			return;

		const folders: string[] = [];
		const files: string[] = [];
		selectedKeys.forEach((key) => {
			if (key.endsWith("/")) folders.push(key);
			else files.push(key);
		});

		let success = 0;
		let failed = 0;

		await Promise.all([
			...files.map(async (key) => {
				try {
					const res = await fetch(
						`/api/storage/object?key=${encodeURIComponent(key)}`,
						{ method: "DELETE" },
					);
					if (res.ok) success++;
					else failed++;
				} catch {
					failed++;
				}
			}),
			...folders.map(async (folderPrefix) => {
				try {
					const res = await fetch(
						`/api/storage/folder?prefix=${encodeURIComponent(folderPrefix)}`,
						{ method: "DELETE" },
					);
					if (res.ok) success++;
					else failed++;
				} catch {
					failed++;
				}
			}),
		]);

		if (failed === 0) {
			toast.success(
				`${success} elemento${success > 1 ? "s" : ""} eliminado${success > 1 ? "s" : ""}`,
			);
		} else {
			toast.error(
				`${failed} de ${total} no se pudo eliminar`,
			);
		}

		setSelectedKeys(new Set());
		fetchList(prefix);
	};

	const openUploadDialog = () => {
		setUploadItems([]);
		setUploadDialogOpen(true);
	};

	const closeUploadDialog = () => {
		setUploadDialogOpen(false);
		setTimeout(() => setUploadItems([]), 200);
	};

	const addUploadFiles = async (files: FileList | File[]) => {
		const arr = Array.from(files);
		const items = await Promise.all(
			arr.map(async (file) => ({
				file,
				preview: await createPreview(file),
				status: "pending" as UploadStatus,
				progress: 0,
			})),
		);
		setUploadItems((prev) => [...prev, ...items]);
	};

	const removeUploadItem = (index: number) => {
		setUploadItems((prev) => prev.filter((_, i) => i !== index));
	};

	const handleUploadAll = async () => {
		const pendingIndices = uploadItems
			.map((item, idx) => (item.status === "pending" ? idx : -1))
			.filter((idx) => idx !== -1);

		if (pendingIndices.length === 0) return;

		// Marcar todos como uploading
		setUploadItems((prev) =>
			prev.map((it, i) =>
				pendingIndices.includes(i)
					? { ...it, status: "uploading" as UploadStatus, progress: 0 }
					: it,
			),
		);

		let allSucceeded = true;

		await Promise.all(
			pendingIndices.map(async (idx) => {
				try {
					await uploadOne(uploadItems[idx].file, prefix, (p) => {
						setUploadItems((prev) =>
							prev.map((it, i) => (i === idx ? { ...it, progress: p } : it)),
						);
					});
					setUploadItems((prev) =>
						prev.map((it, i) =>
							i === idx
								? { ...it, status: "done" as UploadStatus, progress: 100 }
								: it,
						),
					);
				} catch (err) {
					allSucceeded = false;
					setUploadItems((prev) =>
						prev.map((it, i) =>
							i === idx
								? {
										...it,
										status: "error" as UploadStatus,
										error:
											err instanceof Error ? err.message : "Error al subir",
									}
								: it,
						),
					);
				}
			}),
		);

		fetchList(prefix);

		// Si todo subió OK, cerrar el modal después de un breve delay
		// (para que se vea el check verde antes de cerrar).
		if (allSucceeded) {
			const count = pendingIndices.length;
			toast.success(
				`${count} archivo${count > 1 ? "s" : ""} subido${count > 1 ? "s" : ""}`,
			);
			setTimeout(() => closeUploadDialog(), 700);
		}
	};

	const hasPending = uploadItems.some((i) => i.status === "pending");
	const isUploading = uploadItems.some((i) => i.status === "uploading");

	const handleCreateFolder = () => {
		setNewFolderName("");
		setCreateFolderOpen(true);
	};

	const handleSubmitCreateFolder = async (
		e?: React.FormEvent<HTMLFormElement>,
	) => {
		e?.preventDefault();
		const name = newFolderName.trim();
		if (!name) {
			toast.error("Ingresá un nombre");
			return;
		}
		setIsCreatingFolder(true);
		try {
			const res = await fetch("/api/storage/folder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prefix, name }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Error al crear");
			}
			toast.success("Carpeta creada");
			setCreateFolderOpen(false);
			setNewFolderName("");
			fetchList(prefix);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al crear");
		} finally {
			setIsCreatingFolder(false);
		}
	};

	const handleDeleteFile = async (key: string, name: string) => {
		if (
			!(await confirm({
				description: `¿Eliminar el archivo "${name}"?`,
				confirmLabel: "Eliminar",
				variant: "destructive",
			}))
		)
			return;
		try {
			const res = await fetch(
				`/api/storage/object?key=${encodeURIComponent(key)}`,
				{ method: "DELETE" },
			);
			if (!res.ok) throw new Error("Error al eliminar");
			toast.success("Archivo eliminado");
			fetchList(prefix);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al eliminar");
		}
	};

	const handleDeleteFolder = async (folderPrefix: string, name: string) => {
		if (
			!(await confirm({
				description: `¿Eliminar la carpeta "${name}" y todo su contenido? Esta acción no se puede deshacer.`,
				confirmLabel: "Eliminar",
				variant: "destructive",
			}))
		)
			return;
		try {
			const res = await fetch(
				`/api/storage/folder?prefix=${encodeURIComponent(folderPrefix)}`,
				{ method: "DELETE" },
			);
			if (!res.ok) throw new Error("Error al eliminar");
			const json = await res.json();
			toast.success(
				`Carpeta eliminada${json.deleted ? ` (${json.deleted} objetos)` : ""}`,
			);
			fetchList(prefix);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al eliminar");
		}
	};

	const handleDownload = async (key: string) => {
		try {
			const res = await fetch(
				`/api/storage/object?key=${encodeURIComponent(key)}&download=1`,
			);
			if (!res.ok) throw new Error("Error al obtener URL");
			const { url } = await res.json();
			// Disparar descarga sin abrir pestaña: el presigned URL trae
			// `Content-Disposition: attachment`, así que el browser baja el archivo.
			const a = document.createElement("a");
			a.href = url;
			a.download = key.split("/").pop() || "archivo";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al descargar");
		}
	};

	const isEmpty =
		!loading &&
		data &&
		data.folders.length === 0 &&
		data.files.length === 0;

	const sortedFolders = useMemo(() => {
		if (!data) return [];
		const folders = [...data.folders];
		folders.sort((a, b) => {
			if (sortBy === "name") {
				const aLabel = getFolderMeta(a.key, a.name).label;
				const bLabel = getFolderMeta(b.key, b.name).label;
				const cmp = aLabel.localeCompare(bLabel, "es");
				return sortDir === "asc" ? cmp : -cmp;
			}
			return 0;
		});
		return folders;
	}, [data, sortBy, sortDir]);

	const sortedFiles = useMemo(() => {
		if (!data) return [];
		const files = [...data.files];
		files.sort((a, b) => {
			let cmp = 0;
			if (sortBy === "name") {
				cmp = a.name.localeCompare(b.name, "es");
			} else if (sortBy === "modified") {
				const aT = a.lastModified ? new Date(a.lastModified).getTime() : 0;
				const bT = b.lastModified ? new Date(b.lastModified).getTime() : 0;
				cmp = aT - bT;
			} else if (sortBy === "size") {
				cmp = a.size - b.size;
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
		return files;
	}, [data, sortBy, sortDir]);

	const sortIcon = (col: "name" | "modified" | "size") => {
		if (sortBy !== col)
			return <ArrowUpDown className="h-3 w-3 opacity-40" />;
		return sortDir === "asc" ? (
			<ArrowUp className="h-3 w-3" />
		) : (
			<ArrowDown className="h-3 w-3" />
		);
	};

	const allItemKeys = useMemo(() => {
		if (!data) return [] as string[];
		return [
			...data.folders.map((f) => f.key),
			...data.files.map((f) => f.key),
		];
	}, [data]);

	const allSelected =
		allItemKeys.length > 0 && allItemKeys.every((k) => selectedKeys.has(k));
	const someSelected = selectedKeys.size > 0 && !allSelected;

	return (
		<div className="space-y-6 w-full">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
						<HardDrive className="h-6 w-6 text-primary" />
						Gestor de Archivos
					</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						Bucket de Legalistas en MinIO
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-md border border-border bg-background p-0.5">
						<button
							onClick={() => changeViewMode("list")}
							className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
								viewMode === "list"
									? "bg-primary text-white"
									: "text-muted-foreground hover:text-foreground"
							}`}
							title="Vista lista"
						>
							<List className="h-4 w-4" />
						</button>
						<button
							onClick={() => changeViewMode("grid")}
							className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
								viewMode === "grid"
									? "bg-primary text-white"
									: "text-muted-foreground hover:text-foreground"
							}`}
							title="Vista grilla"
						>
							<LayoutGrid className="h-4 w-4" />
						</button>
					</div>
					<Button
						variant="outline"
						onClick={handleCreateFolder}
						disabled={loading}
					>
						<FolderPlus className="h-4 w-4 mr-2" />
						Nueva carpeta
					</Button>
					<Button
						className="bg-primary hover:bg-primary/85 text-white"
						onClick={openUploadDialog}
					>
						<Upload className="h-4 w-4 mr-2" />
						Subir archivo
					</Button>
				</div>
			</div>

			{/* Breadcrumb */}
			<div className="flex items-center gap-1.5 text-sm flex-wrap rounded-lg border border-border bg-muted/40 px-3 py-2">
				<button
					onClick={() => setPrefix("")}
					className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
				>
					<Home className="h-3.5 w-3.5" />
					Inicio
				</button>
				{breadcrumb.map((crumb, i) => {
					const meta = getFolderMeta(crumb.prefix, crumb.label);
					return (
						<div key={crumb.prefix} className="flex items-center gap-1.5">
							<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
							<button
								onClick={() => setPrefix(crumb.prefix)}
								className={`hover:text-primary transition-colors ${
									i === breadcrumb.length - 1
										? "text-foreground font-medium"
										: "text-muted-foreground"
								}`}
							>
								{meta.label}
							</button>
						</div>
					);
				})}
			</div>

			{/* Bulk action bar */}
			{selectedKeys.size > 0 && (
				<div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-foreground">
							{selectedKeys.size} seleccionado
							{selectedKeys.size > 1 ? "s" : ""}
						</span>
						<button
							onClick={clearSelection}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							Cancelar
						</button>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={toggleSelectAll}
							className="h-8"
						>
							Seleccionar todo
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleDeleteSelected}
							className="h-8"
						>
							<Trash2 className="h-4 w-4 mr-1.5" />
							Borrar
						</Button>
					</div>
				</div>
			)}

			{/* Content */}
			<div className="rounded-xl border border-border bg-card">
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="h-6 w-6 animate-spin text-primary" />
					</div>
				) : error ? (
					<div className="p-6 text-sm text-destructive">{error}</div>
				) : isEmpty ? (
					<div className="py-20 text-center">
						<Folder className="h-12 w-12 mx-auto text-muted-foreground/40" />
						<p className="mt-3 text-sm text-muted-foreground">
							Carpeta vacía
						</p>
						<p className="text-xs text-muted-foreground/70 mt-1">
							Subí archivos o creá una nueva carpeta para empezar
						</p>
					</div>
				) : viewMode === "list" ? (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
									<th className="w-10 px-4 py-2.5">
										<Checkbox
											checked={allSelected}
											onCheckedChange={toggleSelectAll}
											aria-label="Seleccionar todo"
											className={someSelected ? "data-[state=checked]:bg-primary/60" : ""}
										/>
									</th>
									<th className="text-left font-semibold px-2 py-2.5">
										<button
											onClick={() => toggleSort("name")}
											className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
										>
											Name {sortIcon("name")}
										</button>
									</th>
									<th className="text-left font-semibold px-4 py-2.5 hidden md:table-cell">
										<button
											onClick={() => toggleSort("modified")}
											className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
										>
											Last Modified {sortIcon("modified")}
										</button>
									</th>
									<th className="text-right font-semibold px-4 py-2.5 w-28">
										<button
											onClick={() => toggleSort("size")}
											className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
										>
											Size {sortIcon("size")}
										</button>
									</th>
									<th className="w-12 px-2 py-2.5" />
								</tr>
							</thead>
							<tbody>
								{sortedFolders.map((folder) => {
									const meta = getFolderMeta(folder.key, folder.name);
									const isSelected = selectedKeys.has(folder.key);
									return (
										<tr
											key={folder.key}
											className={`group border-b border-border last:border-b-0 transition-colors ${
												isSelected ? "bg-primary/5" : "hover:bg-muted/40"
											}`}
										>
											<td className="px-4 py-2.5">
												<Checkbox
													checked={isSelected}
													onCheckedChange={() => toggleSelected(folder.key)}
													aria-label={`Seleccionar ${meta.label}`}
												/>
											</td>
											<td className="px-2 py-2.5">
												<button
													onClick={() => setPrefix(folder.key)}
													className="flex items-center gap-3 min-w-0 text-left w-full"
												>
													<div
														className={`inline-flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${meta.style.bg}`}
													>
														<Folder className={`h-4 w-4 ${meta.style.icon}`} />
													</div>
													<div className="min-w-0">
														<p className="font-medium truncate">{meta.label}</p>
														{meta.description && (
															<p className="text-xs text-muted-foreground truncate">
																{meta.description}
															</p>
														)}
													</div>
												</button>
											</td>
											<td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
												—
											</td>
											<td className="px-4 py-2.5 text-right text-muted-foreground">
												—
											</td>
											<td className="px-2 py-2.5">
												<button
													onClick={() =>
														handleDeleteFolder(folder.key, folder.name)
													}
													className="opacity-0 group-hover:opacity-100 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
													title="Eliminar carpeta"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</td>
										</tr>
									);
								})}
								{sortedFiles.map((file) => {
									const Icon = fileIcon(file.name);
									const isSelected = selectedKeys.has(file.key);
									return (
										<tr
											key={file.key}
											className={`group border-b border-border last:border-b-0 transition-colors ${
												isSelected ? "bg-primary/5" : "hover:bg-muted/40"
											}`}
										>
											<td className="px-4 py-2.5">
												<Checkbox
													checked={isSelected}
													onCheckedChange={() => toggleSelected(file.key)}
													aria-label={`Seleccionar ${file.name}`}
												/>
											</td>
											<td className="px-2 py-2.5">
												<button
													onClick={() => openFileDetail(file)}
													className="flex items-center gap-3 min-w-0 text-left w-full"
												>
													<Icon className="h-5 w-5 text-muted-foreground shrink-0" />
													<p className="truncate">{file.name}</p>
												</button>
											</td>
											<td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell whitespace-nowrap">
												{file.lastModified
													? new Date(file.lastModified).toLocaleString(
															"es-AR",
															{
																year: "numeric",
																month: "short",
																day: "numeric",
																hour: "2-digit",
																minute: "2-digit",
															},
														)
													: "—"}
											</td>
											<td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
												{formatBytes(file.size)}
											</td>
											<td className="px-2 py-2.5">
												<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button
														onClick={() => handleDownload(file.key)}
														className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-muted hover:text-primary transition-colors"
														title="Descargar"
													>
														<Download className="h-4 w-4" />
													</button>
													<button
														onClick={() => handleDeleteFile(file.key, file.name)}
														className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
														title="Eliminar"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className="p-5 space-y-6">
						{/* Carpetas */}
						{data && data.folders.length > 0 && (
							<section>
								<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
									Carpetas · {data.folders.length}
								</h2>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
									{data.folders.map((folder) => {
										const meta = getFolderMeta(folder.key, folder.name);
										const isSelected = selectedKeys.has(folder.key);
										return (
											<div
												key={folder.key}
												className={`group relative rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
													isSelected
														? "border-primary ring-2 ring-primary/30"
														: "border-border hover:border-primary/40"
												}`}
											>
												<div
													className={`absolute top-2 left-2 z-10 transition-opacity ${
														isSelected || selectedKeys.size > 0
															? "opacity-100"
															: "opacity-0 group-hover:opacity-100"
													}`}
												>
													<Checkbox
														checked={isSelected}
														onCheckedChange={() => toggleSelected(folder.key)}
														aria-label={`Seleccionar ${meta.label}`}
														className="bg-background border-border"
													/>
												</div>
												<button
													onClick={() => setPrefix(folder.key)}
													className="w-full p-4 text-left"
												>
													<div
														className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ring-1 ${meta.style.bg} ${meta.style.ring}`}
													>
														<Folder className={`h-5 w-5 ${meta.style.icon}`} />
													</div>
													<p
														className="mt-3 font-semibold text-sm text-foreground truncate"
														title={meta.label}
													>
														{meta.label}
													</p>
													{meta.description && (
														<p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
															{meta.description}
														</p>
													)}
												</button>
												<button
													onClick={() =>
														handleDeleteFolder(folder.key, folder.name)
													}
													className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
													title="Eliminar carpeta"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</div>
										);
									})}
								</div>
							</section>
						)}

						{/* Archivos */}
						{data && data.files.length > 0 && (
							<section>
								<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
									Archivos · {data.files.length}
								</h2>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
									{data.files.map((file) => {
										const Icon = fileIcon(file.name);
										const isSelected = selectedKeys.has(file.key);
										return (
											<div
												key={file.key}
												className={`group relative rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
													isSelected
														? "border-primary ring-2 ring-primary/30"
														: "border-border hover:border-primary/40"
												}`}
											>
												<div
													className={`absolute top-2 left-2 z-10 transition-opacity ${
														isSelected || selectedKeys.size > 0
															? "opacity-100"
															: "opacity-0 group-hover:opacity-100"
													}`}
												>
													<Checkbox
														checked={isSelected}
														onCheckedChange={() => toggleSelected(file.key)}
														aria-label={`Seleccionar ${file.name}`}
														className="bg-background border-border"
													/>
												</div>
												<button
													onClick={() => openFileDetail(file)}
													className="w-full p-4 text-left"
												>
													<div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
														<Icon className="h-5 w-5 text-muted-foreground" />
													</div>
													<p
														className="mt-3 text-sm text-foreground truncate"
														title={file.name}
													>
														{file.name}
													</p>
													<p className="text-[11px] text-muted-foreground mt-0.5">
														{formatBytes(file.size)}
														{file.lastModified
															? ` · ${new Date(file.lastModified).toLocaleDateString("es-AR")}`
															: ""}
													</p>
												</button>
												<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button
														onClick={() => handleDownload(file.key)}
														className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-background border border-border hover:bg-muted hover:text-primary transition-colors"
														title="Descargar"
													>
														<Download className="h-3.5 w-3.5" />
													</button>
													<button
														onClick={() => handleDeleteFile(file.key, file.name)}
														className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-background border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
														title="Eliminar"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>
											</div>
										);
									})}
								</div>
							</section>
						)}
					</div>
				)}
			</div>

			{/* Dialog: subir archivos */}
			<Dialog
				open={uploadDialogOpen}
				onOpenChange={(open) => {
					if (isUploading) return;
					if (!open) closeUploadDialog();
					else setUploadDialogOpen(true);
				}}
			>
				<DialogContent className="sm:max-w-md overflow-hidden">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Upload className="h-5 w-5 text-primary" />
							Subir archivos
						</DialogTitle>
						<DialogDescription>
							{prefix
								? `Se van a subir dentro de ${prefix}`
								: "Se van a subir a la raíz del bucket"}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 min-w-0">
						{/* Dropzone */}
						<button
							type="button"
							onDragOver={(e) => {
								e.preventDefault();
								setIsDragging(true);
							}}
							onDragLeave={() => setIsDragging(false)}
							onDrop={(e) => {
								e.preventDefault();
								setIsDragging(false);
								if (e.dataTransfer.files.length) {
									addUploadFiles(e.dataTransfer.files);
								}
							}}
							onClick={() => dropInputRef.current?.click()}
							className={`w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-3 transition-colors ${
								isDragging
									? "border-primary bg-primary/10"
									: "border-primary/40 bg-primary/4 hover:bg-primary/10"
							}`}
						>
							<div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
								<UploadCloud className="h-7 w-7 text-primary" />
							</div>
							<p className="text-sm font-medium text-primary">
								Arrastrá archivos o hacé click para buscar
							</p>
							<p className="text-xs text-muted-foreground">
								Soporta múltiples archivos
							</p>
						</button>

						<input
							ref={dropInputRef}
							type="file"
							multiple
							className="hidden"
							onChange={(e) => {
								if (e.target.files) addUploadFiles(e.target.files);
								e.target.value = "";
							}}
						/>

						{/* Lista de archivos */}
						{uploadItems.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
								<p className="text-xs text-muted-foreground">
									Todavía no agregaste archivos para subir
								</p>
							</div>
						) : (
							<div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-1 min-w-0">
								{uploadItems.map((item, idx) => {
									const Icon = fileIcon(item.file.name);
									const statusLabel =
										item.status === "pending"
											? "Pendiente"
											: item.status === "uploading"
												? `Subiendo · ${item.progress}%`
												: item.status === "done"
													? "Subido"
													: item.error || "Error";
									return (
										<div
											key={idx}
											className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/30 overflow-hidden min-w-0 w-full"
										>
											<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
												{item.preview ? (
													<img
														src={item.preview}
														alt={item.file.name}
														className="absolute inset-0 block h-full w-full object-cover"
													/>
												) : (
													<div className="absolute inset-0 flex items-center justify-center">
														<Icon className="h-5 w-5 text-muted-foreground" />
													</div>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{item.file.name}
												</p>
												<p
													className={`text-[11px] ${
														item.status === "error"
															? "text-red-500"
															: item.status === "done"
																? "text-green-600"
																: "text-muted-foreground"
													}`}
												>
													{formatBytes(item.file.size)} · {statusLabel}
												</p>
												{item.status === "uploading" && (
													<div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
														<div
															className="h-full bg-primary transition-all duration-200"
															style={{ width: `${item.progress}%` }}
														/>
													</div>
												)}
											</div>
											<div className="shrink-0">
												{item.status === "pending" && (
													<button
														type="button"
														onClick={() => removeUploadItem(idx)}
														className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
														title="Quitar"
													>
														<X className="h-4 w-4" />
													</button>
												)}
												{item.status === "uploading" && (
													<Loader2 className="h-5 w-5 animate-spin text-primary" />
												)}
												{item.status === "done" && (
													<div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
														<CheckCircle2 className="h-5 w-5 text-green-600" />
													</div>
												)}
												{item.status === "error" && (
													<AlertCircle className="h-5 w-5 text-red-500" />
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={closeUploadDialog}
							disabled={isUploading}
						>
							Cerrar
						</Button>
						<Button
							type="button"
							onClick={handleUploadAll}
							disabled={!hasPending || isUploading}
						>
							{isUploading && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Subir{" "}
							{hasPending
								? `(${uploadItems.filter((i) => i.status === "pending").length})`
								: ""}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Dialog: nueva carpeta */}
			<Dialog
				open={createFolderOpen}
				onOpenChange={(open) => {
					if (!isCreatingFolder) setCreateFolderOpen(open);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FolderPlus className="h-5 w-5 text-primary" />
							Nueva carpeta
						</DialogTitle>
						<DialogDescription>
							{prefix
								? `Se va a crear dentro de ${prefix}`
								: "Se va a crear en la raíz del bucket"}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmitCreateFolder} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="new-folder-name">Nombre</Label>
							<Input
								id="new-folder-name"
								value={newFolderName}
								onChange={(e) => setNewFolderName(e.target.value)}
								placeholder="Ej: documentos-2026"
								autoFocus
								disabled={isCreatingFolder}
							/>
							<p className="text-xs text-muted-foreground">
								Evitá espacios y caracteres especiales. Usá guiones o guion bajo.
							</p>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateFolderOpen(false)}
								disabled={isCreatingFolder}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={isCreatingFolder || !newFolderName.trim()}
							>
								{isCreatingFolder && (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								)}
								Crear
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Drawer de detalle */}
			<Sheet
				open={detailFolder !== null || detailFile !== null}
				onOpenChange={(open) => {
					if (!open) closeDetail();
				}}
			>
				<SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
					{detailFolder &&
						(() => {
							const meta = getFolderMeta(detailFolder.key, detailFolder.name);
							return (
								<>
									<SheetHeader>
										<SheetTitle className="flex items-center gap-3 pr-6">
											<div
												className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1 shrink-0 ${meta.style.bg} ${meta.style.ring}`}
											>
												<Folder className={`h-5 w-5 ${meta.style.icon}`} />
											</div>
											<span className="truncate">{meta.label}</span>
										</SheetTitle>
										<SheetDescription>
											{meta.description || "Carpeta"}
										</SheetDescription>
									</SheetHeader>

									<div className="px-4 space-y-5">
										{/* Acciones */}
										<div className="space-y-1.5">
											<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
												Acciones
											</p>
											<button
												onClick={() => {
													const target = detailFolder.key;
													closeDetail();
													setPrefix(target);
												}}
												className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
											>
												<Folder className="h-4 w-4 text-primary" />
												Abrir carpeta
											</button>
										</div>

										{/* Eliminar */}
										<Button
											variant="outline"
											className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
											onClick={async () => {
												const folderKey = detailFolder.key;
												const folderName = detailFolder.name;
												closeDetail();
												await handleDeleteFolder(folderKey, folderName);
											}}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Eliminar carpeta
										</Button>

										{/* Info */}
										<div>
											<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
												Información
											</p>
											<dl className="space-y-3 text-sm">
												<div>
													<dt className="text-xs text-muted-foreground">
														Nombre
													</dt>
													<dd className="font-medium">{meta.label}</dd>
												</div>
												<div>
													<dt className="text-xs text-muted-foreground">
														Slug
													</dt>
													<dd className="font-mono text-xs">
														{detailFolder.name}
													</dd>
												</div>
												<div>
													<dt className="text-xs text-muted-foreground">
														Ruta
													</dt>
													<dd className="font-mono text-xs break-all">
														{detailFolder.key}
													</dd>
												</div>
											</dl>
										</div>
									</div>
								</>
							);
						})()}

					{detailFile &&
						(() => {
							const Icon = fileIcon(detailFile.name);
							const previewType = getPreviewType(detailFile.name);
							return (
								<>
									<SheetHeader>
										<SheetTitle className="flex items-center gap-3 pr-6">
											<div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
												<Icon className="h-5 w-5 text-muted-foreground" />
											</div>
											<span className="truncate text-sm">
												{detailFile.name}
											</span>
										</SheetTitle>
										<SheetDescription>
											{formatBytes(detailFile.size)}
											{detailFile.lastModified
												? ` · ${new Date(detailFile.lastModified).toLocaleDateString("es-AR")}`
												: ""}
										</SheetDescription>
									</SheetHeader>

									<div className="px-4 space-y-5">
										{/* Preview */}
										{previewType === "image" && detailPreviewUrl && (
											<div className="rounded-lg overflow-hidden border border-border bg-muted/30">
												<img
													src={detailPreviewUrl}
													alt={detailFile.name}
													className="block w-full h-auto max-h-80 object-contain"
												/>
											</div>
										)}
										{previewType === "pdf" && detailPreviewUrl && (
											<div className="rounded-lg overflow-hidden border border-border bg-muted/30">
												<iframe
													src={detailPreviewUrl}
													title={detailFile.name}
													className="block w-full h-96 bg-background"
												/>
											</div>
										)}
										{previewType === "office" && detailPreviewUrl && (
											<div className="rounded-lg overflow-hidden border border-border bg-muted/30">
												<iframe
													src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
														detailPreviewUrl,
													)}`}
													title={detailFile.name}
													className="block w-full h-96 bg-background"
												/>
												<p className="px-3 py-2 text-[11px] text-muted-foreground bg-muted/40 border-t border-border">
													Visualización via Office Online. Si no carga, descargá el archivo.
												</p>
											</div>
										)}
										{previewType && !detailPreviewUrl && (
											<div className="rounded-lg border border-border bg-muted/30 p-6 flex items-center justify-center">
												<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
											</div>
										)}

										{/* Acciones */}
										<div className="space-y-1.5">
											<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
												Acciones
											</p>
											<button
												onClick={() => handleDownload(detailFile.key)}
												className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
											>
												<Download className="h-4 w-4 text-primary" />
												Descargar
											</button>
											<button
												onClick={async () => {
													try {
														const res = await fetch(
															`/api/storage/object?key=${encodeURIComponent(detailFile.key)}`,
														);
														if (!res.ok) throw new Error();
														const { url } = await res.json();
														await navigator.clipboard.writeText(url);
														toast.success("Link copiado");
													} catch {
														toast.error("No se pudo copiar el link");
													}
												}}
												className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
											>
												<Upload className="h-4 w-4 text-primary" />
												Copiar link
											</button>
										</div>

										{/* Eliminar */}
										<Button
											variant="outline"
											className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
											onClick={async () => {
												const fileKey = detailFile.key;
												const fileName = detailFile.name;
												closeDetail();
												await handleDeleteFile(fileKey, fileName);
											}}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Eliminar
										</Button>

										{/* Info */}
										<div>
											<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
												Información
											</p>
											<dl className="space-y-3 text-sm">
												<div>
													<dt className="text-xs text-muted-foreground">
														Nombre
													</dt>
													<dd className="font-medium break-all">
														{detailFile.name}
													</dd>
												</div>
												<div>
													<dt className="text-xs text-muted-foreground">
														Tamaño
													</dt>
													<dd className="font-medium">
														{formatBytes(detailFile.size)}
													</dd>
												</div>
												<div>
													<dt className="text-xs text-muted-foreground">
														Última modificación
													</dt>
													<dd className="font-medium">
														{detailFile.lastModified
															? new Date(detailFile.lastModified).toLocaleString(
																	"es-AR",
																)
															: "—"}
													</dd>
												</div>
												<div>
													<dt className="text-xs text-muted-foreground">
														Ruta
													</dt>
													<dd className="font-mono text-xs break-all">
														{detailFile.key}
													</dd>
												</div>
											</dl>
										</div>
									</div>
								</>
							);
						})()}
				</SheetContent>
			</Sheet>

			{ConfirmationDialog}
		</div>
	);
}
