"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Heading2,
	Heading3,
	Image as ImageIcon,
	Italic,
	Link2,
	List,
	ListOrdered,
	Loader2,
	Quote,
	Redo,
	Strikethrough,
	Undo,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BLOG_UPLOAD_ENDPOINT } from "@/constant/api-endpoints";

interface BlogEditorProps {
	content: string;
	onChange: (html: string) => void;
	/** slug actual del post — se pasa al uploader para nombrar las imágenes inline */
	slugHint?: string;
	placeholder?: string;
}

const ToolbarBtn = ({
	onClick,
	active,
	disabled,
	title,
	children,
}: {
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
	title: string;
	children: React.ReactNode;
}) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		title={title}
		className={cn(
			"p-1.5 rounded transition-colors",
			active
				? "bg-primary/15 text-primary"
				: "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200",
			disabled && "opacity-40 cursor-not-allowed",
		)}
	>
		{children}
	</button>
);

const Divider = () => (
	<div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />
);

export function BlogEditor({
	content,
	onChange,
	slugHint,
	placeholder = "Escribí el contenido del post...",
}: BlogEditorProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);

	// Upload helper compartido entre toolbar, drop y paste.
	const uploadImageFile = useCallback(
		async (file: File): Promise<string | null> => {
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
				return data.url as string;
			} catch (err) {
				console.error("[BlogEditor] uploadImageFile:", err);
				toast.error(err instanceof Error ? err.message : "Error al subir imagen");
				return null;
			}
		},
		[slugHint],
	);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [2, 3, 4] },
			}),
			Placeholder.configure({ placeholder }),
			Link.configure({
				openOnClick: false,
				autolink: true,
				HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
			}),
			Image.configure({
				inline: false,
				allowBase64: false,
				HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-3" },
			}),
		],
		content,
		onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
		editorProps: {
			attributes: {
				class:
					"prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3",
			},
			handleDrop: (view, event) => {
				const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
					f.type.startsWith("image/"),
				);
				if (files.length === 0) return false;
				event.preventDefault();
				const coords = view.posAtCoords({
					left: event.clientX,
					top: event.clientY,
				});
				const pos = coords?.pos ?? view.state.selection.from;
				setUploading(true);
				(async () => {
					try {
						for (const file of files) {
							const url = await uploadImageFile(file);
							if (!url) continue;
							view.dispatch(
								view.state.tr.insert(
									pos,
									view.state.schema.nodes.image.create({ src: url, alt: "" }),
								),
							);
						}
						toast.success(
							files.length === 1
								? "Imagen insertada"
								: `${files.length} imágenes insertadas`,
						);
					} finally {
						setUploading(false);
					}
				})();
				return true;
			},
			handlePaste: (view, event) => {
				const items = Array.from(event.clipboardData?.items ?? []);
				const imageItems = items.filter((it) => it.type.startsWith("image/"));
				if (imageItems.length === 0) return false;
				event.preventDefault();
				setUploading(true);
				(async () => {
					try {
						for (const item of imageItems) {
							const file = item.getAsFile();
							if (!file) continue;
							const url = await uploadImageFile(file);
							if (!url) continue;
							view.dispatch(
								view.state.tr.replaceSelectionWith(
									view.state.schema.nodes.image.create({ src: url, alt: "" }),
								),
							);
						}
						toast.success("Imagen pegada");
					} finally {
						setUploading(false);
					}
				})();
				return true;
			},
		},
		immediatelyRender: false,
	});

	const triggerImageUpload = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleImageSelected = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			e.target.value = "";
			if (!file || !editor) return;
			setUploading(true);
			const url = await uploadImageFile(file);
			setUploading(false);
			if (url) {
				editor.chain().focus().setImage({ src: url, alt: "" }).run();
				toast.success("Imagen insertada");
			}
		},
		[editor, uploadImageFile],
	);

	const promptLink = useCallback(() => {
		if (!editor) return;
		const previousUrl = editor.getAttributes("link").href || "";
		const url = window.prompt("URL del link (vacío para quitar)", previousUrl);
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	if (!editor) {
		return (
			<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 min-h-[460px] flex items-center justify-center text-sm text-gray-400">
				Cargando editor...
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 px-2 py-1.5 sticky top-0 z-10">
				<ToolbarBtn
					onClick={() => editor.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
					title="Deshacer (Ctrl+Z)"
				>
					<Undo className="h-4 w-4" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
					title="Rehacer (Ctrl+Y)"
				>
					<Redo className="h-4 w-4" />
				</ToolbarBtn>

				<Divider />

				<ToolbarBtn
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 2 }).run()
					}
					active={editor.isActive("heading", { level: 2 })}
					title="Título H2"
				>
					<Heading2 className="h-4 w-4" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 3 }).run()
					}
					active={editor.isActive("heading", { level: 3 })}
					title="Subtítulo H3"
				>
					<Heading3 className="h-4 w-4" />
				</ToolbarBtn>

				<Divider />

				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleBold().run()}
					active={editor.isActive("bold")}
					title="Negrita (Ctrl+B)"
				>
					<Bold className="h-4 w-4" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleItalic().run()}
					active={editor.isActive("italic")}
					title="Cursiva (Ctrl+I)"
				>
					<Italic className="h-4 w-4" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleStrike().run()}
					active={editor.isActive("strike")}
					title="Tachado"
				>
					<Strikethrough className="h-4 w-4" />
				</ToolbarBtn>

				<Divider />

				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					active={editor.isActive("bulletList")}
					title="Lista con viñetas"
				>
					<List className="h-4 w-4" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					active={editor.isActive("orderedList")}
					title="Lista numerada"
				>
					<ListOrdered className="h-4 w-4" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
					active={editor.isActive("blockquote")}
					title="Cita"
				>
					<Quote className="h-4 w-4" />
				</ToolbarBtn>

				<Divider />

				<ToolbarBtn
					onClick={promptLink}
					active={editor.isActive("link")}
					title="Insertar/editar link"
				>
					<Link2 className="h-4 w-4" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={triggerImageUpload}
					disabled={uploading}
					title="Subir imagen"
				>
					{uploading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<ImageIcon className="h-4 w-4" />
					)}
				</ToolbarBtn>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					hidden
					onChange={handleImageSelected}
				/>
			</div>

			<EditorContent editor={editor} />
		</div>
	);
}
