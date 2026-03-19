"use client";
import { AlertCircle, MessageSquare, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useChat } from "@/context/ChatContext";
import ChatBoxHeader from "./ChatBoxHeader";
import ChatBoxSendForm from "./ChatBoxSendForm";

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
		return `hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
	if (diffHours < 24)
		return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
	if (diffDays < 7)
		return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
	return date.toLocaleDateString("es-ES");
};

export default function ChatBox() {
	const {
		activeChat,
		messages,
		currentUser,
		isTyping,
		markMessagesAsRead,
		error,
		connectionStatus,
	} = useChat();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const hasMarkedReadRef = useRef(false);
	const processedMessageIds = useRef(new Set<string>());

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	useEffect(() => {
		if (activeChat && !hasMarkedReadRef.current) {
			markMessagesAsRead();
			hasMarkedReadRef.current = true;
		}
		return () => {
			hasMarkedReadRef.current = false;
		};
	}, [activeChat, markMessagesAsRead]);

	const filteredMessages = messages.filter((message) => {
		if (!message || typeof message !== "object" || !message.content)
			return false;
		if (typeof message.id === "number" && message.id > 0) {
			const duplicateIndex = messages.findIndex(
				(m) =>
					m !== message &&
					typeof m.id === "number" &&
					m.id > 0 &&
					m.id === message.id,
			);
			return duplicateIndex === -1;
		}
		return true;
	});

	useEffect(() => {
		processedMessageIds.current = new Set<string>();
	}, [activeChat]);

	if (!activeChat) {
		return (
			<div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 xl:w-3/4">
				<div className="text-center p-8">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<MessageSquare className="h-8 w-8 text-gray-400 dark:text-gray-500" />
					</div>
					<h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
						Seleccioná una conversación
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Elegí un contacto de la lista para empezar a chatear
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 xl:w-3/4">
			<ChatBoxHeader user={activeChat} />

			{connectionStatus !== "connected" && (
				<div className="flex items-center gap-2 px-4 py-2 mx-4 mt-2 text-sm rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400">
					{connectionStatus === "connecting" ? (
						<Wifi className="h-4 w-4 animate-pulse" />
					) : (
						<WifiOff className="h-4 w-4" />
					)}
					{connectionStatus === "connecting"
						? "Conectando al servidor de chat..."
						: "Desconectado. Intentando reconectar..."}
				</div>
			)}

			{error && (
				<div className="flex items-center gap-2 px-4 py-2 mx-4 mt-2 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					{error}
				</div>
			)}

			<div className="flex-1 max-h-full p-5 space-y-5 overflow-auto custom-scrollbar xl:p-6">
				{filteredMessages.map((message, index) => {
					const isSender = message.senderId === currentUser?.id;
					const formattedTime = formatMessageTime(message.createdAt);
					const messageKey = message.id || `temp-${index}`;

					return (
						<div
							key={messageKey}
							className={`flex ${isSender ? "justify-end" : "items-start gap-3"}`}
						>
							{!isSender && (
								<div className="w-9 h-9 overflow-hidden rounded-full shrink-0">
									{message.sender?.image ? (
										<Image
											src={
												message.sender.image.startsWith("http")
													? message.sender.image
													: `${process.env.NEXT_PUBLIC_BACKEND_URL}${message.sender.image}`
											}
											alt={message.sender?.name || "Avatar"}
											width={36}
											height={36}
											className="h-full w-full object-cover rounded-full"
										/>
									) : (
										<div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
											{message.sender?.name?.charAt(0).toUpperCase() || "U"}
										</div>
									)}
								</div>
							)}

							<div className={isSender ? "text-right max-w-[75%]" : "max-w-[75%]"}>
								<div
									className={`inline-block px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
										isSender
											? "bg-primary text-white rounded-br-md"
											: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md"
									}`}
								>
									{message.content}
								</div>
								<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
									{formattedTime}
								</p>
							</div>
						</div>
					);
				})}

				{isTyping && (
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 overflow-hidden rounded-full shrink-0">
							{activeChat.image ? (
								<Image
									src={
										activeChat.image.startsWith("http")
											? activeChat.image
											: `${process.env.NEXT_PUBLIC_BACKEND_URL}${activeChat.image}`
									}
									alt={activeChat?.name || "Avatar"}
									width={36}
									height={36}
									className="h-full w-full object-cover rounded-full"
								/>
							) : (
								<div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
									{activeChat?.name?.charAt(0).toUpperCase() || "U"}
								</div>
							)}
						</div>
						<div>
							<div className="inline-block px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-md">
								<div className="typing-indicator">
									<span />
									<span />
									<span />
								</div>
							</div>
							<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
								{activeChat.name} está escribiendo...
							</p>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>
			<ChatBoxSendForm />
		</div>
	);
}
