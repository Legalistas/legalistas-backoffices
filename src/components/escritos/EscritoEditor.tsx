"use client";

import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
	type Editor,
	EditorContent,
	Extension,
	mergeAttributes,
	Node,
	useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	ArrowUpDown,
	Baseline,
	Bold,
	Highlighter,
	IndentDecrease,
	IndentIncrease,
	Italic,
	Link2,
	List,
	ListOrdered,
	Minus,
	PilcrowRight,
	Quote,
	Redo,
	RemoveFormatting,
	Scissors,
	Strikethrough,
	Subscript as SubscriptIcon,
	Superscript as SuperscriptIcon,
	Table as TableIcon,
	Underline,
	Undo,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FormatoHoja, VariableEscrito } from "@/types/escritos";
import "./documento.css";
import { LogoLegalistas, Membrete } from "./Membrete";
import { ALTO_HOJA, Paginacion, REPAGINAR, SEPARACION_HOJAS } from "./paginacion";

// Editor de escritos y plantillas. Todo lo que ofrece se guarda como HTML que
// el PDF del servidor respeta (backend/src/modules/escritos/utils/documento.ts,
// cssDocumento): alineación, tamaños y colores van como estilos en línea, las
// tablas y el salto de página tienen reglas en los dos lados.

interface EscritoEditorProps {
	value: string;
	onChange: (html: string) => void;
	formato?: Partial<FormatoHoja>;
	/** Si viene, se muestra "Insertar variable" ({{CLAVE}}). */
	variables?: VariableEscrito[];
	editable?: boolean;
}

const VARIABLE = /\{\{\s*[A-Z_]+\s*\}\}/g;

/**
 * Marca las {{VARIABLES}} del texto. En un escrito son datos que faltan
 * cargar en el sistema: en el PDF salen como "*" y "Completar variables" las
 * llena cuando el dato exista. Solo es una marca visual: el texto no cambia.
 */
const VariablesMarcadas = Extension.create({
	name: "variablesMarcadas",
	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					decorations(state) {
						const marcas: Decoration[] = [];
						state.doc.descendants((node, pos) => {
							if (!node.isText || !node.text) return;
							for (const m of node.text.matchAll(VARIABLE)) {
								const desde = pos + (m.index ?? 0);
								marcas.push(
									Decoration.inline(desde, desde + m[0].length, {
										class: "variable-escrito",
										title: "Dato que falta cargar en el sistema: en el PDF sale *",
									}),
								);
							}
						});
						return DecorationSet.create(state.doc, marcas);
					},
				},
			}),
		];
	},
});

/**
 * Formato propio de un párrafo, como en Word:
 * - sangría de primera línea (text-indent). Con espacios no sirve: al
 *   justificar se estiran y cada párrafo queda distinto;
 * - interlineado distinto al de la hoja (encabezado sencillo y cuerpo doble).
 *   Va como múltiplo del alto de línea de la fuente (--alto-linea), igual que
 *   el interlineado de la hoja.
 */
const FormatoParrafo = Extension.create({
	name: "formatoParrafo",
	addGlobalAttributes() {
		return [
			{
				types: ["paragraph"],
				attributes: {
					sangria: {
						default: null,
						parseHTML: (el) => el.style.textIndent || null,
						renderHTML: (attrs) =>
							attrs.sangria ? { style: `text-indent: ${attrs.sangria}` } : {},
					},
					interlineado: {
						default: null,
						parseHTML: (el) => el.getAttribute("data-interlineado"),
						renderHTML: (attrs) =>
							attrs.interlineado
								? {
										"data-interlineado": attrs.interlineado,
										style: `line-height: calc(${attrs.interlineado} * var(--alto-linea, 1.15))`,
									}
								: {},
					},
				},
			},
		];
	},
});

/** Salto de página: en el PDF corta la hoja (clase .page-break). */
const SaltoPagina = Node.create({
	name: "saltoPagina",
	group: "block",
	atom: true,
	selectable: true,
	parseHTML: () => [{ tag: "div.page-break" }],
	renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { class: "page-break" })],
});

