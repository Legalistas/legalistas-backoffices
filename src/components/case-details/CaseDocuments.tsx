"use client";
import JSZip from "jszip";
import {
	Archive,
	ChevronDown,
	Download,
	File,
	FileArchive,
	FileCode,
	FileImage,
	FileIcon as FilePdf,
	FileText,
	Trash2,
	X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { BASE_URL } from "@/constant/api-endpoints";
import type { CasesDocuments } from "@/types/cases";

interface CasesDocumentsProps {
	documents: CasesDocuments[];
	caseId?: string;
	onDocumentLoad?: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
	all: { label: "Todas las categorías", color: "" },
	general: {
		label: "General",
		color: "bg-muted text-foreground border-border",
	},
	legal: { label: "Legal", color: "bg-blue-50 text-blue-700 border-blue-200" },
	fiscal: {
		label: "Fiscal",
		color: "bg-green-50 text-green-700 border-green-200",
	},
	personal: {
		label: "Personal",
		color: "bg-purple-50 text-purple-700 border-purple-200",
	},
	informe_trimestral: {
		label: "Informe Trimestral",
		color: "bg-teal-50 text-teal-700 border-teal-200",
	},
};

export default function CaseDocuments({
	documents,
	caseId,
	onDocumentLoad,
}: CasesDocumentsProps) {
	const { data: session } = useSession();
	const [isDeleting, setIsDeleting] = useState<number | null>(null);
	const [isDownloadingAll, setIsDownloadingAll] = useState(false);
	const [filterCategory, setFilterCategory] = useState<string>("all");

	// Función para obtener el icono según la extensión del archivo
	const getFileIcon = (extension: string) => {
		switch (extension?.toLowerCase()) {
			case "pdf":
				return <FilePdf className="h-5 w-5 text-red-500" />;
			case "jpg":
			case "jpeg":
			case "png":
			case "webp":
			case "avif":
				return <FileImage className="h-5 w-5 text-blue-500" />;
			case "zip":
			case "rar":
				return <FileArchive className="h-5 w-5 text-yellow-500" />;
			case "doc":
			case "docx":
				return <FileText className="h-5 w-5 text-blue-700" />;
			case "html":
			case "css":
			case "js":
				return <FileCode className="h-5 w-5 text-green-500" />;
			default:
				return <File className="h-5 w-5 text-muted-foreground" />;
		}
	};

	// Función para formatear el tamaño del archivo
	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Number.parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
	};

	// Función para formatear la fecha
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Función para descargar un documento
	const handleDownload = async (docItem: CasesDocuments) => {
		try {
			if (!docItem.filePath) {
				toast.error("Ruta del archivo no disponible");
				return;
			}

			const fileUrl = `${BASE_URL}/${docItem.filePath}`;

			const fetchOptions: RequestInit = {
				method: "GET",
				mode: "cors",
			};

			if (session?.user?.accessToken) {
				fetchOptions.headers = {
					Authorization: `Bearer ${session.user.accessToken}`,
				};
			}

			toast.loading("Iniciando descarga...", { id: "download-toast" });

			const response = await fetch(fileUrl, fetchOptions);

			if (!response.ok) {
				throw new Error(`Error ${response.status}: ${response.statusText}`);
			}

			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);

			const downloadLink = document.createElement("a");
			downloadLink.style.display = "none";
			downloadLink.href = blobUrl;

			const fileName =
				docItem.fileName || `documento.${docItem.extension || "bin"}`;
			downloadLink.download = fileName;

			document.body.appendChild(downloadLink);
			downloadLink.click();

			setTimeout(() => {
				if (document.body.contains(downloadLink)) {
					document.body.removeChild(downloadLink);
				}
				window.URL.revokeObjectURL(blobUrl);
			}, 100);

			toast.success("Documento descargado correctamente", {
				id: "download-toast",
			});
		} catch (error) {
			console.error("Error al descargar:", error);
			toast.error("Error al descargar el documento", { id: "download-toast" });

			if (docItem.filePath) {
				const fileUrl = `${BASE_URL}/${docItem.filePath}`;
				const newWindow = window.open(fileUrl, "_blank");
				if (newWindow) {
					newWindow.focus();
					toast.info("Archivo abierto en nueva pestaña");
				}
			}
		}
	};

	// Función para eliminar un documento
	const handleDelete = async (documentId: number) => {
		if (!session?.user?.accessToken) {
			toast.error("No estás autenticado");
			return;
		}

		try {
			setIsDeleting(documentId);
			// TODO: implementar endpoint de eliminación
			toast.info("Eliminación de documentos próximamente");
		} catch (error) {
			console.error("Error al eliminar:", error);
			toast.error("Error al eliminar el documento");
		} finally {
			setIsDeleting(null);
		}
	};

	const handleDownloadAll = async () => {
		if (!documents || documents.length === 0) {
			toast.error("No hay documentos para descargar");
			return;
		}

		try {
			setIsDownloadingAll(true);
			toast.loading("Preparando descarga de todos los documentos...", {
				id: "download-all-toast",
			});

			const zip = new JSZip();
			let successCount = 0;
			let errorCount = 0;

			for (const doc of documents) {
				try {
					if (!doc.filePath) {
						errorCount++;
						continue;
					}

					const fileUrl = `${BASE_URL}/${doc.filePath}`;
					const fetchOptions: RequestInit = {
						method: "GET",
						mode: "cors",
					};

					if (session?.user?.accessToken) {
						fetchOptions.headers = {
							Authorization: `Bearer ${session.user.accessToken}`,
						};
					}

					const response = await fetch(fileUrl, fetchOptions);

					if (!response.ok) {
						errorCount++;
						continue;
					}

					const blob = await response.blob();
					const fileName =
						doc.fileName || `documento_${doc.id}.${doc.extension || "bin"}`;

					zip.file(fileName, blob);
					successCount++;
				} catch (error) {
					console.error(`Error descargando ${doc.fileName}:`, error);
					errorCount++;
				}
			}

			if (successCount === 0) {
				toast.error("No se pudo descargar ningún documento", {
					id: "download-all-toast",
				});
				return;
			}

			toast.loading("Generando archivo ZIP...", { id: "download-all-toast" });
			const zipBlob = await zip.generateAsync({ type: "blob" });

			const blobUrl = window.URL.createObjectURL(zipBlob);
			const downloadLink = document.createElement("a");
			downloadLink.style.display = "none";
			downloadLink.href = blobUrl;
			downloadLink.download = `documentos_caso_${caseId}.zip`;

			document.body.appendChild(downloadLink);
			downloadLink.click();

			setTimeout(() => {
				if (document.body.contains(downloadLink)) {
					document.body.removeChild(downloadLink);
				}
				window.URL.revokeObjectURL(blobUrl);
			}, 100);

			const message =
				errorCount > 0
					? `ZIP descargado con ${successCount} documentos (${errorCount} errores)`
					: `ZIP descargado con ${successCount} documentos`;

			toast.success(message, { id: "download-all-toast" });
		} catch (error) {
			console.error("Error al crear ZIP:", error);
			toast.error("Error al crear el archivo ZIP", {
				id: "download-all-toast",
			});
		} finally {
			setIsDownloadingAll(false);
		}
	};

	// Ordenar documentos por fecha descendente y filtrar por categoría
	const sortedDocuments = [...documents].sort(
		(a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
	);
	const filteredDocuments =
		filterCategory === "all"
			? sortedDocuments
			: sortedDocuments.filter(
					(d) => (d.category || "general").toLowerCase() === filterCategory,
				);

	// Obtener categorías únicas de los documentos
	const uniqueCategories = Array.from(
		new Set(documents.map((d) => (d.category || "general").toLowerCase())),
	);

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-border">
				<div className="flex items-center gap-2">
					<FileText className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-md font-semibold text-foreground">
						Documentos
					</h3>
					{documents.length > 0 && (
						<span className="text-xs text-muted-foreground">
							({documents.length}{" "}
							{documents.length === 1 ? "archivo" : "archivos"})
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{documents.length > 0 && (
						<>
							{uniqueCategories.length > 1 && (
								<div className="relative">
									<select
										value={filterCategory}
										onChange={(e) => setFilterCategory(e.target.value)}
										className="appearance-none text-xs font-medium text-muted-foreground bg-card border border-border rounded-md pl-3 pr-7 py-2 hover:border-input focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
									>
										<option value="all">Todas las categorías</option>
										{uniqueCategories.map((cat) => (
											<option key={cat} value={cat}>
												{CATEGORY_CONFIG[cat]?.label ||
													cat.charAt(0).toUpperCase() + cat.slice(1)}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
								</div>
							)}
							{filterCategory !== "all" && (
								<button
									onClick={() => setFilterCategory("all")}
									className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
							<button
								onClick={handleDownloadAll}
								disabled={isDownloadingAll}
								className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
							>
								<Archive className="h-3.5 w-3.5" />
								{isDownloadingAll ? "Descargando..." : "Descargar todo"}
							</button>
						</>
					)}
				</div>
			</div>

			{/* Content */}
			{documents.length === 0 ? (
				<div className="flex flex-col items-center justify-center px-5 py-14">
					<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
						<FileText className="h-6 w-6 text-muted-foreground" />
					</div>
					<p className="text-sm font-medium text-foreground mb-1">
						No hay documentos disponibles
					</p>
					<p className="text-xs text-muted-foreground mb-3">
						Los documentos subidos aparecerán aquí.
					</p>
				</div>
			) : filteredDocuments.length === 0 ? (
				<div className="flex flex-col items-center justify-center px-5 py-10">
					<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
						<FileText className="h-5 w-5 text-muted-foreground" />
					</div>
					<p className="text-sm font-medium text-foreground mb-0.5">
						Sin resultados
					</p>
					<p className="text-xs text-muted-foreground mb-3">
						No hay documentos en esta categoría
					</p>
					<button
						onClick={() => setFilterCategory("all")}
						className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
					>
						Limpiar filtro
					</button>
				</div>
			) : (
				<div className="p-4 space-y-3">
					{filteredDocuments.map((doc) => {
						const extLabel =
							doc.fileType?.split("/")[1]?.toUpperCase() ||
							doc.extension?.toUpperCase() ||
							"ARCHIVO";

						return (
							<div
								key={doc.id}
								className="rounded-lg border p-5 bg-card border-border hover:border-input transition-colors"
							>
								<div className="flex items-start justify-between gap-4">
									{/* Info del documento */}
									<div className="flex items-start gap-3 min-w-0 flex-1">
										<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted border border-border shrink-0">
											{getFileIcon(doc.extension || "")}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 flex-wrap">
												<h4 className="text-sm font-semibold text-foreground truncate">
													{doc.fileName || doc.description || "Sin nombre"}
												</h4>
												<span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
													{extLabel}
												</span>
											</div>

											{doc.description && doc.fileName && (
												<p className="mt-1 text-sm text-muted-foreground line-clamp-1">
													{doc.description}
												</p>
											)}

											<div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
												<span>{formatFileSize(doc.fileSize || 0)}</span>
												<span>•</span>
												<span>
													{doc.uploadedAt
														? formatDate(doc.uploadedAt)
														: "Sin fecha"}
												</span>
												{doc.category && (
													<>
														<span>•</span>
														<span
															className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${CATEGORY_CONFIG[doc.category.toLowerCase()]?.color || "bg-muted text-foreground border-border"}`}
														>
															{CATEGORY_CONFIG[doc.category.toLowerCase()]
																?.label || doc.category}
														</span>
													</>
												)}
												{doc.isPublic && (
													<>
														<span>•</span>
														<span className="text-green-500 font-medium">
															Público
														</span>
													</>
												)}
											</div>
										</div>
									</div>

									{/* Acciones */}
									<div className="flex items-center gap-1.5 shrink-0">
										<button
											onClick={() => handleDownload(doc)}
											title="Descargar documento"
											className="p-2 rounded-lg border border-border bg-card hover:bg-primary/5 text-primary transition-colors"
										>
											<Download className="h-4 w-4" />
										</button>
										<button
											onClick={() => handleDelete(doc.id)}
											disabled={isDeleting === doc.id}
											title="Eliminar documento"
											className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
										>
											<Trash2
												className={`h-4 w-4 ${isDeleting === doc.id ? "opacity-50" : ""}`}
											/>
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
