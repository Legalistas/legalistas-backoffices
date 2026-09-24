"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Props {
	uploading: boolean;
	uploadProgress: number;
	onUpload: (file: File) => Promise<void>;
	maxMb?: number;
}

// Dropzone + file input para subir un PDF. Valida extensión y tamaño en el
// cliente antes de mandarlo (el backend re-valida igual).
export function CaseAnalysisUploader({
	uploading,
	uploadProgress,
	onUpload,
	maxMb = 100,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const handleFile = async (file: File) => {
		if (!file.name.toLowerCase().endsWith(".pdf")) {
			toast.error("Solo se aceptan archivos PDF");
			return;
		}
		if (file.size > maxMb * 1024 * 1024) {
			toast.error(`El archivo supera el máximo de ${maxMb}MB`);
			return;
		}
		await onUpload(file);
	};

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				const file = e.dataTransfer.files[0];
				if (file) void handleFile(file);
			}}
			className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-colors ${
				dragging
					? "border-primary bg-primary/5"
					: "border-slate-300 bg-slate-50"
			}`}
		>
			<FileUp className="mb-3 h-10 w-10 text-slate-400" />
			<h3 className="text-base font-medium text-slate-800">
				Subí el expediente en PDF
			</h3>
			<p className="mt-1 text-sm text-slate-500">
				Arrastralo acá o hacé click abajo. Máximo {maxMb}MB.
			</p>

			<input
				ref={inputRef}
				type="file"
				accept="application/pdf,.pdf"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) {
						void handleFile(file);
						e.target.value = "";
					}
				}}
			/>

			<Button
				className="mt-4"
				onClick={() => inputRef.current?.click()}
				disabled={uploading}
			>
				{uploading ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<FileUp className="mr-2 h-4 w-4" />
				)}
				{uploading ? "Subiendo..." : "Seleccionar PDF"}
			</Button>

			{uploading && (
				<div className="mt-4 w-full max-w-sm">
					<Progress value={uploadProgress} className="h-2" />
					<p className="mt-1 text-xs text-slate-500">
						{uploadProgress}% — no cierres la pestaña
					</p>
				</div>
			)}
		</div>
	);
}
