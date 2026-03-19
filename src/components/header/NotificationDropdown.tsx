"use client";
import {
	AlertTriangle,
	Bell,
	Calendar,
	CheckCircle,
	FileText,
	Info,
	RefreshCcw,
	Scale,
	Settings,
	SquareKanban,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { formatDistanceToNow } from "@/utils/format";
import { useNotifications } from "../notification-provider";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/shared/Dropdown";
import { DropdownItem } from "@/components/shared/DropdownItem";

export interface Notification {
	id: number;
	message: string;
	type: string;
	read: boolean;
	userId: number;
	createdAt: string;
	updatedAt: string;
}

export default function NotificationDropdown() {
	const { unreadCount, refreshNotifications, notifications, loading } =
		useNotifications();
	const [isOpen, setIsOpen] = useState(false);
	const [notifying, setNotifying] = useState(true);

	function toggleDropdown() {
		setIsOpen(!isOpen);
	}

	function closeDropdown() {
		setIsOpen(false);
	}

	const handleClick = () => {
		toggleDropdown();
		setNotifying(false);
	};

	const getIcon = (type: string) => {
		switch (type) {
			case "system":
				return <Settings className="h-5 w-5 text-blue-500" />;
			case "crm":
				return <SquareKanban className="h-5 w-5 text-purple-500" />;
			case "cases":
				return <Scale className="h-5 w-5 text-amber-500" />;
			case "causes_files":
				return <FileText className="h-5 w-5 text-green-500" />;
			case "events":
				return <Calendar className="h-5 w-5 text-indigo-500" />;
			case "success":
				return <CheckCircle className="h-5 w-5 text-green-500" />;
			case "warning":
				return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
			case "error":
				return <AlertTriangle className="h-5 w-5 text-red-500" />;
			case "normal":
			case "info":
			default:
				return <Info className="h-5 w-5 text-blue-500" />;
		}
	};

	return (
		<div className="relative">
			<button
				className="relative dropdown-toggle flex items-center justify-center size-10 rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				onClick={handleClick}
			>
				{unreadCount > 0 && (
					<span
						className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex`}
					>
						<span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
					</span>
				)}
				<Bell className="w-5 h-5" />
			</button>
			<Dropdown
				isOpen={isOpen}
				onClose={closeDropdown}
				className="absolute -right-[240px] mt-[17px] flex h-auto w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
			>
				<div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
					<h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
						Notificación{" "}
						{unreadCount > 0 && (
							<span className="text-sm font-normal text-gray-500 dark:text-gray-400">
								({unreadCount} nuevos)
							</span>
						)}
					</h5>
					<div className="flex gap-2">
						<button
							className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
							onClick={() => {
								refreshNotifications();
							}}
						>
							<RefreshCcw className="w-5 h-5" />
						</button>
						<button
							onClick={toggleDropdown}
							className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>
				<ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
					{/* Example notification items */}
					{loading ? (
						<div className="flex justify-center py-8">
							Cargando notificaciones...
						</div>
					) : notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center w-full">
							<Bell className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-medium">No hay notificaciones</h3>
							<p className="text-sm text-muted-foreground">
								Las notificaciones aparecerán aquí cuando las recibas.
							</p>
						</div>
					) : (
						notifications.map((notification: Notification) => (
							<li key={String(notification.id)}>
								<DropdownItem
									onItemClick={closeDropdown}
									className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
								>
									<span className="relative block w-full h-10 rounded-full z-1 max-w-10">
										<span className="absolute inset-0 flex items-center justify-center">
											{getIcon(notification.type)}
										</span>
									</span>

									<span className="block">
										<span className="mb-1.5 space-x-1 block text-theme-sm text-gray-500 dark:text-gray-400">
											<p
												className={`text-sm ${notification.read ? "" : "font-medium"}`}
											>
												{notification.message}
											</p>
										</span>

										<span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
											<span>Sistema</span>
											<span className="w-1 h-1 bg-gray-400 rounded-full"></span>
											<span>
												{formatDistanceToNow(
													new Date(notification.createdAt).getTime(),
												)}
											</span>
										</span>
									</span>
								</DropdownItem>
							</li>
						))
					)}
					{/* Add more items as needed */}
				</ul>
				{notifications.length === 0 ? (
					<Button
						variant="default"
						className="mt-3 w-full"
						onClick={() => {
							refreshNotifications();
						}}
					>
						Actualizar
					</Button>
				) : (
					<Link
						href="/admin/notifications"
						className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
					>
						Ver todas las notificaciones
					</Link>
				)}
			</Dropdown>
		</div>
	);
}
