"use client";
import { MoreVertical, Phone, Video } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { User } from "@/context/ChatContext";
import { useChat } from "@/context/ChatContext";
import { Dropdown } from "@/components/shared/Dropdown";
import { DropdownItem } from "@/components/shared/DropdownItem";

interface ChatBoxHeaderProps {
	user: User;
}

export default function ChatBoxHeader({ user }: ChatBoxHeaderProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { onlineUsers } = useChat();
	const isOnline = onlineUsers.has(user.id);

	return (
		<div className="sticky flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 xl:px-6">
			<div className="flex items-center gap-3">
				<div className="relative h-10 w-10 rounded-full shrink-0">
					{user.image ? (
						<Image
							src={
								user.image.startsWith("http")
									? user.image
									: `${process.env.NEXT_PUBLIC_BACKEND_URL}${user.image}`
							}
							alt={user?.name || "Avatar"}
							width={40}
							height={40}
							className="h-full w-full object-cover rounded-full"
						/>
					) : (
						<div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
							{user?.name?.charAt(0).toUpperCase() || "U"}
						</div>
					)}
					<span
						className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
							isOnline ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
						}`}
					/>
				</div>
				<div>
					<h5 className="text-sm font-medium text-gray-800 dark:text-gray-100">
						{user.name}
					</h5>
					<p className={`text-xs ${isOnline ? "text-green-500" : "text-gray-400 dark:text-gray-500"}`}>
						{isOnline ? "En línea" : "Desconectado"}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1">
				<button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors">
					<Phone className="h-4 w-4" />
				</button>
				<button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors">
					<Video className="h-4 w-4" />
				</button>
				<div className="relative">
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
					>
						<MoreVertical className="h-4 w-4" />
					</button>
					<Dropdown
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						className="w-40 p-2"
					>
						<DropdownItem
							onItemClick={() => setIsOpen(false)}
							className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
						>
							Ver perfil
						</DropdownItem>
						<DropdownItem
							onItemClick={() => setIsOpen(false)}
							className="flex w-full font-normal text-left text-red-500 rounded-lg hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
						>
							Eliminar chat
						</DropdownItem>
					</Dropdown>
				</div>
			</div>
		</div>
	);
}
