"use client";

import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	Clock,
	MessageCircle,
	Mic,
	Paperclip,
	Plus,
	Send,
	Square,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CASES_CONSULTATIONS_CLOSE_ENDPOINT,
	CASES_CONSULTATIONS_GET_BY_ID_ENDPOINT,
	CASES_CONSULTATIONS_MARK_READ_ENDPOINT,
	CASES_CONSULTATIONS_REOPEN_ENDPOINT,
	CASES_CONSULTATIONS_SEND_MESSAGE_ENDPOINT,
} from "@/constant/api-endpoints";
import type { CaseConsultations } from "@/types/cases";

interface ConsultationMessage {
	id: number;
	consultationId: number;
	sender: "user" | "responsible" | "internal";
	content: string;
	timestamp: string;
	isRead?: boolean;
}

interface ConsultationDetailResponse {
	data: CaseConsultations & {
		messages: ConsultationMessage[];
	};
}

export default function ConsultationDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const consultationId = params.id as string;

	const [consultation, setConsultation] = useState<CaseConsultations | null>(
		null,
	);
	const [messages, setMessages] = useState<ConsultationMessage[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchConsultation = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(
				CASES_CONSULTATIONS_GET_BY_ID_ENDPOINT(consultationId),
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Error fetching consultation");
			}

			const apiResponse: ConsultationDetailResponse = await response.json();
			setConsultation(apiResponse.data);
			setMessages(apiResponse.data.messages || []);

			// Marcar consulta como leída
			await markAsRead();
		} catch (error) {
			console.error("Failed to fetch consultation:", error);
			setError("No se pudo cargar la consulta.");
		} finally {
			setLoading(false);
		}
	}, [consultationId, session?.user?.accessToken]);

	const markAsRead = useCallback(async () => {
		try {
			await fetch(CASES_CONSULTATIONS_MARK_READ_ENDPOINT(consultationId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
		} catch (error) {
			console.error("Failed to mark as read:", error);
		}
	}, [consultationId, session?.user?.accessToken]);

	const sendMessage = useCallback(async () => {
		if (!newMessage.trim() || sending) return;

		try {
			setSending(true);
			setError(null);

			const response = await fetch(
				CASES_CONSULTATIONS_SEND_MESSAGE_ENDPOINT(consultationId),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({
						content: newMessage.trim(),
						sender: "responsible", // o "internal" dependiendo del tipo de usuario
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Error sending message");
			}

			const newMessageData = await response.json();

			// Agregar el nuevo mensaje a la lista
			setMessages((prev) => [...prev, newMessageData.data]);
			setNewMessage("");

			// Actualizar el estado de la consulta si es necesario
			if (consultation?.status === "PENDING") {
				setConsultation((prev) => (prev ? { ...prev, status: "OPEN" } : null));
			}
		} catch (error) {
			console.error("Failed to send message:", error);
			setError("No se pudo enviar el mensaje.");
		} finally {
			setSending(false);
		}
	}, [
		newMessage,
		sending,
		consultationId,
		session?.user?.accessToken,
		consultation?.status,
	]);

	const handleCloseConsultation = useCallback(async () => {
		try {
			setError(null);

			const response = await fetch(
				CASES_CONSULTATIONS_CLOSE_ENDPOINT(consultationId),
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Error closing consultation");
			}

			const result = await response.json();
			setConsultation((prev) => (prev ? { ...prev, status: "CLOSED" } : null));
			console.log("Consulta cerrada:", result.message);
		} catch (error) {
			console.error("Failed to close consultation:", error);
			setError("No se pudo cerrar la consulta.");
		}
	}, [consultationId, session?.user?.accessToken]);

	const handleReopenConsultation = useCallback(async () => {
		try {
			setError(null);

			const response = await fetch(
				CASES_CONSULTATIONS_REOPEN_ENDPOINT(consultationId),
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Error reopening consultation");
			}

			const result = await response.json();
			setConsultation((prev) => (prev ? { ...prev, status: "OPEN" } : null));
			console.log("Consulta reabierta:", result.message);
		} catch (error) {
			console.error("Failed to reopen consultation:", error);
			setError("No se pudo reabrir la consulta.");
		}
	}, [consultationId, session?.user?.accessToken]);

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			sendMessage();
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status.toLowerCase()) {
			case "open":
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "pending":
				return <Clock className="w-4 h-4 text-yellow-500" />;
			case "closed":
				return <AlertCircle className="w-4 h-4 text-gray-500" />;
			default:
				return <MessageCircle className="w-4 h-4 text-blue-500" />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "open":
				return "bg-green-100 text-green-800 border-green-200";
			case "pending":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "closed":
				return "bg-gray-100 text-gray-800 border-gray-200";
			default:
				return "bg-blue-100 text-blue-800 border-blue-200";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "PENDING":
				return "pendiente";
			case "OPEN":
				return "abierta";
			case "CLOSED":
				return "cerrada";
			default:
				return status.toLowerCase();
		}
	};

	useEffect(() => {
		if (session?.user?.accessToken && consultationId) {
			fetchConsultation();
		}
	}, [session?.user?.accessToken, consultationId, fetchConsultation]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex items-center gap-2 text-gray-600">
					<MessageCircle className="h-5 w-5 animate-pulse" />
					<span>Cargando consulta...</span>
				</div>
			</div>
		);
	}

	if (error || !consultation) {
		return (
			<div className="max-w-4xl mx-auto p-6">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						{error || "No se pudo encontrar la consulta."}
					</AlertDescription>
				</Alert>
				<div className="mt-4">
					<Button
						onClick={() => router.push("/admin/consultations")}
						variant="outline"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Volver a consultas
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<Button
					onClick={() => router.push("/admin/consultations")}
					variant="outline"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Volver
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold text-gray-900">
						{consultation.title}
					</h1>
					<div className="flex items-center gap-4 mt-2">
						<div
							className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(consultation.status)}`}
						>
							{getStatusIcon(consultation.status)}
							<span className="capitalize">
								{getStatusText(consultation.status)}
							</span>
						</div>
						<span className="text-sm text-gray-500">
							Caso: {consultation.cases?.title || "N/A"}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{consultation.status === "CLOSED" ? (
						<Button
							onClick={handleReopenConsultation}
							variant="outline"
						>
							Reabrir consulta
						</Button>
					) : (
						<Button
							onClick={handleCloseConsultation}
							variant="outline"
						>
							Cerrar consulta
						</Button>
					)}
				</div>
			</div>

			{error && (
				<Alert variant="destructive" className="mb-6">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Messages */}
			<div className="bg-white rounded-lg border border-gray-200 mb-6">
				<div className="p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">Conversación</h2>
				</div>

				<div className="p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
					<div className="space-y-4">
						{messages.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								<MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
								<p>No hay mensajes en esta consulta.</p>
							</div>
						) : (
							messages.map((message, index) => (
								<div
									key={message.id || index}
									className={`flex ${message.sender === "user" ? "justify-start" : "justify-end"}`}
								>
									<div
										className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
											message.sender === "user"
												? "bg-primary text-white"
												: "bg-gray-100 text-gray-900"
										}`}
									>
										<div className="flex items-center gap-2 mb-1">
											<span
												className={`text-xs font-medium ${
													message.sender === "user"
														? "text-blue-100"
														: "text-gray-600"
												}`}
											>
												{message.sender === "user"
													? "Cliente"
													: message.sender === "responsible"
														? "Abogado Responsable"
														: "Abogado Interno"}
											</span>
										</div>
										<p className="text-sm whitespace-pre-wrap">
											{message.content}
										</p>
										<p
											className={`text-xs mt-2 ${
												message.sender === "user"
													? "text-blue-100"
													: "text-gray-500"
											}`}
										>
											{new Date(message.timestamp).toLocaleString("es-ES", {
												day: "2-digit",
												month: "short",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{/* Response Area */}
			<div className="bg-white rounded-lg border border-gray-200 p-4">
				<div className="flex justify-between items-center mb-3">
					<h3 className="font-medium text-gray-900">Responder consulta</h3>
					{consultation.status === "CLOSED" && (
						<Badge variant="secondary">
							Consulta cerrada
						</Badge>
					)}
				</div>

				{consultation.status !== "CLOSED" && (
					<div className="relative">
						<textarea
							value={newMessage}
							onChange={(e) => setNewMessage(e.target.value)}
							onKeyDown={handleKeyPress}
							className="w-full p-3 pb-12 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
							placeholder="Escribe tu respuesta... (Ctrl+Enter para enviar)"
							rows={4}
							disabled={sending}
						/>

						{/* Toolbar */}
						<div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
							<div className="flex items-center gap-2">
								<Button variant="ghost" size="sm" disabled={sending}>
									<Paperclip className="w-4 h-4" />
								</Button>
								<Button variant="ghost" size="sm" disabled={sending}>
									<Mic className="w-4 h-4" />
								</Button>
							</div>

							<Button
								onClick={sendMessage}
								disabled={!newMessage.trim() || sending}
							>
								{sending ? (
									<>
										<MessageCircle className="w-4 h-4 mr-2 animate-spin" />
										Enviando...
									</>
								) : (
									<>
										<Send className="w-4 h-4 mr-2" />
										Enviar
									</>
								)}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
