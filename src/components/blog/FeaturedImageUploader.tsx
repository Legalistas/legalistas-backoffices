"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { BLOG_UPLOAD_ENDPOINT } from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";

interface FeaturedImageUploaderProps {
	value: string | null;
	onChange: (url: string | null) => void;
	/** Callback opcional con metadata: dimensiones, bytes originales/optimizados. */
	onUploaded?: (info: {
		url: string;
		width?: number;
		height?: number;
		size?: number;
		originalSize?: number;
	}) => void;
	slugHint?: string;
	label?: string;
	help?: string;
	aspect?: "video" | "square" | "auto";
}

const aspectClass = {
	video: "aspect-video",
	square: "aspect-square",
	auto: "",
} as const;

export function FeaturedImageUploader({
	value,
	onChange,
	onUploaded,
	slugHint,
	label = "Imagen destacada",
	help,
	aspect = "video",
}: FeaturedImageUploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);

	const handleFile = useCallback(
		async (file: File) => {
			setUploading(true);
			try {
				const form = new FormData();
				form.append("file", file);
				if (slugHint) form.append("slug", slugHint);
				const res = await fetch(BLOG_UPLOAD_ENDPOINT, {
					method: "POST",
					body: form,
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({ error: "Error" }));
					throw new Error(err.error || "Error al subir");
				}
				const data = await res.json();
				onChange(data.url);
				onUploaded?.({
					url: data.url,
					width: data.width,
					height: data.height,
					size: data.size,
					originalSize: data.originalSize,
				});
				if (data.optimized && data.originalSize && data.size) {
					const saved = Math.round(
						(1 - data.size / data.originalSize) * 100,
					);
					toast.success(
						saved > 0
							? `Imagen subida (${saved}% más liviana)`
							: "Imagen subida",
					);
				} else {
					toast.success("Imagen subida");
				}
			} catch (err) {
				console.error("[FeaturedImageUploader] upload:", err);
				toast.error(err instanceof Error ? err.message : "Error al subir");
			} finally {
				setUploading(false);
			}
		},
		[onChange, onUploaded, slugHint],
	);

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (file) handleFile(file);
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file) handleFile(file);
	};

	return (
		<div className="space-y-1.5">
			<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
				{label}
			</label>

			{value ? (
				<div
					className={cn(
						"relative w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-white/5",
						aspectClass[aspect],
					)}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={value}
						alt=""
						className="w-full h-full object-cover"
					/>
					<button
						type="button"
						onClick={() => onChange(null)}
						className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
						title="Quitar imagen"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			) : (
				<div
					onClick={() => inputRef.current?.click()}
					onDragOver={(e) => e.preventDefault()}
					onDrop={onDrop}
					className={cn(
						"flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-white/3 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5",
						aspectClass[aspect],
						aspect === "auto" && "py-10",
					)}
				>
					{uploading ? (
						<>
							<Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
							<p className="text-xs text-gray-500 mt-2">Subiendo...</p>
						</>
					) : (
						<>
							<ImagePlus className="h-6 w-6 text-gray-400" />
							<p className="text-xs text-gray-500 mt-2">
								Arrastrá o click para subir
							</p>
							<p className="text-[10px] text-gray-400 mt-0.5">
								JPG, PNG, WEBP, AVIF, GIF — máx 10MB
							</p>
						</>
					)}
				</div>
			)}

			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				hidden
				onChange={onFileChange}
			/>

			{help && <p className="text-[11px] text-gray-400">{help}</p>}
		</div>
	);
}
