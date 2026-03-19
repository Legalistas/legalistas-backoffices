"use client";

import {
	ChevronDown,
	DollarSign,
	Eye,
	EyeOff,
	Loader2,
	Pencil,
	Plus,
	Settings,
	Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	CASES_FILES_EXPENSES_CREATE_ENDPOINT,
	CASES_FILES_EXPENSES_DELETE_ENDPOINT,
	CASES_FILES_EXPENSES_UPDATE_ENDPOINT,
} from "@/constant/api-endpoints"; // Assuming this is for creating expenses
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import CreateEditExpensesModal, {
	type FileExpenses as ModalFileExpenses,
} from "./CreateEditExpensesModal"; // Import the modal and its specific type

// Define a new endpoint for updating expenses.
// You might want to move this to your api-endpoints.ts file
interface FileExpenses {
	id: number;
	amount: number;
	description: string;
	userId: number; // Added userId as it's in the API response
	user: {
		// Detailed user object as per API response
		id: number;
		name: string;
		email: string;
	};
}

interface FileExpensesProps {
	expenses?: FileExpenses[];
	onEdit?: (part: FileExpenses) => void;
	onDelete?: (partId: number | string) => void;
	onAdd?: (part: FileExpenses) => void;
	caseId: number;
	fileId: number;
	onExpensesChange?: (expenses: FileExpenses[]) => void;
	onRefresh?: () => void;
}

interface ColumnConfig {
	key: keyof FileExpenses | "actions";
	label: string;
	visible: boolean;
	required?: boolean;
}

const defaultColumns: ColumnConfig[] = [
	{ key: "id", label: "ID", visible: true },
	{ key: "amount", label: "Monto", visible: true, required: true },
	{ key: "description", label: "Descripción", visible: true },
	{ key: "user", label: "Miembro", visible: true },
	{ key: "actions", label: "Acciones", visible: true, required: true },
];

const presetConfigurations = {
	basic: {
		name: "Vista General",
		columns: ["id", "amount", "description", "user", "actions"],
	},
};

