import { Pencil, Trash2 } from "lucide-react";
import type { User } from "@/types/users";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface CustomersTableProps {
	customers: User[];
	hasActiveFilters: boolean;
	handleClearSearch: () => void;
	handleEdit: (customer: User) => void;
	handleDelete: (id: number) => void;
	isLoading?: boolean;
}

export default function CustomersTable({
	customers,
	hasActiveFilters,
	handleClearSearch,
	handleEdit,
	handleDelete,
	isLoading,
}: CustomersTableProps) {
	return (
		<Table className="w-full min-w-200">
			<TableHeader className="bg-gray-50 dark:bg-white/5">
				<TableRow>
					<TableCell className="w-[5%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
						ID
					</TableCell>
					<TableCell className="w-[15%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
						Apellido & Nombre
					</TableCell>
					<TableCell className="w-[18%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
						Correo
					</TableCell>
					<TableCell className="w-[10%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
						Teléfono
					</TableCell>
					<TableCell className="w-[15%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
						Dirección
					</TableCell>
					<TableCell className="w-[12%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
						Provincia
					</TableCell>
					<TableCell className="w-[10%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-left">
						Ciudad
					</TableCell>
					<TableCell className="w-[10%] px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 text-right">
						Acción
					</TableCell>
				</TableRow>
			</TableHeader>
			<TableBody>
				{customers.length > 0 ? (
					[...customers]
						.sort((a, b) => a.id - b.id)
						.map((customer) => (
							<TableRow
								key={customer.id}
								className="hover:bg-gray-50 dark:hover:bg-white/5"
							>
								<TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
									{customer.id}
								</TableCell>
								<TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
									{customer.name}
								</TableCell>
								<TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
									{customer.email || "-"}
								</TableCell>
								<TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
									{customer.userProfile?.phone || "-"}
								</TableCell>
								<TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
									{customer.userAddresses && customer.userAddresses.length > 0
										? `${customer.userAddresses[0]?.street || "-"}, ${customer.userAddresses[0]?.streetNumber || "-"}`
										: "-"}
								</TableCell>
								<TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
									{customer.userAddresses && customer.userAddresses.length > 0
										? customer.userAddresses[0]?.state?.name || "-"
										: "-"}
								</TableCell>
								<TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
									{customer.userAddresses && customer.userAddresses.length > 0
										? customer.userAddresses[0]?.city || "-"
										: "-"}
								</TableCell>
								<TableCell className="px-4 py-3 text-right">
									<div className="flex items-center justify-end gap-1">
										<button
											onClick={() => handleEdit(customer)}
											className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-white/5 transition-colors"
										>
											<Pencil className="h-3.5 w-3.5" />
										</button>
										<button
											onClick={() => handleDelete(customer.id)}
											className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-white/5 transition-colors"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									</div>
								</TableCell>
							</TableRow>
						))
				) : (
					<TableRow>
						<TableCell colSpan={8} className="px-4 py-8 text-center">
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{hasActiveFilters
									? "No se encontraron clientes con los filtros seleccionados."
									: "No hay clientes disponibles."}
							</p>
							{hasActiveFilters && (
								<button
									onClick={handleClearSearch}
									className="mt-2 text-sm text-primary hover:underline"
								>
									Limpiar filtros
								</button>
							)}
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
