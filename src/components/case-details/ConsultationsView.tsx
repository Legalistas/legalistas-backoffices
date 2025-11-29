
"use client"

import { CaseConsultationMessages, CaseConsultations } from "@/types/cases"
import { Clipboard, File, Plus, Send, FileText, FileImage, FileArchive, FileCode, MessageCircleCode, EyeClosed, Ban } from "lucide-react"
import { BASE_URL, CASES_CONSULTATIONS_MESSAGES_ENDPOINT, CASES_CONSULTATIONS_MARK_READ_ENDPOINT, CASES_CONSULTATIONS_CLOSE_ENDPOINT } from "@/constant/api-endpoints"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import Button from "../ui/button/Button"
import CreateConsultationForm from "./CreateConsultationForm"

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

    // Estado para mostrar el formulario de nueva consulta
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Mantener la consulta seleccionada tras F5 usando localStorage
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


    // Devuelve el texto legible del status
    const getStatusText = (status: CaseConsultations["status"]) => {
        switch (status) {
            case "PENDING":
                return "pendiente"
            case "OPEN":
                return "abierta"
            case "CLOSED":
                return "cerrada"
            default:
                return "desconocida"
        }
    }

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


    return (
        <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Sidebar con lista de consultas */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between p-4">
                    <h2 className="text-lg font-semibold">Consultas del caso</h2>
                    {/* Botón solo para admin/responsable, aquí se asume que siempre se muestra. Puedes condicionar por rol si lo necesitas. */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateForm(true)}
                        className="ml-2"
                    >
                        Nueva Consulta
                    </Button>
                </div>
                {/* Formulario para crear nueva consulta */}
                {showCreateForm && (
                    <div className="p-4">
                        <CreateConsultationForm
                            caseId={Number(caseId)}
                            onSuccess={() => { setShowCreateForm(false); if (typeof window !== 'undefined') window.location.reload(); }}
                            onCancel={() => setShowCreateForm(false)}
                        />
                    </div>
                )}
                <ul>
                    {consultations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((consultation) => (
                        <li
                            key={`consultation-${consultation.id}`}
                            onClick={() => handleSelectConsultation(consultation)}
                            className={`p-4 cursor-pointer hover:bg-gray-100 ${selectedConsultation?.id === consultation.id ? "bg-blue-100" : ""}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{consultation.title}</span>
                                <span
                                    className={`text-xs px-2 py-1 rounded uppercase ${consultation.status === "OPEN"
                                        ? "bg-green-100 text-green-700"
                                        : consultation.status === "PENDING"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-red-100 text-red-700"}`}
                                >
                                    {getStatusText(consultation.status)}
                                </span>
                                {/* Indicador de mensajes no leídos */}
                                {typeof (consultation as any).unreadMessages === 'number' && (consultation as any).unreadMessages > 0 && (
                                    <span className="ml-2 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs font-bold" title="Mensajes no leídos">
                                        {(consultation as any).unreadMessages}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Creada el {new Date(consultation.createdAt).toLocaleString()}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Panel de mensajes */}
            <div className="w-2/3 flex flex-col">
                {selectedConsultation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <button
                                className="text-xs text-gray-400 underline hover:text-gray-600 mt-2 md:mt-0"
                                onClick={handleDeselectConsultation}
                                title="Cerrar panel de consulta"
                            >
                                Cerrar panel
                            </button>
                            <div>
                                <h3 className="font-semibold text-lg">{selectedConsultation.title}</h3>
                                <p className="text-sm text-gray-500">
                                    Consulta creada el {new Date(selectedConsultation.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded uppercase ${selectedConsultation.status === "OPEN"
                                    ? "bg-green-100 text-green-700"
                                    : selectedConsultation.status === "PENDING"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700"}`}>{getStatusText(selectedConsultation.status)}</span>
                                {selectedConsultation.status === "OPEN" && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleCloseConsultation}
                                        className=""
                                        title="Cerrar consulta"
                                    >
                                        <Ban className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Archivos generales de la consulta */}
                        {selectedConsultation.files && selectedConsultation.files.length > 0 && (
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <h4 className="font-medium text-gray-700 mb-2">Archivos adjuntos a la consulta</h4>
                                <ul className="space-y-1 text-sm">
                                    {selectedConsultation.files.map((file) => (
                                        <li key={`file-${file.id}`}> 
                                            <button
                                                type="button"
                                                onClick={() => downloadFile(file.filePath, file.fileName)}
                                                className="flex items-center gap-2 text-blue-600 hover:underline"
                                            >
                                                {getFileIcon(file.extension)}
                                                {file.fileName} ({file.extension.toUpperCase()})
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Lista de mensajes */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[300px]">
                            {selectedConsultation.messages?.map(
                                (message: CaseConsultationMessages, index: number) => (
                                    <div
                                        key={message.id ? `msg-${message.id}` : `msg-idx-${index}`}
                                        className={`flex ${message.sender === "user" ? "justify-start" : "justify-end"
                                            }`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender === "user"
                                                ? "bg-[#3B82F6] text-white"
                                                : "bg-gray-100 text-gray-900"
                                                }`}
                                        >
                                            <p className="text-sm">{message.content}</p>
                                            <p
                                                className={`text-xs mt-1 ${message.sender === "user" ? "text-blue-100" : "text-gray-500"
                                                    }`}
                                            >
                                                {`Enviado el ${new Date(message.timestamp).toLocaleString()}`}
                                            </p>

                                            {message.files && message.files.length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    {message.files.map((file) => (
                                                        <button
                                                            key={`msgfile-${file.id}`}
                                                            type="button"
                                                            onClick={() => downloadFile(file.filePath, file.fileName)}
                                                            className="flex items-center gap-2 text-xs underline"
                                                        >
                                                            {getFileIcon(file.extension)} {file.fileName} ({Math.round(file.fileSize / 1024)} KB)
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            )}
                            {/* Ref para scroll automático */}
                            <div ref={messagesEndRef} />
                        </div>
                        {/* Botón para bajar al último mensaje (simula 'unread') */}
                        <div className="flex justify-end px-4 pb-2">
                            <button
                                type="button"
                                onClick={scrollToLastMessage}
                                className="text-xs text-blue-600 underline hover:text-blue-800"
                                title="Ir al último mensaje"
                            >
                                Ir al último mensaje
                            </button>
                        </div>

                        {/* Input de mensaje + archivos */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="relative flex items-end">
                                <textarea
                                    placeholder="Escribe tu mensaje aquí..."
                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-24 h-32 resize"
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    style={{ resize: "none" }}
                                />
                                <input
                                    type="file"
                                    multiple
                                    onChange={(e) => setAttachedFiles(e.target.files)}
                                    className="hidden"
                                    id="fileUpload"
                                />
                                <div className="absolute right-2 bottom-2 flex flex-col items-end gap-2">
                                    {/* Archivos seleccionados para adjuntar */}
                                    {attachedFiles && attachedFiles.length > 0 && (
                                        <div className="mb-1 max-w-xs flex flex-col items-end">
                                            <ul className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700 shadow border border-gray-200">
                                                {Array.from(attachedFiles).map((file, idx) => (
                                                    <li key={idx} className="flex items-center gap-1">
                                                        {getFileIcon(file.name.split('.').pop() || '')}
                                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                                        <span className="text-gray-400">({Math.round(file.size / 1024)} KB)</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div className="flex gap-1">
                                        <label
                                            htmlFor="fileUpload"
                                            className="cursor-pointer p-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                                            title="Adjuntar archivos"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </label>
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={sending}
                                            className="bg-blue-600 text-white p-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
                                            title="Enviar mensaje"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
                            <MessageCircleCode className="h-10 w-10 text-gray-500" />
                            <h3 className="mb-2 text-lg font-medium">Selecciona una consulta</h3>
                            <p className="mb-4 mt-2 text-sm text-gray-500">
                                Elige una consulta de la lista para ver los mensajes y archivos asociados.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
