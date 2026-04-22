"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	EMPLOYMENT_BY_USER_ENDPOINT,
	SETTINGS_ROLES_ENDPOINT,
} from "@/constant/api-endpoints";

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

const toInputDate = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

// Áreas del negocio — las opciones fijas del selector
const AREAS = ["Legal", "Ventas", "Contable", "Marketing", "IT", "Dirección"] as const;
type Area = (typeof AREAS)[number];

// Deriva el área desde el nombre (slug) del rol
const areaFromRoleName = (roleName?: string | null): Area | "" => {
	if (!roleName) return "";
	const n = roleName.toLowerCase();
	if (/(legal|abogad|asistente_legal|coordinador_legal)/.test(n)) return "Legal";
	if (/(ventas|ejecutiv|representante_vent|analista_vent|gerente_vent)/.test(n)) return "Ventas";
	if (/(contable|financier|contador|tesorer|auditor)/.test(n)) return "Contable";
	if (/(marketing|contenid|disenador|investigador_merc)/.test(n)) return "Marketing";
	if (/(it|sistemas|desarrollador|soporte_tecnico)/.test(n)) return "IT";
	if (/(admin|ceo|coo|director_general|gerente_general)/.test(n)) return "Dirección";
	return "";
};

interface EmploymentDataFormProps {
	userId: number;
	roleName?: string | null;
	roleDisplayName?: string | null;
	onRemoved?: () => void;
	onSaved?: () => void;
}

export default function EmploymentDataForm({
	userId,
	roleName,
	roleDisplayName,
	onRemoved,
	onSaved,
}: EmploymentDataFormProps) {
	const { data: session } = useSession();
	const [data, setData] = useState<EmploymentData>(EMPTY);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [exists, setExists] = useState(false);
	const [availableRoles, setAvailableRoles] = useState<
		{ id: number; name: string; displayName: string | null }[]
	>([]);

	const token = session?.user?.accessToken;

	// Cargar roles disponibles para el select de Puesto
	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		fetch(`${SETTINGS_ROLES_ENDPOINT}?limit=10000`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled || !json) return;
				const list = Array.isArray(json) ? json : json.data || [];
				setAvailableRoles(list);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [token]);

	useEffect(() => {
		if (!userId || !token) return;

		let cancelled = false;
		setIsLoading(true);
		setData(EMPTY);
		setExists(false);

		fetch(EMPLOYMENT_BY_USER_ENDPOINT(userId), {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled || !json?.data) return;
				const emp = json.data.employment;
				// Rol: primero del response (backend nuevo); si no vino, usa los props
				const responseRole = json.data.roleUser?.[0]?.role;
				const rolePosition =
					responseRole?.displayName || roleDisplayName || "";
				const roleArea = areaFromRoleName(
					responseRole?.name || roleName || "",
				);

				if (emp) {
					setExists(true);
					setData({
						cuil: emp.cuil || "",
						hireDate: toInputDate(emp.hireDate),
						terminationDate: toInputDate(emp.terminationDate),
						position: emp.position || rolePosition,
						area: emp.area || roleArea,
						collectiveAgreement: emp.collectiveAgreement || "",
						healthInsurance: emp.healthInsurance || "",
						artProvider: emp.artProvider || "",
						baseSalary: emp.baseSalary?.toString() || "",
						status: (emp.status as EmploymentStatus) || "ACTIVE",
					});
				} else {
					// Sin ficha aún → pre-cargar solo puesto/área desde el rol
					setData((d) => ({
						...d,
						position: rolePosition,
						area: roleArea,
					}));
				}
			})
			.catch(() => toast.error("Error al cargar datos laborales"))
			.finally(() => !cancelled && setIsLoading(false));

		return () => {
			cancelled = true;
		};
	}, [userId, token, roleName, roleDisplayName]);

	const handleSave = async () => {
		if (!token) return;
		setIsSaving(true);
		try {
			const res = await fetch(EMPLOYMENT_BY_USER_ENDPOINT(userId), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
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
			setExists(true);
			onSaved?.();
		} catch {
			toast.error("Error al guardar datos laborales");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!token) return;
		if (!confirm("¿Quitar la ficha laboral de este usuario?")) return;
		setIsDeleting(true);
		try {
			const res = await fetch(EMPLOYMENT_BY_USER_ENDPOINT(userId), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Ficha laboral eliminada");
			onRemoved?.();
		} catch {
			toast.error("Error al eliminar");
		} finally {
			setIsDeleting(false);
		}
	};

	const set = <K extends keyof EmploymentData>(k: K, v: EmploymentData[K]) =>
		setData((d) => ({ ...d, [k]: v }));

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-10">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
					<Select
						value={data.position || ""}
						onValueChange={(v) => set("position", v)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Seleccioná un puesto" />
						</SelectTrigger>
						<SelectContent>
							{availableRoles.length === 0 && data.position && (
								<SelectItem value={data.position}>{data.position}</SelectItem>
							)}
							{availableRoles.map((r) => (
								<SelectItem
									key={r.id}
									value={r.displayName || r.name}
								>
									{r.displayName || r.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Área / Departamento</Label>
					<Select
						value={data.area || ""}
						onValueChange={(v) => set("area", v)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Seleccioná un área" />
						</SelectTrigger>
						<SelectContent>
							{AREAS.map((a) => (
								<SelectItem key={a} value={a}>
									{a}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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

			<div className="flex items-center justify-between pt-4 border-t border-border">
				{exists ? (
					<Button
						type="button"
						variant="outline"
						onClick={handleDelete}
						disabled={isDeleting || isSaving}
						className="text-destructive hover:text-destructive"
					>
						{isDeleting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="mr-2 h-4 w-4" />
						)}
						Quitar ficha
					</Button>
				) : (
					<div />
				)}
				<Button type="button" onClick={handleSave} disabled={isSaving}>
					{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					{exists ? "Guardar cambios" : "Crear ficha"}
				</Button>
			</div>
		</div>
	);
}
