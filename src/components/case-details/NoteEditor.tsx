"use client";

import Mention from "@tiptap/extension-mention";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Italic,
	List,
	ListOrdered,
	Redo,
	Strikethrough,
	Undo,
} from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import tippy, { type Instance as TippyInstance } from "tippy.js";

interface MentionUser {
	id: number;
	name: string;
	image?: string | null;
}

interface NoteEditorProps {
	content: string;
	onChange: (html: string) => void;
	onMentionsChange?: (userIds: number[]) => void;
	mentionUsers: MentionUser[];
	placeholder?: string;
}

// ── Mention suggestion list component ──
interface MentionListProps {
	items: MentionUser[];
	command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
	onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
	({ items, command }, ref) => {
		const [selectedIndex, setSelectedIndex] = useState(0);

		const selectItem = useCallback(
			(index: number) => {
				const item = items[index];
				if (item) {
					command({ id: String(item.id), label: item.name });
				}
			},
			[items, command],
		);

		useEffect(() => {
			setSelectedIndex(0);
		}, [items]);

		useImperativeHandle(ref, () => ({
			onKeyDown: ({ event }: { event: KeyboardEvent }) => {
				if (event.key === "ArrowUp") {
					setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
					return true;
				}
				if (event.key === "ArrowDown") {
					setSelectedIndex((prev) => (prev + 1) % items.length);
					return true;
				}
				if (event.key === "Enter") {
					selectItem(selectedIndex);
					return true;
				}
				return false;
			},
		}));

		if (items.length === 0) {
			return (
				<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3">
					<p className="text-xs text-gray-400">No se encontraron usuarios</p>
				</div>
			);
		}

		return (
			<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden py-1 min-w-[200px]">
				{items.map((item, index) => (
					<button
						key={item.id}
						onClick={() => selectItem(index)}
						className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors ${
							index === selectedIndex
								? "bg-primary/5 dark:bg-primary/80/20 text-primary dark:text-primary"
								: "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
						}`}
					>
						<div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/80/30 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
							{item.name.charAt(0).toUpperCase()}
						</div>
						<span className="truncate">{item.name}</span>
					</button>
				))}
			</div>
		);
	},
);

MentionList.displayName = "MentionList";

// ── Main editor ──
export const NoteEditor = ({
	content,
	onChange,
	onMentionsChange,
	mentionUsers,
	placeholder = "Escribe tu comentario... Usa @ para mencionar",
}: NoteEditorProps) => {
	const mentionUsersRef = useRef(mentionUsers);
	mentionUsersRef.current = mentionUsers;

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				bulletList: { HTMLAttributes: { class: "list-disc pl-5" } },
				orderedList: { HTMLAttributes: { class: "list-decimal pl-5" } },
			}),
			Mention.configure({
				HTMLAttributes: {
					class:
						"mention bg-primary/5 dark:bg-primary/80/20 text-primary dark:text-primary rounded px-1 py-0.5 font-medium text-sm",
				},
				suggestion: {
					items: ({ query }: { query: string }) => {
						return mentionUsersRef.current
							.filter((user) =>
								user.name.toLowerCase().includes(query.toLowerCase()),
							)
							.slice(0, 5);
					},
					render: () => {
						let component: ReactRenderer<MentionListRef> | null = null;
						let popup: TippyInstance[] | null = null;

						return {
							onStart: (props: any) => {
								component = new ReactRenderer(MentionList, {
									props,
									editor: props.editor,
								});

								if (!props.clientRect) return;

								popup = tippy("body", {
									getReferenceClientRect: props.clientRect,
									appendTo: () => document.body,
									content: component.element,
									showOnCreate: true,
									interactive: true,
									trigger: "manual",
									placement: "bottom-start",
								});
							},
							onUpdate: (props: any) => {
								component?.updateProps(props);
								if (popup && props.clientRect) {
									popup[0]?.setProps({
										getReferenceClientRect: props.clientRect,
									});
								}
							},
							onKeyDown: (props: any) => {
								if (props.event.key === "Escape") {
									popup?.[0]?.hide();
									return true;
								}
								return component?.ref?.onKeyDown(props) ?? false;
							},
							onExit: () => {
								popup?.[0]?.destroy();
								component?.destroy();
							},
						};
					},
				},
			}),
		],
		content: content || "",
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			onChange(html);

			// Extract mentioned user IDs
			if (onMentionsChange) {
				const ids: number[] = [];
				editor.state.doc.descendants((node) => {
					if (node.type.name === "mention" && node.attrs.id) {
						ids.push(Number(node.attrs.id));
					}
				});
				onMentionsChange([...new Set(ids)]);
			}
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[80px] px-4 py-3 text-sm",
			},
		},
	});

	// Cleanup
	useEffect(() => {
		return () => {
			editor?.destroy();
		};
	}, []);

	if (!editor) return null;

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

	return (
		<div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
			{/* Toolbar */}
			<div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
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
				>
					<Strikethrough className="h-3.5 w-3.5" />
				</ToolbarBtn>

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
			<div className="relative">
				{editor.isEmpty && (
					<div className="absolute top-0 left-0 px-4 py-3 text-sm text-gray-400 pointer-events-none">
						{placeholder}
					</div>
				)}
				<EditorContent editor={editor} />
			</div>
		</div>
	);
};
