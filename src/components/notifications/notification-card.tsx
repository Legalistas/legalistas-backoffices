"use client"

import { useState, useEffect } from "react"
import { useNotifications } from "@/components/notification-provider"
import { Card, CardContent } from "@/components/ui/card/Card"
import Button from "@/components/ui/button/Button"

import { formatDistanceToNow, formatLocalDateTime } from "@/utils/format"
import { CheckCircle, Info, AlertTriangle, MoreVertical, Trash, CheckCheck, Eye, Settings, Users, Briefcase, FileText, Folder, Calendar, SquareKanban, Scale } from "lucide-react"
import type { Notification } from "@/components/notification-provider"

interface NotificationCardProps {
    notification: Notification
}

export default function NotificationCard({ notification }: NotificationCardProps) {
    const { markNotificationAsRead } = useNotifications()
    const [isExpanded, setIsExpanded] = useState(false)
    const [relativeDate, setRelativeDate] = useState<string>("")
    const [localDate, setLocalDate] = useState<string>("")

    useEffect(() => {
        // Formatear las fechas cuando el componente se monta o la notificación cambia
        try {
            // Usar las funciones de utilidad que preservan la hora original
            setRelativeDate(formatDistanceToNow(notification.createdAt))
            setLocalDate(formatLocalDateTime(notification.createdAt))

            // Logs para depuración
            console.log("Notification date:", notification.createdAt)
            console.log("Formatted as:", relativeDate, "and", localDate)
        } catch (error) {
            console.error("Error formatting dates:", error)
            setRelativeDate("fecha desconocida")
            setLocalDate("fecha desconocida")
        }
    }, [localDate, notification.createdAt, relativeDate])

    const handleMarkAsRead = () => {
        markNotificationAsRead(notification.id)
    }

    const getIcon = () => {
        switch (notification.type) {
            case "system":
                return <Settings className="h-5 w-5 text-blue-500" />
            case "crm":
                return <SquareKanban className="h-5 w-5 text-purple-500" />
            case "cases":
                return <Scale className="h-5 w-5 text-amber-500" />
            case "causes_files":
                return <FileText className="h-5 w-5 text-green-500" />
            case "events":
                return <Calendar className="h-5 w-5 text-indigo-500" />
            case "success":
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case "warning":
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />
            case "error":
                return <AlertTriangle className="h-5 w-5 text-red-500" />
            case "normal":
            case "info":
            default:
                return <Info className="h-5 w-5 text-blue-500" />
        }
    }

    const getTypeLabel = () => {
        switch (notification.type) {
            case "system":
                return "Sistema"
            case "crm":
                return "CRM"
            case "cases":
                return "Casos"
            case "causes_files":
                return "Archivos"
            case "events":
                return "Eventos"
            case "success":
                return "Éxito"
            case "warning":
                return "Advertencia"
            case "error":
                return "Error"
            case "normal":
                return "Normal"
            case "info":
                return "Info"
            default:
                return notification.type
        }
    }

    const getTypeColor = () => {
        switch (notification.type) {
            case "system":
                return "bg-blue-100 text-blue-800"
            case "crm":
                return "bg-purple-100 text-purple-800"
            case "cases":
                return "bg-amber-100 text-amber-800"
            case "causes_files":
                return "bg-green-100 text-green-800"
            case "events":
                return "bg-indigo-100 text-indigo-800"
            case "success":
                return "bg-green-100 text-green-800"
            case "warning":
                return "bg-yellow-100 text-yellow-800"
            case "error":
                return "bg-red-100 text-red-800"
            case "normal":
            case "info":
            default:
                return "bg-blue-100 text-blue-800"
        }
    }

    return (
        <Card className={`overflow-hidden transition-all ${notification.read ? "bg-background" : "bg-muted/30"}`}>
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <div className="mt-1">{getIcon()}</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor()} font-medium`}>
                                    {getTypeLabel()}
                                </span>
                                {!notification.read && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" title="No leída"></span>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground" title={localDate}>
                                {relativeDate}
                            </span>
                        </div>
                        <p className={`text-sm ${notification.read ? "" : "font-medium"} ${isExpanded ? "" : "line-clamp-2"} mb-2`}>
                            {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                            <Button variant="primary" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                                <Eye className="h-4 w-4 mr-1" />
                                {isExpanded ? "Ver menos" : "Ver más"}
                            </Button>
                            <div className="flex items-center gap-2">
                                {!notification.read && (
                                    <Button variant="primary" size="sm" onClick={handleMarkAsRead}>
                                        <CheckCheck className="h-4 w-4 mr-1" />
                                        Marcar como leída
                                    </Button>
                                )}
                                {/* <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {!notification.read && (
                                            <DropdownMenuItem onClick={handleMarkAsRead}>
                                                <CheckCheck className="h-4 w-4 mr-2" />
                                                Marcar como leída
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem className="text-red-600">
                                            <Trash className="h-4 w-4 mr-2" />
                                            Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu> */}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
