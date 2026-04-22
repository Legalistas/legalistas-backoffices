import { Activity, Briefcase, Lock, MapPin, Pencil, Trash2, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/Can";
import { Role } from "@/constant/user";
import { SUPERADMIN } from "@/constant/menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

// Solo SUPERADMIN + área contable pueden ver/editar datos laborales
const EMPLOYMENT_ALLOWED_ROLES = [
	...SUPERADMIN,
	Role.COORDINADOR_FINANCIERO,
	Role.DIRECTOR_FINANCIERO,
	Role.CONTADOR_SENIOR,
	Role.ANALISTA_FINANCIERO,
	Role.TESORERO,
	Role.AUDITOR_INTERNO,
];

interface MembersTableProps {
	members: User[];
	hasActiveFilters: boolean;
	handleClearSearch: () => void;
	handleEdit: (member: User) => void;
	handleDelete: (id: number) => void;
	handleToggleBlock: (userId: number, isBlocked: boolean) => void;
	isLoading?: boolean;
}

// Colores por área (soporta dark mode)
const roleColorFor = (roleName: string | undefined): string => {
	if (!roleName) return "bg-muted text-muted-foreground border-border";
	const n = roleName.toLowerCase();
	if (/(legal|abogad|asistente_legal|coordinador_legal)/.test(n))
		return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
	if (/(ventas|ejecutiv|representante_vent|analista_vent|gerente_vent)/.test(n))
		return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
	if (/(contable|financier|contador|tesorer|auditor)/.test(n))
		return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
	if (/(marketing|contenid|disenador|investigador_merc)/.test(n))
		return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800";
	if (/(it|sistemas|desarrollador|soporte_tecnico)/.test(n))
		return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800";
	if (/(admin|ceo|coo|director_general|gerente_general)/.test(n))
		return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
	return "bg-muted text-muted-foreground border-border";
};

const getInitials = (name: string): string => {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
					<MapPin className="h-5 w-5 text-muted-foreground" />
				</div>
				<p className="text-sm font-medium text-foreground">No se encontraron miembros</p>
				<p className="text-xs text-muted-foreground mt-1">
					{hasActiveFilters
						? "Probá quitar algunos filtros para ver más resultados"
						: "Todavía no hay miembros cargados"}
				</p>
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
				<TableRow className="hover:bg-transparent">
					<TableHead>Miembro</TableHead>
					<TableHead>Rol</TableHead>
					<TableHead>Contacto</TableHead>
					<TableHead>Ubicación</TableHead>
					<TableHead>Estado</TableHead>
					<TableHead className="text-right">Acciones</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{[...members]
					.sort((a, b) => a.id - b.id)
					.map((member) => {
						const role = member.roleUser?.[0]?.role;
						const location = [
							member.userAddresses?.[0]?.city,
							member.userAddresses?.[0]?.state?.name,
						]
							.filter(Boolean)
							.join(", ");
						return (
							<TableRow
								key={member.id}
								className="group transition-colors hover:bg-muted/40"
							>
								<TableCell>
									<div className="flex items-center gap-3">
										<Avatar>
											{member.image && (
												<AvatarImage src={member.image} alt={member.name} />
											)}
											<AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-medium">
												{getInitials(member.name)}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col min-w-0">
											<span className="font-medium text-foreground truncate">
												{member.name}
											</span>
											<span className="text-xs text-muted-foreground truncate">
												{member.email || "Sin email"}
											</span>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Badge
										variant="outline"
										className={`font-medium ${roleColorFor(role?.name)}`}
									>
										{role?.displayName || role?.name || "—"}
									</Badge>
								</TableCell>
								<TableCell>
									<span className="text-sm text-muted-foreground">
										{member.userProfile?.phone || "—"}
									</span>
								</TableCell>
								<TableCell>
									{location ? (
										<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
											<MapPin className="h-3.5 w-3.5 shrink-0" />
											<span className="truncate">{location}</span>
										</div>
									) : (
										<span className="text-sm text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell>
									{member.isBlocked ? (
										<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
											<span className="h-1.5 w-1.5 rounded-full bg-destructive" />
											Bloqueado
										</span>
									) : (
										<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
											<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
											Activo
										</span>
									)}
								</TableCell>
								<TableCell>
									<div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
										<Button
											size="icon"
											variant="ghost"
											onClick={() => handleEdit(member)}
											title="Editar"
											className="h-8 w-8"
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Can role={EMPLOYMENT_ALLOWED_ROLES}>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => router.push(`/admin/rrhh/${member.id}`)}
												title="Ficha RRHH"
												className="h-8 w-8"
											>
												<Briefcase className="h-3.5 w-3.5" />
											</Button>
										</Can>
										<Button
											size="icon"
											variant="ghost"
											onClick={() =>
												router.push(
													`/admin/activity-logs?userId=${member.id}&userName=${encodeURIComponent(member.name)}`,
												)
											}
											title="Ver historial"
											className="h-8 w-8"
										>
											<Activity className="h-3.5 w-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() =>
												handleToggleBlock(member.id, !member.isBlocked)
											}
											title={member.isBlocked ? "Desbloquear" : "Bloquear"}
											className={`h-8 w-8 ${member.isBlocked ? "text-destructive hover:text-destructive" : ""}`}
										>
											{member.isBlocked ? (
												<Unlock className="h-3.5 w-3.5" />
											) : (
												<Lock className="h-3.5 w-3.5" />
											)}
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => handleDelete(member.id)}
											title="Eliminar"
											className="h-8 w-8 text-destructive hover:text-destructive"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						);
					})}
			</TableBody>
		</Table>
	);
}