export default function FilesExpenses({
	expenses = [],
	onEdit,
	onDelete,
	onAdd,
	caseId,
	fileId,
	onExpensesChange,
	onRefresh,
}: FileExpensesProps) {
	const { data: session } = useSession();
	const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
	const [showColumnConfig, setShowColumnConfig] = useState(false);
	const [selectedExpense, setSelectedExpense] = useState<FileExpenses | null>(
		null,
	);
	const [openCreateEditExpenseModal, setOpenCreateEditExpenseModal] =
		useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [localExpenses, setExpenseParts] = useState<FileExpenses[]>(expenses);

	// Sincronizar localParts con props parts cuando cambien
	useEffect(() => {
		setExpenseParts(expenses);
	}, [expenses]);

	const visibleColumns = columns.filter((col) => col.visible);

	const toggleColumn = (key: keyof FileExpenses | "actions") => {
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

	const handleAddExpenses = () => {
		setSelectedExpense(null);
		setOpenCreateEditExpenseModal(true);
	};

	const handleEditExpenses = (expense: FileExpenses) => {
		setSelectedExpense(expense);
		setOpenCreateEditExpenseModal(true);
		if (onEdit) {
			onEdit(expense);
		}
	};

	const handleDeleteExpenses = (expenseId: number | string) => {
		if (onDelete) {
			onDelete(expenseId);
		}
	};

	const handleSaveExpense = async (modalExpenseData: ModalFileExpenses) => {
		setIsLoading(true);
		let response: Response; // Declare response with let
		let responseData: any; // Declare responseData with let

		try {
			const userId = session?.user?.id; // Get userId from session
			if (!userId) {
				throw new Error("User ID not available. Cannot save expense.");
			}

			let method: string;
			let endpoint: string;
			let payload: any;

			if (modalExpenseData.id) {
				// Editing existing expense
				method = "PATCH";
				endpoint = CASES_FILES_EXPENSES_UPDATE_ENDPOINT(
					caseId,
					fileId,
					modalExpenseData.id,
				);
				payload = {
					amount: modalExpenseData.amount,
					description: modalExpenseData.description,
					userId: Number(userId), // Ensure userId is sent as number for updates
				};
			} else {
				// Creating new expense
				method = "POST";
				endpoint = CASES_FILES_EXPENSES_CREATE_ENDPOINT(caseId, fileId); // Assuming this endpoint handles adding expenses to a file
				payload = {
					expenses: [
						{
							amount: modalExpenseData.amount,
							description: modalExpenseData.description,
							userId: Number(userId),
						},
					],
				};
			}

			response = await fetch(endpoint, {
				method: method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message ||
						`Error al ${modalExpenseData.id ? "actualizar" : "crear"} el gasto`,
				);
			}

			responseData = await response.json(); // Assign responseData here

			let updatedExpenseData: FileExpenses;

			if (modalExpenseData.id) {
				// For update, assume backend returns the updated expense or we construct it
				updatedExpenseData = {
					...modalExpenseData,
					userId: Number(userId),
					user: {
						id: Number(userId),
						name: session?.user?.name ?? "Unknown",
						email: session?.user?.email ?? "",
					},
				} as FileExpenses; // Explicitly cast to FileExpenses
				// Update the existing expense in local state
				setExpenseParts((prev) =>
					prev.map((exp) =>
						exp.id === updatedExpenseData.id ? updatedExpenseData : exp,
					),
				);
				toast.success("Gasto actualizado exitosamente");
			} else {
				// For creation, use the data returned by the backend, which should include the full user object
				if (
					responseData.data &&
					Array.isArray(responseData.data) &&
					responseData.data.length > 0
				) {
					updatedExpenseData = responseData.data[0];
				} else if (responseData.data) {
					updatedExpenseData = responseData.data;
				} else {
					// Fallback if backend doesn't return the full object
					updatedExpenseData = {
						...modalExpenseData,
						id: Date.now(), // Temporary ID
						userId: Number(userId),
						user: {
							id: Number(userId),
							name: session?.user?.name ?? "Unknown",
							email: session?.user?.email ?? "",
						},
					} as FileExpenses; // Explicitly cast to FileExpenses
				}
				// Add the new expense to local state
				setExpenseParts((prev) => [...prev, updatedExpenseData]);
				toast.success("Gasto agregado exitosamente");
			}

			// Notify parent component
			if (onRefresh) {
				onRefresh();
			} else if (onExpensesChange) {
				onExpensesChange(localExpenses); // Pass the updated local state
			} else if (onAdd && !modalExpenseData.id) {
				onAdd(updatedExpenseData);
			} else if (onEdit && modalExpenseData.id) {
				onEdit(updatedExpenseData);
			}
		} catch (error) {
			console.error("Error al guardar el gasto:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al guardar el gasto",
			);
		} finally {
			setIsLoading(false);
			setOpenCreateEditExpenseModal(false);
			setSelectedExpense(null);
		}
	};

	const formatCurrency = (amount: number) => {
		if (typeof amount !== "number" || isNaN(amount)) {
			return "$ 0.00";
		}
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
		}).format(amount);
	};

	const renderCellContent = (
		expense: FileExpenses,
		columnKey: keyof FileExpenses | "actions",
	) => {
		switch (columnKey) {
			case "id":
				return expense.id || "-";
			case "amount":
				return (
					<span
						className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${expense.amount > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-600"}`}
					>
						{formatCurrency(expense.amount)}
					</span>
				);
			case "description": {
				const description = expense[columnKey];
				return description &&
					typeof description === "string" &&
					description.length > 50 ? (
					<span title={description} className="cursor-help">
						{description.substring(0, 50)}...
					</span>
				) : (
					description
				);
			}
			case "user":
				return expense.user?.name || "-";
			case "actions":
				return (
					<div className="flex items-center justify-end gap-1">
						<button
							onClick={() => handleEditExpenses(expense)}
							disabled={isLoading}
							className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
						>
							<Pencil className="h-4 w-4" />
							<span className="sr-only">Editar</span>
						</button>
						<button
							onClick={() => handleDeleteExpenses(expense.id || "")}
							disabled={isLoading || !expense.id}
							className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
						>
							<Trash2 className="h-4 w-4" />
							<span className="sr-only">Eliminar</span>
						</button>
					</div>
				);
			default:
				return expense[columnKey] || "-";
		}
	};

	if (localExpenses.length === 0) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<DollarSign className="h-5 w-5 text-gray-500" />
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							No hay gastos disponibles
						</span>
					</div>
					<button
						onClick={handleAddExpenses}
						disabled={isLoading}
						className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						Agregar gasto
					</button>
				</div>
				<div className="overflow-auto rounded-md border border-gray-200 bg-white dark:bg-gray-800">
					<div className="text-center py-6">
						<DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
						<p className="mt-2 text-muted-foreground">
							No hay gastos disponibles
						</p>
					</div>
				</div>
				<CreateEditExpensesModal
					open={openCreateEditExpenseModal}
					onClose={() => setOpenCreateEditExpenseModal(false)}
					onSave={handleSaveExpense}
					expense={selectedExpense}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Controles de configuración */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<DollarSign className="h-5 w-5 text-gray-500" />
					<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
						{`Total de gastos: ${formatCurrency(localExpenses.reduce((acc, expense) => acc + expense.amount, 0))}`}
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
						onClick={handleAddExpenses}
						disabled={isLoading}
						className="ml-2 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						Agregar nuevo gasto
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
						{localExpenses.map((expense, index) => (
							<TableRow key={expense.id ?? `row-${index}`}>
								{visibleColumns.map((column) => (
									<TableCell
										key={column.key}
										className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
									>
										{renderCellContent(expense, column.key)}
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
			<CreateEditExpensesModal
				open={openCreateEditExpenseModal}
				onClose={() => setOpenCreateEditExpenseModal(false)}
				onSave={handleSaveExpense}
				expense={selectedExpense}
			/>
		</div>
	);
}
