"use client";

import { Eye, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pagination } from "@/components/shared/Pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/hooks/useConfirm";
import { CRM_COLUMNS, SOURCE_CHANNEL } from "@/constant/crm";
import type { Lead } from "@/types/crm";

const FINAL_COLUMN_IDS = [9, 10, 11];

interface KanbanListProps {
	leads: Lead[];
	onEditLead: (lead: Lead) => void;
	onDeleteLead: (leadId: string) => void;
	hideFinalColumns?: boolean;
	onHideFinalColumnsChange?: (value: boolean) => void;
}

export default function KanbanList({
	leads,
	onEditLead,
	onDeleteLead,
	hideFinalColumns = true,
	onHideFinalColumnsChange,
}: KanbanListProps) {
	const { confirm, ConfirmationDialog } = useConfirm();
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const visibleLeads = useMemo(() => {
		if (!hideFinalColumns) return leads;
		return leads.filter(
			(lead) => !FINAL_COLUMN_IDS.includes(Number(lead.columnId)),
		);
	}, [leads, hideFinalColumns]);

	const getSourceChannelLabel = (sourceChannelId: number | undefined) => {
		if (!sourceChannelId) return "Desconocido";
		const channel = SOURCE_CHANNEL.find((ch) => ch.id === sourceChannelId);
		return channel ? channel.name : `Canal ${sourceChannelId}`;
	};

	const getColumnLabel = (columnId: number | undefined) => {
		if (!columnId) return "Desconocido";
		const column = CRM_COLUMNS.find(
			(col) => String(col.id) === String(columnId),
		);
		return column ? column.title : `Columna ${columnId}`;
	};

	// Pagination logic
	const totalPages = Math.ceil(visibleLeads.length / itemsPerPage);
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = indexOfLastItem - itemsPerPage;
	const currentLeads = visibleLeads.slice(indexOfFirstItem, indexOfLastItem);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};


	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{visibleLeads.length} leads
					{hideFinalColumns && visibleLeads.length !== leads.length && (
						<span> (ocultando {leads.length - visibleLeads.length} finalizados)</span>
					)}
				</p>
				{onHideFinalColumnsChange && (
					<div className="flex items-center gap-2">
						<Switch
							id="show-final-list"
							checked={!hideFinalColumns}
							onCheckedChange={(checked) => onHideFinalColumnsChange(!checked)}
						/>
						<Label htmlFor="show-final-list" className="text-sm cursor-pointer">
							Mostrar Ganados, Perdidos y Archivados
						</Label>
					</div>
				)}
			</div>
			<div className="overflow-hidden rounded-xl border bg-white dark:bg-background">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="w-[50px]">ID</TableHead>
							<TableHead>Cliente</TableHead>
							<TableHead>Provincia</TableHead>
							<TableHead>Ciudad</TableHead>
							<TableHead>Servicios</TableHead>
							<TableHead>Canal</TableHead>
							<TableHead>Etapa</TableHead>
							<TableHead>Vendedora</TableHead>
							<TableHead>Abog. Interno</TableHead>
							<TableHead>Abog. Responsable</TableHead>
							<TableHead className="w-[100px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{currentLeads.length === 0 ? (
							<TableRow>
								<TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
									No se encontraron leads
								</TableCell>
							</TableRow>
						) : (
							currentLeads.map((lead) => (
								<TableRow key={lead.id}>
									<TableCell className="font-medium">{lead.id}</TableCell>
									<TableCell>{lead.user?.name}</TableCell>
									{/* Provincia/ciudad del lead primero; la dirección del
									    cliente es solo el fallback (ver BUG-01). */}
									<TableCell>
										{lead.state?.name ??
											lead.user?.userAddresses?.[0]?.state?.name ??
											"—"}
									</TableCell>
									<TableCell>
										{lead.city?.name ??
											lead.user?.userAddresses?.[0]?.locality?.name ??
											lead.user?.userAddresses?.[0]?.city ??
											"—"}
									</TableCell>
									<TableCell>
										{lead.services && (
											<Badge variant="secondary" className="text-xs">
												{lead.services.label}
											</Badge>
										)}
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="text-xs">
											{getSourceChannelLabel(lead.sourceChannelId)}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge className="text-xs">
											{getColumnLabel(Number(lead.columnId))}
										</Badge>
									</TableCell>
									<TableCell>{lead.seller?.name}</TableCell>
									<TableCell>{lead.internalLawyer?.name}</TableCell>
									<TableCell>{lead.responsibleLawyer?.name}</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Button variant="ghost" size="icon" className="size-8" asChild>
												<Link href={`/admin/crm/leads/${lead.id}`}>
													<Eye className="size-4" />
												</Link>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="size-8 text-blue-500 hover:text-blue-700"
												onClick={() => onEditLead(lead)}
											>
												<Pencil className="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="size-8 text-destructive hover:text-destructive"
												onClick={async () => {
													if (
														await confirm({
															description: "¿Estás seguro de que deseas eliminar este lead?",
															confirmLabel: "Eliminar",
														})
													) {
														onDeleteLead(lead.id);
													}
												}}
											>
												<Trash className="size-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{totalPages > 0 && (
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={visibleLeads.length}
					itemsPerPage={itemsPerPage}
					onPageChange={handlePageChange}
				/>
			)}
			{ConfirmationDialog}
		</div>
	);
}