const TAMANOS = ["8", "9", "10", "11", "12", "13", "14", "16", "18", "20", "24"];
const COLORES = [
	{ nombre: "Negro", valor: "#000000" },
	{ nombre: "Gris", valor: "#4b5563" },
	{ nombre: "Rojo", valor: "#b91c1c" },
	{ nombre: "Azul", valor: "#1d4ed8" },
	{ nombre: "Verde", valor: "#15803d" },
	{ nombre: "Naranja", valor: "#c2410c" },
];
const RESALTADOS = [
	{ nombre: "Amarillo", valor: "#fef08a" },
	{ nombre: "Verde", valor: "#bbf7d0" },
	{ nombre: "Celeste", valor: "#bae6fd" },
	{ nombre: "Rosa", valor: "#fbcfe8" },
];
const SIN_TAMANO = "auto";
const SANGRIAS = ["1.25cm", "2.5cm", "3.5cm", "5cm", "6.5cm"];
const INTERLINEADOS = ["1", "1.15", "1.5", "2"];

/**
 * Alto de línea "sencillo" de Word por fuente, en em. Word multiplica el
 * interlineado por esto; CSS, por el tamaño de letra. Misma tabla que el PDF
 * (backend/src/modules/escritos/utils/documento.ts, ALTO_LINEA).
 */
const ALTO_LINEA: Record<string, number> = {
	"Times New Roman": 1.15,
	Arial: 1.15,
	Calibri: 1.22,
	Garamond: 1.125,
};
/** Mismas alternativas métricamente compatibles que el PDF (STACK_FUENTES). */
const STACK_FUENTES: Record<string, string> = {
	"Times New Roman": "'Times New Roman', Tinos, 'Liberation Serif', serif",
	Arial: "Arial, Arimo, 'Liberation Sans', Helvetica, sans-serif",
	Calibri: "Calibri, Carlito, 'Liberation Sans', sans-serif",
	Garamond: "Garamond, 'EB Garamond', 'Liberation Serif', serif",
};

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
			className={cn(
				"rounded p-1.5 transition-colors disabled:opacity-40",
				active
					? "bg-primary/10 text-primary"
					: "text-muted-foreground hover:bg-muted hover:text-foreground",
			)}
		>
			{children}
		</button>
	);
}

const Separador = () => <span className="mx-1 h-5 w-px bg-border" />;

