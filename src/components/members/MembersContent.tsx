"use client";
import {
	Activity,
	Filter,
	Plus,
	Scale,
	Search,
	UserCog,
	Users,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	SETTINGS_COUNTRIES_ENDPOINT,
	SETTINGS_ROLES_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import type { User } from "@/types/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/shared/Pagination";
import MembersTable from "./MembersTable";
import RoleMultiSelect from "./RoleMultiSelect";

// Roles internos del equipo
const INTERNAL_TEAM_ROLES = [
	"admin",
	"director_general_ceo",
	"gerente_general_coo",
	"directora_area_legal",
	"coordinador_legal",
	"abogado_representante",
	"abogado_interno",
	"asistente_legal",
	"director_area_it",
	"coordinador_it",
	"administrador_sistemas",
	"desarrollador_software",
	"soporte_tecnico",
	"directora_area_ventas",
	"coordinador_ventas",
	"gerente_ventas",
	"ejecutivo_ventas",
	"representante_ventas",
	"analista_ventas",
	"directora_area_marketing",
	"coordinador_marketing",
	"director_marketing",
	"especialista_marketing_digital",
	"disenador_grafico",
	"investigador_mercado",
	"gestor_contenidos",
	"directora_area_contable",
	"coordinador_financiero",
	"director_financiero",
	"contador_senior",
	"analista_financiero",
	"tesorero",
	"auditor_interno",
];

// Roles legales/abogados
const LAWYER_ROLES = [
	"directora_area_legal",
	"coordinador_legal",
	"abogado_representante",
	"abogado_interno",
	"asistente_legal",
];

type TabType = "all" | "lawyers" | "staff";

function getRoleIdentifier(member: any): string {
	return (
		member.roleUser?.[0]?.role?.slug?.toLowerCase() ||
		member.roleUser?.[0]?.role?.name?.toLowerCase() ||
		""
	);
}

function isInternalTeamMember(member: any): boolean {
	return INTERNAL_TEAM_ROLES.includes(getRoleIdentifier(member));
}

function isLawyer(member: any): boolean {
	return LAWYER_ROLES.includes(getRoleIdentifier(member));
}

export default function MembersContent() {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const router = useRouter();
	const [allMembers, setAllMembers] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<User | null>(null);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");
	const [newMemberPassword, setNewMemberPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [availableRoles, setAvailableRoles] = useState<any[]>([]);
	const [availableCountries, setAvailableCountries] = useState<any[]>([]);
	const [availableStates, setAvailableStates] = useState<any[]>([]);
	const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
		null,
	);

	const isInitialRender = useRef(true);

	// Stats - solo miembros internos
	const memberStats = useMemo(() => {
		const internalMembers = allMembers.filter(isInternalTeamMember);
		return {
			total: internalMembers.length,
			lawyers: internalMembers.filter(isLawyer).length,
			staff: internalMembers.filter((m) => !isLawyer(m)).length,
		};
	}, [allMembers]);

	// Filtrado - solo miembros internos, sin clientes
	const filteredMembers = useMemo(() => {
		let filtered = allMembers.filter(isInternalTeamMember);

		if (activeTab === "lawyers") {
			filtered = filtered.filter(isLawyer);
		} else if (activeTab === "staff") {
			filtered = filtered.filter((m) => !isLawyer(m));
		}

		if (searchTerm.trim()) {
			const q = searchTerm.toLowerCase().trim();
			filtered = filtered.filter(
				(m) =>
					m.name?.toLowerCase().includes(q) ||
					m.email?.toLowerCase().includes(q) ||
					m.roleUser?.[0]?.role?.displayName?.toLowerCase().includes(q),
			);
		}

		if (selectedRoles.length > 0) {
			filtered = filtered.filter((m) =>
				m.roleUser?.some((ru: any) =>
					selectedRoles.includes(ru.roleId?.toString()),
				),
			);
		}

		return filtered;
	}, [allMembers, searchTerm, selectedRoles, activeTab]);

	const hasActiveFilters = Boolean(
		searchTerm.trim() || selectedRoles.length > 0 || activeTab !== "all",
	);

	const ITEMS_PER_PAGE = 10;

	const paginatedMembers = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredMembers, currentPage]);

	const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1;

	// Fetch members
	const fetchAllMembers = useCallback(async () => {
		try {
			setIsLoading(true);
			const url = new URL(`${USERS_ENDPOINT}`, window.location.origin);
			url.searchParams.append("page", "1");
			url.searchParams.append("limit", "100");

			const response = await fetch(url.toString(), {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) throw new Error("Failed to fetch members");

			const result = await response.json();
			setAllMembers(result.data);
		} catch (error) {
			console.error("Error fetching members:", error);
			toast.error("Error al cargar el equipo");
		} finally {
			setIsLoading(false);
		}
	}, [session?.user?.accessToken]);

	const fetchRoles = useCallback(async () => {
		try {
			const response = await fetch(`${SETTINGS_ROLES_ENDPOINT}?limit=10000`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (response.ok) {
				const result = await response.json();
				const internalRoles = (result.data || []).filter((role: any) => {
					const slug =
						role.slug?.toLowerCase() || role.name?.toLowerCase() || "";
					return INTERNAL_TEAM_ROLES.includes(slug);
				});
				setAvailableRoles(internalRoles);
			}
		} catch (error) {
			console.error("Error fetching roles:", error);
		}
	}, [session?.user?.accessToken]);

	const fetchCountries = useCallback(async () => {
		try {
			const response = await fetch(
				`${SETTINGS_COUNTRIES_ENDPOINT}?limit=10000`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);
			if (response.ok) {
				const result = await response.json();
				setAvailableCountries(result.data || []);
			}
		} catch (error) {
			console.error("Error fetching countries:", error);
		}
	}, [session?.user?.accessToken]);

	const fetchStatesByCountry = useCallback(
		async (countryId: number) => {
			try {
				const response = await fetch(
					`${SETTINGS_COUNTRIES_ENDPOINT}/${countryId}/states?limit=10000`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
					},
				);
				if (response.ok) {
					const result = await response.json();
					setAvailableStates(result.data || []);
				}
			} catch (error) {
				console.error("Error fetching states:", error);
				setAvailableStates([]);
			}
		},
		[session?.user?.accessToken],
	);

	useEffect(() => {
		if (isInitialRender.current && session?.user?.accessToken) {
			fetchAllMembers();
			fetchRoles();
			fetchCountries();
			isInitialRender.current = false;
		}
	}, [fetchAllMembers, fetchRoles, fetchCountries, session?.user?.accessToken]);

	useEffect(() => {
		if (editingMember?.userAddresses?.[0]?.countryId) {
			const countryId = editingMember.userAddresses[0].countryId;
			setSelectedCountryId(countryId);
			fetchStatesByCountry(countryId);
		}
	}, [editingMember?.userAddresses, fetchStatesByCountry]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedRoles, activeTab]);

	// Handlers
	const handleDelete = useCallback(
		async (id: number) => {
			if (!(await confirm({ description: "¿Estás seguro de que deseas eliminar este miembro?", confirmLabel: "Eliminar" })))
				return;
			try {
				const response = await fetch(`${USERS_ENDPOINT}/${id}`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});
				if (!response.ok) throw new Error("Failed to delete user");
				toast.success("Miembro eliminado correctamente");
				await fetchAllMembers();
			} catch (error) {
				console.error("Error al eliminar el miembro:", error);
				toast.error("Error al eliminar el miembro");
			}
		},
		[session?.user?.accessToken, fetchAllMembers, confirm],
	);

	const handleToggleBlock = useCallback(
		async (userId: number, isBlocked: boolean) => {
			const action = isBlocked ? "bloquear" : "desbloquear";
			if (!(await confirm({ description: `¿Estás seguro de que deseas ${action} este usuario?`, confirmLabel: "Continuar", variant: "default" })))
				return;
			try {
				const response = await fetch(`${USERS_ENDPOINT}/${userId}/block`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({ isBlocked }),
				});
				if (!response.ok) throw new Error(`Failed to ${action} user`);
				const data = await response.json();
				toast.success(
					data.message ||
						`Usuario ${isBlocked ? "bloqueado" : "desbloqueado"} correctamente`,
				);
				setAllMembers((prev) =>
					prev.map((m) => (m.id === userId ? { ...m, isBlocked } : m)),
				);
			} catch (error) {
				console.error(`Error al ${action} el usuario:`, error);
				toast.error(`Error al ${action} el usuario`);
			}
		},
		[session?.user?.accessToken, confirm],
	);

	const handleClearSearch = useCallback(() => {
		setSearchTerm("");
		setSelectedRoles([]);
		setShowFilters(false);
		setCurrentPage(1);
	}, []);

	const handleEdit = useCallback((member: User) => {
		setEditingMember(member);
		setNewMemberPassword("");
		setConfirmPassword("");
		setModalMode("edit");
		setDialogOpen(true);
	}, []);

	const closeDialog = useCallback(() => {
		setDialogOpen(false);
		setEditingMember(null);
		setNewMemberPassword("");
		setConfirmPassword("");
		setModalMode("create");
	}, []);

	const handleCreateMember = useCallback(async () => {
		if (!editingMember) return;
		if (!editingMember.name?.trim()) {
			toast.error("El nombre es requerido");
			return;
		}
		if (!editingMember.email?.trim()) {
			toast.error("El email es requerido");
			return;
		}
		if (!newMemberPassword || newMemberPassword.length < 6) {
			toast.error("La contraseña debe tener al menos 6 caracteres");
			return;
		}
		if (newMemberPassword !== confirmPassword) {
			toast.error("Las contraseñas no coinciden");
			return;
		}
		if (!editingMember.roleUser?.[0]?.roleId) {
			toast.error("Debes seleccionar un rol");
			return;
		}

		try {
			const createData = {
				name: editingMember.name,
				email: editingMember.email,
				password: newMemberPassword,
				image: editingMember.image || "",
				role: editingMember.roleUser?.[0]?.roleId,
				userProfile: {
					birthDate:
						editingMember.userProfile?.birthDate || new Date().toISOString(),
					docType: editingMember.userProfile?.docType || 1,
					docNumber: editingMember.userProfile?.docNumber || "",
					gender: editingMember.userProfile?.gender || 1,
					phone: editingMember.userProfile?.phone || "",
				},
				userAddresses:
					editingMember.userAddresses && editingMember.userAddresses.length > 0
						? editingMember.userAddresses.map((addr) => ({
								street: addr.street || "",
								streetNumber: addr.streetNumber || "",
								city: addr.city || "",
								stateId: addr.stateId || 1,
								countryId: addr.countryId || 1,
								cp: addr.cp || "",
								description: addr.description || "",
								isDefault: addr.isDefault !== undefined ? addr.isDefault : true,
							}))
						: [
								{
									street: "",
									streetNumber: "",
									city: "",
									stateId: 1,
									countryId: 1,
									cp: "",
									description: "",
									isDefault: true,
								},
							],
			};

			const response = await fetch(`${USERS_ENDPOINT}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(createData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al crear el miembro");
			}

			toast.success("Miembro creado correctamente");
			closeDialog();
			await fetchAllMembers();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Error al crear el miembro",
			);
		}
	}, [
		editingMember,
		newMemberPassword,
		confirmPassword,
		session?.user?.accessToken,
		fetchAllMembers,
		closeDialog,
	]);

	const handleUpdateMember = useCallback(async () => {
		if (!editingMember) return;
		if (!editingMember.name?.trim()) {
			toast.error("El nombre es requerido");
			return;
		}
		if (!editingMember.email?.trim()) {
			toast.error("El email es requerido");
			return;
		}

		try {
			const updateData = {
				name: editingMember.name,
				email: editingMember.email,
				image: editingMember.image,
				role: editingMember.roleUser?.[0]?.roleId,
				userProfile: {
					birthDate:
						editingMember.userProfile?.birthDate || new Date().toISOString(),
					docType: editingMember.userProfile?.docType || 1,
					docNumber: editingMember.userProfile?.docNumber || "",
					gender: editingMember.userProfile?.gender || 1,
					phone: editingMember.userProfile?.phone || "",
				},
				userAddresses:
					editingMember.userAddresses && editingMember.userAddresses.length > 0
						? editingMember.userAddresses.map((addr) => ({
								street: addr.street || "",
								streetNumber: addr.streetNumber || "",
								city: addr.city || "",
								stateId: addr.stateId,
								countryId: addr.countryId,
								cp: addr.cp || "",
								description: addr.description || "",
								isDefault: addr.isDefault,
							}))
						: [
								{
									street: "",
									streetNumber: "",
									city: "",
									stateId: editingMember.userAddresses?.[0]?.stateId || 1,
									countryId: editingMember.userAddresses?.[0]?.countryId || 1,
									cp: "",
									description: "",
									isDefault: true,
								},
							],
			};

			const response = await fetch(`${USERS_ENDPOINT}/${editingMember.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(updateData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || "Error al actualizar el miembro",
				);
			}

			toast.success("Miembro actualizado correctamente");
			closeDialog();
			await fetchAllMembers();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Error al actualizar el miembro",
			);
		}
	}, [editingMember, session?.user?.accessToken, fetchAllMembers, closeDialog]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (modalMode === "create") handleCreateMember();
		else handleUpdateMember();
	};

	const openCreateDialog = () => {
		setEditingMember({
			id: 0,
			name: "",
			email: "",
			image: "",
			userProfile: {
				phone: "",
				docType: 1,
				docNumber: "",
				gender: 1,
				birthDate: new Date().toISOString(),
			},
			userAddresses: [
				{
					street: "",
					streetNumber: "",
					city: "",
					stateId: 0,
					countryId: 0,
					cp: "",
					description: "",
					isDefault: true,
				},
			],
			roleUser: [],
		} as any);
		setNewMemberPassword("");
		setConfirmPassword("");
		setModalMode("create");
		setDialogOpen(true);
	};

	// Skeleton loading
	if (isLoading) {
		return (
			<div className="flex flex-col gap-6">
				{/* Header skeleton */}
				<div className="flex items-center justify-between">
					<Skeleton className="h-9 w-32" />
					<div className="flex gap-2">
						<Skeleton className="h-10 w-44" />
						<Skeleton className="h-10 w-36" />
					</div>
				</div>

				{/* Stats cards skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[...Array(3)].map((_, i) => (
						<Card key={i} className="border-l-4 border-l-muted">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-4 rounded-full" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-12" />
							</CardContent>
						</Card>
					))}
				</div>

				{/* Tabs + search skeleton */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div className="flex gap-1">
						<Skeleton className="h-9 w-24 rounded-md" />
						<Skeleton className="h-9 w-28 rounded-md" />
						<Skeleton className="h-9 w-24 rounded-md" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-10 w-75 rounded-md" />
						<Skeleton className="h-10 w-10 rounded-md" />
					</div>
				</div>

				{/* Table skeleton with team member rows */}
				<div className="rounded-lg border bg-card">
					{/* Table header */}
					<div className="flex items-center gap-4 px-4 py-3 border-b">
						<Skeleton className="h-4 w-8" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-40 hidden md:block" />
						<Skeleton className="h-4 w-24 hidden md:block" />
						<Skeleton className="h-4 w-20 hidden lg:block" />
						<Skeleton className="h-4 w-16 ml-auto" />
					</div>
					{/* Table rows with avatar, name, role */}
					{[...Array(8)].map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
						>
							<Skeleton className="h-10 w-10 rounded-full shrink-0" />
							<div className="flex flex-col gap-1.5 flex-1">
								<Skeleton className="h-4 w-36" />
								<Skeleton className="h-3 w-48" />
							</div>
							<Skeleton className="h-6 w-28 rounded-full hidden md:block" />
							<Skeleton className="h-4 w-20 hidden lg:block" />
							<Skeleton className="h-8 w-8 rounded-md ml-auto" />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					Equipo
				</h1>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={() => router.push("/admin/activity-logs")}
					>
						<Activity className="h-4 w-4 mr-2" />
						Historial de sesiones
					</Button>
					<Button onClick={openCreateDialog}>
						<Plus className="h-4 w-4 mr-2" />
						Nuevo miembro
					</Button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="border-l-4 border-l-blue-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Equipo
						</CardTitle>
						<Users className="h-4 w-4 text-blue-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{memberStats.total}
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-purple-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Abogados
						</CardTitle>
						<Scale className="h-4 w-4 text-purple-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{memberStats.lawyers}
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-orange-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Personal
						</CardTitle>
						<UserCog className="h-4 w-4 text-orange-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{memberStats.staff}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs + Search */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as TabType)}
					>
						<TabsList>
							<TabsTrigger value="all">
								Todos
								<Badge variant="secondary" className="ml-2">
									{memberStats.total}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value="lawyers">
								Abogados
								<Badge variant="secondary" className="ml-2">
									{memberStats.lawyers}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value="staff">
								Personal
								<Badge variant="secondary" className="ml-2">
									{memberStats.staff}
								</Badge>
							</TabsTrigger>
						</TabsList>
					</Tabs>

					<div className="flex items-center gap-2">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Buscar por nombre, email o rol..."
								className="pl-9 w-75"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setShowFilters(!showFilters)}
							className={
								selectedRoles.length > 0
									? "border-primary text-primary"
									: ""
							}
						>
							<Filter className="h-4 w-4" />
						</Button>
						{hasActiveFilters && (
							<Button variant="ghost" size="sm" onClick={handleClearSearch}>
								<X className="h-4 w-4 mr-1" />
								Limpiar
							</Button>
						)}
					</div>
				</div>

				{/* Filters panel */}
				{showFilters && (
					<Card>
						<CardContent className="pt-4">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<RoleMultiSelect
									label="Filtrar por roles"
									defaultSelected={selectedRoles}
									onChange={(roles) => {
										setSelectedRoles(roles);
										setCurrentPage(1);
									}}
								/>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Active filter chips */}
				{hasActiveFilters && (
					<div className="flex flex-wrap gap-2 items-center">
						<span className="text-xs font-medium text-muted-foreground">
							Filtros activos:
						</span>
						{searchTerm && (
							<Badge variant="secondary" className="gap-1">
								<Search className="h-3 w-3" />
								{searchTerm}
								<button
									onClick={() => setSearchTerm("")}
									className="ml-1 hover:text-foreground"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						)}
						{selectedRoles.length > 0 && (
							<Badge variant="secondary" className="gap-1">
								<Filter className="h-3 w-3" />
								{selectedRoles.length} rol(es)
								<button
									onClick={() => setSelectedRoles([])}
									className="ml-1 hover:text-foreground"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						)}
					</div>
				)}
			</div>

			{/* Table */}
			<div className="rounded-lg border bg-card">
				<div>
					<MembersTable
						members={paginatedMembers}
						hasActiveFilters={hasActiveFilters}
						handleClearSearch={handleClearSearch}
						handleEdit={handleEdit}
						handleDelete={handleDelete}
						handleToggleBlock={handleToggleBlock}
						isLoading={false}
					/>
				</div>
			</div>

			{/* Pagination */}
			{filteredMembers.length > ITEMS_PER_PAGE && (
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredMembers.length}
					itemsPerPage={ITEMS_PER_PAGE}
					onPageChange={setCurrentPage}
				/>
			)}

			{/* Dialog crear/editar miembro */}
			<Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{modalMode === "create"
								? "Crear Nuevo Miembro"
								: `Editar: ${editingMember?.name || ""}`}
						</DialogTitle>
						<DialogDescription className="sr-only">Formulario para gestionar un miembro del equipo</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="md:col-span-2">
								<Label>Nombre completo *</Label>
								<Input
									value={editingMember?.name || ""}
									onChange={(e) =>
										setEditingMember((prev) =>
											prev ? { ...prev, name: e.target.value } : null,
										)
									}
									placeholder="Ej: Juan Pérez"
								/>
							</div>

							<div>
								<Label>Email *</Label>
								<Input
									type="email"
									value={editingMember?.email || ""}
									onChange={(e) =>
										setEditingMember((prev) =>
											prev ? { ...prev, email: e.target.value } : null,
										)
									}
									placeholder="ejemplo@email.com"
								/>
							</div>

							<div>
								<Label>Teléfono</Label>
								<Input
									type="tel"
									value={editingMember?.userProfile?.phone || ""}
									onChange={(e) =>
										setEditingMember((prev) => {
											if (!prev) return null;
											return {
												...prev,
												userProfile: {
													...(prev.userProfile || {}),
													phone: e.target.value,
												} as any,
											};
										})
									}
									placeholder="+54 9 11 1234-5678"
								/>
							</div>

							<div className="md:col-span-2">
								<Label>Rol *</Label>
								<Select
									value={
										editingMember?.roleUser?.[0]?.roleId?.toString() || ""
									}
									onValueChange={(value) =>
										setEditingMember((prev) =>
											prev
												? {
														...prev,
														roleUser: [
															{
																...prev.roleUser?.[0],
																roleId: parseInt(value),
															},
														],
													}
												: null,
										)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar rol..." />
									</SelectTrigger>
									<SelectContent>
										{availableRoles.map((role) => (
											<SelectItem key={role.id} value={role.id.toString()}>
												{role.displayName || role.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{modalMode === "create" && (
								<>
									<div>
										<Label>Contraseña *</Label>
										<Input
											type="password"
											value={newMemberPassword}
											onChange={(e) => setNewMemberPassword(e.target.value)}
											placeholder="Mínimo 6 caracteres"
										/>
									</div>
									<div>
										<Label>Confirmar Contraseña *</Label>
										<Input
											type="password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											placeholder="Repite la contraseña"
										/>
										{confirmPassword &&
											newMemberPassword !== confirmPassword && (
												<p className="text-xs text-destructive mt-1">
													Las contraseñas no coinciden
												</p>
											)}
									</div>
								</>
							)}
						</div>

						{/* Ubicación */}
						<div>
							<h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">
								Ubicación
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label>País *</Label>
									<Select
										value={
											editingMember?.userAddresses?.[0]?.countryId?.toString() ||
											""
										}
										onValueChange={(value) => {
											const countryId = parseInt(value);
											setSelectedCountryId(countryId);
											fetchStatesByCountry(countryId);
											setEditingMember((prev) => {
												if (!prev?.userAddresses?.length) return prev;
												const addrs = [...prev.userAddresses];
												addrs[0] = {
													...addrs[0],
													countryId,
													stateId: 0,
												};
												return { ...prev, userAddresses: addrs };
											});
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Seleccionar país..." />
										</SelectTrigger>
										<SelectContent>
											{availableCountries.map((c) => (
												<SelectItem key={c.id} value={c.id.toString()}>
													{c.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label>Provincia/Estado *</Label>
									<Select
										value={
											editingMember?.userAddresses?.[0]?.stateId?.toString() ||
											""
										}
										onValueChange={(value) => {
											setEditingMember((prev) => {
												if (!prev?.userAddresses?.length) return prev;
												const addrs = [...prev.userAddresses];
												addrs[0] = {
													...addrs[0],
													stateId: parseInt(value),
												};
												return { ...prev, userAddresses: addrs };
											});
										}}
										disabled={!selectedCountryId}
									>
										<SelectTrigger>
											<SelectValue placeholder="Seleccionar provincia..." />
										</SelectTrigger>
										<SelectContent>
											{availableStates.map((s) => (
												<SelectItem key={s.id} value={s.id.toString()}>
													{s.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{!selectedCountryId && (
										<p className="text-xs text-muted-foreground mt-1">
											Primero selecciona un país
										</p>
									)}
								</div>

								<div>
									<Label>Dirección (Calle)</Label>
									<Input
										value={editingMember?.userAddresses?.[0]?.street || ""}
										onChange={(e) => {
											setEditingMember((prev) => {
												if (!prev?.userAddresses?.length) return prev;
												const addrs = [...prev.userAddresses];
												addrs[0] = { ...addrs[0], street: e.target.value };
												return { ...prev, userAddresses: addrs };
											});
										}}
										placeholder="Calle y número"
									/>
								</div>

								<div>
									<Label>Ciudad</Label>
									<Input
										value={editingMember?.userAddresses?.[0]?.city || ""}
										onChange={(e) => {
											setEditingMember((prev) => {
												if (!prev?.userAddresses?.length) return prev;
												const addrs = [...prev.userAddresses];
												addrs[0] = { ...addrs[0], city: e.target.value };
												return { ...prev, userAddresses: addrs };
											});
										}}
										placeholder="Ciudad"
									/>
								</div>
							</div>
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeDialog}>
								Cancelar
							</Button>
							<Button type="submit">
								{modalMode === "create" ? "Crear Miembro" : "Guardar Cambios"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		{ConfirmationDialog}
		</div>
	);
}
