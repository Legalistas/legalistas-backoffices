import { Activity, Lock, Pencil, Trash2, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface MembersTableProps {
	members: User[];
	hasActiveFilters: boolean;
	handleClearSearch: () => void;
	handleEdit: (member: User) => void;
	handleDelete: (id: number) => void;
	handleToggleBlock: (userId: number, isBlocked: boolean) => void;
	isLoading?: boolean;
}

export default function MembersTable({
	members,
	hasActiveFilters,
	handleClearSearch,
	handleEdit,
	handleDelete,
	handleToggleBlock,
}: MembersTableProps) {
	const router = useRouter();

	if (members.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<p className="text-muted-foreground">No se encontraron miembros</p>
				{hasActiveFilters && (
					<Button variant="link" onClick={handleClearSearch} className="mt-2">
						Limpiar filtros
					</Button>
				)}
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-16">ID</TableHead>
					<TableHead>Nombre</TableHead>
					<TableHead>Correo</TableHead>
					<TableHead>Rol</TableHead>
					<TableHead>Teléfono</TableHead>
					<TableHead>Provincia</TableHead>
					<TableHead>Ciudad</TableHead>
					<TableHead className="text-right">Acciones</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{[...members]
					.sort((a, b) => a.id - b.id)
					.map((member) => (
						<TableRow key={member.id}>
							<TableCell className="font-mono text-xs text-muted-foreground">
								{member.id}
							</TableCell>
							<TableCell className="font-medium">
								<div className="flex items-center gap-2">
									{member.name}
									{member.isBlocked && (
										<Badge variant="destructive" className="text-xs">
											Bloqueado
										</Badge>
									)}
								</div>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{member.email || "-"}
							</TableCell>
							<TableCell>
								<Badge variant="outline">
									{member.roleUser[0]?.role?.displayName || "-"}
								</Badge>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{member.userProfile?.phone || "-"}
							</TableCell>
							<TableCell className="text-muted-foreground">
								{member.userAddresses?.[0]?.state?.name || "-"}
							</TableCell>
							<TableCell className="text-muted-foreground">
								{member.userAddresses?.[0]?.city || "-"}
							</TableCell>
							<TableCell>
								<div className="flex items-center justify-end gap-1">
									<Button
										size="icon"
										variant="ghost"
										onClick={() => handleEdit(member)}
										title="Editar"
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() =>
											router.push(
												`/admin/activity-logs?userId=${member.id}&userName=${encodeURIComponent(member.name)}`,
											)
										}
										title="Ver historial"
									>
										<Activity className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() =>
											handleToggleBlock(member.id, !member.isBlocked)
										}
										title={
											member.isBlocked ? "Desbloquear" : "Bloquear"
										}
										className={
											member.isBlocked
												? "text-destructive hover:text-destructive"
												: ""
										}
									>
										{member.isBlocked ? (
											<Unlock className="h-4 w-4" />
										) : (
											<Lock className="h-4 w-4" />
										)}
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => handleDelete(member.id)}
										title="Eliminar"
										className="text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					))}
			</TableBody>
		</Table>
	);
}
