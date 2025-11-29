import { Table, TableHeader, TableRow, TableCell, TableBody } from "../ui/table";
import { Pencil, Trash2 } from "lucide-react";
import Button from "../ui/button/Button";
import { User } from "@/types/users";

interface CustomersTableProps {
    customers: User[];
    hasActiveFilters: boolean
    handleClearSearch: () => void
    handleEdit: (customer: User) => void
    handleDelete: (id: number) => void
    isLoading?: boolean
}

export default function CustomersTable({
    customers,
    hasActiveFilters,
    handleClearSearch,
    handleEdit,
    handleDelete,
    isLoading
}: CustomersTableProps) {
    return (
        <div>
            <Table className="w-full min-w-[800px]">
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableCell isHeader className="w-[1%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            ID
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Apellido & Nombre
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Correo
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Teléfono
                        </TableCell>

                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Dirección
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Provincia
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Ciudad
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Acción
                        </TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                    {[...customers]
                        .sort((a, b) => a.id - b.id)
                        .map((customer) => {
                            return (
                                <TableRow key={customer.id} className="border-b border-gray-200">
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{customer.id}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{customer.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{customer.email || "-"}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{customer.userProfile?.phone || "-"}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {customer.userAddresses && customer.userAddresses.length > 0
                                            ? `${customer.userAddresses[0]?.street || "-"}, ${customer.userAddresses[0]?.streetNumber || "-"}`
                                            : "-"
                                        }
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {customer.userAddresses && customer.userAddresses.length > 0
                                            ? customer.userAddresses[0]?.state?.name || "-"
                                            : "-"
                                        }
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {customer.userAddresses && customer.userAddresses.length > 0
                                            ? customer.userAddresses[0]?.city || "-"
                                            : "-"
                                        }
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleEdit(customer)}
                                                variant="outline"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(customer.id)}
                                                variant="outline"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                </TableBody>
            </Table>
        </div>
    );
}