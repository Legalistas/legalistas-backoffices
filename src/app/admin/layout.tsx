"use client"

import type React from "react"
import { useEffect } from "react"
import { useSidebar } from "@/context/SidebarContext"
import AppHeader from "@/layout/AppHeader"
import AppSidebar from "@/layout/AppSidebar"
import Backdrop from "@/components/Backdrop"
import { useSession } from "next-auth/react"
import { Toaster } from "sonner"
import { useRouter } from "next/navigation"
import FloatingChatBubble from "@/components/FloatingChatBubble"
import { ChatProvider } from "@/context/ChatContext"
import { NotificationProvider } from "@/components/notification-provider"
import { useSessionTracker } from "@/hooks/useSessionTracker"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()
  const router = useRouter()

  useSessionTracker()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin")
    }
  }, [status, router])

  // Show loading state while checking authentication
  // if (status === "loading") {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <p className="text-lg font-semibold">Cargando...</p>
  //     </div>
  //   )
  // }

  // Prevent layout rendering without session
  // This is just a fallback, the middleware should handle this
  if (!session) return null

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen ? "ml-0" : isExpanded || isHovered ? "lg:ml-[225px]" : "lg:ml-[90px]"

  const userId = Number(session.user.id)

  if (!userId) return null

  return (
    <ChatProvider userId={userId}>
      <NotificationProvider>
        <div className="h-screen w-full overflow-hidden bg-[#f1f1f1]">
          <AppSidebar />
          <Backdrop />
          <div className={`flex flex-col h-screen transition-all duration-300 ease-in-out ${mainContentMargin}`}>
            <div className="sticky top-0 z-10 bg-background border-b border-border">
              <AppHeader />
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-4 mx-auto max-w-[--breakpoint-2xl] md:p-6">{children}</div>
            </div>
          </div>
          <FloatingChatBubble />
          <Toaster />
        </div>
      </NotificationProvider>
    </ChatProvider>
  )
}
