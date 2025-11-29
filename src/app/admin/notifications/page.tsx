import { Suspense } from "react"
import NotificationsPage from "@/components/notifications/notifications-page"
export const metadata = {
    title: "Notificaciones | Sistema de Notificaciones",
    description: "Visualiza y gestiona todas tus notificaciones",
}

export default function NotificationsRoute() {
    return (
        <NotificationsPage />
    )
}
