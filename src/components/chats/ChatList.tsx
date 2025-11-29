"use client"
import { useEffect, useState } from "react"
import { Dropdown } from "../ui/dropdown/Dropdown"
import { DropdownItem } from "../ui/dropdown/DropdownItem"
import Image from "next/image"
import { useChat } from "@/context/ChatContext"
import { Dot, User } from "lucide-react"

interface ChatListProps {
  isOpen: boolean
  onToggle: () => void
}

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

export default function ChatList({ isOpen, onToggle }: ChatListProps) {
  const { recentChats, setActiveChat, activeChat, onlineUsers } = useChat()
  const [localRecentChats, setLocalRecentChats] = useState(recentChats)

  // Update local state when recentChats changes
  useEffect(() => {
    setLocalRecentChats(recentChats)
  }, [recentChats])

  return (
    <div className="h-full overflow-y-auto px-4 custom-scrollbar" style={{ maxHeight: "calc(100vh - 220px)" }}>
      {localRecentChats.length > 0 ? (
        localRecentChats.map((chat) => {
          const isOnline = onlineUsers.has(chat.user.id)

          return (
            <div
              key={chat.user.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 mb-2 ${activeChat?.id === chat.user.id
                ? "bg-gray-100 dark:bg-white/[0.05]"
                : "hover:bg-gray-100 dark:hover:bg-white/[0.03]"
                }`}
              onClick={() => setActiveChat(chat.user)}
            >
              <div className="relative h-10 w-10 rounded-full flex-shrink-0">
                {chat.user.image ? (
                  <Image
                    src={
                      chat.user?.image
                        ? (chat.user?.image.startsWith('http')
                          ? chat.user?.image
                          : `${process.env.NEXT_PUBLIC_BACKEND_URL}${chat.user?.image}`)
                        : '/placeholder.svg'
                    }
                    alt={chat.user?.name || "User Avatar"}
                    width={40}
                    height={40}
                    quality={100}
                    priority
                    className="h-full w-full object-cover object-center rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-medium">
                    {chat.user?.name ? chat.user.name.charAt(0).toUpperCase() : "L"}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-[1.5px] border-white ${isOnline ? "bg-green-500" : "bg-gray-400"
                    } dark:border-gray-900`}
                ></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h5 className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{chat.user.name}</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                      {chat.lastMessage?.content || "Aún no hay mensajes"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    <span className="text-xs text-gray-400">
                      {chat.lastMessage ? formatMessageTime(chat.lastMessage.createdAt) : ""}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-medium text-white">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <div className="text-gray-400 mb-2">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 10.5H16M8 14.5H11M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay chats recientes</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Inicia una conversación seleccionando un usuario</p>
        </div>
      )}
    </div>
  )
}
