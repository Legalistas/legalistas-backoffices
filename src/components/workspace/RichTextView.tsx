"use client";

import Mention from "@tiptap/extension-mention";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * HTML del editor en solo lectura. Pasa por el esquema de tiptap en vez de
 * dangerouslySetInnerHTML: lo que no sea texto, listas o menciones se descarta.
 */
export function RichTextView({ html }: { html: string }) {
	const editor = useEditor({
		immediatelyRender: false,
		editable: false,
		extensions: [
			StarterKit.configure({
				bulletList: { HTMLAttributes: { class: "list-disc pl-5" } },
				orderedList: { HTMLAttributes: { class: "list-decimal pl-5" } },
			}),
			Mention.configure({
				HTMLAttributes: { class: "mention rounded bg-primary/5 px-1 py-0.5 font-medium text-primary" },
				// Para que cada mención se muestre con su @ o su #.
				suggestions: [{ char: "@" }, { char: "#" }],
			}),
		],
		content: html,
		editorProps: { attributes: { class: "prose prose-sm max-w-none text-sm dark:prose-invert" } },
	});
	return <EditorContent editor={editor} />;
}
