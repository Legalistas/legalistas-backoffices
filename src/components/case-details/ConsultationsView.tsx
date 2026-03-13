
"use client"

import { CaseConsultationMessages, CaseConsultations } from "@/types/cases"
import { 
    File, Plus, Send, FileText, FileImage, FileArchive, FileCode, 
    MessageSquare, X, Clock, CheckCircle2, XCircle, ChevronRight,
    Paperclip, ArrowDown, User, Building2
} from "lucide-react"
import { BASE_URL, CASES_CONSULTATIONS_MESSAGES_ENDPOINT, CASES_CONSULTATIONS_MARK_READ_ENDPOINT, CASES_CONSULTATIONS_CLOSE_ENDPOINT } from "@/constant/api-endpoints"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import Button from "../ui/button/Button"
import CreateConsultationForm from "./CreateConsultationForm"

const STATUS_CONFIG = {
    PENDING: { 
        label: "Pendiente", 
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
        icon: Clock 
    },
    OPEN: { 
        label: "Abierta", 
        color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
        icon: CheckCircle2 
    },
    CLOSED: { 
        label: "Cerrada", 
        color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
        icon: XCircle 
    },
}

interface ConsultationsViewProps {
    consultations: CaseConsultations[]
    caseId: string
    onCreateConsultation?: () => void
}

