"use client";

import {
	AlertTriangle,
	Bell,
	CheckCircle,
	Inbox,
	RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Notification } from "@/components/notification-provider";
import { useNotifications } from "@/components/notification-provider";
import NotificationCard from "@/components/notifications/notification-card";
import NotificationFilters from "@/components/notifications/notification-filters";
import NotificationStats from "@/components/notifications/notification-stats";
import { Button } from "@/components/ui/button";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";

// Tipos para los filtros
type FilterType = "all" | "unread" | "read";
type SortType = "newest" | "oldest";
type NotificationType =
	| "all"
	| "crm"
	| "cases"
	| "cause_files"
	| "events"
	| "system"
	| "info"
	| "success"
	| "warning"
	| "error";

export default function NotificationsPage() {
	const {
		notifications,
		loading,
		error,
		refreshNotifications,
		markNotificationAsRead,
		currentUserId,
	} = useNotifications();

	// Estados para filtros y ordenamiento
	const [filterType, setFilterType] = useState<FilterType>("all");
	const [sortType, setSortType] = useState<SortType>("newest");
	const [notificationType, setNotificationType] =
		useState<NotificationType>("all");
	const [searchQuery, setSearchQuery] = useState("");

	// Estados para paginación
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Aplicar filtros y ordenamiento
	const filteredNotifications = notifications
		.filter((notification) => {
			// Filtro por estado de lectura
			if (filterType === "unread") return !notification.read;
			if (filterType === "read") return notification.read;
			return true;
		})
		.filter((notification) => {
			// Filtro por tipo de notificación
			if (notificationType === "all") return true;
			return notification.type === notificationType;
		})
		.filter((notification) => {
			// Filtro por búsqueda
			if (!searchQuery) return true;
			return notification.message
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
		})
		.sort((a, b) => {
			// Ordenamiento
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return sortType === "newest" ? dateB - dateA : dateA - dateB;
		});

	// Calcular paginación
	const totalItems = filteredNotifications.length;
	const totalPages = Math.ceil(totalItems / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentItems = filteredNotifications.slice(startIndex, endIndex);

	// Manejar cambio de página
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// Manejar actualización
	const handleRefresh = () => {
		if (!currentUserId) return;
		refreshNotifications();
	};

	// Manejar marcar todas como leídas
	const handleMarkAllAsRead = () => {
		const unreadNotifications = filteredNotifications.filter(
			(notification) => !notification.read,
		);
		unreadNotifications.forEach((notification) => {
			markNotificationAsRead(notification.id);
		});
	};

	// Resetear a la primera página cuando cambian los filtros
	useEffect(() => {
		setCurrentPage(1);
	}, [filterType, notificationType, searchQuery, sortType]);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
				<h2 className="text-2xl font-medium text-red-500 mb-2">
					Error al cargar notificaciones
				</h2>
				<p className="text-muted-foreground mb-6">{error}</p>
				<Button onClick={handleRefresh} disabled={!currentUserId}>
					<RefreshCw className="h-4 w-4 mr-2" />
					Intentar de nuevo
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold">
					<Bell className="h-6 w-6 inline-block mr-2" />
					Notificaciones
				</h2>
				<div className="flex items-center gap-2">
					<Button
						onClick={handleRefresh}
						disabled={loading || !currentUserId}
						variant="outline"
					>
						<RefreshCw
							className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
						/>
						Actualizar
					</Button>
					<Button
						onClick={handleMarkAllAsRead}
						variant="outline"
						disabled={loading}
					>
						<CheckCircle className="h-4 w-4 mr-2" />
						Marcar todas como leídas
					</Button>
				</div>
			</div>

			{/* New search and filter bar */}
			<div className="flex flex-col gap-6 mb-6">
				<NotificationStats notifications={notifications} />
				<NotificationFilters
					filterType={filterType}
					setFilterType={(value: string) => setFilterType(value as FilterType)}
					sortType={sortType}
					setSortType={(value: string) => setSortType(value as SortType)}
					notificationType={notificationType}
					setNotificationType={(value: string) =>
						setNotificationType(value as NotificationType)
					}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
				/>
			</div>

			<Tabs
				defaultValue="all"
				value={filterType}
				onValueChange={(value) => setFilterType(value as FilterType)}
				className="w-full bg-white dark:bg-gray-800"
			>
				<TabsList className="w-full">
					<TabsTrigger value="all">
						<Inbox className="h-4 w-4 mr-2" />
						Todas
					</TabsTrigger>
					<TabsTrigger value="unread">
						<AlertTriangle className="h-4 w-4 mr-2" />
						No leídas
					</TabsTrigger>
					<TabsTrigger value="read">
						<CheckCircle className="h-4 w-4 mr-2" />
						Leídas
					</TabsTrigger>
				</TabsList>

				<TabsContent value="all">
					{renderNotificationList(currentItems, loading, handleMarkAllAsRead)}
				</TabsContent>

				<TabsContent value="unread">
					{renderNotificationList(currentItems, loading, handleMarkAllAsRead)}
				</TabsContent>

				<TabsContent value="read">
					{renderNotificationList(currentItems, loading, handleMarkAllAsRead)}
				</TabsContent>
			</Tabs>

			{totalPages > 1 && (
				// <Pagination
				//     currentPage={currentPage}
				//     totalPages={totalPages}
				//     onPageChange={handlePageChange}
				//     className="mt-8"
				// />
				<></>
			)}
		</div>
	);
}

// Función auxiliar para renderizar la lista de notificaciones
function renderNotificationList(
	notifications: Notification[],
	loading: boolean,
	handleMarkAllAsRead: () => void,
) {
	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
				<p className="text-muted-foreground">Cargando notificaciones...</p>
			</div>
		);
	}

	if (notifications.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<Inbox className="h-16 w-16 text-muted-foreground mb-4" />
				<h3 className="text-xl font-medium mb-2">No hay notificaciones</h3>
				<p className="text-muted-foreground">
					No se encontraron notificaciones con los filtros seleccionados.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{notifications.map((notification) => (
				<NotificationCard key={notification.id} notification={notification} />
			))}
		</div>
	);
}
