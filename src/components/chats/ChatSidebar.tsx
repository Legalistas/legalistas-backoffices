"use client"
import { useState, useEffect, useRef, useCallback, memo } from "react"
import ChatList from "./ChatList"
import ChatHeader from "./ChatHeader"
import { useChat } from "@/context/ChatContext"
import { USERS_ENDPOINT } from "@/constant/api-endpoints"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/Tabs"
import { Search } from 'lucide-react'
import { useSession } from "next-auth/react"


// Define User type
interface User {
  id: number
  name: string
  image?: string | null
  isOnline?: boolean
}

// Componente UserItem optimizado con memo
const UserItem = memo(({
  user,
  isActive,
  isOnline,
  onClick
}: {
  user: User
  isActive: boolean
  isOnline: boolean
  onClick: (user: User) => void
}) => {
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 mb-2 ${isActive
          ? "bg-gray-100 dark:bg-white/5"
          : "hover:bg-gray-100 dark:hover:bg-white/3"
        }`}
      onClick={() => onClick(user)}
    >
      <div className="relative h-10 w-10 rounded-full shrink-0">
        {user.image ? (
          <Image
            src={
              user?.image
                ? (user?.image.startsWith('http')
                  ? user?.image
                  : `${process.env.NEXT_PUBLIC_BACKEND_URL}${user?.image}`)
                : '/placeholder.svg'
            }
            alt={user?.name || "User Avatar"}
            width={40}
            height={40}
            quality={100}
            priority
            className="h-full w-full object-cover object-center rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-black dark:text-black text-sm font-medium">
            {user?.name ? user.name.charAt(0).toUpperCase() : "L"}
          </div>
        )}
        <span
          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-[1.5px] border-white ${isOnline ? "bg-green-500" : "bg-gray-400"
            } dark:border-gray-900`}
        ></span>
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{user.name}</h5>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isOnline ? "En línea" : "Desconectado"}
        </p>
      </div>
    </div>
  )
})

UserItem.displayName = 'UserItem'

export default function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"chats" | "users">("chats")
  const [error, setError] = useState<string | null>(null)
  const { setActiveChat, activeChat, onlineUsers } = useChat()
  const usersContainerRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()

  // Optimizar el callback para evitar re-renders
  const handleUserClick = useCallback((user: User) => {
    setActiveChat(user)
  }, [setActiveChat])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // Fetch users from the API
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      try {
        // Usar el token de la sesión en lugar de localStorage
        const token = session?.user?.accessToken

        if (!token) {
          console.error("No authentication token found in session")
          setError("No authentication token found") // Set error message
          return
        }

        const response = await fetch(`${USERS_ENDPOINT}?limit=100`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Error fetching users: ${response.status}`)
        }

        const data = await response.json()

        // Assuming the API returns { data: User[] }
        const usersList = data.data || data

        setUsers(usersList)
      } catch (error: any) {
        console.error("Error fetching users:", error)
        setError(error.message || "Failed to fetch users") // Set error message
      } finally {
        setIsLoading(false)
      }
    }

    // Solo ejecutar fetchUsers si hay una sesión activa
    if (session?.user?.accessToken) {
      fetchUsers()
    }
  }, [session]) // Añadir session como dependencia para que se ejecute cuando cambie

  // Filter users based on search term
  const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 transition-all duration-300 bg-gray-900/50 z-999999"
          onClick={toggleSidebar}
        ></div>
      )}
      <div className="flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 xl:flex xl:w-1/4 h-full">
        <ChatHeader onToggle={toggleSidebar} />

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:focus:border-brand-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {error && (
            <div className="px-4 py-2 mb-2">
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-1 rounded text-xs">{error}</div>
            </div>
          )}
        </div>

        <div className="flex px-4 mb-3 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === "chats"
              ? "text-brand-500 border-b-2 border-brand-500"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            onClick={() => setActiveTab("chats")}
          >
            Chats Recientes
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === "users"
              ? "text-brand-500 border-b-2 border-brand-500"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            onClick={() => setActiveTab("users")}
          >
            Todos los Usuarios
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === "chats" ? (
            <ChatList isOpen={isOpen} onToggle={toggleSidebar} />
          ) : (
            <div
              ref={usersContainerRef}
              className="h-full overflow-y-auto px-4 custom-scrollbar"
              style={{ maxHeight: "calc(100vh - 220px)" }}
            >
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
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
                <div className="flex justify-center py-4 text-gray-500">
                  {searchTerm ? "No se encontraron usuarios" : "No hay usuarios disponibles"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
