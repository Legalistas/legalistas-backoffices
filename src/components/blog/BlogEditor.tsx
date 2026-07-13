"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { BLOG_UPLOAD_ENDPOINT } from "@/constant/api-endpoints";

interface BlogEditorProps {
	content: string;
	onChange: (html: string) => void;
	/** slug actual del post — se pasa al uploader para nombrar las imágenes inline */
	slugHint?: string;
	placeholder?: string;
}

const TINYMCE_API_KEY = process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "no-api-key";

export function BlogEditor({
	content,
	onChange,
	slugHint,
	placeholder = "Escribí el contenido del post...",
}: BlogEditorProps) {
	const slugRef = useRef(slugHint);
	slugRef.current = slugHint;

	const uploadImageFile = useCallback(
		async (file: File): Promise<string> => {
			const form = new FormData();
			form.append("file", file);
			if (slugRef.current) form.append("slug", slugRef.current);
			const res = await fetch(BLOG_UPLOAD_ENDPOINT, {
				method: "POST",
				body: form,
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Error al subir" }));
				throw new Error(err.error || "Error al subir");
			}
			const data = await res.json();
			return data.url as string;
		},
		[],
	);

	return (
		<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
			<Editor
				apiKey={TINYMCE_API_KEY}
				value={content}
				onEditorChange={(html) => onChange(html)}
				init={{
					height: 500,
					menubar: "file edit view insert format tools table help",
					plugins: [
						"advlist",
						"autolink",
						"lists",
						"link",
						"image",
						"charmap",
						"preview",
						"anchor",
						"searchreplace",
						"visualblocks",
						"code",
						"fullscreen",
						"insertdatetime",
						"media",
						"table",
						"help",
						"wordcount",
						"emoticons",
						"codesample",
					],
					toolbar:
						"undo redo | blocks | bold italic underline strikethrough | " +
						"alignleft aligncenter alignright alignjustify | " +
						"bullist numlist outdent indent | link image media table | " +
						"forecolor backcolor removeformat | codesample blockquote | " +
						"fullscreen preview code | help",
					placeholder,
					language: "es",
					branding: false,
					promotion: false,
					convert_urls: false,
					image_advtab: true,
					image_caption: true,
					image_title: true,
					automatic_uploads: true,
					file_picker_types: "image",
					paste_data_images: true,
					images_upload_handler: async (blobInfo, progress) => {
						try {
							const file = new File([blobInfo.blob()], blobInfo.filename(), {
								type: blobInfo.blob().type,
							});
							progress?.(20);
							const url = await uploadImageFile(file);
							progress?.(100);
							return url;
						} catch (err) {
							const message =
								err instanceof Error ? err.message : "Error al subir imagen";
							toast.error(message);
							throw message;
						}
					},
					file_picker_callback: (cb) => {
						const input = document.createElement("input");
						input.type = "file";
						input.accept = "image/*";
						input.onchange = async () => {
							const file = input.files?.[0];
							if (!file) return;
							try {
								const url = await uploadImageFile(file);
								cb(url, { alt: file.name });
								toast.success("Imagen insertada");
							} catch (err) {
								toast.error(
									err instanceof Error ? err.message : "Error al subir imagen",
								);
							}
						};
						input.click();
					},
					content_style:
						"body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;padding:12px}img{max-width:100%;height:auto;border-radius:8px}blockquote{border-left:3px solid #d1d5db;padding-left:12px;color:#6b7280;margin:12px 0}",
					skin: "oxide",
					content_css: "default",
				}}
			/>
		</div>
	);
}
