"use client"
import { useEffect, useRef } from "react"
import ChatBoxHeader from "./ChatBoxHeader"
import ChatBoxSendForm from "./ChatBoxSendForm"
import Image from "next/image"
import { useChat } from "@/context/ChatContext"
import { AlertCircle } from "lucide-react"

// Helper function to format date in a human-readable way
const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return "ahora"
  } else if (diffMins < 60) {
    return `hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`
  } else if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
  } else if (diffDays < 7) {
    return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`
  } else {
    // Format date as DD/MM/YYYY for older messages (formato español)
    return date.toLocaleDateString('es-ES')
  }
}

export default function ChatBox() {
  const { activeChat, messages, currentUser, isTyping, markMessagesAsRead, error, connectionStatus } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Add this near the top of the component
  const hasMarkedReadRef = useRef(false)
  const processedMessageIds = useRef(new Set<string>())

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Mark messages as read when viewing a chat
  useEffect(() => {
    if (activeChat && !hasMarkedReadRef.current) {
      markMessagesAsRead()
      hasMarkedReadRef.current = true
    }

    return () => {
      // Reset the flag when the component unmounts or activeChat changes
      hasMarkedReadRef.current = false
    }
  }, [activeChat, markMessagesAsRead])

  // Modificar la parte del filtrado de mensajes para incluir validaciones adicionales
  // Reemplazar la función de filtrado de mensajes con esta versión mejorada
  const filteredMessages = messages.filter((message) => {
    // Validar que el mensaje tenga la estructura básica necesaria
    if (!message || typeof message !== "object" || !message.content) {
      console.error("Invalid message in filteredMessages:", message)
      return false
    }

    // Solo filtrar mensajes que tienen el mismo ID (no temporales)
    if (typeof message.id === "number" && message.id > 0) {
      const duplicateIndex = messages.findIndex(
        (m) => m !== message && typeof m.id === "number" && m.id > 0 && m.id === message.id,
      )
      return duplicateIndex === -1
    }
    return true
  })

  // Asegurarse de que el ref de mensajes procesados se reinicie cuando cambia el chat activo
  useEffect(() => {
    // Limpiar el conjunto de IDs procesados cuando cambia el chat
    processedMessageIds.current = new Set<string>()
  }, [activeChat])

  if (!activeChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] xl:w-3/4">
        <div className="text-center p-5">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">Select a conversation</h3>
          <p className="text-gray-500 dark:text-gray-400">Choose a contact from the list to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] xl:w-3/4">
      {/* <!-- ====== Chat Box Start --> */}
      <ChatBoxHeader user={activeChat} />

      {/* Estado de conexión */}
      {connectionStatus !== "connected" && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded relative mb-2 mx-4 mt-2 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="block sm:inline">
            {connectionStatus === "connecting"
              ? "Conectando al servidor de chat..."
              : "Desconectado del servidor. Intentando reconectar..."}
          </span>
        </div>
      )}

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-2 mx-4 mt-2 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex-1 max-h-full p-5 space-y-6 overflow-auto custom-scrollbar xl:space-y-8 xl:p-6">
        {filteredMessages.map((message, index) => {
          const isSender = message.senderId === currentUser?.id
          const formattedTime = formatMessageTime(message.createdAt)

          // Use index as fallback key if id is not available (for temporary messages)
          const messageKey = message.id || `temp-${index}`

          return (
            <div key={messageKey} className={`flex ${isSender ? "justify-end" : "items-start gap-4"}`}>
              {!isSender && (
                <div className="w-10 h-10 overflow-hidden rounded-full">

                  {message.sender?.image ? (
                    <Image
                      src={
                        message.sender?.image
                          ? (message.sender.image.startsWith('http')
                            ? message.sender.image
                            : `${process.env.NEXT_PUBLIC_BACKEND_URL}${message.sender.image}`)
                          : "/images/placeholder.svg"
                      }
                      alt={message.sender?.name || "User Avatar"}
                      width={40}
                      height={40}
                      quality={100}
                      priority
                      className="h-full w-full object-cover object-center rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-medium">
                      {message.sender?.name ? message.sender?.name.charAt(0).toUpperCase() : "L"}
                    </div>
                  )}

                </div>
              )}

              <div className={`${isSender ? "text-right" : ""}`}>
                <div
                  className={`px-3 py-2 rounded-lg ${isSender
                    ? "bg-brand-500 text-white dark:bg-brand-500"
                    : "bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white/90"
                    } ${isSender ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                >
                  <p className="text-sm ">{message.content}</p>
                </div>
                <p className="mt-2 text-gray-500 text-theme-xs dark:text-gray-400">{formattedTime}</p>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 overflow-hidden rounded-full">
              {activeChat.image ? (
                <Image
                  src={
                    activeChat.image
                      ? (activeChat.image.startsWith('http')
                        ? activeChat.image
                        : `${process.env.NEXT_PUBLIC_BACKEND_URL}${activeChat.image}`)
                      : "/images/placeholder.svg"
                  }
                  alt={activeChat?.name || "User Avatar"}
                  width={40}
                  height={40}
                  quality={100}
                  priority
                  className="h-full w-full object-cover object-center rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-medium">
                  {activeChat?.name ? activeChat.name.charAt(0).toUpperCase() : "L"}
                </div>
              )}
            </div>
            <div>
              <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white/90 rounded-tl-sm">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <p className="mt-2 text-gray-500 text-theme-xs dark:text-gray-400">{activeChat.name} is typing...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      <ChatBoxSendForm />
      {/* <!-- ====== Chat Box End --> */}
    </div>
  )
}
