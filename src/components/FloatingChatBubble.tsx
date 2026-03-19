"use client";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChat } from "@/context/ChatContext";

interface FloatingChatBubbleProps {
	position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
	offset?: number;
}

export default function FloatingChatBubble({
	position = "bottom-right",
	offset = 20,
}: FloatingChatBubbleProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [hasNewMessage, setHasNewMessage] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const { recentChats } = useChat();

	// Verificar si estamos en la página de chat
	const isInChatPage = pathname?.includes("/chat");

	// Usar valores fijos para la posición en lugar de clases dinámicas
	const getPositionStyles = () => {
		switch (position) {
			case "bottom-right":
				return { bottom: `${offset}px`, right: `${offset}px` };
			case "bottom-left":
				return { bottom: `${offset}px`, left: `${offset}px` };
			case "top-right":
				return { top: `${offset}px`, right: `${offset}px` };
			case "top-left":
				return { top: `${offset}px`, left: `${offset}px` };
			default:
				return { bottom: `${offset}px`, right: `${offset}px` };
		}
	};

	// Actualizar el contador de mensajes no leídos - MEJORADO para tiempo real
	useEffect(() => {
		const totalUnread = recentChats.reduce(
			(total, chat) => total + chat.unreadCount,
			0,
		);

		// Si NO estamos en la página de chat Y hay mensajes nuevos, mostrar notificación
		if (!isInChatPage && totalUnread > unreadCount) {
			console.log("🚨 BUBBLE: New message detected, showing notification!");
			setHasNewMessage(true);

			// ABRIR AUTOMÁTICAMENTE la burbuja cuando hay mensaje nuevo
			setIsOpen(true);

			// Resetear la animación después de 3 segundos
			const timer = setTimeout(() => {
				setHasNewMessage(false);
			}, 3000);

			// Cerrar automáticamente después de 5 segundos
			const closeTimer = setTimeout(() => {
				setIsOpen(false);
			}, 5000);

			return () => {
				clearTimeout(timer);
				clearTimeout(closeTimer);
			};
		}

		setUnreadCount(totalUnread);
	}, [recentChats, unreadCount, isInChatPage]);

	// Navegar a la página de chat
	const handleOpenChat = () => {
		router.push("/admin/chat");
	};

	// Obtener los estilos de posición
	const positionStyles = getPositionStyles();

	// No mostrar la burbuja si estamos en la página de chat
	if (isInChatPage) {
		return null;
	}

	return (
		<div
			className="fixed z-9999"
			style={positionStyles}
			data-testid="floating-chat-bubble"
		>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, scale: 0.5, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.5, y: 20 }}
						className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64 border border-gray-200 dark:border-gray-700"
					>
						<div className="flex justify-between items-center mb-3">
							<h3 className="font-medium text-gray-800 dark:text-white">
								Mensajes
							</h3>
							<button
								onClick={() => setIsOpen(false)}
								className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							>
								<X size={18} />
							</button>
						</div>

						<div className="space-y-2 max-h-60 overflow-y-auto">
							{recentChats.length > 0 ? (
								recentChats.slice(0, 3).map((chat) => (
									<div
										key={chat.user.id}
										className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all ${
											chat.unreadCount > 0
												? "bg-primary/5 hover:bg-primary/10 border border-primary/20 shadow-sm"
												: "hover:bg-gray-100 dark:hover:bg-gray-700"
										}`}
										onClick={handleOpenChat}
									>
										<div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
											{chat.user.image ? (
												<>
													<Image
														src={
															chat.user?.image
																? chat.user?.image.startsWith("http")
																	? chat.user?.image
																	: `${process.env.NEXT_PUBLIC_BACKEND_URL}${chat.user?.image}`
																: "/placeholder.svg"
														}
														alt={chat.user?.name || "User Avatar"}
														width={40}
														height={40}
														quality={100}
														priority
														className="h-full w-full object-cover object-center rounded-full"
													/>
												</>
											) : (
												<div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/80 flex items-center justify-center text-black dark:text-black text-sm font-medium">
													{chat.user?.name
														? chat.user.name.charAt(0).toUpperCase()
														: "L"}
												</div>
											)}
											{chat.unreadCount > 0 && (
												<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
													{chat.unreadCount}
												</span>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-gray-800 dark:text-white truncate">
												{chat.user.name}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
												{chat.lastMessage?.content || "No hay mensajes"}
											</p>
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
									No hay mensajes recientes
								</p>
							)}
						</div>

						<button
							onClick={handleOpenChat}
							className="w-full mt-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-medium transition-colors"
						>
							Ver todos los mensajes
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			<motion.button
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				onClick={() => setIsOpen(!isOpen)}
				className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-black shadow-lg transition-colors"
				animate={
					hasNewMessage
						? {
								y: [0, -10, 0],
								scale: [1, 1.1, 1],
								boxShadow: [
									"0 4px 14px 0 rgb(0 0 0 / 0.25)",
									"0 8px 25px 0 rgb(59 130 246 / 0.5)",
									"0 4px 14px 0 rgb(0 0 0 / 0.25)",
								],
							}
						: {}
				}
				transition={{ duration: 0.6, ease: "easeInOut" }}
			>
				<MessageCircle size={24} />
				{unreadCount > 0 && (
					<motion.span
						className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: "spring", stiffness: 500, damping: 30 }}
					>
						{unreadCount > 99 ? "99+" : unreadCount}
					</motion.span>
				)}
			</motion.button>
		</div>
	);
}
