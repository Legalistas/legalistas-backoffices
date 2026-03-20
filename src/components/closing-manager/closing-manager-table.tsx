"use client";

import { Check, Eye, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/Pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	CLOSING_BY_ID_ENDPOINT,
	CLOSING_DETAIL_ENDPOINT,
} from "@/constant/api-endpoints";
import { Role } from "@/constant/user";
import {
	closingType,
	closingTypeColors,
	statusCapital,
	statusCapitalColor,
	statusColors,
	statusData,
} from "@/constant/closing-manager";
import { cn } from "@/lib/utils";
import type {
	ClosingManagerEntry,
	Pagination as PaginationType,
} from "@/types/closing-manager";
import ViewClosingModal from "./ViewClosingModal";

// =============================================================================
// Definición de columnas v2 — 21 columnas (sin intimation ni sepblac)
// =============================================================================
const COLUMNS = [
	{ id: "date", label: "Fecha", align: "left" },
	{ id: "case", label: "Causa", align: "left" },
	{ id: "lawyer", label: "Representante", align: "left" },
	{ id: "type", label: "Tipo de Cierre", align: "left" },
	{ id: "capitalAmount", label: "Capital ($)", align: "right" },
	{ id: "capitalState", label: "Estado Capital", align: "left" },
	{ id: "hpAgreed", label: "HP Convenido (%)", align: "right" },
	{ id: "hpTotal", label: "HP Total ($)", align: "right" },
	{ id: "hpRepresentante", label: "HP Representante ($)", align: "right" },
	{ id: "hpLegalistas", label: "HP Legalistas ($)", align: "right" },
	{ id: "feeStatus", label: "Estado Honorarios", align: "left" },
	{ id: "pclAgreed", label: "PCL Convenido (%)", align: "right" },
	{ id: "pclTotal", label: "PCL Total ($)", align: "right" },
	{ id: "pclRepresentante", label: "PCL Representante ($)", align: "right" },
	{ id: "pclLegalistas", label: "PCL Legalistas ($)", align: "right" },
	{ id: "pclStatus", label: "Estado PCL", align: "left" },
	{ id: "contributionsAmount", label: "Aportes Totales ($)", align: "right" },
	{
		id: "aportesRepresentante",
		label: "Aportes Representante ($)",
		align: "right",
	},
	{ id: "aportesLegalistas", label: "Aportes Legalistas ($)", align: "right" },
	{ id: "montoTransferir", label: "Monto a Transferir ($)", align: "right" },
	{ id: "totalCaseExpenses", label: "Gastos Causa ($)", align: "right" },
	{ id: "detail", label: "Detalle", align: "left" },
] as const;

// Columna montoTransferir siempre visible (no se puede ocultar)
const ALWAYS_VISIBLE = ["montoTransferir"];

interface ClosingManagerTableProps {
	closings: ClosingManagerEntry[];
	pagination: PaginationType;
	onPageChange: (page: number) => void;
	onRefresh?: () => void;
	visibleColumns: string[];
	/** Auto-open detail drawer for this closing ID (from global search) */
	openClosingId?: number | null;
	onOpenClosingHandled?: () => void;
}

