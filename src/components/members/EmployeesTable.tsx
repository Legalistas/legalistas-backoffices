"use client";

import { Briefcase, Trash2 } from "lucide-react";
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

interface EmployeesTableProps {
	employees: User[];
	hasActiveFilters: boolean;
	handleClearSearch: () => void;
	handleEmployment: (member: User) => void;
	handleRemoveEmployment: (member: User) => void;
}

const statusLabel: Record<NonNullable<User["employment"]>["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
	ACTIVE: { label: "Activo", variant: "default" },
	ON_LEAVE: { label: "Licencia", variant: "secondary" },
	SUSPENDED: { label: "Suspendido", variant: "outline" },
	TERMINATED: { label: "Desvinculado", variant: "destructive" },
};

const tenureLabel = (hireDate: string | null, terminationDate: string | null) => {
	if (!hireDate) return "—";
	const start = new Date(hireDate).getTime();
	const end = terminationDate ? new Date(terminationDate).getTime() : Date.now();
	const days = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
	if (days < 30) return `${days}d`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}m`;
	const years = Math.floor(months / 12);
	const remainderMonths = months % 12;
	return remainderMonths ? `${years}a ${remainderMonths}m` : `${years}a`;
};

const formatDate = (iso: string | null) =>
	iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export default function EmployeesTable({
	employees,
	hasActiveFilters,
	handleClearSearch,
	handleEmployment,
	handleRemoveEmployment,
}: EmployeesTableProps) {
	if (employees.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<p className="text-muted-foreground">
					{hasActiveFilters ? "No se encontraron empleados con esos filtros" : "No hay empleados con ficha laboral todavía"}
				</p>
				{hasActiveFilters && (
					<Button variant="link" onClick={handleClearSearch} className="mt-2">
						Limpiar filtros
					</Button>
				)}
				{!hasActiveFilters && (
					<p className="text-xs text-muted-foreground mt-2">
						Clickeá el icono 💼 desde las pestañas "Todos / Abogados / Personal" para crear la ficha.
					</p>
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
					<TableHead>Puesto</TableHead>
					<TableHead>Área</TableHead>
					<TableHead>CUIL</TableHead>
					<TableHead>Ingreso</TableHead>
					<TableHead>Antigüedad</TableHead>
					<TableHead>Estado</TableHead>
					<TableHead className="text-right">Acciones</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{[...employees]
					.sort((a, b) => a.id - b.id)
					.map((member) => {
						const emp = member.employment;
						if (!emp) return null;
						const status = statusLabel[emp.status] ?? statusLabel.ACTIVE;
						return (
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
									{emp.position || "—"}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{emp.area || "—"}
								</TableCell>
								<TableCell className="text-muted-foreground font-mono text-xs">
									{emp.cuil || "—"}
								</TableCell>
								<TableCell className="text-muted-foreground text-xs">
									{formatDate(emp.hireDate)}
								</TableCell>
								<TableCell className="text-muted-foreground text-xs">
									{tenureLabel(emp.hireDate, emp.terminationDate)}
								</TableCell>
								<TableCell>
									<Badge variant={status.variant}>{status.label}</Badge>
								</TableCell>
								<TableCell>
									<div className="flex items-center justify-end gap-1">
										<Button
											size="icon"
											variant="ghost"
											onClick={() => handleEmployment(member)}
											title="Editar ficha"
										>
											<Briefcase className="h-4 w-4" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => handleRemoveEmployment(member)}
											title="Quitar ficha"
											className="text-destructive hover:text-destructive"
										>
											<Trash2 className="h-4 w-4" />
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
