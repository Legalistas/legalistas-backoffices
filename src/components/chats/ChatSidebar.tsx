"use client";
import { MessageCircle, Search, Users } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { USERS_ENDPOINT } from "@/constant/api-endpoints";
import { useChat } from "@/context/ChatContext";
import ChatHeader from "./ChatHeader";
import ChatList from "./ChatList";

interface User {
	id: number;
	name: string;
	image?: string | null;
	isOnline?: boolean;
}

const UserItem = memo(
	({
		user,
		isActive,
		isOnline,
		onClick,
	}: {
		user: User;
		isActive: boolean;
		isOnline: boolean;
		onClick: (user: User) => void;
	}) => {
		return (
			<div
				className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 mb-1 transition-colors ${
					isActive
						? "bg-primary/10 dark:bg-primary/20"
						: "hover:bg-gray-50 dark:hover:bg-gray-800/50"
				}`}
				onClick={() => onClick(user)}
			>
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
				<div className="flex-1 min-w-0">
					<h5 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
						{user.name}
					</h5>
					<p className={`text-xs ${isOnline ? "text-green-500" : "text-gray-400 dark:text-gray-500"}`}>
						{isOnline ? "En línea" : "Desconectado"}
					</p>
				</div>
			</div>
		);
	},
);

UserItem.displayName = "UserItem";

export default function ChatSidebar() {
	const [isOpen, setIsOpen] = useState(false);
	const [users, setUsers] = useState<User[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<"chats" | "users">("chats");
	const [error, setError] = useState<string | null>(null);
	const { setActiveChat, activeChat, onlineUsers } = useChat();
	const usersContainerRef = useRef<HTMLDivElement>(null);
	const { data: session } = useSession();

	const handleUserClick = useCallback(
		(user: User) => {
			setActiveChat(user);
		},
		[setActiveChat],
	);

	const toggleSidebar = () => {
		setIsOpen(!isOpen);
	};

	useEffect(() => {
		const fetchUsers = async () => {
			setIsLoading(true);
			try {
				const token = session?.user?.accessToken;
				if (!token) {
					setError("No se encontró token de autenticación");
					return;
				}

				const response = await fetch(`${USERS_ENDPOINT}?limit=100`, {
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				});

				if (!response.ok)
					throw new Error(`Error al cargar usuarios: ${response.status}`);

				const data = await response.json();
				setUsers(data.data || data);
			} catch (error: any) {
				console.error("Error fetching users:", error);
				setError(error.message || "Error al cargar usuarios");
			} finally {
				setIsLoading(false);
			}
		};

		if (session?.user?.accessToken) {
			fetchUsers();
		}
	}, [session]);

	const filteredUsers = users.filter((user) =>
		user.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<>
			{isOpen && (
				<div
					className="fixed inset-0 transition-all duration-300 bg-black/50 dark:bg-black/70 z-999999"
					onClick={toggleSidebar}
				/>
			)}
			<div className="flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 xl:flex xl:w-1/4 h-full">
				<ChatHeader onToggle={toggleSidebar} />

				{/* Search */}
				<div className="px-4 py-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
						<input
							type="text"
							placeholder="Buscar..."
							className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary dark:focus:bg-gray-800"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
				</div>

				{error && (
					<div className="px-4 pb-2">
						<div className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-red-50 border border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
							{error}
						</div>
					</div>
				)}

				{/* Tabs */}
				<div className="flex mx-4 mb-3 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
					<button
						className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
							activeTab === "chats"
								? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
								: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
						}`}
						onClick={() => setActiveTab("chats")}
					>
						<MessageCircle className="h-3.5 w-3.5" />
						Recientes
					</button>
					<button
						className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
							activeTab === "users"
								? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
								: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
						}`}
						onClick={() => setActiveTab("users")}
					>
						<Users className="h-3.5 w-3.5" />
						Usuarios
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-hidden">
					{activeTab === "chats" ? (
						<ChatList isOpen={isOpen} onToggle={toggleSidebar} />
					) : (
						<div
							ref={usersContainerRef}
							className="h-full overflow-y-auto px-4 custom-scrollbar"
							style={{ maxHeight: "calc(100vh - 280px)" }}
						>
							{isLoading ? (
								<div className="flex justify-center py-8">
									<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
								</div>
							) : filteredUsers.length > 0 ? (
								filteredUsers.map((user) => (
									<UserItem
										key={user.id}
										user={user}
										isActive={activeChat?.id === user.id}
										isOnline={onlineUsers.has(user.id)}
										onClick={handleUserClick}
									/>
								))
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
									<p className="text-sm text-gray-500 dark:text-gray-400">
										{searchTerm
											? "No se encontraron usuarios"
											: "No hay usuarios disponibles"}
									</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