function Toolbar({ editor, variables }: { editor: Editor; variables?: VariableEscrito[] }) {
	const grupos = useMemo(() => {
		const map = new Map<string, VariableEscrito[]>();
		for (const v of variables ?? []) {
			map.set(v.grupo, [...(map.get(v.grupo) ?? []), v]);
		}
		return [...map.entries()];
	}, [variables]);

	const c = () => editor.chain().focus();
	const bloque = editor.isActive("heading", { level: 1 })
		? "h1"
		: editor.isActive("heading", { level: 2 })
			? "h2"
			: editor.isActive("heading", { level: 3 })
				? "h3"
				: "p";
	const tamano = (editor.getAttributes("textStyle").fontSize as string | undefined)?.replace("pt", "");
	const enLista = editor.isActive("bulletList") || editor.isActive("orderedList");
	const enTabla = editor.isActive("table");
	const sangria = editor.getAttributes("paragraph").sangria as string | null | undefined;
	const interlineado = editor.getAttributes("paragraph").interlineado as string | null | undefined;

	const setLink = () => {
		const previo = editor.getAttributes("link").href as string | undefined;
		const url = window.prompt("Dirección del enlace (vacío para quitarlo)", previo ?? "https://");
		if (url === null) return;
		if (url.trim() === "") c().extendMarkRange("link").unsetLink().run();
		else c().extendMarkRange("link").setLink({ href: url.trim() }).run();
	};

	return (
		<div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-card px-2 py-1.5">
			<ToolbarBtn title="Deshacer" onClick={() => c().undo().run()} disabled={!editor.can().undo()}>
				<Undo className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn title="Rehacer" onClick={() => c().redo().run()} disabled={!editor.can().redo()}>
				<Redo className="h-4 w-4" />
			</ToolbarBtn>
			<Separador />

			<Select
				value={bloque}
				onValueChange={(v) => {
					if (v === "p") c().setParagraph().run();
					else c().setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
				}}
			>
				<SelectTrigger className="h-8 w-32 text-xs" title="Estilo de párrafo">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="p">Párrafo</SelectItem>
					<SelectItem value="h1">Título 1</SelectItem>
					<SelectItem value="h2">Título 2</SelectItem>
					<SelectItem value="h3">Título 3</SelectItem>
				</SelectContent>
			</Select>
			<Select
				value={tamano && TAMANOS.includes(tamano) ? tamano : SIN_TAMANO}
				onValueChange={(v) =>
					v === SIN_TAMANO ? c().unsetFontSize().run() : c().setFontSize(`${v}pt`).run()
				}
			>
				<SelectTrigger className="ml-1 h-8 w-24 text-xs" title="Tamaño de letra">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={SIN_TAMANO}>Tamaño</SelectItem>
					{TAMANOS.map((t) => (
						<SelectItem key={t} value={t}>
							{t} pt
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Separador />

			<ToolbarBtn title="Negrita" onClick={() => c().toggleBold().run()} active={editor.isActive("bold")}>
				<Bold className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn title="Cursiva" onClick={() => c().toggleItalic().run()} active={editor.isActive("italic")}>
				<Italic className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Subrayado"
				onClick={() => c().toggleUnderline().run()}
				active={editor.isActive("underline")}
			>
				<Underline className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn title="Tachado" onClick={() => c().toggleStrike().run()} active={editor.isActive("strike")}>
				<Strikethrough className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Subíndice"
				onClick={() => c().toggleSubscript().run()}
				active={editor.isActive("subscript")}
			>
				<SubscriptIcon className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Superíndice"
				onClick={() => c().toggleSuperscript().run()}
				active={editor.isActive("superscript")}
			>
				<SuperscriptIcon className="h-4 w-4" />
			</ToolbarBtn>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						title="Color de texto"
						className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<Baseline
							className="h-4 w-4"
							style={{ color: (editor.getAttributes("textStyle").color as string) || undefined }}
						/>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{COLORES.map((col) => (
						<DropdownMenuItem key={col.valor} onSelect={() => c().setColor(col.valor).run()}>
							<span className="h-3 w-3 rounded-full border" style={{ background: col.valor }} />
							{col.nombre}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => c().unsetColor().run()}>Sin color</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						title="Resaltar"
						className={cn(
							"rounded p-1.5 hover:bg-muted hover:text-foreground",
							editor.isActive("highlight") ? "bg-primary/10 text-primary" : "text-muted-foreground",
						)}
					>
						<Highlighter className="h-4 w-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{RESALTADOS.map((col) => (
						<DropdownMenuItem
							key={col.valor}
							onSelect={() => c().setHighlight({ color: col.valor }).run()}
						>
							<span className="h-3 w-3 rounded-sm border" style={{ background: col.valor }} />
							{col.nombre}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => c().unsetHighlight().run()}>Sin resaltado</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Separador />

			<ToolbarBtn
				title="Alinear a la izquierda"
				onClick={() => c().setTextAlign("left").run()}
				active={editor.isActive({ textAlign: "left" })}
			>
				<AlignLeft className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Centrar"
				onClick={() => c().setTextAlign("center").run()}
				active={editor.isActive({ textAlign: "center" })}
			>
				<AlignCenter className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Alinear a la derecha"
				onClick={() => c().setTextAlign("right").run()}
				active={editor.isActive({ textAlign: "right" })}
			>
				<AlignRight className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Justificar"
				onClick={() => c().setTextAlign("justify").run()}
				active={editor.isActive({ textAlign: "justify" })}
			>
				<AlignJustify className="h-4 w-4" />
			</ToolbarBtn>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						title="Sangría de primera línea"
						className={cn(
							"rounded p-1.5 hover:bg-muted hover:text-foreground",
							sangria ? "bg-primary/10 text-primary" : "text-muted-foreground",
						)}
					>
						<PilcrowRight className="h-4 w-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{SANGRIAS.map((s) => (
						<DropdownMenuItem
							key={s}
							onSelect={() => c().updateAttributes("paragraph", { sangria: s }).run()}
						>
							<span className={cn("w-4", sangria !== s && "invisible")}>✓</span>
							{s.replace(".", ",").replace("cm", " cm")}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => c().updateAttributes("paragraph", { sangria: null }).run()}>
						Sin sangría
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						title="Interlineado del párrafo"
						className={cn(
							"rounded p-1.5 hover:bg-muted hover:text-foreground",
							interlineado ? "bg-primary/10 text-primary" : "text-muted-foreground",
						)}
					>
						<ArrowUpDown className="h-4 w-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{INTERLINEADOS.map((i) => (
						<DropdownMenuItem
							key={i}
							onSelect={() => c().updateAttributes("paragraph", { interlineado: i }).run()}
						>
							<span className={cn("w-4", interlineado !== i && "invisible")}>✓</span>
							{i.replace(".", ",")}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={() => c().updateAttributes("paragraph", { interlineado: null }).run()}
					>
						<span className={cn("w-4", interlineado && "invisible")}>✓</span>
						El de la hoja
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Separador />

			<ToolbarBtn
				title="Viñetas"
				onClick={() => c().toggleBulletList().run()}
				active={editor.isActive("bulletList")}
			>
				<List className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Lista numerada"
				onClick={() => c().toggleOrderedList().run()}
				active={editor.isActive("orderedList")}
			>
				<ListOrdered className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Aumentar sangría de la lista"
				onClick={() => c().sinkListItem("listItem").run()}
				disabled={!enLista || !editor.can().sinkListItem("listItem")}
			>
				<IndentIncrease className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Reducir sangría de la lista"
				onClick={() => c().liftListItem("listItem").run()}
				disabled={!enLista || !editor.can().liftListItem("listItem")}
			>
				<IndentDecrease className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Cita"
				onClick={() => c().toggleBlockquote().run()}
				active={editor.isActive("blockquote")}
			>
				<Quote className="h-4 w-4" />
			</ToolbarBtn>
			<Separador />

			<ToolbarBtn title="Línea horizontal" onClick={() => c().setHorizontalRule().run()}>
				<Minus className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn
				title="Salto de página"
				onClick={() => c().insertContent({ type: "saltoPagina" }).run()}
				disabled={enTabla}
			>
				<Scissors className="h-4 w-4" />
			</ToolbarBtn>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						title="Tabla"
						className={cn(
							"rounded p-1.5 hover:bg-muted hover:text-foreground",
							enTabla ? "bg-primary/10 text-primary" : "text-muted-foreground",
						)}
					>
						<TableIcon className="h-4 w-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem
						onSelect={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()}
					>
						Insertar tabla 3 × 3
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().addRowBefore().run()}>
						Fila arriba
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().addRowAfter().run()}>
						Fila abajo
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().addColumnBefore().run()}>
						Columna a la izquierda
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().addColumnAfter().run()}>
						Columna a la derecha
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().toggleHeaderRow().run()}>
						Fila de encabezado
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().mergeOrSplit().run()}>
						Unir / separar celdas
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().deleteRow().run()}>
						Borrar fila
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!enTabla} onSelect={() => c().deleteColumn().run()}>
						Borrar columna
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={!enTabla}
						className="text-destructive"
						onSelect={() => c().deleteTable().run()}
					>
						Borrar tabla
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ToolbarBtn title="Enlace" onClick={setLink} active={editor.isActive("link")}>
				<Link2 className="h-4 w-4" />
			</ToolbarBtn>
			<ToolbarBtn title="Quitar formato" onClick={() => c().unsetAllMarks().clearNodes().run()}>
				<RemoveFormatting className="h-4 w-4" />
			</ToolbarBtn>

			{grupos.length > 0 && (
				<div className="ml-auto w-52">
					<Select
						value=""
						onValueChange={(clave) => c().insertContent(`{{${clave}}}`).run()}
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
	);
}

