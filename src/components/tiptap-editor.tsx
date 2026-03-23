"use client";

import Color from "@tiptap/extension-color";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	HeadingIcon,
	Italic,
	List,
	ListOrdered,
	Palette,
	Redo,
	Strikethrough,
	Type,
	Undo,
} from "lucide-react";
import { useState } from "react";

interface TiptapEditorProps {
	content: string;
	onChange: (content: string) => void;
}

const fontSizes = [
	{ label: "Pequeño", value: "12px" },
	{ label: "Normal", value: "16px" },
	{ label: "Mediano", value: "20px" },
	{ label: "Grande", value: "24px" },
	{ label: "Muy grande", value: "32px" },
];

const textColors = [
	{ label: "Negro", value: "#000000" },
	{ label: "Gris", value: "#718096" },
	{ label: "Rojo", value: "#E53E3E" },
	{ label: "Naranja", value: "#ED8936" },
	{ label: "Amarillo", value: "#ECC94B" },
	{ label: "Verde", value: "#48BB78" },
	{ label: "Azul", value: "#4299E1" },
	{ label: "Índigo", value: "#667EEA" },
	{ label: "Púrpura", value: "#9F7AEA" },
	{ label: "Rosa", value: "#ED64A6" },
];

const backgroundColors = [
	{ label: "Ninguno", value: "transparent" },
	{ label: "Gris claro", value: "#EDF2F7" },
	{ label: "Rojo claro", value: "#FED7D7" },
	{ label: "Naranja claro", value: "#FEEBC8" },
	{ label: "Amarillo claro", value: "#FEFCBF" },
	{ label: "Verde claro", value: "#C6F6D5" },
	{ label: "Azul claro", value: "#BEE3F8" },
	{ label: "Índigo claro", value: "#C3DAFE" },
	{ label: "Púrpura claro", value: "#E9D8FD" },
	{ label: "Rosa claro", value: "#FED7E2" },
];

