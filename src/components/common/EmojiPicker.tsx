"use client";

import { Smile } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const EMOJIS = [
	"🙂", "👋", "✅", "❌", "📅", "🗓️", "📄", "📎", "📞", "📍",
	"⚖️", "🕐", "⏳", "⚠️", "✍️", "💼", "🏥", "🚗", "💰", "🎉",
	"😀", "😃", "😄", "😁", "😊", "😍", "🥰", "😘", "🤗", "🤔",
	"😐", "😑", "😶", "🙄", "😏", "😣", "😥", "😮", "🤐", "😯",
	"😪", "😫", "🥱", "😴", "😌", "😛", "😜", "😝", "🤤", "😒",
	"😓", "😔", "😕", "🙃", "🤑", "😲", "☹️", "🙁", "😖", "😞",
	"😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬",
	"😰", "😱", "🥵", "🥶", "😳", "🤪", "😵", "🥴", "😷", "🤒",
	"👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉",
	"👆", "👇", "☝️", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪",
	"❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
];

/** Emoji button that opens a grid; after a pick the caller puts the focus back where it wants. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
	const [open, setOpen] = useState(false);
	const picked = useRef(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button type="button" variant="ghost" size="icon" aria-label="Emojis" title="Emojis" className="shrink-0">
					<Smile className="h-5 w-5" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				side="top"
				className="w-80 p-2"
				// Closed by a pick: don't send the focus back to the button.
				onCloseAutoFocus={(e) => {
					if (picked.current) e.preventDefault();
					picked.current = false;
				}}
			>
				<div className="grid max-h-56 grid-cols-10 gap-0.5 overflow-y-auto">
					{EMOJIS.map((emoji) => (
						<button
							key={emoji}
							type="button"
							aria-label={emoji}
							className="flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-muted"
							onClick={() => {
								picked.current = true;
								setOpen(false);
								onPick(emoji);
							}}
						>
							{emoji}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