export function EscritoEditor({
	value,
	onChange,
	formato,
	variables,
	editable = true,
}: EscritoEditorProps) {
	const [hojas, setHojas] = useState(1);
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
				link: { openOnClick: false, autolink: true },
			}),
			TextStyleKit.configure({ backgroundColor: false, fontFamily: false, lineHeight: false }),
			Highlight.configure({ multicolor: true }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			FormatoParrafo,
			TableKit.configure({ table: { resizable: false } }),
			Subscript,
			Superscript,
			SaltoPagina,
			VariablesMarcadas,
			Paginacion.configure({ alCambiarHojas: setHojas }),
		],
		content: value,
		editable,
		immediatelyRender: false,
		// La barra muestra el estado de la selección (negrita activa, etc.).
		shouldRerenderOnTransaction: true,
		editorProps: { attributes: { class: "escrito-documento min-h-[180mm]" } },
		onUpdate: ({ editor }) => onChange(editor.getHTML()),
	});

	// Contenido que llega de afuera (carga inicial, "completar variables").
	useEffect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value, { emitUpdate: false });
		}
	}, [editor, value]);

	// La hoja reproduce márgenes y tipografía del PDF.
	const fuente = formato?.fuente ?? "Times New Roman";
	const altoLinea = ALTO_LINEA[fuente] ?? ALTO_LINEA["Times New Roman"];
	const rpu = formato?.membrete === "RPU";
	// Con el logo de Legalistas en el margen hace falta un mínimo de 22 mm;
	// el membrete RPU va con el texto.
	const margenSuperior = rpu
		? (formato?.margenSuperior ?? 25)
		: Math.max(formato?.margenSuperior ?? 25, 22);
	const margenInferior = formato?.margenInferior ?? 20;
	const margenIzquierdo = formato?.margenIzquierdo ?? 30;
	const hoja = {
		"--doc-fuente": STACK_FUENTES[fuente] ?? STACK_FUENTES["Times New Roman"],
		"--doc-tamano": `${formato?.tamanoFuente ?? 12}pt`,
		"--alto-linea": String(altoLinea),
		"--doc-interlineado": String(Math.round(Number(formato?.interlineado ?? 1.5) * altoLinea * 1000) / 1000),
		paddingTop: `${margenSuperior}mm`,
		paddingBottom: `${margenInferior}mm`,
		paddingLeft: `${margenIzquierdo}mm`,
		paddingRight: `${formato?.margenDerecho ?? 20}mm`,
		minHeight: `${hojas * (ALTO_HOJA + SEPARACION_HOJAS) - SEPARACION_HOJAS}px`,
	} as React.CSSProperties;

	// Con otro formato (márgenes, fuente…) los cortes de hoja cambian.
	const claveFormato = JSON.stringify(formato ?? {});
	useEffect(() => {
		if (!editor || editor.isDestroyed || !claveFormato) return;
		editor.view.dispatch(editor.state.tr.setMeta(REPAGINAR, true).setMeta("addToHistory", false));
	}, [editor, claveFormato]);

	if (!editor) return null;

	return (
		<div className="overflow-hidden rounded-lg border bg-card">
			{editable && <Toolbar editor={editor} variables={variables} />}

			{/* Hojas A4 (210 × 297 mm) separadas, como en Word, con los márgenes,
			    el membrete y la numeración del PDF. El texto pasa de una a otra
			    respetando los márgenes de cada hoja (paginacion.ts). */}
			<div className="overflow-x-auto bg-muted/50 px-4 py-8">
				<div className="relative mx-auto w-[210mm]">
					{Array.from({ length: hojas }, (_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: las hojas son posiciones fijas
							key={i}
							className="hoja-a4-pagina"
							style={{ top: `${i * (ALTO_HOJA + SEPARACION_HOJAS)}px` }}
						>
							{!rpu && (
								<LogoLegalistas
									style={{ top: `${margenSuperior - 14}mm`, left: `${margenIzquierdo}mm` }}
								/>
							)}
							{formato?.numerarPaginas && (
								<div
									className="absolute inset-x-0 text-center text-[9pt] text-black"
									style={{
										bottom: `${Math.max(margenInferior / 2 - 2, 3)}mm`,
										fontFamily: STACK_FUENTES[fuente],
									}}
								>
									Página {i + 1} de {hojas}
								</div>
							)}
						</div>
					))}
					<div
						className="hoja-a4"
						style={hoja}
						// Click en el margen o entre hojas: cursor en el texto más cercano.
						onMouseDown={(e) => {
							if (!editable || e.target !== e.currentTarget) return;
							e.preventDefault();
							const r = editor.view.dom.getBoundingClientRect();
							const pos = editor.view.posAtCoords({
								left: Math.min(Math.max(e.clientX, r.left + 1), r.right - 1),
								top: Math.min(Math.max(e.clientY, r.top + 1), r.bottom - 1),
							})?.pos;
							if (pos == null) editor.commands.focus("end");
							else editor.chain().focus().setTextSelection(pos).run();
						}}
					>
						<Membrete tipo={formato?.membrete} />
						<EditorContent editor={editor} />
					</div>
				</div>
			</div>
		</div>
	);
}
