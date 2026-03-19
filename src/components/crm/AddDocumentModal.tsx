"use client";

import {
	AlertCircle,
	CheckCircle,
	File,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
	LEADS_ENDPOINT,
	LEADS_UPLOAD_ENDPOINT,
} from "@/constant/api-endpoints";
import type { Lead } from "@/types/crm";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface AddDocumentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

const ACCEPTED_FILE_TYPES = {
	"application/pdf": [".pdf"],
	"application/msword": [".doc"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
		".docx",
	],
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
	"image/webp": [".webp"],
	"image/avif": [".avif"],
};

export default function AddDocumentModal({
	open,
	onOpenChange,
	lead,
	onLeadUpdate,
}: AddDocumentModalProps) {
	const { data: session } = useSession();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
	const [uploadStatus, setUploadStatus] = useState<
		Record<string, "idle" | "uploading" | "success" | "error">
	>({});

	const onDrop = useCallback((acceptedFiles: File[]) => {
		setFiles((prevFiles) => {
			const newFiles = acceptedFiles.filter(
				(file) =>
					!prevFiles.some(
						(prevFile) =>
							prevFile.name === file.name && prevFile.size === file.size,
					),
			);
			return [...prevFiles, ...newFiles].slice(0, 5);
		});

		setUploadProgress((prev) => {
			const next = { ...prev };
			for (const file of acceptedFiles) {
				if (!(file.name in next)) next[file.name] = 0;
			}
			return next;
		});

		setUploadStatus((prev) => {
			const next = { ...prev };
			for (const file of acceptedFiles) {
				if (!(file.name in next)) next[file.name] = "idle";
			}
			return next;
		});
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_FILE_TYPES,
		maxSize: 10485760,
		maxFiles: 5,
	});

	const removeFile = (fileName: string) => {
		setFiles((prev) => prev.filter((file) => file.name !== fileName));
		setUploadProgress((prev) => {
			const next = { ...prev };
			delete next[fileName];
			return next;
		});
		setUploadStatus((prev) => {
			const next = { ...prev };
			delete next[fileName];
			return next;
		});
	};

	const handleClose = () => {
		setFiles([]);
		setUploadProgress({});
		setUploadStatus({});
		onOpenChange(false);
	};

	const uploadFiles = async () => {
		if (files.length === 0) {
			toast.error("Por favor, selecciona al menos un archivo");
			return;
		}

		setIsSubmitting(true);

		try {
			const results = await Promise.allSettled(
				files.map(async (file) => {
					setUploadStatus((prev) => ({ ...prev, [file.name]: "uploading" }));

					let progress = 0;
					const interval = setInterval(() => {
						progress += Math.random() * 10;
						if (progress > 95) {
							progress = 95;
							clearInterval(interval);
						}
						setUploadProgress((prev) => ({
							...prev,
							[file.name]: Math.min(Math.round(progress), 95),
						}));
					}, 300);

					try {
						const formData = new FormData();
						formData.append("file", file);
						formData.append("documentName", file.name);
						formData.append("userId", session?.user?.id || "");

						const response = await fetch(
							`${LEADS_UPLOAD_ENDPOINT(Number(lead.id))}`,
							{
								method: "POST",
								headers: {
									Authorization: `Bearer ${session?.user?.accessToken}`,
								},
								body: formData,
							},
						);

						clearInterval(interval);

						if (!response.ok) {
							throw new Error(
								`Error al subir ${file.name}: ${response.statusText}`,
							);
						}

						setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
						setUploadStatus((prev) => ({ ...prev, [file.name]: "success" }));

						return await response.json();
					} catch (error) {
						clearInterval(interval);
						setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }));
						throw error;
					}
				}),
			);

			const allSuccessful = results.every((r) => r.status === "fulfilled");

			if (allSuccessful) {
				toast.success("Documentos subidos correctamente");

				const updatedLeadResponse = await fetch(
					`${LEADS_ENDPOINT}/${lead.id}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
					},
				);

				if (updatedLeadResponse.ok) {
					const updatedLead = await updatedLeadResponse.json();
					onLeadUpdate(updatedLead);
				}

				handleClose();
			} else {
				const failedCount = results.filter((r) => r.status === "rejected").length;
				toast.error(
					`${failedCount} documento(s) no se pudieron subir. Inténtalo de nuevo.`,
				);
			}
		} catch {
			toast.error("Ocurrió un error al subir los documentos");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Nuevo documento</DialogTitle>
					<DialogDescription>
						Selecciona el archivo para{" "}
						<span className="font-medium text-foreground">{lead.user?.name}</span>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Dropzone */}
					<div
						{...getRootProps()}
						className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
							isDragActive
								? "border-primary bg-primary/5"
								: "border-muted-foreground/25 hover:border-muted-foreground/50"
						}`}
					>
						<input {...getInputProps()} />
						<Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
						{isDragActive ? (
							<p className="text-primary">Suelta los archivos aquí...</p>
						) : (
							<div>
								<p className="text-muted-foreground">
									Arrastra y suelta archivos aquí, o haz clic para seleccionar
								</p>
								<p className="text-sm text-muted-foreground/70 mt-1">
									PDF, DOC, DOCX, JPG, PNG, WEBP, AVIF (máx. 10MB)
								</p>
							</div>
						)}
					</div>

					{/* File list */}
					{files.length > 0 && (
						<div className="space-y-2 max-h-50 overflow-y-auto">
							<p className="text-sm font-medium">Archivos seleccionados:</p>
							{files.map((file) => (
								<div
									key={file.name}
									className="flex items-center justify-between bg-muted p-2 rounded-md"
								>
									<div className="flex items-center space-x-2 overflow-hidden">
										<File className="h-4 w-4 text-muted-foreground shrink-0" />
										<span className="text-sm truncate">{file.name}</span>
									</div>
									<div className="flex items-center space-x-2">
										{uploadStatus[file.name] === "uploading" && (
											<div className="w-16 bg-muted-foreground/20 rounded-full h-2.5">
												<div
													className="bg-primary h-2.5 rounded-full"
													style={{ width: `${uploadProgress[file.name]}%` }}
												/>
											</div>
										)}
										{uploadStatus[file.name] === "success" && (
											<CheckCircle className="h-4 w-4 text-green-500" />
										)}
										{uploadStatus[file.name] === "error" && (
											<AlertCircle className="h-4 w-4 text-red-500" />
										)}
										<button
											onClick={(e) => {
												e.stopPropagation();
												removeFile(file.name);
											}}
											className="text-muted-foreground hover:text-destructive"
											disabled={isSubmitting}
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button onClick={uploadFiles} disabled={isSubmitting || files.length === 0}>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Subir documentos
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
