"use client";

import { EllipsisVertical } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/shared/Dropdown";
import { DropdownItem } from "@/components/shared/DropdownItem";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { useConfirm } from "@/hooks/useConfirm";
import { CRM_COLUMNS, SOURCE_CHANNEL, WHATSAPP_MESSAGES } from "@/constant/crm";
import { formatDateCustom } from "@/lib/functions";
import type { Lead } from "@/types/crm";

interface LeadCardProps {
	lead: Lead;
	onEdit: () => void;
	onDelete: () => void;
}

export default function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
	const { confirm, ConfirmationDialog } = useConfirm();
	const [dropdownOpen, setDropdownOpen] = useState(false);

	// Add defensive checks for lead properties
	if (!lead) {
		console.error("Lead is undefined or null");
		return null;
	}

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return new Intl.DateTimeFormat("es", {
				day: "numeric",
				month: "short",
			}).format(date);
		} catch (e) {
			console.error("Error formatting date:", e);
			return "Invalid date";
		}
	};

	const getSellerName = (sellerId: number | undefined) => {
		if (!sellerId) return "Sin vendedor";

		// Map seller IDs to names
		const sellerMap: Record<number, string> = {
			4: "Juan Pérez",
			5: "María García",
			6: "Carlos Rodríguez",
		};

		return sellerMap[sellerId] || `Vendedor ${sellerId}`;
	};

	const getSourceChannelLabel = (sourceChannelId: number | undefined) => {
		if (!sourceChannelId) return "Desconocido";

		const channel = SOURCE_CHANNEL.find((ch) => ch.id === sourceChannelId);
		return channel ? channel.name : `Canal ${sourceChannelId}`;
	};

	// Get user location from userAddresses
	const getUserLocation = () => {
		if (!lead.user?.userAddresses || lead.user.userAddresses.length === 0) {
			return "-";
		}

		// Buscar dirección por defecto o la primera
		const defaultAddress =
			lead.user.userAddresses.find((addr) => addr.isDefault) ||
			lead.user.userAddresses[0];

		if (!defaultAddress) return "-";

		const province = defaultAddress.state?.name || "Estado desconocido";
		const city = defaultAddress.city?.trim();

		return `${province}${city ? ` - ${city}` : " - -"}`;
	};

	// Obtener mensaje de WhatsApp según la etapa
	const getWhatsappMessage = () => {
		const columnId = String(lead.columnId || "1");
		const message = WHATSAPP_MESSAGES[columnId] || WHATSAPP_MESSAGES["1"];
		const nombre = lead.user?.name || lead.name || "cliente";
		return message.replace("{nombre}", nombre);
	};

	// Obtener el teléfono del lead
	const getLeadPhone = () => {
		return lead.phone || lead.user?.userProfile?.phone || "";
	};

	// Abrir WhatsApp con el mensaje
	const handleWhatsappClick = () => {
		const phone = getLeadPhone();
		if (!phone) {
			toast.error("Este lead no tiene número de teléfono registrado");
			return;
		}
		// Limpiar el teléfono (quitar espacios, guiones, etc.)
		const cleanPhone = phone.replace(/[\s\-()]/g, "");
		const message = encodeURIComponent(getWhatsappMessage());
		window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
	};

	// Obtener el nombre de la etapa actual
	const getCurrentStageName = () => {
		const column = CRM_COLUMNS.find((col) => col.id === String(lead.columnId));
		return column?.title || "Estado del caso";
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
			<div className="p-4 flex justify-between items-start">
				<div>
					<h3 className="font-medium text-gray-900 dark:text-white">
						<Link href={`/admin/crm/leads/${lead.id}`}>
							{lead.user?.name || "Sin nombre"}
						</Link>
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400  mb-2">
						{getUserLocation()}
					</p>

					<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
						{/* Badge de servicio */}
						{lead.services && (
							<Badge
								variant="secondary"
								className="text-xs flex items-center gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
							>
								{lead.services.label}
							</Badge>
						)}
					</div>

					{/* Avatares */}
					{(() => {
						const users = [
							lead.seller,
							lead.internalLawyer,
							lead.responsibleLawyer,
						].filter(Boolean).map((u) => ({
							name: u?.name || "",
							image: u?.image || "",
						}));
						return users.length > 0 ? (
							<GroupAvatar users={users} max={3} size="sm" className="mt-2" />
						) : null;
					})()}
				</div>
				<div className="relative">
					<Button
						variant="default"
						className="h-7 w-7 text-gray-600 hover:bg-gray-300 dark:hover:bg-gray-400 rounded-full p-1"
						onClick={() => setDropdownOpen(!dropdownOpen)}
					>
						<EllipsisVertical className="h-4 w-4" />
						<span className="sr-only">Open menu</span>
					</Button>
					<Dropdown
						isOpen={dropdownOpen}
						onClose={() => setDropdownOpen(false)}
						className="w-40"
					>
						<DropdownItem tag="a" href={`/admin/crm/leads/${lead.id}`}>
							Ver detalles
						</DropdownItem>
						<DropdownItem onClick={onEdit}>Editar</DropdownItem>
						<DropdownItem
							onClick={async () => {
								if (
									await confirm({
										description: "¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.",
										confirmLabel: "Eliminar",
									})
								) {
									onDelete();
								}
							}}
							className="text-red-600"
						>
							Eliminar
						</DropdownItem>
					</Dropdown>
				</div>
			</div>

			{/* <div className="px-4 pb-2">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
        </div>
        <div className="mb-2">
        </div>
      </div> */}

			<div className="flex justify-between items-center px-4 py-2 border-t border-gray-200 dark:border-gray-700">
				<div className="text-xs text-gray-500 dark:text-gray-400">
					{formatDateCustom(lead.createdAt)}
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={handleWhatsappClick}
						className="h-7 px-2 text-xs border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30"
						title={getCurrentStageName()}
					>
						<svg className="h-4 w-4 fill-green-600 mr-1" viewBox="0 0 24 24">
							<path d="M12.04 2C6.58 2 2.16 6.42 2.16 11.88c0 1.92.5 3.72 1.46 5.32L2 22l4.95-1.6c1.55.85 3.32 1.3 5.09 1.3h.01c5.46 0 9.88-4.42 9.88-9.88S17.5 2 12.04 2zm0 17.9c-1.63 0-3.23-.44-4.63-1.26l-.33-.19-2.94.95.96-2.86-.21-.34a7.8 7.8 0 01-1.2-4.12c0-4.32 3.52-7.84 7.85-7.84 2.09 0 4.05.81 5.53 2.29a7.78 7.78 0 012.3 5.55c0 4.33-3.52 7.82-7.83 7.82zm4.3-5.87c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.18-1.4-1.32-1.64-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28z" />
						</svg>
						<span className="hidden sm:inline">Enviar</span>
					</Button>
					<Badge
						variant="secondary"
						className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
					>
						{getSourceChannelLabel(lead.sourceChannelId)}
					</Badge>
				</div>
			</div>
			{ConfirmationDialog}
		</div>
	);
}
