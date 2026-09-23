"use client";

import {
	BookMarked,
	ChevronDown,
	Eye,
	EyeOff,
	Loader2,
	Pencil,
	Plus,
	Settings,
	Trash2,
	Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { CASE_PART_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import { partyTypeLabel } from "@/constant/parties";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import CreateEditPartModal from "./CreateEditPartModal";

// Los campos son los del relevamiento 5.1. `partyType` es string y no una
// unión cerrada porque las partes que todavía no se migraron traen los tipos
// viejos (DEMANDANTE, TERCERO, 'abogado') y hay que poder mostrarlas.
interface FilePart {
	id?: number;
	partyId?: number | null;
	name: string;
	partyType: string;
	address?: string | null;
	city?: string | null;
	stateId?: number | null;
	postalCode?: string | null;
	phone?: string | null;
	documentNumber?: string | null;
	party?: { id: number; name: string; isActive: boolean } | null;
}

interface FilesPartsProps {
	parts?: FilePart[];
	onEdit?: (part: FilePart) => void;
	onDelete?: (partId: number | string) => void;
	onAdd?: (part: FilePart) => void;
	caseId: number;
	fileId: number;
	onPartsChange?: (parts: FilePart[]) => void;
	onRefresh?: () => void;
}

interface ColumnConfig {
	key: keyof FilePart | "actions";
	label: string;
	visible: boolean;
	required?: boolean;
}

// Columnas alineadas al relevamiento 5.1: se fueron email, tipo de documento,
// rol y notas; entraron ciudad, código postal y el vínculo al catálogo.
const defaultColumns: ColumnConfig[] = [
	{ key: "id", label: "ID", visible: false },
	{ key: "name", label: "Razón social / Nombre", visible: true, required: true },
	{ key: "partyType", label: "Tipo de Parte", visible: true, required: true },
	{ key: "party", label: "Catálogo", visible: true },
	{ key: "address", label: "Domicilio", visible: true },
	{ key: "city", label: "Ciudad", visible: true },
	{ key: "postalCode", label: "C.P.", visible: false },
	{ key: "phone", label: "Teléfono", visible: true },
	{ key: "documentNumber", label: "DNI", visible: false },
	{ key: "actions", label: "Acciones", visible: true, required: true },
];

const presetConfigurations = {
	basic: {
		name: "Vista Básica",
		columns: ["name", "partyType", "phone", "actions"],
	},
	complete: {
		name: "Vista Completa",
		columns: [
			"id",
			"name",
			"partyType",
			"party",
			"address",
			"city",
			"postalCode",
			"phone",
			"documentNumber",
			"actions",
		],
	},
	legal: {
		name: "Vista Legal",
		columns: ["name", "partyType", "party", "documentNumber", "actions"],
	},
	contact: {
		name: "Vista Contacto",
		columns: ["name", "phone", "address", "city", "postalCode", "actions"],
	},
};

export default function FilesParts({
	parts = [],
	onEdit,
	onDelete,
	onAdd,
	caseId,
	fileId,
	onPartsChange,
	onRefresh,
}: FilesPartsProps) {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
	const [showColumnConfig, setShowColumnConfig] = useState(false);
	const [selectedPart, setSelectedPart] = useState<FilePart | null>(null);
	const [openCreateEditPartModal, setOpenCreateEditPartModal] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [localParts, setLocalParts] = useState<FilePart[]>(parts);

	// Sincronizar localParts con props parts cuando cambien
	useEffect(() => {
		setLocalParts(parts);
	}, [parts]);

	const visibleColumns = columns.filter((col) => col.visible);

	const toggleColumn = (key: keyof FilePart | "actions") => {
		setColumns((prev) =>
			prev.map((col) =>
				col.key === key && !col.required
					? { ...col, visible: !col.visible }
					: col,
			),
		);
	};

	const applyPreset = (presetKey: keyof typeof presetConfigurations) => {
		const preset = presetConfigurations[presetKey];
		setColumns((prev) =>
			prev.map((col) => ({
				...col,
				visible: preset.columns.includes(col.key as string),
			})),
		);
		setShowColumnConfig(false);
	};

	// Cubre los tipos nuevos y los heredados, porque las partes sin migrar
	// siguen trayendo DEMANDANTE y TERCERO.
	const getPartyTypeColor = (type: string) => {
		switch (type) {
			case "DEMANDADO":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
			case "ACTOR":
			case "DEMANDANTE":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
			case "TERCERO_CITADO_GARANTIA":
			case "TERCERO":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
			case "TESTIGO":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
			case "PERITO":
				return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
		}
	};

	// El modal guarda contra /cases/:caseId/parts y devuelve la parte ya
	// persistida. Acá solo se refleja en la lista local: antes este handler
	// hacía su propio POST/PUT contra los endpoints viejos, lo que ahora sería
	// un guardado duplicado en la tabla equivocada.
	const handleSavePart = (saved: FilePart) => {
		const yaEstaba = localParts.some((p) => p.id === saved.id);
		const actualizada = yaEstaba
			? localParts.map((p) => (p.id === saved.id ? saved : p))
			: [...localParts, saved];

		setLocalParts(actualizada);
		onPartsChange?.(actualizada);
		if (yaEstaba) onEdit?.(saved);
		else onAdd?.(saved);

		setOpenCreateEditPartModal(false);
		setSelectedPart(null);
		onRefresh?.();
	};

	const handleDeletePart = async (partId: number | string) => {
		if (!session?.user?.accessToken || typeof partId !== "number") {
			toast.error("No se puede eliminar la parte");
			return;
		}

		if (!(await confirm({ description: "¿Está seguro que desea eliminar esta parte?", confirmLabel: "Eliminar" }))) {
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch(CASE_PART_BY_ID_ENDPOINT(caseId, partId), {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al eliminar la parte");
			}

			// Actualizar la lista local
			const updatedParts = localParts.filter((p) => p.id !== partId);
			setLocalParts(updatedParts);
			onPartsChange?.(updatedParts);

			// Notificar al componente padre si existe el callback
			onDelete?.(partId);

			toast.success("Parte eliminada exitosamente");
		} catch (error) {
			console.error("Error al eliminar la parte:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al eliminar la parte",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAddPart = () => {
		setSelectedPart(null);
		setOpenCreateEditPartModal(true);
	};

	const handleEditPart = (part: FilePart) => {
		setSelectedPart(part);
		setOpenCreateEditPartModal(true);
	};

	const renderCellContent = (
		part: FilePart,
		columnKey: keyof FilePart | "actions",
	) => {
		switch (columnKey) {
			case "id":
				return part.id || "-";
			case "partyType":
				return (
					<span
						className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getPartyTypeColor(part.partyType)}`}
					>
						{partyTypeLabel(part.partyType)}
					</span>
				);
			// Distingue una parte reutilizada del catálogo de una cargada suelta,
			// y avisa si la del catálogo se dio de baja después de asignarla.
			case "party":
				if (!part.party) {
					return (
						<span className="text-xs text-muted-foreground">Carga suelta</span>
					);
				}
				return (
					<span
						className={`inline-flex items-center gap-1 text-xs ${part.party.isActive ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"}`}
						title={
							part.party.isActive
								? `Del catálogo: ${part.party.name}`
								: `"${part.party.name}" está dada de baja en el catálogo`
						}
					>
						<BookMarked className="h-3 w-3 shrink-0" />
						{part.party.isActive ? "Del catálogo" : "De baja"}
					</span>
				);
			case "actions":
				return (
					<div className="flex items-center justify-end gap-1">
						<button
							onClick={() => handleEditPart(part)}
							disabled={isLoading}
							className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
						>
							<Pencil className="h-4 w-4" />
							<span className="sr-only">Editar</span>
						</button>
						<button
							onClick={() => handleDeletePart(part.id || "")}
							disabled={isLoading || !part.id}
							className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
						>
							<Trash2 className="h-4 w-4" />
							<span className="sr-only">Eliminar</span>
						</button>
					</div>
				);
			default: {
				const valor = part[columnKey];
				// `party` y `partyId` tienen su propio case; lo que llega acá es
				// siempre escalar.
				return typeof valor === "string" || typeof valor === "number"
					? valor || "-"
					: "-";
			}
		}
	};

	if (localParts.length === 0) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Users className="h-5 w-5 text-gray-500" />
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							No hay partes disponibles
						</span>
					</div>
					<button
						onClick={handleAddPart}
						disabled={isLoading}
						className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						Agregar parte
					</button>
				</div>
				<div className="overflow-auto rounded-md border border-gray-200 bg-white dark:bg-gray-800">
					<div className="text-center py-6">
						<Users className="h-12 w-12 mx-auto text-muted-foreground" />
						<p className="mt-2 text-muted-foreground">
							No hay partes disponibles
						</p>
					</div>
				</div>
				<CreateEditPartModal
					open={openCreateEditPartModal}
					onClose={() => setOpenCreateEditPartModal(false)}
					onSave={handleSavePart}
					part={selectedPart}
					caseId={caseId}
					fileId={fileId}
				/>
				{ConfirmationDialog}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Controles de configuración */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5 text-gray-500" />
					<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
						{localParts.length} parte{localParts.length !== 1 ? "s" : ""}
					</span>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative">
						<button
							onClick={() => setShowColumnConfig(!showColumnConfig)}
							disabled={isLoading}
							className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
						>
							<Settings className="h-4 w-4" />
							Configurar columnas
							<ChevronDown
								className={`h-4 w-4 transition-transform ${showColumnConfig ? "rotate-180" : ""}`}
							/>
						</button>

						{showColumnConfig && (
							<div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10">
								<div className="p-4">
									<h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
										Configuración de columnas
									</h3>

									{/* Configuraciones predefinidas */}
									<div className="mb-4">
										<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
											Configuraciones predefinidas:
										</p>
										<div className="grid grid-cols-2 gap-2">
											{Object.entries(presetConfigurations).map(
												([key, preset]) => (
													<button
														key={key}
														onClick={() =>
															applyPreset(
																key as keyof typeof presetConfigurations,
															)
														}
														className="px-2 py-1 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
													>
														{preset.name}
													</button>
												),
											)}
										</div>
									</div>

									<div className="border-t border-gray-200 dark:border-gray-600 pt-3">
										<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
											Columnas individuales:
										</p>
										<div className="space-y-2 max-h-48 overflow-y-auto">
											{columns.map((column) => (
												<label
													key={column.key}
													className={`flex items-center gap-2 text-sm ${column.required ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
												>
													<input
														type="checkbox"
														checked={column.visible}
														onChange={() => toggleColumn(column.key)}
														disabled={column.required}
														className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
													/>
													<span className="text-gray-700 dark:text-gray-300">
														{column.label}
														{column.required && (
															<span className="text-xs text-gray-400 ml-1">
																(requerido)
															</span>
														)}
													</span>
													{column.visible ? (
														<Eye className="h-3 w-3 text-green-500" />
													) : (
														<EyeOff className="h-3 w-3 text-gray-400" />
													)}
												</label>
											))}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
					<button
						onClick={handleAddPart}
						disabled={isLoading}
						className="ml-2 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						Agregar parte
					</button>
				</div>
			</div>

			{/* Tabla */}
			<div className="overflow-auto rounded-md border border-gray-200 bg-white dark:bg-gray-800">
				<Table className="w-full text-sm">
					<TableHeader className="bg-gray-50 dark:bg-gray-700">
						<TableRow>
							{visibleColumns.map((column) => (
								<TableCell
									key={column.key}
									className={`px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-left ${
										column.key === "id" ? "w-[1%]" : ""
									} ${column.key === "actions" ? "w-[120px]" : ""}`}
								>
									{column.label}
								</TableCell>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{localParts.map((part, index) => (
							<TableRow key={part.id ?? `${part.name}-${index}`}>
								{visibleColumns.map((column) => (
									<TableCell
										key={column.key}
										className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
									>
										{renderCellContent(part, column.key)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Información adicional */}
			<div className="text-xs text-gray-500 dark:text-gray-400">
				Mostrando {visibleColumns.length - 1} de {columns.length - 1} columnas
				disponibles
			</div>
			<CreateEditPartModal
				open={openCreateEditPartModal}
				onClose={() => setOpenCreateEditPartModal(false)}
				onSave={handleSavePart}
				part={selectedPart}
				caseId={caseId}
				fileId={fileId}
			/>
			{ConfirmationDialog}
		</div>
	);
}
