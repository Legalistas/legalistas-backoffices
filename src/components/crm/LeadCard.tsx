"use client";

import { EllipsisVertical, Phone, Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/shared/Dropdown";
import { DropdownItem } from "@/components/shared/DropdownItem";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { useConfirm } from "@/hooks/useConfirm";
import { SOURCE_CHANNEL } from "@/constant/crm";
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

	const getSourceChannelLabel = (sourceChannelId: number | undefined) => {
		if (!sourceChannelId) return "Desconocido";

		const channel = SOURCE_CHANNEL.find((ch) => ch.id === sourceChannelId);
		return channel ? channel.name : `Canal ${sourceChannelId}`;
	};

	/**
	 * Ubicación de la oportunidad.
	 *
	 * Prioridad: provincia/ciudad DEL LEAD (KPIs v1.1, punto 7) → dirección
	 * del cliente. El dato del lead siempre gana: la dirección del cliente
	 * es su domicilio particular y el caso puede ser de otra localidad.
	 */
	const getUserLocation = () => {
		const defaultAddress =
			lead.user?.userAddresses?.find((addr) => addr.isDefault) ||
			lead.user?.userAddresses?.[0];

		const province = lead.state?.name || defaultAddress?.state?.name;
		const city =
			lead.city?.name ||
			defaultAddress?.locality?.name ||
			defaultAddress?.city?.trim();

		if (!province && !city) return "—";
		if (!city) return province;
		if (!province) return city;
		return `${province} - ${city}`;
	};

	const phone = lead.phone || lead.user?.userProfile?.phone || "";

	const handleDeleteClick = async () => {
		if (
			await confirm({
				description: "¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.",
				confirmLabel: "Eliminar",
			})
		) {
			onDelete();
		}
	};

	const avatarUsers = [lead.seller, lead.internalLawyer, lead.responsibleLawyer]
		.filter(Boolean)
		.map((u) => ({ name: u?.name || "", image: u?.image || "" }));

	return (
		<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors hover:border-sidebar-primary hover:shadow-md">
			<div className="p-4">
				{/* Nombre + menú */}
				<div className="flex items-start justify-between">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
						<Link href={`/admin/crm/leads/${lead.id}`}>
							{lead.user?.name || "Sin nombre"}
						</Link>
					</h3>
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
							<DropdownItem onClick={handleDeleteClick} className="text-red-600">
								Eliminar
							</DropdownItem>
						</Dropdown>
					</div>
				</div>

				{/* Teléfono */}
				{phone && (
					<p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 mt-1.5">
						<Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
						{phone}
					</p>
				)}

				{/* Servicio */}
				{lead.services && (
					<p className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200 mt-1.5">
						<Tag className="h-3.5 w-3.5 shrink-0 text-gray-400" />
						{lead.services.label}
					</p>
				)}

				{/* Ubicación */}
				<p className="pl-5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
					{getUserLocation()}
				</p>

				{/* Lead # / fecha */}
				<div className="flex items-center justify-between mt-3 text-xs">
					<span className="text-gray-500 dark:text-gray-400">Lead #{lead.id}</span>
					<span className="font-semibold text-gray-900 dark:text-white">
						{formatDateCustom(lead.createdAt)}
					</span>
				</div>
			</div>

			{/* Avatares + eliminar / canal */}
			<div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-1.5">
					{avatarUsers.length > 0 && (
						<GroupAvatar users={avatarUsers} max={3} size="sm" />
					)}
					<button
						type="button"
						onClick={handleDeleteClick}
						title="Eliminar"
						className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>
				<Badge
					variant="outline"
					className="text-[10px] font-semibold uppercase tracking-wide"
				>
					{getSourceChannelLabel(lead.sourceChannelId)}
				</Badge>
			</div>
			{ConfirmationDialog}
		</div>
	);
}