export default function ConsultationsView({
    consultations,
    caseId,
    onCreateConsultation,
}: ConsultationsViewProps) {
    const [closeError, setCloseError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const [selectedConsultation, setSelectedConsultation] = useState<CaseConsultations | null>(() => {
        if (typeof window !== 'undefined') {
            const savedId = localStorage.getItem('selectedConsultationId');
            if (savedId && Array.isArray(consultations) && consultations.length > 0) {
                const found = consultations.find(c => String(c.id) === savedId);
                return found || null;
            }
        }
        return null;
    });

    const { data: session } = useSession()

    // Marcar como leída la consulta
    const markAsRead = useCallback(async (consultationId: number) => {
        try {
            await fetch(CASES_CONSULTATIONS_MARK_READ_ENDPOINT(consultationId), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
        } catch (error) {
            console.error("Failed to mark as read:", error)
        }
    }, [session?.user?.accessToken])

    // Cambia el estado de la consulta a OPEN en backend y local, y marca como leída si tiene mensajes no leídos
    const handleSelectConsultation = async (consultation: CaseConsultations) => {
        // Solo cambiar a OPEN si está en PENDING (no tocar si ya es OPEN o CLOSED)
        if (consultation.status === "PENDING") {
            try {
                await fetch(`${BASE_URL}/cases/${consultation.caseId}/consultation/${consultation.id}/open`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken || ''}`
                    },
                });
                consultation.status = "OPEN";
            } catch (err) {
                console.error("No se pudo actualizar la consulta a OPEN", err);
            }
        }
        // Si tiene mensajes no leídos (unreadMessages > 0), marcar como leída
        if (typeof (consultation as any).unreadMessages === 'number' && (consultation as any).unreadMessages > 0) {
            await markAsRead(consultation.id);
            (consultation as any).unreadMessages = 0;
        }
        setSelectedConsultation({ ...consultation });
        if (typeof window !== 'undefined') {
            localStorage.setItem('selectedConsultationId', String(consultation.id));
        }
    };
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    // Scroll automático al último mensaje cuando cambia la consulta o se envía un mensaje
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [selectedConsultation?.messages?.length, selectedConsultation?.id]);

    // Al cargar, si hay una consulta seleccionada guardada, seleccionarla
    useEffect(() => {
        if (!selectedConsultation && typeof window !== 'undefined') {
            const savedId = localStorage.getItem('selectedConsultationId');
            if (savedId && Array.isArray(consultations) && consultations.length > 0) {
                const found = consultations.find(c => String(c.id) === savedId);
                if (found) setSelectedConsultation(found);
            }
        }
    }, [consultations]);

    // Limpiar localStorage al deseleccionar (opcional, si quieres limpiar al cerrar panel)
    const handleDeselectConsultation = () => {
        setSelectedConsultation(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('selectedConsultationId');
        }
    };

    // Cerrar consulta (actualiza en backend y local)

    const handleCloseConsultation = useCallback(async () => {
        if (!selectedConsultation) return;
        setCloseError(null);
        try {
            const response = await fetch(CASES_CONSULTATIONS_CLOSE_ENDPOINT(selectedConsultation.id), {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error("Error closing consultation");
            }
            const result = await response.json();
            setSelectedConsultation(prev => prev ? { ...prev, status: "CLOSED" } : null);
            // Opcional: mostrar mensaje de éxito
            // toast.success("Consulta cerrada correctamente");
            console.log("Consulta cerrada:", result.message);
        } catch (error) {
            console.error("Failed to close consultation:", error);
            setCloseError("No se pudo cerrar la consulta.");
        }
    }, [selectedConsultation, session?.user?.accessToken]);

    // Scroll a último mensaje (puede usarse para botón 'unread')
    const scrollToLastMessage = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };
    const [messageContent, setMessageContent] = useState("")
    const [attachedFiles, setAttachedFiles] = useState<FileList | null>(null)
    const [sending, setSending] = useState(false)
    // ...existing code...

    // Devuelve el icono adecuado según la extensión
    const getFileIcon = (ext: string) => {
        switch (ext?.toLowerCase()) {
            case "pdf":
                return <FileText className="w-4 h-4 text-red-500" />
            case "jpg":
            case "jpeg":
            case "png":
            case "webp":
            case "avif":
                return <FileImage className="w-4 h-4 text-blue-500" />
            case "zip":
            case "rar":
                return <FileArchive className="w-4 h-4 text-yellow-500" />
            case "doc":
            case "docx":
                return <FileText className="w-4 h-4 text-blue-700" />
            case "html":
            case "css":
            case "js":
                return <FileCode className="w-4 h-4 text-green-500" />
            default:
                return <File className="w-4 h-4 text-gray-500" />
        }
    }

    const handleSendMessage = async () => {
        if (!selectedConsultation || (!messageContent && !attachedFiles)) return

        setSending(true)
        try {
            const formData = new FormData()
            formData.append("consultationId", String(selectedConsultation.id))
            formData.append("sender", "responsible")
            if (messageContent) formData.append("content", messageContent)

            if (attachedFiles) {
                Array.from(attachedFiles).forEach(file => {
                    formData.append('file', file); // name 'file' coincide con multer.array('file')
                });
            }

            const res = await fetch(CASES_CONSULTATIONS_MESSAGES_ENDPOINT(selectedConsultation.caseId), {
                method: "POST",
                body: formData,
                headers: {
                    Authorization: `Bearer ${session?.user?.accessToken || ''}`
                }
            })

            if (!res.ok) throw new Error("Error sending message")
            const newMsg = await res.json()

            // actualizar mensajes localmente para render inmediato
            selectedConsultation.messages = [
                ...(selectedConsultation.messages || []),
                newMsg.data,
            ]
            setMessageContent("")
            setAttachedFiles(null)
        } catch (err) {
            console.error(err)
        } finally {
            setSending(false)
        }
    }


    const downloadFile = (filePath: string, fileName: string) => {
        const url = `${BASE_URL}/${filePath}`
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es-AR", { 
            day: "2-digit", 
            month: "2-digit", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const formatShortDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        
        if (diffHours < 24) {
            return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
        }
        if (diffHours < 48) {
            return "Ayer"
        }
        return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    }

    const sortedConsultations = [...consultations].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const pendingCount = consultations.filter(c => c.status === "PENDING").length
    const openCount = consultations.filter(c => c.status === "OPEN").length

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="flex h-[600px]">
                {/* Sidebar - Lista de consultas */}
                <div className="w-[340px] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-800/50">
                    {/* Header del sidebar */}
                    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-gray-400" />
                                <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Consultas</h3>
                            </div>
                            <button 
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Nueva
                            </button>
                        </div>
                        {consultations.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                                    <Clock className="h-3 w-3" />
                                    {pendingCount} pendientes
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {openCount} abiertas
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Formulario de nueva consulta */}
                    {showCreateForm && (
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <CreateConsultationForm
                                caseId={Number(caseId)}
                                onSuccess={() => { setShowCreateForm(false); if (typeof window !== 'undefined') window.location.reload(); }}
                                onCancel={() => setShowCreateForm(false)}
                            />
                        </div>
                    )}

                    {/* Lista de consultas */}
                    <div className="flex-1 overflow-y-auto">
                        {consultations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full px-4 py-10">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                                    <MessageSquare className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sin consultas</p>
                                <p className="text-xs text-gray-400 text-center mb-3">No hay consultas del cliente aún.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {sortedConsultations.map((consultation) => {
                                    const statusConfig = STATUS_CONFIG[consultation.status] || STATUS_CONFIG.PENDING
                                    const StatusIcon = statusConfig.icon
                                    const isSelected = selectedConsultation?.id === consultation.id
                                    const unreadCount = (consultation as any).unreadMessages || 0
                                    const lastMessage = consultation.messages?.[consultation.messages.length - 1]

                                    return (
                                        <div
                                            key={consultation.id}
                                            onClick={() => handleSelectConsultation(consultation)}
                                            className={`px-4 py-3 cursor-pointer transition-colors ${
                                                isSelected 
                                                    ? "bg-brand-50 dark:bg-brand-900/20 border-l-2 border-brand-500" 
                                                    : "hover:bg-gray-100 dark:hover:bg-gray-700/50 border-l-2 border-transparent"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                    consultation.status === "PENDING" 
                                                        ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800" 
                                                        : consultation.status === "OPEN"
                                                            ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800"
                                                            : "bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600"
                                                }`}>
                                                    <StatusIcon className={`h-4 w-4 ${
                                                        consultation.status === "PENDING" 
                                                            ? "text-amber-500" 
                                                            : consultation.status === "OPEN"
                                                                ? "text-green-500"
                                                                : "text-gray-400"
                                                    }`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className={`text-sm font-medium truncate ${
                                                            isSelected 
                                                                ? "text-brand-700 dark:text-brand-300" 
                                                                : "text-gray-900 dark:text-gray-100"
                                                        }`}>
                                                            {consultation.title}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {unreadCount > 0 && (
                                                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-brand-500 rounded-full">
                                                                    {unreadCount}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-gray-400">
                                                                {formatShortDate(consultation.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {lastMessage && (
                                                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {lastMessage.sender === "user" ? "Cliente: " : "Tú: "}
                                                            {lastMessage.content || "Archivo adjunto"}
                                                        </p>
                                                    )}
                                                    <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel de mensajes */}
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
                    {selectedConsultation ? (
                        <>
                            {/* Header del chat */}
                            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-center justify-center">
                                            <MessageSquare className="h-5 w-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {selectedConsultation.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Creada el {formatDate(selectedConsultation.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const statusConfig = STATUS_CONFIG[selectedConsultation.status] || STATUS_CONFIG.PENDING
                                            const StatusIcon = statusConfig.icon
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusConfig.color}`}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {statusConfig.label}
                                                </span>
                                            )
                                        })()}
                                        {selectedConsultation.status === "OPEN" && (
                                            <button
                                                onClick={handleCloseConsultation}
                                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                                title="Cerrar consulta"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={handleDeselectConsultation}
                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                                            title="Cerrar panel"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Archivos de la consulta */}
                                {selectedConsultation.files && selectedConsultation.files.length > 0 && (
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                                        {selectedConsultation.files.map((file) => (
                                            <button
                                                key={file.id}
                                                onClick={() => downloadFile(file.filePath, file.fileName)}
                                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                {getFileIcon(file.extension)}
                                                <span className="truncate max-w-[120px]">{file.fileName}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mensajes */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
                                {selectedConsultation.messages?.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                                            <MessageSquare className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500">No hay mensajes aún</p>
                                    </div>
                                ) : (
                                    selectedConsultation.messages?.map((message: CaseConsultationMessages, index: number) => {
                                        const isUser = message.sender === "user"
                                        return (
                                            <div
                                                key={message.id || `msg-${index}`}
                                                className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                                            >
                                                <div className={`flex items-end gap-2 max-w-[70%] ${isUser ? "flex-row" : "flex-row-reverse"}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                        isUser 
                                                            ? "bg-gray-200 dark:bg-gray-600" 
                                                            : "bg-brand-100 dark:bg-brand-900/30"
                                                    }`}>
                                                        <User className={`h-4 w-4 ${
                                                            isUser ? "text-gray-600 dark:text-gray-300" : "text-brand-600 dark:text-brand-400"
                                                        }`} />
                                                    </div>
                                                    <div className={`rounded-2xl px-4 py-2.5 ${
                                                        isUser 
                                                            ? "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-bl-md" 
                                                            : "bg-brand-500 text-white rounded-br-md"
                                                    }`}>
                                                        {message.content && (
                                                            <p className={`text-sm ${isUser ? "text-gray-900 dark:text-gray-100" : "text-white"}`}>
                                                                {message.content}
                                                            </p>
                                                        )}
                                                        {message.files && message.files.length > 0 && (
                                                            <div className="mt-2 space-y-1.5">
                                                                {message.files.map((file) => (
                                                                    <button
                                                                        key={file.id}
                                                                        onClick={() => downloadFile(file.filePath, file.fileName)}
                                                                        className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                                                                            isUser 
                                                                                ? "bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500" 
                                                                                : "bg-white/20 hover:bg-white/30"
                                                                        }`}
                                                                    >
                                                                        {getFileIcon(file.extension)}
                                                                        <span className="truncate max-w-[140px]">{file.fileName}</span>
                                                                        <span className="text-[10px] opacity-70">
                                                                            ({Math.round(file.fileSize / 1024)} KB)
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <p className={`text-[10px] mt-1.5 ${
                                                            isUser ? "text-gray-400" : "text-white/70"
                                                        }`}>
                                                            {formatDate(message.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Botón scroll */}
                            <div className="flex justify-center py-1 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={scrollToLastMessage}
                                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-500 transition-colors"
                                >
                                    <ArrowDown className="h-3 w-3" />
                                    Ir al último mensaje
                                </button>
                            </div>

                            {/* Input de mensaje */}
                            {selectedConsultation.status !== "CLOSED" && (
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    {/* Archivos adjuntos preview */}
                                    {attachedFiles && attachedFiles.length > 0 && (
                                        <div className="mb-3 flex items-center gap-2 flex-wrap">
                                            {Array.from(attachedFiles).map((file, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs"
                                                >
                                                    {getFileIcon(file.name.split('.').pop() || '')}
                                                    <span className="truncate max-w-[100px] text-gray-700 dark:text-gray-300">
                                                        {file.name}
                                                    </span>
                                                    <span className="text-gray-400">
                                                        ({Math.round(file.size / 1024)} KB)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1 relative">
                                            <textarea
                                                placeholder="Escribe tu mensaje..."
                                                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                                                rows={2}
                                                value={messageContent}
                                                onChange={(e) => setMessageContent(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault()
                                                        handleSendMessage()
                                                    }
                                                }}
                                            />
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={(e) => setAttachedFiles(e.target.files)}
                                            className="hidden"
                                            id="fileUpload"
                                        />
                                        <label
                                            htmlFor="fileUpload"
                                            className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 transition-colors cursor-pointer"
                                            title="Adjuntar archivo"
                                        >
                                            <Paperclip className="h-5 w-5" />
                                        </label>
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={sending || (!messageContent && !attachedFiles)}
                                            className="p-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Enviar mensaje"
                                        >
                                            <Send className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedConsultation.status === "CLOSED" && (
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                        <XCircle className="h-4 w-4" />
                                        Esta consulta está cerrada
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                                    <MessageSquare className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Selecciona una consulta
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                    Elige una consulta de la lista para ver los mensajes y responder al cliente.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
