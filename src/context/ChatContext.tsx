"use client"
import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useSession } from "next-auth/react"
import {
    CHAT_MESSAGES_ENDPOINT,
    CHAT_RECENT_ENDPOINT,
    CHAT_HISTORY_ENDPOINT,
    CHAT_READ_ENDPOINT,
    USERS_ENDPOINT,
} from "@/constant/api-endpoints"


// Define types
export interface User {
    id: number
    name: string
    image?: string | null
}

export interface ChatMessage {
    id: number
    content: string
    senderId: number
    receiverId: number
    isRead: boolean
    createdAt: string
    updatedAt: string
    sender: {
        id: number
        name: string | null
        image: string | null
    }
    receiver: {
        id: number
        name: string | null
        image: string | null
    }
    tempId?: string // Optional property for temporary ID
}

export interface ChatPreview {
    user: User
    lastMessage: ChatMessage | null
    unreadCount: number
}

interface ChatContextType {
    currentUser: User | null
    activeChat: User | null
    messages: ChatMessage[]
    recentChats: ChatPreview[]
    isLoading: boolean
    error: string | null
    sendMessage: (content: string) => void
    setActiveChat: (user: User) => void
    markMessagesAsRead: () => void
    isTyping: boolean
    startTyping: () => void
    stopTyping: () => void
    typingUsers: { [key: number]: boolean }
    onlineUsers: Set<number>
    connectionStatus: "connected" | "connecting" | "disconnected"
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode; userId: number }> = ({ children, userId }) => {
    const { data: session } = useSession()
    const socketRef = useRef<Socket | null>(null)
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [activeChat, setActiveChat] = useState<User | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [recentChats, setRecentChats] = useState<ChatPreview[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [typingUsers, setTypingUsers] = useState<{ [key: number]: boolean }>({})
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
    const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected")
    const [isSending, setIsSending] = useState(false)
    const reconnectAttempts = useRef(0)
    const maxReconnectAttempts = 5
    const sentMessagesCache = useRef(new Set<string>())
    const activeChatRef = useRef<User | null>(null)

    // Add this near the top of the component, with the other refs
    const hasMarkedReadRef = useRef<{ [key: number]: boolean }>({})

    // Define fetchWithAuth with useCallback
    const fetchWithAuth = useCallback(
        async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
            // Get token from session or localStorage
            const token = session?.user?.accessToken

            // Set up headers with authentication
            const headers = new Headers(options.headers || {})

            if (token) {
                headers.set("Authorization", `Bearer ${token}`)
            }

            if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
                headers.set("Content-Type", "application/json")
            }

            // Merge options
            const fetchOptions: RequestInit = {
                ...options,
                headers,
            }

            // Make the request
            const response = await fetch(url, fetchOptions)

            // Handle errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `API error: ${response.status}`)
            }

            // Parse JSON response
            if (response.headers.get("Content-Type")?.includes("application/json")) {
                return response.json()
            }

            return response.text() as unknown as T
        },
        [session?.user?.accessToken],
    )

    // Mark messages as read
    const markMessageAsRead = useCallback(
        async (messageId: number) => {
            if (!activeChat) return

            try {
                await fetchWithAuth(CHAT_READ_ENDPOINT(activeChat.id), { method: "POST" })

                // Update messages
                setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isRead: true } : msg)))

                // Update recent chats
                setRecentChats((prev) =>
                    prev.map((chat) => (chat.user.id === activeChat.id ? { ...chat, unreadCount: 0 } : chat)),
                )
            } catch (err) {
                console.error("Error marking messages as read:", err)
            }
        },
        [activeChat, fetchWithAuth],
    )

    // Mark messages as read
    const markMessagesAsRead = useCallback(async () => {
        if (!activeChat) return

        // Add this line to prevent unnecessary API calls if there are no unread messages
        const hasUnreadMessages = recentChats.some((chat) => chat.user.id === activeChat.id && chat.unreadCount > 0)

        if (!hasUnreadMessages) return

        try {
            await fetchWithAuth(CHAT_READ_ENDPOINT(activeChat.id), { method: "POST" })

            // Update messages
            setMessages((prev) =>
                prev.map((msg) => (msg.senderId === activeChat.id && !msg.isRead ? { ...msg, isRead: true } : msg)),
            )

            // Update recent chats
            setRecentChats((prev) =>
                prev.map((chat) => (chat.user.id === activeChat.id ? { ...chat, unreadCount: 0 } : chat)),
            )
        } catch (err) {
            console.error("Error marking messages as read:", err)
        }
    }, [activeChat, fetchWithAuth, recentChats])

    // First, let's define fetchRecentChats with useCallback before the useEffect
    const fetchRecentChats = useCallback(async () => {
        setIsLoading(true)
        try {
            const chats = await fetchWithAuth<ChatPreview[]>(CHAT_RECENT_ENDPOINT)
            setRecentChats(chats)
        } catch (err) {
            console.error("Error fetching recent chats:", err)
            setError("Failed to load recent chats")
        } finally {
            setIsLoading(false)
        }
    }, [fetchWithAuth])

    // Define updateRecentChatsWithMessage with useCallback and proper typing
    const updateRecentChatsWithMessage = useCallback(
        (message: ChatMessage) => {
            // Validar que el mensaje tenga la estructura esperada
            if (!message || typeof message !== "object") {
                console.error("Invalid message object received:", message)
                return
            }

            setRecentChats((prev: ChatPreview[]) => {
                // Determinar el ID del otro usuario y su información
                const otherUserId = message.senderId === userId ? message.receiverId : message.senderId

                // Verificar que otherUserId sea válido
                if (!otherUserId) {
                    console.error("Invalid otherUserId in message:", message)
                    return prev
                }

                const otherUser = message.senderId === userId ? message.receiver : message.sender

                // Verificar que otherUser sea válido
                if (!otherUser || typeof otherUser !== "object") {
                    console.error("Invalid otherUser object:", otherUser)
                    return prev
                }

                // Crear un objeto de usuario con valores predeterminados seguros
                const typedUser: User = {
                    id: otherUser.id || otherUserId, // Usar otherUserId como respaldo
                    name: otherUser.name || `User ${otherUserId}`, // Proporcionar un nombre predeterminado
                    image: otherUser.image || null,
                }

                // Check if chat already exists
                const existingChatIndex = prev.findIndex((chat) => chat.user.id === otherUserId)

                if (existingChatIndex >= 0) {
                    // Update existing chat
                    const updatedChats = [...prev]
                    updatedChats[existingChatIndex] = {
                        ...updatedChats[existingChatIndex],
                        lastMessage: message,
                        unreadCount:
                            message.senderId !== userId && !message.isRead
                                ? updatedChats[existingChatIndex].unreadCount + 1
                                : updatedChats[existingChatIndex].unreadCount,
                    }

                    // Move this chat to the top
                    const [chat] = updatedChats.splice(existingChatIndex, 1)
                    return [chat, ...updatedChats]
                } else {
                    // Add new chat with properly typed user
                    return [
                        {
                            user: typedUser,
                            lastMessage: message,
                            unreadCount: message.senderId !== userId && !message.isRead ? 1 : 0,
                        },
                        ...prev,
                    ]
                }
            })
        },
        [userId],
    )

    // Actualizar la función initializeSocket para usar las variables de entorno correctamente
    const initializeSocket = useCallback(() => {
        if (!userId || !session?.user?.accessToken) return null

        setConnectionStatus("connecting")

        // Usar la URL base correcta
        const SOCKET_BASE_URL = "https://backend.legalistas.ar"
        console.log("Connecting to socket server at:", SOCKET_BASE_URL)

        // Configuración mejorada para Socket.IO
        const socket = io(SOCKET_BASE_URL, {
            withCredentials: true,
            path: "/socket.io",
            auth: {
                userId,
                token: session.user.accessToken,
            },
            reconnection: true,
            reconnectionAttempts: 10, // Incrementar intentos
            reconnectionDelay: 2000, // Reducir delay inicial
            reconnectionDelayMax: 10000, // Máximo delay entre intentos
            randomizationFactor: 0.5, // Randomizar para evitar thundering herd
            timeout: 20000, // Incrementar timeout de conexión
            transports: process.env.NODE_ENV === 'production' 
                ? ["websocket", "polling"] // En producción: websocket primero
                : ["polling", "websocket"], // En desarrollo: polling primero para debugging
            autoConnect: true,
            forceNew: false, // Reutilizar conexiones existentes
            upgrade: true, // Permitir upgrade a websocket
            rememberUpgrade: true, // Recordar el upgrade exitoso
        })

        return socket
    }, [userId, session?.user?.accessToken])

    // Initialize socket connection
    useEffect(() => {
        if (!userId || !session?.user?.accessToken) return

        // Get current user details
        const fetchCurrentUser = async () => {
            try {
                const userData = await fetchWithAuth<User>(`${USERS_ENDPOINT}/${userId}`)
                setCurrentUser(userData)
            } catch (err) {
                console.error("Error fetching current user:", err)
                setError("Failed to load user data")
            }
        }

        fetchCurrentUser()

        // Inicializar socket solo si no existe
        if (!socketRef.current) {
            socketRef.current = initializeSocket()

            if (!socketRef.current) return

            // Configurar eventos del socket
            const socket = socketRef.current

            socket.on("connect", () => {
                console.log("Connected to chat server with socket ID:", socket.id)
                console.log("Using transport:", socket.io.engine.transport.name)
                setConnectionStatus("connected")
                setError(null)
                reconnectAttempts.current = 0
                socket.emit("chat:join")

                // Fetch recent chats after successful connection
                fetchRecentChats()
            })

            // Log transport upgrades
            socket.io.engine.on("upgrade", () => {
                console.log("🚀 Transport upgraded to:", socket.io.engine.transport.name)
            })

            socket.io.engine.on("upgradeError", (error) => {
                console.warn("⚠️ Transport upgrade failed:", error.message)
                console.log("Continuing with current transport:", socket.io.engine.transport.name)
            })

            socket.on("connect_error", (error) => {
                console.error("Socket connection error:", error.message)
                setConnectionStatus("disconnected")
                setError(`Connection error: ${error.message}`)

                // Incrementar intentos de reconexión
                reconnectAttempts.current += 1

                // Si excedemos el máximo de intentos, detener reconexión
                if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.error("Max reconnection attempts reached")
                    socket.disconnect()
                    setError("Failed to connect after multiple attempts. Please refresh the page.")
                }
            })

            socket.on("disconnect", (reason) => {
                console.log(`Disconnected from chat server. Reason: ${reason}`)
                setConnectionStatus("disconnected")

                if (reason === "io server disconnect") {
                    // Reconectar solo si el servidor desconectó explícitamente
                    setTimeout(() => {
                        socket.connect()
                    }, 3000)
                } else if (reason === "transport close" || reason === "transport error") {
                    console.log("Transport issue detected, will attempt reconnection")
                }
            })

            socket.on("user:online", (userId: number) => {
                setOnlineUsers((prev) => new Set(prev).add(userId))
            })

            socket.on("user:offline", (userId: number) => {
                setOnlineUsers((prev) => {
                    const newSet = new Set(prev)
                    newSet.delete(userId)
                    return newSet
                })
            })

            // MANEJO DE MENSAJES POR SOCKET - VERSIÓN ULTRA SIMPLE
            socket.on("chat:message", (message: ChatMessage) => {
                console.log("🔔 NEW MESSAGE RECEIVED:", message)
                
                // Validar mensaje básico
                if (!message || !message.senderId || !message.receiverId) {
                    return
                }

                // Verificar si es para el chat activo AHORA MISMO
                const currentChatId = activeChatRef.current?.id
                const isForCurrentChat = currentChatId && (
                    message.senderId === currentChatId || 
                    message.receiverId === currentChatId
                )

                console.log("✅ Is for current chat?", isForCurrentChat, "Current chat ID:", currentChatId)

                if (isForCurrentChat) {
                    // SIEMPRE agregar el mensaje, sin verificaciones complejas
                    console.log("📨 ADDING MESSAGE TO CURRENT CHAT")
                    setMessages((prev) => {
                        // Solo verificar que no sea el mismo mensaje por ID
                        const alreadyExists = prev.find(msg => msg.id === message.id)
                        if (alreadyExists) {
                            console.log("⚠️ Message already exists, skipping")
                            return prev
                        }
                        console.log("✅ ADDING TO STATE")
                        return [...prev, message]
                    })
                }

                // Actualizar recent chats
                updateRecentChatsWithMessage(message)
            })

            socket.on("chat:typing", (data: { userId: number; username: string }) => {
                setTypingUsers((prev) => ({ ...prev, [data.userId]: true }))
            })

            socket.on("chat:stopTyping", (data: { userId: number }) => {
                setTypingUsers((prev) => ({ ...prev, [data.userId]: false }))
            })
        }

        // Cleanup function
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect()
                socketRef.current = null
            }
        }
    }, [
        userId,
        session?.user?.accessToken,
        fetchRecentChats,
        updateRecentChatsWithMessage,
        fetchWithAuth,
        markMessageAsRead,
        initializeSocket,
    ])

    // Keep activeChatRef in sync with activeChat state
    useEffect(() => {
        activeChatRef.current = activeChat
    }, [activeChat])

    // Debug: Log when messages state changes
    useEffect(() => {
        console.log("🔄 MESSAGES STATE CHANGED:", {
            count: messages.length,
            activeChat: activeChat?.id,
            lastMessage: messages[messages.length - 1]?.content
        })
    }, [messages, activeChat])

    // Set active chat and load messages
    const handleSetActiveChat = async (user: User) => {
        setActiveChat(user)
        activeChatRef.current = user // Keep ref in sync
        setIsLoading(true)

        try {
            const chatMessages = await fetchWithAuth<ChatMessage[]>(CHAT_HISTORY_ENDPOINT(user.id))
            setMessages(chatMessages)

            // Mark messages as read
            await fetchWithAuth(CHAT_READ_ENDPOINT(user.id), { method: "POST" })

            // Update unread count in recent chats
            setRecentChats((prev) => prev.map((chat) => (chat.user.id === user.id ? { ...chat, unreadCount: 0 } : chat)))
        } catch (err) {
            console.error("Error fetching chat messages:", err)
            setError("Failed to load messages")
        } finally {
            setIsLoading(false)
        }
    }

    // Send a message - VERSIÓN ULTRA SIMPLE
    const sendMessage = useCallback(
        async (content: string) => {
            if (!socketRef.current || !activeChat || !content.trim() || isSending) return

            setIsSending(true)

            try {
                console.log("📤 SENDING MESSAGE:", content)

                // Solo enviar por HTTP - NO tocar el estado local
                const newMessage = await fetchWithAuth<ChatMessage>(CHAT_MESSAGES_ENDPOINT, {
                    method: "POST",
                    body: JSON.stringify({
                        receiverId: activeChat.id,
                        content,
                    }),
                })

                console.log("✅ HTTP MESSAGE SENT:", newMessage.id)

                // Actualizar recent chats
                updateRecentChatsWithMessage(newMessage)

                // NO agregar al estado - el socket lo hará automáticamente
                console.log("⏳ Waiting for socket update...")

            } catch (err) {
                console.error("❌ Error sending message:", err)
                setError("Failed to send message")
            } finally {
                setIsSending(false)
            }
        },
        [activeChat, fetchWithAuth, isSending, updateRecentChatsWithMessage],
    )

    // Also modify the useEffect that calls markMessagesAsRead to use a ref to track if it's already been called
    // Then modify the useEffect that calls markMessagesAsRead
    useEffect(() => {
        if (activeChat) {
            // Only mark as read if we haven't already done so for this chat session
            if (!hasMarkedReadRef.current[activeChat.id]) {
                markMessagesAsRead()
                hasMarkedReadRef.current[activeChat.id] = true
            }
        }
    }, [activeChat, recentChats, markMessagesAsRead])

    // Add a cleanup for the ref when changing chats
    useEffect(() => {
        // Store the current activeChat.id in a variable to avoid stale closure issues
        const currentActiveChatId = activeChat?.id

        return () => {
            if (currentActiveChatId) {
                // Use the captured value instead of accessing activeChat directly
                hasMarkedReadRef.current[currentActiveChatId] = false
            }
        }
    }, [activeChat])

    // Typing indicators
    const startTyping = useCallback(() => {
        if (!socketRef.current || !activeChat || !socketRef.current.connected) return
        socketRef.current.emit("chat:typing", activeChat.id)
    }, [activeChat])

    const stopTyping = useCallback(() => {
        if (!socketRef.current || !activeChat || !socketRef.current.connected) return
        socketRef.current.emit("chat:stopTyping", activeChat.id)
    }, [activeChat])

    const isTyping = activeChat ? typingUsers[activeChat.id] || false : false

    const value = {
        currentUser,
        activeChat,
        messages,
        recentChats,
        isLoading,
        error,
        sendMessage,
        setActiveChat: handleSetActiveChat,
        markMessagesAsRead,
        isTyping,
        startTyping,
        stopTyping,
        typingUsers,
        onlineUsers,
        connectionStatus,
    }

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChat = () => {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error("useChat must be used within a ChatProvider")
    }
    return context
}
