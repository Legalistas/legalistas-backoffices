"use client";

import { Briefcase, Clock, FileText, Loader2, Palmtree, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYMENT_BY_USER_ENDPOINT } from "@/constant/api-endpoints";
import AttendanceTab from "./AttendanceTab";
import ContractsTab from "./ContractsTab";
import LeavesTab from "./LeavesTab";

type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";

interface EmploymentData {
	cuil: string;
	hireDate: string;
	terminationDate: string;
	position: string;
	area: string;
	collectiveAgreement: string;
	healthInsurance: string;
	artProvider: string;
	baseSalary: string;
	status: EmploymentStatus;
}

const EMPTY: EmploymentData = {
	cuil: "",
	hireDate: "",
	terminationDate: "",
	position: "",
	area: "",
	collectiveAgreement: "",
	healthInsurance: "",
	artProvider: "",
	baseSalary: "",
	status: "ACTIVE",
};

interface EmploymentDialogProps {
	open: boolean;
	onClose: () => void;
	userId: number | null;
	userName: string;
	onSaved?: () => void;
}

const toInputDate = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

export default function EmploymentDialog({
	open,
	onClose,
	userId,
	userName,
	onSaved,
}: EmploymentDialogProps) {
	const { data: session } = useSession();
	const [data, setData] = useState<EmploymentData>(EMPTY);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [exists, setExists] = useState(false);

	useEffect(() => {
		if (!open || !userId || !session?.user?.accessToken) return;

		let cancelled = false;
		setIsLoading(true);
		setData(EMPTY);
		setExists(false);

		fetch(EMPLOYMENT_BY_USER_ENDPOINT(userId), {
			headers: { Authorization: `Bearer ${session.user.accessToken}` },
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled || !json?.data) return;
				const emp = json.data.employment;
				if (emp) {
					setExists(true);
					setData({
						cuil: emp.cuil || "",
						hireDate: toInputDate(emp.hireDate),
						terminationDate: toInputDate(emp.terminationDate),
						position: emp.position || "",
						area: emp.area || "",
						collectiveAgreement: emp.collectiveAgreement || "",
						healthInsurance: emp.healthInsurance || "",
						artProvider: emp.artProvider || "",
						baseSalary: emp.baseSalary?.toString() || "",
						status: (emp.status as EmploymentStatus) || "ACTIVE",
					});
				}
			})
			.catch(() => toast.error("Error al cargar datos laborales"))
			.finally(() => !cancelled && setIsLoading(false));

		return () => {
			cancelled = true;
		};
	}, [open, userId, session?.user?.accessToken]);

	const handleSave = async () => {
		if (!userId || !session?.user?.accessToken) return;
		setIsSaving(true);
		try {
			const res = await fetch(EMPLOYMENT_BY_USER_ENDPOINT(userId), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
				body: JSON.stringify({
					...data,
					hireDate: data.hireDate || null,
					terminationDate: data.terminationDate || null,
					baseSalary: data.baseSalary || null,
				}),
			});
			if (!res.ok) throw new Error();
			toast.success("Datos laborales guardados");
			onSaved?.();
			onClose();
		} catch {
			toast.error("Error al guardar datos laborales");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!userId || !session?.user?.accessToken) return;
		if (!confirm("¿Quitar la ficha laboral de este usuario?")) return;
		setIsDeleting(true);
		try {
			const res = await fetch(EMPLOYMENT_BY_USER_ENDPOINT(userId), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${session.user.accessToken}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Ficha laboral eliminada");
			onSaved?.();
			onClose();
		} catch {
			toast.error("Error al eliminar");
		} finally {
			setIsDeleting(false);
		}
	};

	const set = <K extends keyof EmploymentData>(k: K, v: EmploymentData[K]) =>
		setData((d) => ({ ...d, [k]: v }));

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Briefcase className="h-5 w-5" />
						Ficha RRHH — {userName}
					</DialogTitle>
					<DialogDescription>
						Datos laborales, contratos y documentación del empleado.
					</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="data" className="w-full">
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="data">
							<Briefcase className="h-3.5 w-3.5 mr-1.5" />
							<span className="hidden sm:inline">Datos</span>
						</TabsTrigger>
						<TabsTrigger value="contracts" disabled={!userId}>
							<FileText className="h-3.5 w-3.5 mr-1.5" />
							<span className="hidden sm:inline">Contratos</span>
						</TabsTrigger>
						<TabsTrigger value="attendance" disabled={!userId}>
							<Clock className="h-3.5 w-3.5 mr-1.5" />
							<span className="hidden sm:inline">Asistencia</span>
						</TabsTrigger>
						<TabsTrigger value="leaves" disabled={!userId}>
							<Palmtree className="h-3.5 w-3.5 mr-1.5" />
							<span className="hidden sm:inline">Licencias</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="data" className="mt-4">
				{isLoading ? (
					<div className="flex items-center justify-center py-10">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
						<div className="space-y-2">
							<Label>CUIL / CUIT</Label>
							<Input
								value={data.cuil}
								onChange={(e) => set("cuil", e.target.value)}
								placeholder="20-12345678-9"
							/>
						</div>
						<div className="space-y-2">
							<Label>Estado</Label>
							<Select
								value={data.status}
								onValueChange={(v) => set("status", v as EmploymentStatus)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ACTIVE">Activo</SelectItem>
									<SelectItem value="ON_LEAVE">Licencia</SelectItem>
									<SelectItem value="SUSPENDED">Suspendido</SelectItem>
									<SelectItem value="TERMINATED">Desvinculado</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Fecha de ingreso</Label>
							<Input
								type="date"
								value={data.hireDate}
								onChange={(e) => set("hireDate", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Fecha de egreso</Label>
							<Input
								type="date"
								value={data.terminationDate}
								onChange={(e) => set("terminationDate", e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Puesto</Label>
							<Input
								value={data.position}
								onChange={(e) => set("position", e.target.value)}
								placeholder="Asistente legal"
							/>
						</div>
						<div className="space-y-2">
							<Label>Área / Departamento</Label>
							<Input
								value={data.area}
								onChange={(e) => set("area", e.target.value)}
								placeholder="Legal, Ventas, Contable..."
							/>
						</div>

						<div className="space-y-2 md:col-span-2">
							<Label>Convenio colectivo</Label>
							<Input
								value={data.collectiveAgreement}
								onChange={(e) => set("collectiveAgreement", e.target.value)}
								placeholder="CCT 130/75 — Empleados de Comercio"
							/>
						</div>

						<div className="space-y-2">
							<Label>Obra social</Label>
							<Input
								value={data.healthInsurance}
								onChange={(e) => set("healthInsurance", e.target.value)}
								placeholder="OSDE, Swiss Medical..."
							/>
						</div>
						<div className="space-y-2">
							<Label>ART</Label>
							<Input
								value={data.artProvider}
								onChange={(e) => set("artProvider", e.target.value)}
								placeholder="Galeno ART, Prevención..."
							/>
						</div>

						<div className="space-y-2 md:col-span-2">
							<Label>Sueldo básico (ARS)</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={data.baseSalary}
								onChange={(e) => set("baseSalary", e.target.value)}
								placeholder="0.00"
							/>
						</div>
					</div>
				)}

				<DialogFooter className="gap-2 sm:gap-0 mt-4">
					{exists && (
						<Button
							type="button"
							variant="outline"
							onClick={handleDelete}
							disabled={isDeleting || isSaving}
							className="text-destructive hover:text-destructive mr-auto"
						>
							{isDeleting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="mr-2 h-4 w-4" />
							)}
							Quitar ficha
						</Button>
					)}
					<Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
						Cancelar
					</Button>
					<Button type="button" onClick={handleSave} disabled={isSaving || isLoading}>
						{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{exists ? "Guardar cambios" : "Crear ficha"}
					</Button>
				</DialogFooter>
					</TabsContent>

					<TabsContent value="contracts" className="mt-4">
						{userId && <ContractsTab userId={userId} />}
					</TabsContent>

					<TabsContent value="attendance" className="mt-4">
						{userId && <AttendanceTab userId={userId} />}
					</TabsContent>

					<TabsContent value="leaves" className="mt-4">
						{userId && <LeavesTab userId={userId} />}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
