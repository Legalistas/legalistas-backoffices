"use client";
import { MessageSquare } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";

interface ChatListProps {
	isOpen: boolean;
	onToggle: () => void;
}

const formatMessageTime = (dateString: string): string => {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return "ahora";
	if (diffMins < 60)
		return `${diffMins}min`;
	if (diffHours < 24)
		return `${diffHours}h`;
	if (diffDays < 7)
		return `${diffDays}d`;
	return date.toLocaleDateString("es-ES");
};

export default function ChatList({ isOpen, onToggle }: ChatListProps) {
	const { recentChats, setActiveChat, activeChat, onlineUsers } = useChat();
	const [localRecentChats, setLocalRecentChats] = useState(recentChats);

	useEffect(() => {
		setLocalRecentChats(recentChats);
	}, [recentChats]);

	return (
		<div
			className="h-full overflow-y-auto px-4 custom-scrollbar"
			style={{ maxHeight: "calc(100vh - 280px)" }}
		>
			{localRecentChats.length > 0 ? (
				localRecentChats.map((chat) => {
					const isOnline = onlineUsers.has(chat.user.id);
					const isActive = activeChat?.id === chat.user.id;

					return (
						<div
							key={chat.user.id}
							className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 mb-1 transition-colors ${
								isActive
									? "bg-primary/10 dark:bg-primary/20"
									: "hover:bg-gray-50 dark:hover:bg-gray-800/50"
							}`}
							onClick={() => setActiveChat(chat.user)}
						>
							<div className="relative h-10 w-10 rounded-full shrink-0">
								{chat.user.image ? (
									<Image
										src={
											chat.user.image.startsWith("http")
												? chat.user.image
												: `${process.env.NEXT_PUBLIC_BACKEND_URL}${chat.user.image}`
										}
										alt={chat.user?.name || "Avatar"}
										width={40}
										height={40}
										className="h-full w-full object-cover rounded-full"
									/>
								) : (
									<div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
										{chat.user?.name?.charAt(0).toUpperCase() || "U"}
									</div>
								)}
								<span
									className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
										isOnline ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
									}`}
								/>
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between">
									<h5 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
										{chat.user.name}
									</h5>
									<span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
										{chat.lastMessage
											? formatMessageTime(chat.lastMessage.createdAt)
											: ""}
									</span>
								</div>
								<div className="flex items-center justify-between mt-0.5">
									<p className="text-xs text-gray-500 dark:text-gray-400 truncate pr-2">
										{chat.lastMessage?.content || "Sin mensajes"}
									</p>
									{chat.unreadCount > 0 && (
										<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white shrink-0">
											{chat.unreadCount}
										</span>
									)}
								</div>
							</div>
						</div>
					);
				})
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<MessageSquare className="h-6 w-6 text-gray-400 dark:text-gray-500" />
					</div>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						No hay chats recientes
					</p>
					<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
						Seleccioná un usuario para empezar
					</p>
				</div>
			)}
		</div>
	);
}
