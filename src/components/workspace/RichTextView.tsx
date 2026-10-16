"use client";

import Mention from "@tiptap/extension-mention";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * Read-only editor HTML. Goes through tiptap's schema instead of
 * dangerouslySetInnerHTML: anything that is not text, lists or mentions is dropped.
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
				// So each mention shows its own @ or #.
				suggestions: [{ char: "@" }, { char: "#" }],
			}),
		],
		content: html,
		editorProps: { attributes: { class: "prose prose-sm max-w-none text-sm dark:prose-invert" } },
	});
	return <EditorContent editor={editor} />;
}
