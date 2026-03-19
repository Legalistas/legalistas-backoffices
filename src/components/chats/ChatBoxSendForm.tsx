"use client";
import { Loader2, Send, Smile } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@/context/ChatContext";

const EMOJIS = [
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

export default function ChatBoxSendForm() {
	const [message, setMessage] = useState("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const { sendMessage, startTyping, stopTyping, connectionStatus } = useChat();
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const lastSubmitTimeRef = useRef<number>(0);
	const emojiPickerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (message.trim() && !typingTimeoutRef.current) {
			startTyping();
			typingTimeoutRef.current = setTimeout(() => {
				stopTyping();
				typingTimeoutRef.current = null;
			}, 3000);
		}
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
				typingTimeoutRef.current = null;
				stopTyping();
			}
		};
	}, [message, startTyping, stopTyping]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				emojiPickerRef.current &&
				!emojiPickerRef.current.contains(event.target as Node)
			) {
				setShowEmojiPicker(false);
			}
		}
		if (showEmojiPicker) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [showEmojiPicker]);

	const addEmoji = (emoji: string) => {
		setMessage((prev) => prev + emoji);
		setShowEmojiPicker(false);
		inputRef.current?.focus();
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!message.trim() || isSubmitting) return;

		const now = Date.now();
		if (now - lastSubmitTimeRef.current < 500) return;
		lastSubmitTimeRef.current = now;

		setIsSubmitting(true);
		sendMessage(message.trim());
		setMessage("");
		inputRef.current?.focus();

		setTimeout(() => {
			setIsSubmitting(false);
		}, 500);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			const form = inputRef.current?.closest("form");
			if (form) form.requestSubmit();
		}
	};

	return (
		<div className="sticky bottom-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3">
			{showEmojiPicker && (
				<div
					ref={emojiPickerRef}
					className="absolute bottom-16 left-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50 w-80 max-h-48 overflow-y-auto"
				>
					<div className="grid grid-cols-10 gap-0.5">
						{EMOJIS.map((emoji, index) => (
							<button
								key={index}
								type="button"
								className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-base transition-colors"
								onClick={() => addEmoji(emoji)}
							>
								{emoji}
							</button>
						))}
					</div>
				</div>
			)}

			<form className="flex items-center gap-2" onSubmit={handleSubmit}>
				<button
					type="button"
					className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors shrink-0"
					title="Emojis"
					onClick={() => setShowEmojiPicker(!showEmojiPicker)}
				>
					<Smile className="h-5 w-5" />
				</button>

				<input
					ref={inputRef}
					type="text"
					placeholder="Escribe un mensaje..."
					className="flex-1 text-sm text-gray-800 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={connectionStatus !== "connected" || isSubmitting}
				/>

				<button
					type="submit"
					className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
					disabled={
						!message.trim() ||
						isSubmitting ||
						connectionStatus !== "connected"
					}
				>
					{isSubmitting ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</button>
			</form>
		</div>
	);
}