const ToolbarBtn = ({
	onClick,
	active,
	children,
	disabled,
}: {
	onClick: () => void;
	active?: boolean;
	children: React.ReactNode;
	disabled?: boolean;
}) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		className={`p-1.5 rounded transition-colors ${
			active
				? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
				: "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
		} disabled:opacity-40`}
	>
		{children}
	</button>
);

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
	const [showTextColorPicker, setShowTextColorPicker] = useState(false);
	const [showBgColorPicker, setShowBgColorPicker] = useState(false);
	const [showFontSizePicker, setShowFontSizePicker] = useState(false);

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				bulletList: { HTMLAttributes: { class: "list-disc pl-5" } },
				orderedList: { HTMLAttributes: { class: "list-decimal pl-5" } },
				heading: {
					levels: [1, 2, 3, 4, 5, 6],
					HTMLAttributes: { class: "my-2" },
				},
			}),
			Paragraph.configure({
				HTMLAttributes: { class: "my-2" },
			}),
			Text,
			TextStyle.configure({
				HTMLAttributes: { class: "text-base" },
			}),
			Color.configure({
				types: ["textStyle"],
			}),
		],
		content: content || "",
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
			},
		},
	});

	if (!editor) {
		return null;
	}

	const setHeading = (level: number) => {
		editor
			.chain()
			.focus()
			.toggleHeading({ level: level as any })
			.run();
	};

	const setTextColor = (color: string) => {
		editor.chain().focus().setColor(color).run();
		setShowTextColorPicker(false);
	};

	const setBackgroundColor = (color: string) => {
		editor
			.chain()
			.focus()
			.setMark("textStyle", { backgroundColor: color })
			.run();
		setShowBgColorPicker(false);
	};

	const setFontSize = (size: string) => {
		editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
		setShowFontSizePicker(false);
	};

	return (
		<div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleBold().run()}
					active={editor.isActive("bold")}
				>
					<Bold className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleItalic().run()}
					active={editor.isActive("italic")}
				>
					<Italic className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleStrike().run()}
					active={editor.isActive("strike")}
					disabled={!editor.can().chain().focus().toggleStrike().run()}
				>
					<Strikethrough className="h-3.5 w-3.5" />
				</ToolbarBtn>

				<div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

				{/* Heading select */}
				<div className="relative inline-block">
					<select
						className="appearance-none bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 pr-7 focus:outline-none focus:ring-1 focus:ring-primary text-xs text-gray-600 dark:text-gray-300"
						value={
							editor.isActive("heading", { level: 1 })
								? "h1"
								: editor.isActive("heading", { level: 2 })
									? "h2"
									: editor.isActive("heading", { level: 3 })
										? "h3"
										: editor.isActive("heading", { level: 4 })
											? "h4"
											: editor.isActive("heading", { level: 5 })
												? "h5"
												: editor.isActive("heading", { level: 6 })
													? "h6"
													: ""
						}
						onChange={(e) => {
							const value = e.target.value;
							if (value === "") {
								editor.chain().focus().setParagraph().run();
							} else {
								const level = Number.parseInt(value.replace("h", ""));
								setHeading(level);
							}
						}}
					>
						<option value="">Párrafo</option>
						<option value="h1">Título 1</option>
						<option value="h2">Título 2</option>
						<option value="h3">Título 3</option>
						<option value="h4">Título 4</option>
						<option value="h5">Título 5</option>
						<option value="h6">Título 6</option>
					</select>
					<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-400 dark:text-gray-500">
						<HeadingIcon className="h-3 w-3" />
					</div>
				</div>

				<div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					active={editor.isActive("bulletList")}
				>
					<List className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					active={editor.isActive("orderedList")}
				>
					<ListOrdered className="h-3.5 w-3.5" />
				</ToolbarBtn>

				<div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

				{/* Font Size Dropdown */}
				<div className="relative">
					<ToolbarBtn
						onClick={() => {
							setShowFontSizePicker(!showFontSizePicker);
							setShowTextColorPicker(false);
							setShowBgColorPicker(false);
						}}
					>
						<Type className="h-3.5 w-3.5" />
					</ToolbarBtn>
					{showFontSizePicker && (
						<div className="absolute z-10 mt-1 w-36 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 py-1">
							{fontSizes.map((size) => (
								<button
									key={size.value}
									type="button"
									className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
									onClick={() => setFontSize(size.value)}
								>
									<span style={{ fontSize: size.value }}>{size.label}</span>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Text Color Dropdown */}
				<div className="relative">
					<ToolbarBtn
						onClick={() => {
							setShowTextColorPicker(!showTextColorPicker);
							setShowFontSizePicker(false);
							setShowBgColorPicker(false);
						}}
					>
						<Palette className="h-3.5 w-3.5" />
					</ToolbarBtn>
					{showTextColorPicker && (
						<div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-2">
							<div className="grid grid-cols-5 gap-1">
								{textColors.map((color) => (
									<button
										key={color.value}
										type="button"
										className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
										style={{ backgroundColor: color.value }}
										onClick={() => setTextColor(color.value)}
										title={color.label}
									/>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Background Color Dropdown */}
				<div className="relative">
					<ToolbarBtn
						onClick={() => {
							setShowBgColorPicker(!showBgColorPicker);
							setShowFontSizePicker(false);
							setShowTextColorPicker(false);
						}}
					>
						<div className="w-3.5 h-3.5 border border-gray-400 dark:border-gray-500 rounded-sm">
							<div className="w-full h-full bg-gray-200 dark:bg-gray-500 rounded-sm" />
						</div>
					</ToolbarBtn>
					{showBgColorPicker && (
						<div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-2">
							<div className="grid grid-cols-5 gap-1">
								{backgroundColors.map((color) => (
									<button
										key={color.value}
										type="button"
										className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
										style={{ backgroundColor: color.value }}
										onClick={() => setBackgroundColor(color.value)}
										title={color.label}
									/>
								))}
							</div>
						</div>
					)}
				</div>

				<div className="flex-1" />

				<ToolbarBtn
					onClick={() => editor.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
				>
					<Undo className="h-3.5 w-3.5" />
				</ToolbarBtn>
				<ToolbarBtn
					onClick={() => editor.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
				>
					<Redo className="h-3.5 w-3.5" />
				</ToolbarBtn>
			</div>

			{/* Editor */}
			<EditorContent
				editor={editor}
				className="p-3 min-h-[150px] prose prose-sm dark:prose-invert max-w-none"
			/>
		</div>
	);
}
