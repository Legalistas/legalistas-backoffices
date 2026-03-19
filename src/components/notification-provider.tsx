"use client";

import { useSession } from "next-auth/react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	NOTIFICATIONS_ENDPOINT,
	NOTIFICATIONS_READ_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";

export interface Notification {
	id: number;
	message: string;
	type: string;
	read: boolean;
	userId: number;
	createdAt: string;
	updatedAt: string;
}

export interface User {
	id: string | number; // Cambiado para aceptar tanto número como string
	name: string;
	email: string;
}

type NotificationContextType = {
	notifications: Notification[];
	users: User[];
	unreadCount: number;
	loading: boolean;
	error: string | null;
	currentUserId: string | number | null; // Cambiado para aceptar tanto número como string
	setCurrentUserId: (id: string | number | null) => void;
	refreshNotifications: () => Promise<void>;
	markNotificationAsRead: (id: string | number) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
	undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
	const { data: session } = useSession();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [unreadCount, setUnreadCount] = useState(0);
	const [currentUserId, setCurrentUserId] = useState<string | number | null>(
		null,
	);
	const [isInitialized, setIsInitialized] = useState(false);

	// Usar useRef para mantener una referencia persistente al currentUserId
	const currentUserIdRef = useRef<string | number | null>(null);

	// Actualizar la referencia cuando cambie el estado
	useEffect(() => {
		currentUserIdRef.current = currentUserId;
	}, [currentUserId]);

	// Función modificada para establecer el currentUserId
	const handleSetCurrentUserId = (id: string | number | null) => {
		setCurrentUserId(id);
		currentUserIdRef.current = id;
	};

	const fetchUsers = useCallback(async () => {
		if (!session?.user?.accessToken) {
			console.log("No session token available, skipping fetchUsers");
			return;
		}

		try {
			const response = await fetch(`${USERS_ENDPOINT}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Error fetching users: ${response.status}`);
			}

			const fetchedUsers = await response.json();
			setUsers(fetchedUsers);

			if (fetchedUsers.length > 0 && !currentUserIdRef.current) {
				// Importante: Asegurarse de que el ID del usuario coincida con el tipo esperado por la API
				const firstUserId = fetchedUsers[0].id;
				handleSetCurrentUserId(firstUserId);
			}

			setIsInitialized(true);
		} catch (error) {
			console.error("Error fetching users:", error);
			setError("Error al cargar usuarios");
			setLoading(false);
		}
	}, [session?.user?.accessToken]);

	const refreshNotifications = useCallback(async () => {
		// Usar la referencia para asegurar que tenemos el valor más actualizado
		const userId = currentUserIdRef.current || currentUserId;

		if (!userId) {
			console.log(
				"No currentUserId, skipping refresh. CurrentUserId:",
				currentUserId,
				"Ref:",
				currentUserIdRef.current,
			);
			return;
		}

		if (!session?.user?.accessToken) {
			console.log("No session token available, skipping refreshNotifications");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Construir la URL correctamente - asegurarse de que el ID sea del tipo correcto
			const endpoint = NOTIFICATIONS_ENDPOINT(Number(userId));

			const response = await fetch(endpoint, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Error fetching notifications: ${response.status}`);
			}

			const rawData = await response.json();
			// Manejar diferentes estructuras de respuesta
			let notificationsArray = rawData;

			// Si data es un objeto con una propiedad que contiene el array
			if (
				rawData &&
				typeof rawData === "object" &&
				!Array.isArray(rawData) &&
				rawData.data
			) {
				notificationsArray = rawData.data;
			}

			// Verificar si es un array
			if (!Array.isArray(notificationsArray)) {
				setNotifications([]);
				setUnreadCount(0);
			} else {
				// Asegurarse de que cada notificación tenga el formato correcto
				const formattedNotifications = notificationsArray.map(
					(notification: any) => ({
						id: notification.id,
						message: notification.message || "",
						type: notification.type || "info",
						read: Boolean(notification.read),
						userId: notification.userId,
						createdAt: notification.createdAt || new Date().toISOString(),
						updatedAt: notification.updatedAt || new Date().toISOString(),
					}),
				);

				setNotifications(formattedNotifications);
				setUnreadCount(
					formattedNotifications.filter((n: Notification) => !n.read).length,
				);
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
			setError("Error al cargar notificaciones");
			setNotifications([]); // Limpiar notificaciones en caso de error
		} finally {
			setLoading(false);
		}
	}, [currentUserId, session?.user?.accessToken]);

	const markNotificationAsRead = async (id: string | number) => {
		if (!session?.user?.accessToken) return;

		try {
			const endpoint = NOTIFICATIONS_READ_ENDPOINT(Number(id));
			const response = await fetch(endpoint, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(
					`Error marking notification as read: ${response.status}`,
				);
			}

			setNotifications((prev) =>
				prev.map((notification) =>
					notification.id.toString() === id.toString()
						? { ...notification, read: true }
						: notification,
				),
			);
			setUnreadCount((prev) => Math.max(0, prev - 1));
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	// Efecto para cargar usuarios cuando la sesión esté disponible
	useEffect(() => {
		if (session?.user?.accessToken) {
			fetchUsers();
		}
	}, [session, fetchUsers]);

	// Efecto para cargar notificaciones cuando cambie el usuario actual o la sesión
	useEffect(() => {
		if (currentUserId && session?.user?.accessToken && isInitialized) {
			refreshNotifications();
		}
	}, [currentUserId, session, isInitialized, refreshNotifications]);

	// Forzar una actualización inicial después de un breve retraso
	useEffect(() => {
		if (isInitialized && currentUserIdRef.current) {
			const timer = setTimeout(() => {
				refreshNotifications();
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [isInitialized, refreshNotifications]);

	// Añadir un efecto para forzar una actualización periódica
	useEffect(() => {
		if (!isInitialized) return;

		const intervalId = setInterval(() => {
			console.log("Auto-refresh interval triggered");
			if (currentUserIdRef.current && session?.user?.accessToken) {
				refreshNotifications();
			}
		}, 30000); // Actualizar cada 30 segundos

		return () => clearInterval(intervalId);
	}, [session, isInitialized, refreshNotifications]);

	// Obtener el ID del usuario de la sesión
	useEffect(() => {
		if (session?.user?.id && !currentUserIdRef.current) {
			handleSetCurrentUserId(session.user.id);
		}
	}, [session]);

	// Reemplazar el efecto que usa session?.user?.id con uno más flexible
	// Eliminar este efecto:
	// useEffect(() => {
	//   if (!currentUserIdRef.current && users.length === 0) {
	//     console.log("No users loaded yet, setting default userId to 1")
	//     handleSetCurrentUserId(1)
	//   }
	// }, [users])

	// Y reemplazarlo con este nuevo efecto que intenta obtener el ID del usuario de la sesión:
	useEffect(() => {
		// Solo ejecutar si no hay un ID de usuario establecido
		if (!currentUserIdRef.current && session?.user) {
			// Intentar obtener el ID del usuario de diferentes ubicaciones posibles en el objeto de sesión
			const userId = session?.user?.id;

			if (userId) {
				handleSetCurrentUserId(userId);
			} else {
				// Si no podemos encontrar el ID en la sesión, registramos el objeto de sesión para depuración
				console.log("Could not find user ID in session object:", session);
			}
		}
	}, [session]);

	return (
		<NotificationContext.Provider
			value={{
				notifications,
				users,
				unreadCount,
				loading,
				error,
				currentUserId,
				setCurrentUserId: handleSetCurrentUserId,
				refreshNotifications,
				markNotificationAsRead,
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
}

export function useNotifications() {
	const context = useContext(NotificationContext);
	if (context === undefined) {
		throw new Error(
			"useNotifications must be used within a NotificationProvider",
		);
	}
	return context;
}
