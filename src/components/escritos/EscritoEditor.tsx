"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Heading2,
	Italic,
	List,
	ListOrdered,
	Quote,
	Redo,
	Underline,
	Undo,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FormatoHoja, VariableEscrito } from "@/types/escritos";
import "./documento.css";
import { Membrete } from "./Membrete";

// Editor de escritos y plantillas. A propósito sin colores ni tamaños libres:
// el diseño lo dan el membrete (Legalistas o RPU), la fuente y los márgenes
// del formato. Lo que se edita es el texto.

interface EscritoEditorProps {
	value: string;
	onChange: (html: string) => void;
	formato?: Partial<FormatoHoja>;
	/** Si viene, se muestra "Insertar variable" ({{CLAVE}}). */
	variables?: VariableEscrito[];
	editable?: boolean;
}

function ToolbarBtn({
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
}) {
	return (
		<button
			type="button"
			title={title}
			aria-label={title}
			onClick={onClick}
			disabled={disabled}
			className={`rounded p-1.5 transition-colors disabled:opacity-40 ${
				active
					? "bg-muted text-foreground"
					: "text-muted-foreground hover:bg-muted hover:text-foreground"
			}`}
		>
			{children}
		</button>
	);
}

export function EscritoEditor({
	value,
	onChange,
	formato,
	variables,
	editable = true,
}: EscritoEditorProps) {
	const editor = useEditor({
		extensions: [StarterKit.configure({ link: false })],
		content: value,
		editable,
		immediatelyRender: false,
		editorProps: { attributes: { class: "escrito-documento min-h-[60vh]" } },
		onUpdate: ({ editor }) => onChange(editor.getHTML()),
	});

	// Contenido que llega de afuera (carga inicial, "completar variables").
	useEffect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value, { emitUpdate: false });
		}
	}, [editor, value]);

	const grupos = useMemo(() => {
		const map = new Map<string, VariableEscrito[]>();
		for (const v of variables ?? []) {
			map.set(v.grupo, [...(map.get(v.grupo) ?? []), v]);
		}
		return [...map.entries()];
	}, [variables]);

	// La hoja reproduce márgenes y tipografía del PDF (a escala de pantalla).
	const hoja = {
		"--doc-fuente": `'${formato?.fuente ?? "Times New Roman"}', Tinos, 'Liberation Serif', serif`,
		"--doc-tamano": `${formato?.tamanoFuente ?? 12}pt`,
		"--doc-interlineado": String(formato?.interlineado ?? 1.5),
		// Con el logo de Legalistas en el margen hace falta un mínimo de 22 mm;
		// el membrete RPU va con el texto.
		paddingTop: `${
			formato?.membrete === "RPU"
				? (formato?.margenSuperior ?? 25)
				: Math.max(formato?.margenSuperior ?? 25, 22)
		}mm`,
		paddingBottom: `${formato?.margenInferior ?? 20}mm`,
		paddingLeft: `${formato?.margenIzquierdo ?? 30}mm`,
		paddingRight: `${formato?.margenDerecho ?? 20}mm`,
	} as React.CSSProperties;

	if (!editor) return null;

	return (
		<div className="rounded-lg border bg-muted/30">
			{editable && (
				<div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-card px-2 py-1.5">
					<ToolbarBtn
						title="Negrita"
						onClick={() => editor.chain().focus().toggleBold().run()}
						active={editor.isActive("bold")}
					>
						<Bold className="h-4 w-4" />
					</ToolbarBtn>
					<ToolbarBtn
						title="Cursiva"
						onClick={() => editor.chain().focus().toggleItalic().run()}
						active={editor.isActive("italic")}
					>
						<Italic className="h-4 w-4" />
					</ToolbarBtn>
					<ToolbarBtn
						title="Subrayado"
						onClick={() => editor.chain().focus().toggleUnderline().run()}
						active={editor.isActive("underline")}
					>
						<Underline className="h-4 w-4" />
					</ToolbarBtn>
					<span className="mx-1 h-5 w-px bg-border" />
					<ToolbarBtn
						title="Título"
						onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
						active={editor.isActive("heading", { level: 2 })}
					>
						<Heading2 className="h-4 w-4" />
					</ToolbarBtn>
					<ToolbarBtn
						title="Lista"
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						active={editor.isActive("bulletList")}
					>
						<List className="h-4 w-4" />
					</ToolbarBtn>
					<ToolbarBtn
						title="Lista numerada"
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						active={editor.isActive("orderedList")}
					>
						<ListOrdered className="h-4 w-4" />
					</ToolbarBtn>
					<ToolbarBtn
						title="Cita / sangría"
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
						active={editor.isActive("blockquote")}
					>
						<Quote className="h-4 w-4" />
					</ToolbarBtn>
					<span className="mx-1 h-5 w-px bg-border" />
					<ToolbarBtn
						title="Deshacer"
						onClick={() => editor.chain().focus().undo().run()}
						disabled={!editor.can().undo()}
					>
						<Undo className="h-4 w-4" />
					</ToolbarBtn>
					<ToolbarBtn
						title="Rehacer"
						onClick={() => editor.chain().focus().redo().run()}
						disabled={!editor.can().redo()}
					>
						<Redo className="h-4 w-4" />
					</ToolbarBtn>

					{grupos.length > 0 && (
						<div className="ml-auto w-52">
							<Select
								value=""
								onValueChange={(clave) =>
									editor.chain().focus().insertContent(`{{${clave}}}`).run()
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Insertar variable…" />
								</SelectTrigger>
								<SelectContent>
									{grupos.map(([grupo, vars]) => (
										<SelectGroup key={grupo}>
											<SelectLabel>{grupo}</SelectLabel>
											{vars.map((v) => (
												<SelectItem key={v.clave} value={v.clave}>
													{v.etiqueta}
												</SelectItem>
											))}
										</SelectGroup>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>
			)}

			{/* Hoja A4: mismo ancho, márgenes y membrete que el PDF. */}
			<div className="overflow-x-auto p-4">
				<div
					className="mx-auto w-[210mm] max-w-full bg-white shadow-sm"
					style={hoja}
				>
					<Membrete tipo={formato?.membrete} />
					<EditorContent editor={editor} />
				</div>
			</div>
		</div>
	);
}
