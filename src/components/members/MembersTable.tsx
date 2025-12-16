import { Table, TableHeader, TableRow, TableCell, TableBody } from "../ui/table";
import { Pencil, Trash2, Lock, Unlock } from "lucide-react";
import Button from "../ui/button/Button";
import { User } from "@/types/users";

interface MembersTableProps {
    members: User[];
    hasActiveFilters: boolean
    handleClearSearch: () => void
    handleEdit: (member: User) => void
    handleDelete: (id: number) => void
    handleToggleBlock: (userId: number, isBlocked: boolean) => void
    isLoading?: boolean
}

export default function MembersTable({
    members,
    hasActiveFilters,
    handleClearSearch,
    handleEdit,
    handleDelete,
    handleToggleBlock,
    isLoading
}: MembersTableProps) {
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
                        <TableCell isHeader className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Rol
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
                    {[...members]
                        .sort((a, b) => a.id - b.id)
                        .map((member) => {
                            return (
                                <TableRow key={member.id} className="border-b border-gray-200">
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{member.id}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{member.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{member.email || "-"}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{member.roleUser[0]?.role?.displayName || "-"}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{member.userProfile?.phone || "-"}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {member.userAddresses && member.userAddresses.length > 0
                                            ? `${member.userAddresses[0]?.street || "-"}, ${member.userAddresses[0]?.streetNumber || "-"}`
                                            : "-"
                                        }
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {member.userAddresses && member.userAddresses.length > 0
                                            ? member.userAddresses[0]?.state?.name || "-"
                                            : "-"
                                        }
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {member.userAddresses && member.userAddresses.length > 0
                                            ? member.userAddresses[0]?.city || "-"
                                            : "-"
                                        }
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleEdit(member)}
                                                variant="outline"
                                                title="Editar usuario"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleToggleBlock(member.id, !member.isBlocked)}
                                                variant="outline"
                                                className={member.isBlocked ? "text-red-600 hover:text-red-700" : ""}
                                                title={member.isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}
                                            >
                                                {member.isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(member.id)}
                                                variant="outline"
                                                title="Eliminar usuario"
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