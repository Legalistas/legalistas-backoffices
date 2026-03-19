"use client";
import {
	Download,
	File,
	FileArchive,
	FileCode,
	FileImage,
	FileIcon as FilePdf,
	FileText,
	Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import {
	BASE_URL,
	LEADS_DOCUMENTS_DELETE_ENDPOINT,
} from "@/constant/api-endpoints";
import type { Lead } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface LeadDocumentsProps {
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function LeadDocuments({
	lead,
	onLeadUpdate,
}: LeadDocumentsProps) {
	const { data: session } = useSession();
	const [isDeleting, setIsDeleting] = useState<number | null>(null);

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
				return <File className="h-5 w-5 text-gray-500" />;
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
	const handleDownload = async (docItem: any) => {
		try {
			// Verificar que tenemos la ruta del archivo
			if (!docItem.filePath) {
				toast.error("Ruta del archivo no disponible");
				return;
			}

			// Construir la URL completa del documento
			const fileUrl = `${BASE_URL}/${docItem.filePath}`;

			// Crear un enlace temporal y simular clic para descargar
			const a = document.createElement("a");
			a.href = fileUrl;
			a.download = docItem.fileName || "documento";
			a.target = "_blank"; // Abrir en nueva pestaña por si es necesario autenticación
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			toast.success("Descargando documento...");
		} catch (error) {
			console.error("Error al descargar:", error);
			toast.error("Error al descargar el documento");
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

			// Usar el endpoint proporcionado para eliminar el documento
			const response = await fetch(
				LEADS_DOCUMENTS_DELETE_ENDPOINT(Number(lead.id), Number(documentId)),
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error(`Error al eliminar: ${response.statusText}`);
			}

			toast.success("Documento eliminado correctamente");

			// Si existe la función onLeadUpdate, actualizar el lead después de eliminar
			if (onLeadUpdate) {
				// Crear una copia del lead sin el documento eliminado
				const updatedLead = {
					...lead,
					crmDocument:
						lead.crmDocument?.filter((doc) => doc.id !== documentId) || [],
				};
				onLeadUpdate(updatedLead);
			}
		} catch (error) {
			console.error("Error al eliminar:", error);
			toast.error("Error al eliminar el documento");
		} finally {
			setIsDeleting(null);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Documentos</CardTitle>
				<CardDescription>Archivos relacionados con este lead</CardDescription>
			</CardHeader>
			<CardContent>
				{(lead.crmDocument?.length ?? 0) > 0 ? (
					<div className="overflow-x-auto">
						<Table className="w-full">
							<TableHeader>
								<TableRow>
									<TableCell
										colSpan={2}
										className="w-[30%] px-4 py-3 text-sm font-semibold text-left"
									>
										Nombre
									</TableCell>
									<TableCell className="w-[15%] px-4 py-3 text-sm font-semibold text-left">
										Tamaño
									</TableCell>
									<TableCell className="w-[15%] px-4 py-3 text-sm font-semibold text-left">
										Tipo
									</TableCell>
									<TableCell className="w-[20%] px-4 py-3 text-sm font-semibold text-left">
										Fecha
									</TableCell>
									<TableCell className="w-[15%] px-4 py-3 text-sm font-semibold text-center">
										Acciones
									</TableCell>
								</TableRow>
							</TableHeader>
							<TableBody>
								{lead.crmDocument?.map((document) => (
									<TableRow key={document.id}>
										<TableCell className="w-[1%] px-4 py-3">
											{getFileIcon(document.extension || "")}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											{document.fileName || document.description}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											{formatFileSize(document.fileSize || 0)}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											<Badge
												variant="secondary"
												className="text-gray-700 text-sm"
											>
												{document.fileType?.split("/")[1]?.toUpperCase() ||
													document.extension?.toUpperCase()}
											</Badge>
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											{document.uploadedAt
												? formatDate(document.uploadedAt)
												: "N/A"}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-center">
											<div className="flex justify-center space-x-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDownload(document)}
												>
													<Download className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDelete(document.id)}
													disabled={isDeleting === document.id}
													className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<div className="text-center py-6">
						<FileText className="h-12 w-12 mx-auto text-muted-foreground" />
						<p className="mt-2 text-muted-foreground">
							No hay documentos disponibles
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