export default function ClosingManagerTable({
	closings,
	pagination,
	onPageChange,
	onRefresh,
	visibleColumns,
	openClosingId,
	onOpenClosingHandled,
}: ClosingManagerTableProps) {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const router = useRouter();

	const FINANCIAL_KPI_ROLES = [
		Role.ADMINISTRATOR,
		Role.DIRECTOR_GENERAL_CEO,
		Role.GERENTE_GENERAL_COO,
		Role.DIRECTOR_AREA_IT,
		Role.DIRECTORA_AREA_CONTABLE,
	];

	const canSeeHpLegalistas = FINANCIAL_KPI_ROLES.includes(
		session?.user?.role as Role,
	);

	// View modal state
	const [viewClosing, setViewClosing] = useState<ClosingManagerEntry | null>(
		null,
	);

	// Inline edit state
	const [editingDetailId, setEditingDetailId] = useState<number | null>(null);
	const [editingDetailValue, setEditingDetailValue] = useState("");
	const [savingDetail, setSavingDetail] = useState(false);
	const detailInputRef = useRef<HTMLTextAreaElement>(null);

	// Auto-open detail drawer from global search
	useEffect(() => {
		if (openClosingId && closings.length > 0) {
			const found = closings.find((c) => c.id === openClosingId);
			if (found) {
				setViewClosing(found);
				onOpenClosingHandled?.();
			}
		}
	}, [openClosingId, closings, onOpenClosingHandled]);

	useEffect(() => {
		if (editingDetailId && detailInputRef.current) {
			detailInputRef.current.focus();
		}
	}, [editingDetailId]);

	const isColumnVisible = (columnId: string) => {
		if ((columnId === "hpLegalistas" || columnId === "pclLegalistas") && !canSeeHpLegalistas) return false;
		return ALWAYS_VISIBLE.includes(columnId) || visibleColumns.includes(columnId);
	};

	// =========================================================================
	// Formatters
	// =========================================================================
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const formatDate = (dateString: string) => {
		const d = new Date(dateString);
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		return `${day}/${month}/${year}`;
	};

	const formatPercent = (value: number | null) => {
		if (value === null || value === undefined) return "-";
		return `${Number(value) % 1 === 0 ? Number(value).toFixed(0) : Number(value).toFixed(2)}%`;
	};

	// =========================================================================
	// Actions
	// =========================================================================
	const handleDelete = async (id: number) => {
		if (!(await confirm({ description: "¿Estás seguro de eliminar este cierre?", confirmLabel: "Eliminar" }))) return;
		try {
			const response = await fetch(CLOSING_BY_ID_ENDPOINT(id), {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!response.ok) throw new Error("Error al eliminar el cierre");
			if (onRefresh) onRefresh();
		} catch (err) {
			console.error("Error deleting closing:", err);
			toast.error("Error al eliminar el cierre");
		}
	};

	const handleEdit = (id: number) => {
		router.push(`/admin/closing-manager/${id}/edit`);
	};

	// =========================================================================
	// Inline detail edit
	// =========================================================================
	const startEditingDetail = (closing: ClosingManagerEntry) => {
		setEditingDetailId(closing.id);
		setEditingDetailValue(closing.detail || "");
	};

	const cancelEditingDetail = () => {
		setEditingDetailId(null);
		setEditingDetailValue("");
	};

	const saveDetail = async () => {
		if (editingDetailId === null) return;
		setSavingDetail(true);
		try {
			const response = await fetch(CLOSING_DETAIL_ENDPOINT(editingDetailId), {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ detail: editingDetailValue }),
			});
			if (!response.ok) throw new Error("Error al guardar detalle");
			setEditingDetailId(null);
			if (onRefresh) onRefresh();
		} catch (err) {
			console.error("Error saving detail:", err);
			toast.error("Error al guardar el detalle");
		} finally {
			setSavingDetail(false);
		}
	};

	// =========================================================================
	// Render helpers
	// =========================================================================
	const headerCellClass =
		"px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-400 whitespace-nowrap";
	const cellClass = "px-4 py-3 text-sm text-gray-700 dark:text-gray-300";

	const renderCellContent = (
		closing: ClosingManagerEntry,
		columnId: string,
	) => {
		switch (columnId) {
			case "date":
				return <span>{formatDate(closing.date)}</span>;

			case "case":
				return (
					<span
						className="max-w-[200px] truncate block"
						title={closing.case.title}
					>
						{closing.case.title}
					</span>
				);

			case "lawyer":
				return <span>{closing.case?.responsibleLawyer?.name || "-"}</span>;

			case "type":
				return (
					<Badge
						className={cn(
							closingTypeColors[closing.type] || "bg-gray-200 text-gray-800",
						)}
					>
						{closingType[closing.type] || closing.type}
					</Badge>
				);

			case "capitalAmount":
				return (
					<span className="text-right block">
						{formatCurrency(Number(closing.capitalAmount))}
					</span>
				);

			case "capitalState":
				return (
					<Badge
						className={cn(statusCapitalColor[closing.capitalState] || "")}
					>
						{statusCapital[closing.capitalState] || "-"}
					</Badge>
				);

			case "hpAgreed":
				return (
					<span className="text-right block">
						{formatPercent(Number(closing.hpAgreed))}
					</span>
				);

			case "hpTotal":
				return (
					<span className="text-right block">
						{formatCurrency(Number(closing.hpTotal))}
					</span>
				);

			case "hpRepresentante":
				return (
					<span className="text-right block">
						{formatCurrency(closing.hpRepresentante)}
					</span>
				);

			case "hpLegalistas":
				return (
					<span className="text-right block">
						{formatCurrency(closing.hpLegalistas)}
					</span>
				);

			case "feeStatus":
				return (
					<Badge
						className={cn(statusColors[closing.feeStatus] || "")}
					>
						{statusData[closing.feeStatus] || "-"}
					</Badge>
				);

			case "pclAgreed":
				return (
					<span className="text-right block">
						{formatPercent(closing.pclAgreed)}
					</span>
				);

			case "pclTotal":
				return (
					<span className="text-right block">
						{closing.pclTotal != null
							? formatCurrency(Number(closing.pclTotal))
							: "-"}
					</span>
				);

			case "pclRepresentante":
				return (
					<span className="text-right block">
						{formatCurrency(closing.pclRepresentante)}
					</span>
				);

			case "pclLegalistas":
				return (
					<span className="text-right block">
						{formatCurrency(closing.pclLegalistas)}
					</span>
				);

			case "pclStatus":
				return closing.pclStatus ? (
					<Badge
						className={cn(statusColors[closing.pclStatus] || "")}
					>
						{statusData[closing.pclStatus] || "-"}
					</Badge>
				) : (
					<span>-</span>
				);

			case "contributionsAmount":
				return (
					<span className="text-right block">
						{formatCurrency(Number(closing.contributionsAmount))}
					</span>
				);

			case "aportesRepresentante":
				return (
					<span className="text-right block">
						{formatCurrency(closing.aportesRepresentante)}
					</span>
				);

			case "aportesLegalistas":
				return (
					<span className="text-right block">
						{formatCurrency(closing.aportesLegalistas)}
					</span>
				);

			case "montoTransferir":
				return (
					<span
						className={cn(
							"text-right block font-bold",
							closing.montoTransferir < 0 ? "text-red-600 dark:text-red-400" : "text-primary",
						)}
					>
						{formatCurrency(closing.montoTransferir)}
					</span>
				);

			case "totalCaseExpenses":
				return (
					<span className="text-right block text-gray-600 dark:text-gray-400">
						{closing.totalCaseExpenses
							? formatCurrency(closing.totalCaseExpenses)
							: "-"}
					</span>
				);

			case "detail":
				// Inline edit mode
				if (editingDetailId === closing.id) {
					return (
						<div className="flex items-center gap-1 min-w-[200px]">
							<textarea
								ref={detailInputRef}
								value={editingDetailValue}
								onChange={(e) => setEditingDetailValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										saveDetail();
									}
									if (e.key === "Escape") cancelEditingDetail();
								}}
								className="w-full min-h-[60px] rounded border border-primary/30 bg-transparent dark:text-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
								disabled={savingDetail}
							/>
							<div className="flex flex-col gap-1">
								<button
									onClick={saveDetail}
									disabled={savingDetail}
									className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
								>
									{savingDetail ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
									) : (
										<Check className="h-3.5 w-3.5" />
									)}
								</button>
								<button
									onClick={cancelEditingDetail}
									disabled={savingDetail}
									className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
					);
				}
				return (
					<span
						className="max-w-[200px] truncate block cursor-pointer hover:text-primary"
						title={
							closing.detail
								? `${closing.detail} (click para editar)`
								: "Click para agregar detalle"
						}
						onClick={() => startEditingDetail(closing)}
					>
						{closing.detail || (
							<span className="text-gray-400 dark:text-gray-500 italic">Sin detalle</span>
						)}
					</span>
				);

			default:
				return "-";
		}
	};

	// =========================================================================
	// Render
	// =========================================================================
	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
			<div className="w-full overflow-x-auto">
				<Table className="w-full min-w-[2800px]">
					<TableHeader className="bg-gray-50 dark:bg-white/5">
						<TableRow>
							{COLUMNS.map((col) =>
								isColumnVisible(col.id) ? (
									<TableCell
										key={col.id}
										className={cn(
											headerCellClass,
											col.align === "right" ? "text-right" : "text-left",
											col.id === "montoTransferir" &&
												"bg-primary/5 text-primary",
										)}
									>
										{col.label}
									</TableCell>
								) : null,
							)}
							<TableCell
								className={cn(headerCellClass, "text-right")}
							>
								Acción
							</TableCell>
						</TableRow>
					</TableHeader>
					<TableBody>
						{closings.length > 0 ? (
							closings.map((closing) => (
								<TableRow key={closing.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
									{COLUMNS.map((col) =>
										isColumnVisible(col.id) ? (
											<TableCell
												key={col.id}
												className={cn(
													cellClass,
													col.id === "montoTransferir" &&
														(closing.montoTransferir < 0
															? "bg-red-50 dark:bg-red-900/20"
															: "bg-primary/5 dark:bg-primary/10"),
												)}
											>
												{renderCellContent(closing, col.id)}
											</TableCell>
										) : null,
									)}
									<TableCell className="px-4 py-3 text-right">
										<div className="flex items-center justify-end gap-2">
											<button
												onClick={() => setViewClosing(closing)}
												className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 transition-colors"
												title="Ver detalle"
											>
												<Eye className="h-4 w-4" />
												<span className="sr-only">Ver</span>
											</button>
											<button
												onClick={() => handleEdit(closing.id)}
												className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-white/5 transition-colors"
											>
												<Pencil className="h-4 w-4" />
												<span className="sr-only">Editar</span>
											</button>
											<button
												onClick={() => handleDelete(closing.id)}
												className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-white/5 transition-colors"
											>
												<Trash2 className="h-4 w-4" />
												<span className="sr-only">Eliminar</span>
											</button>
										</div>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={visibleColumns.length + 2}
									className="px-4 py-8 text-center"
								>
									<p className="text-gray-500 font-medium">
										No hay cierres disponibles.
									</p>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				{pagination.totalPages > 1 && (
					<div className="px-6 py-4">
						<Pagination
							currentPage={pagination.page}
							totalPages={pagination.totalPages}
							totalItems={pagination.total}
							itemsPerPage={pagination.limit}
							onPageChange={onPageChange}
						/>
					</div>
				)}
			</div>

			<ViewClosingModal
				closing={viewClosing}
				isOpen={!!viewClosing}
				onClose={() => setViewClosing(null)}
			/>
			{ConfirmationDialog}
		</div>
	);
}

// =============================================================================
// Export: IDs de todas las columnas v2 (para el page.tsx)
// =============================================================================
export const ALL_CLOSING_COLUMNS = COLUMNS.map((c) => c.id);
