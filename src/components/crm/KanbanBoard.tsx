"use client";

import {
	DragDropContext,
	Draggable,
	Droppable,
	type DropResult,
} from "@hello-pangea/dnd";
import {
	Archive,
	Briefcase,
	CalendarCheck,
	CalendarClock,
	Clock,
	FileText,
	Handshake,
	KanbanSquare,
	List,
	ListFilterIcon as ListFilterPlus,
	Mail,
	MessageSquare,
	Plus,
	Search,
	SquareKanban,
	Trophy,
	Users,
	X,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import CrmMonthlyFilters from "@/components/crm/CrmMonthlyFilters";
import LeadCard from "@/components/crm/LeadCard";
import LeadFormDialog from "@/components/crm/LeadFormDialog";
import {
	LAWYERS_ENDPOINT,
	LEADS_ENDPOINT,
	SELLERS_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { CRM_COLUMNS } from "@/constant/crm";
// Add this import at the top of the file
import { Role } from "@/constant/user";

import { servicesType } from "@/lib/constant";
import type { Lead } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import Can from "../auth/Can";
import FilterCombobox from "./FilterCombobox";
import KanbanList from "./KanbanList";

const columnConfig: Record<string, { bg: string; color: string; borderColor: string; icon: typeof FileText }> = {
	"1":  { bg: "bg-sky-50", color: "text-sky-700", borderColor: "border-sky-200", icon: MessageSquare },
	"2":  { bg: "bg-amber-50", color: "text-amber-700", borderColor: "border-amber-200", icon: CalendarClock },
	"3":  { bg: "bg-orange-50", color: "text-orange-700", borderColor: "border-orange-200", icon: CalendarCheck },
	"4":  { bg: "bg-blue-50", color: "text-blue-700", borderColor: "border-blue-200", icon: Briefcase },
	"12": { bg: "bg-rose-50", color: "text-rose-700", borderColor: "border-rose-200", icon: Mail },
	"5":  { bg: "bg-purple-50", color: "text-purple-700", borderColor: "border-purple-200", icon: Clock },
	"6":  { bg: "bg-indigo-50", color: "text-indigo-700", borderColor: "border-indigo-200", icon: Handshake },
	"7":  { bg: "bg-teal-50", color: "text-teal-700", borderColor: "border-teal-200", icon: Users },
	"8":  { bg: "bg-cyan-50", color: "text-cyan-700", borderColor: "border-cyan-200", icon: FileText },
	"9":  { bg: "bg-green-50", color: "text-green-700", borderColor: "border-green-200", icon: Trophy },
	"10": { bg: "bg-red-50", color: "text-red-700", borderColor: "border-red-200", icon: XCircle },
	"11": { bg: "bg-gray-50", color: "text-gray-600", borderColor: "border-gray-200", icon: Archive },
};

const defaultColumnConfig = { bg: "bg-gray-50", color: "text-gray-600", borderColor: "border-gray-200", icon: KanbanSquare };

// Tipos para los filtros

type LawyerType = {
	id: string;
	value: string;
	label: string;
};

export default function KanbanBoard() {
	const { data: session } = useSession();
	const [leads, setLeads] = useState<Lead[]>([]);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [currentLead, setCurrentLead] = useState<Lead | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedService, setSelectedService] = useState<number | undefined>(
		undefined,
	);
	const [selectedSeller, setSelectedSeller] = useState<string | undefined>(
		undefined,
	);
	const [selectedLawyerInternal, setSelectedLawyerInternal] = useState<
		string | undefined
	>(undefined);
	const [selectedResponsibleLawyer, setSelectedResponsibleLawyer] = useState<
		string | undefined
	>(undefined);
	const [selectedReferent, setSelectedReferent] = useState<string | undefined>(
		undefined,
	);

	// Monthly filter states
	const [monthFilter, setMonthFilter] = useState(
		String(new Date().getMonth() + 1).padStart(2, "0"),
	);
	const [yearFilter, setYearFilter] = useState(
		String(new Date().getFullYear()),
	);

	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingSeller, setIsLoadingSellers] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// And replace with this implementation:
	const [sellerTypes, setSellerTypes] = useState<LawyerType[]>([]);
	const [lawyerInternalTypes, setLawyerInternalTypes] = useState<LawyerType[]>(
		[],
	);
	const [responsibleLawyerTypes, setResponsibleLawyerTypes] = useState<
		LawyerType[]
	>([]);
	const [referentTypes, setReferentTypes] = useState<LawyerType[]>([]);

	// Add a state to track the current user's roles
	const [userRoles, setUserRoles] = useState<string[]>([]);

	const [view, setView] = useState<"kanban" | "list">("kanban");

	// Add after the existing state declarations
	const [showAllLeads, setShowAllLeads] = useState(false);
	const [hideFinalColumns, setHideFinalColumns] = useState(true);

	console.log("Current view:", session?.user?.role);

	// Check if current user has seller roles that can see all leads
	const canViewAllLeads = useMemo(() => {
		if (!session?.user?.role) return false;

		const sellerRoles = [
			Role.DIRECTORA_AREA_VENTAS,
			Role.DIRECTOR_GENERAL_CEO,
			Role.GERENTE_GENERAL_COO,
			Role.DIRECTORA_AREA_VENTAS,
			Role.COORDINADOR_VENTAS,
			Role.GERENTE_VENTAS,
			Role.EJECUTIVO_VENTAS,
			Role.REPRESENTANTE_VENTAS,
			Role.ANALISTA_VENTAS,
			Role.ASISTENTE_LEGAL,
			Role.COORDINADOR_LEGAL,
			Role.DIRECTOR_AREA_IT,
			Role.DIRECTORA_AREA_MARKETING,
		];

		return sellerRoles.some((role) => role === session.user.role);
	}, [session?.user?.role]);

	// Map status to columnId
	const getColumnIdFromStatus = (status: string): number => {
		switch (status) {
			case "IN_PROGRESS":
				return 1;
			case "WON":
				return 2;
			case "LOST":
				return 3;
			default:
				return 1;
		}
	};

	// Función para verificar si el usuario actual puede evitar la validación de documentación
	const canBypassDocumentationValidation = useMemo(() => {
		if (!session?.user?.role) return false;

		const sellerRoles = [
			Role.DIRECTORA_AREA_VENTAS,
			Role.COORDINADOR_VENTAS,
			Role.GERENTE_VENTAS,
			Role.EJECUTIVO_VENTAS,
			Role.REPRESENTANTE_VENTAS,
			Role.ANALISTA_VENTAS,
		];

		return sellerRoles.includes(session.user.role as Role);
	}, [session?.user?.role]);

	// Add helper functions to map service IDs to labels and priorities
	const fetchLeads = async () => {
		setIsLoading(true);
		setError(null);

		try {
			// Construir URL con parámetros de filtro mensual
			const url = new URL(`${LEADS_ENDPOINT}`, window.location.origin);
			if (monthFilter && yearFilter) {
				url.searchParams.append("month", monthFilter);
				url.searchParams.append("year", yearFilter);
			}

			const response = await fetch(url.toString(), {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			// Replace the existing filteredLeads logic with this:
			let filteredLeads = data;

			// Only apply user-based filtering if showAllLeads is false OR user doesn't have permission
			if (!showAllLeads || !canViewAllLeads) {
				const userId = Number(session?.user?.id);
				filteredLeads = data.filter((item: any) => {
					return (
						item.sellerId === userId ||
						item.internalLawyerId === userId ||
						item.responsibleLawyerId === userId ||
						item.referentId === userId
					);
				});
			}

			// Después mapeamos los leads filtrados
			const mappedLeads = filteredLeads.map((item: any) => {
				const columnId = item.columnId || getColumnIdFromStatus(item.status);

				return {
					id: item.id.toString(),
					name: item.user?.name || "", // Cambio: item.contact?.name -> item.user?.name
					company: item.user?.userAddresses?.[0]?.city || "", // Cambio: item.contact?.city -> item.user?.userAddresses?.[0]?.city
					email: item.user?.email || "", // Cambio: item.contact?.email -> item.user?.email
					phone: item.user?.userProfile?.phone || "", // Cambio: item.user?.profile.phone -> item.user?.userProfile?.phone
					userId: item.userId,
					sellerId: item.sellerId,
					internalLawyerId: item.internalLawyerId,
					responsibleLawyerId: item.responsibleLawyerId,
					servicesId: item.servicesId,
					sourceChannelId: item.sourceChannelId,
					status: item.status,
					columnId: columnId,
					notes: item.notes,
					documentationComplete: item.documentationComplete,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
					services: {
						values: item.servicesId,
						label: getServiceLabel(item.servicesId),
					},
					seller: item.seller,
					user: item.user, // Agregar el objeto user completo
					internalLawyer: item.internalLawyer,
					responsibleLawyer: item.responsibleLawyer,
					referent: item.referent,
				};
			});

			setLeads(mappedLeads);
		} catch (error) {
			console.error("Error fetching leads:", error);
			setError(
				error instanceof Error
					? error.message
					: "Error desconocido al cargar los leads",
			);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchLeads();
	}, [
		session?.user?.accessToken,
		session?.user?.id,
		showAllLeads,
		canViewAllLeads,
		monthFilter,
		yearFilter,
	]);

	const getServiceLabel = (serviceId: number) => {
		const service = servicesType.find((s) => s.value === serviceId);
		return service ? service.label : "Servicio desconocido";
	};

	useEffect(() => {
		const fetchSellers = async () => {
			setIsLoadingSellers(true);
			try {
				const response = await fetch(SELLERS_ENDPOINT, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Error: ${response.status} ${response.statusText}`);
				}

				const { data } = await response.json();

				// Define the roles for each category
				const sellerRoles = [
					Role.DIRECTORA_AREA_VENTAS,
					Role.COORDINADOR_VENTAS,
					Role.GERENTE_VENTAS,
					Role.EJECUTIVO_VENTAS,
					Role.REPRESENTANTE_VENTAS,
					Role.ANALISTA_VENTAS,
				];

				// Map sellers to the format we need
				// Sellers
				const filteredSellers = data.filter((user: any) =>
					user.roleUser.some((ru: any) => sellerRoles.includes(ru.role.name)),
				);

				const sellers = filteredSellers.map((user: any) => ({
					id: user.id.toString(),
					value: user.id.toString(),
					label: user.name,
				}));

				setSellerTypes(sellers);
			} catch (error) {
				console.error("Error fetching sellers:", error);
				// Fallback to hardcoded data in case of error
				setSellerTypes([]);
			} finally {
				setIsLoadingSellers(false);
			}
		};

		if (session?.user?.accessToken) {
			fetchSellers();
		}
	}, [session?.user?.accessToken]);

	// Add this useEffect to fetch lawyers data
	useEffect(() => {
		const fetchLawyers = async () => {
			try {
				const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Error: ${response.status} ${response.statusText}`);
				}

				const { data } = await response.json();

				const responsibleLawyerRoles = [
					Role.DIRECTOR_GENERAL_CEO,
					Role.GERENTE_GENERAL_COO,
					Role.DIRECTORA_AREA_LEGAL,
					Role.COORDINADOR_LEGAL,
					Role.ABOGADO_REPRESENTANTE,
				];

				// Filter and map in separate steps to avoid TypeScript errors
				// Internal Lawyers
				const filteredInternalLawyers = data.filter((user: any) =>
					user.roleUser.some(
						(ru: any) =>
							ru.role.name === Role.ASISTENTE_LEGAL ||
							ru.role.name === Role.GERENTE_GENERAL_COO,
					),
				);

				const internalLawyers = filteredInternalLawyers.map((user: any) => ({
					id: user.id.toString(),
					value: user.id.toString(),
					label: user.name,
				}));

				// Responsible Lawyers
				const filteredResponsibleLawyers = data.filter((user: any) =>
					user.roleUser.some((ru: any) =>
						responsibleLawyerRoles.includes(ru.role.name),
					),
				);

				const responsibleLawyers = filteredResponsibleLawyers.map(
					(user: any) => ({
						id: user.id.toString(),
						value: user.id.toString(),
						label: user.name,
					}),
				);

				setLawyerInternalTypes(internalLawyers);
				setResponsibleLawyerTypes(responsibleLawyers);
			} catch (error) {
				console.error("Error fetching lawyers:", error);
			}
		};

		if (session?.user?.accessToken) {
			fetchLawyers();
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		const fetchReferents = async () => {
			try {
				const response = await fetch(`${USERS_ENDPOINT}?limit=100000`, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Error: ${response.status} ${response.statusText}`);
				}

				const { data } = await response.json();

				const filteredReferents = data.filter((user: any) =>
					user.roleUser.some((ru: any) => ru.role.name === Role.REFERENTES),
				);

				const referents = filteredReferents.map((user: any) => ({
					id: user.id.toString(),
					value: user.id.toString(),
					label: user.name,
				}));

				setReferentTypes(referents);
			} catch (error) {
				console.error("Error fetching referents:", error);
			}
		};

		if (session?.user?.accessToken) {
			fetchReferents();
		}
	}, [session?.user?.accessToken]);

	// Funciones para manejar la selección en los dropdowns
	const handleServiceSelect = (value: string | number | undefined) => {
		setSelectedService(value as number | undefined);
	};

	const handleSellerSelect = (value: string | number | undefined) => {
		setSelectedSeller(value as string | undefined);
	};

	const handleLawyerInternalSelect = (value: string | number | undefined) => {
		setSelectedLawyerInternal(value as string | undefined);
	};

	const handleResponsibleLawyerSelect = (value: string | number | undefined) => {
		setSelectedResponsibleLawyer(value as string | undefined);
	};

	const handleReferentLawyerSelect = (value: string | number | undefined) => {
		setSelectedReferent(value as string | undefined);
	};

	// Funciones para obtener nombres a partir de valores
	const getServiceName = (value: number) => {
		const service = servicesType.find((s) => s.value === value);
		return service ? service.label : value;
	};

	const getSellerName = (value: string) => {
		const seller = sellerTypes.find((s) => s.value === value);
		return seller ? seller.label : value;
	};

	const getLawyerInternalName = (value: string) => {
		const lawyer = lawyerInternalTypes.find((l) => l.value === value);
		return lawyer ? lawyer.label : value;
	};

	const getResponsibleLawyerName = (value: string) => {
		const lawyer = responsibleLawyerTypes.find((l) => l.value === value);
		return lawyer ? lawyer.label : value;
	};

	const getReferentName = (value: string) => {
		const lawyer = referentTypes.find((l) => l.value === value);
		return lawyer ? lawyer.label : value;
	};

	// Apply filters to leads - FIXED to match the actual data structure
	const filteredLeads = useMemo(() => {
		return leads.filter((lead) => {
			// Search filter - only apply if searchQuery is not empty
			if (
				searchQuery &&
				lead.user &&
				!lead.user.name.toLowerCase().includes(searchQuery.toLowerCase())
			) {
				return false;
			}

			// Service filter - only apply if selectedService is defined
			if (selectedService && lead.servicesId !== selectedService) {
				return false;
			}

			// Seller filter - only apply if selectedSeller is defined
			if (selectedSeller && lead.sellerId !== Number(selectedSeller)) {
				return false;
			}

			// Lawyer Internal filter - only apply if selectedLawyerInternal is defined
			if (
				selectedLawyerInternal &&
				lead.internalLawyerId !== Number(selectedLawyerInternal)
			) {
				return false;
			}

			// Responsible Lawyer filter - only apply if selectedResponsibleLawyer is defined
			if (
				selectedResponsibleLawyer &&
				lead.responsibleLawyerId !== Number(selectedResponsibleLawyer)
			) {
				return false;
			}

			// Referent filter - only apply if selectedReferent is defined
			if (selectedReferent && lead.referentId !== Number(selectedReferent)) {
				return false;
			}

			return true;
		});
	}, [
		leads,
		searchQuery,
		selectedService,
		selectedSeller,
		selectedLawyerInternal,
		selectedResponsibleLawyer,
		selectedReferent,
	]);

	const handleDragEnd = async (result: DropResult) => {
		const { destination, source, draggableId } = result;

		if (!destination) return;

		if (
			destination.droppableId === source.droppableId &&
			destination.index === source.index
		) {
			return;
		}

		const leadBeingDragged = leads.find(
			(lead) => lead.id.toString() === draggableId,
		);
		if (!leadBeingDragged) return;

		// Solo aplicar la validación de documentación si el usuario NO tiene permisos de ventas
		if (
			destination.droppableId === "9" &&
			!leadBeingDragged.documentationComplete &&
			!canBypassDocumentationValidation
		) {
			toast.error(
				"Esta oportunidad no puede marcarse como ganada porque falta documentación requerida.",
			);
			return;
		}

		// Determinar el nuevo status
		let newStatus: "WON" | "LOST" | "IN_PROGRESS" = leadBeingDragged.status;

		if (destination.droppableId === "9") {
			newStatus = "WON";
		} else if (destination.droppableId === "10") {
			newStatus = "LOST";
		} else if (
			["1", "2", "3", "4", "5", "6", "7", "8"].includes(destination.droppableId)
		) {
			newStatus = "IN_PROGRESS";
		}

		const newColumnId = Number.parseInt(destination.droppableId);

		// Actualización visual inmediata
		const updatedLeads = leads.map((lead) =>
			lead.id.toString() === draggableId
				? { ...lead, status: newStatus, columnId: newColumnId }
				: lead,
		);

		setLeads(updatedLeads);

		// Persistir cambio en backend
		try {
			await fetch(`${LEADS_ENDPOINT}/${draggableId}/column`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					columnId: newColumnId,
					status: newStatus,
					userId: session?.user?.id,
				}),
			});

			toast.success("Etapa actualizada correctamente");
		} catch (error) {
			console.error("Error actualizando lead en backend:", error);
			// Si querés, podrías volver atrás el cambio en caso de error
		}
	};

	const handleAddLead = () => {
		setCurrentLead(null);
		setIsFormOpen(true);
	};

	const handleEditLead = (lead: Lead) => {
		setCurrentLead(lead);
		setIsFormOpen(true);
	};

	const handleDeleteLead = async (id: string) => {
		try {
			const response = await fetch(`${LEADS_ENDPOINT}/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Error: ${response.status} ${response.statusText}`);
			}

			// Recargar los datos después de eliminar exitosamente
			await fetchLeads();
			toast.success("Lead eliminado correctamente");
		} catch (error) {
			console.error("Error deleting lead:", error);
			toast.error("Error al eliminar el lead");
		}
	};

	const clearFilters = () => {
		setSearchQuery("");
		setSelectedService(undefined);
		setSelectedSeller(undefined);
		setSelectedLawyerInternal(undefined);
		setSelectedResponsibleLawyer(undefined);
		setSelectedReferent(undefined);
	};

	const handleChangeView = () => {
		// Toggle between grid and list views
		setView(view === "kanban" ? "list" : "kanban");
	};

	console.log(canViewAllLeads);

	return (
		<div className="flex flex-col h-full">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
					<SquareKanban className="size-6" />
					Embudo
				</h2>
				<div className="flex items-center gap-4">
					{canViewAllLeads && (
						<div className="flex items-center gap-2">
							<Switch
								id="show-all-leads"
								checked={showAllLeads}
								onCheckedChange={(checked) => setShowAllLeads(checked === true)}
							/>
							<Label htmlFor="show-all-leads" className="text-sm cursor-pointer">
								Ver todas las oportunidades
							</Label>
						</div>
					)}
					<Can role="asistente_legal" inverse>
						<div className="flex items-center gap-2">
							<Switch
								id="hide-final-columns"
								checked={hideFinalColumns}
								onCheckedChange={(checked) => setHideFinalColumns(checked === true)}
							/>
							<Label htmlFor="hide-final-columns" className="text-sm cursor-pointer">
								Ocultar columnas finales
							</Label>
						</div>
						<Button
							onClick={handleAddLead}
						>
							<Plus className="size-4 mr-1.5" />
							Nuevo Lead
						</Button>
					</Can>
				</div>
			</div>

			{/* Monthly Filters */}
			<div className="mb-6">
				<CrmMonthlyFilters
					monthFilter={monthFilter}
					setMonthFilter={setMonthFilter}
					yearFilter={yearFilter}
					setYearFilter={setYearFilter}
					onFiltersChange={(filters) => {
						// Los filtros ya se actualizan por useState
						console.log("Filtros mensuales actualizados:", filters);
					}}
					className="flex-wrap"
				/>
			</div>


			{/* New search and filter bar */}
			<div className="flex flex-col md:flex-row gap-3 mb-6">
				<div className="relative grow">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-1" />
					<Input
						placeholder="Buscar caso..."
						className="pl-9 h-10 w-full bg-white dark:bg-background"
						defaultValue={searchQuery}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex gap-2 flex-wrap md:flex-nowrap">
					<FilterCombobox
						icon={ListFilterPlus}
						placeholder="Tipo de servicio"
						searchPlaceholder="Buscar servicio..."
						options={servicesType.map((s) => ({ value: s.value, label: s.label }))}
						value={selectedService}
						onSelect={handleServiceSelect}
					/>

					<FilterCombobox
						icon={Users}
						placeholder="Vendedor"
						searchPlaceholder="Buscar vendedor..."
						options={sellerTypes.map((s) => ({ value: s.value, label: s.label }))}
						value={selectedSeller}
						onSelect={handleSellerSelect}
						loading={isLoadingSeller}
					/>

					<FilterCombobox
						icon={Briefcase}
						placeholder="Abogado Interno"
						searchPlaceholder="Buscar abogado..."
						options={lawyerInternalTypes.map((l) => ({ value: l.value, label: l.label }))}
						value={selectedLawyerInternal}
						onSelect={handleLawyerInternalSelect}
					/>

					<FilterCombobox
						icon={Users}
						placeholder="Abo. Responsable"
						searchPlaceholder="Buscar abogado..."
						options={responsibleLawyerTypes.map((l) => ({ value: l.value, label: l.label }))}
						value={selectedResponsibleLawyer}
						onSelect={handleResponsibleLawyerSelect}
					/>

					<Can role="asistente_legal" inverse>
						<FilterCombobox
							icon={Users}
							placeholder="Referente"
							searchPlaceholder="Buscar referente..."
							options={referentTypes.map((r) => ({ value: r.value, label: r.label }))}
							value={selectedReferent}
							onSelect={handleReferentLawyerSelect}
						/>
					</Can>

					{/* Botón de vista de cuadrícula */}
					<Button
						variant="outline"
						size="icon"
						className="size-10"
						onClick={handleChangeView}
						aria-label="Toggle view"
					>
						{view === "kanban" ? (
							<List className="size-5" />
						) : (
							<KanbanSquare className="size-5" />
						)}
					</Button>
				</div>
			</div>

			{isLoading && <KanbanSkeleton />}
			{error && (
				<div className="text-red-500 dark:text-red-400 text-center py-4 text-sm">Error: {error}</div>
			)}

			{/* Active filters display */}
			{(selectedService !== undefined ||
				selectedSeller !== undefined ||
				selectedLawyerInternal !== undefined ||
				selectedResponsibleLawyer !== undefined ||
				selectedReferent !== undefined ||
				searchQuery) && (
				<div className="mb-4">
					<div className="flex flex-wrap gap-2">
						{searchQuery && (
							<Badge
								variant="secondary"
								className="flex items-center gap-1 px-3 py-1"
							>
								Búsqueda: {searchQuery}
								<X
									className="h-3 w-3 cursor-pointer ml-1"
									onClick={() => setSearchQuery("")}
								/>
							</Badge>
						)}

						{selectedService !== undefined && (
							<Badge
								variant="secondary"
								className="flex items-center gap-1 px-3 py-1"
							>
								Servicio: {getServiceName(selectedService)}
								<X
									className="h-3 w-3 cursor-pointer ml-1"
									onClick={() => setSelectedService(undefined)}
								/>
							</Badge>
						)}

						{selectedSeller !== undefined && (
							<Badge
								variant="secondary"
								className="flex items-center gap-1 px-3 py-1"
							>
								Vendedor: {getSellerName(selectedSeller)}
								<X
									className="h-3 w-3 cursor-pointer ml-1"
									onClick={() => setSelectedSeller(undefined)}
								/>
							</Badge>
						)}

						{selectedLawyerInternal !== undefined && (
							<Badge
								variant="secondary"
								className="flex items-center gap-1 px-3 py-1"
							>
								Abogado Interno: {getLawyerInternalName(selectedLawyerInternal)}
								<X
									className="h-3 w-3 cursor-pointer ml-1"
									onClick={() => setSelectedLawyerInternal(undefined)}
								/>
							</Badge>
						)}

						{selectedResponsibleLawyer !== undefined && (
							<Badge
								variant="secondary"
								className="flex items-center gap-1 px-3 py-1"
							>
								Abo. Responsable:{" "}
								{getResponsibleLawyerName(selectedResponsibleLawyer)}
								<X
									className="h-3 w-3 cursor-pointer ml-1"
									onClick={() => setSelectedResponsibleLawyer(undefined)}
								/>
							</Badge>
						)}

						{selectedReferent !== undefined && (
							<Badge
								variant="secondary"
								className="flex items-center gap-1 px-3 py-1"
							>
								Referente: {getReferentName(selectedReferent)}
								<X
									className="h-3 w-3 cursor-pointer ml-1"
									onClick={() => setSelectedReferent(undefined)}
								/>
							</Badge>
						)}

						{(selectedService !== undefined ||
							selectedSeller !== undefined ||
							selectedLawyerInternal !== undefined ||
							selectedResponsibleLawyer !== undefined ||
							selectedReferent !== undefined) && (
							<Button
								variant="ghost"
								onClick={clearFilters}
								className="text-muted-foreground"
							>
								<X className="size-3.5 mr-1" />
								Limpiar filtros
							</Button>
						)}
					</div>
				</div>
			)}

			{view === "kanban" ? (
				<>
					<DragDropContext onDragEnd={handleDragEnd}>
						{/* Kanban board container with navigation buttons */}
						<div className="relative flex-1">
							{/* Scrollable container */}
							<div
								ref={scrollContainerRef}
								className="flex gap-4 pb-4 overflow-x-auto h-[calc(100vh-280px)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400"
							>
								{CRM_COLUMNS.filter((column) => {
									const columnIdNum = Number.parseInt(column.id, 10);
									// Si hideFinalColumns está activo, ocultar columnas 9, 10 y 11
									if (
										hideFinalColumns &&
										(columnIdNum === 9 ||
											columnIdNum === 10 ||
											columnIdNum === 11)
									) {
										return false;
									}
									return true;
								}).map((column) => {
									const columnLeads = filteredLeads.filter((lead) => {
										// Convert column ID to number for comparison
										const columnIdNum = Number.parseInt(column.id, 10);

										// Si hideFinalColumns está activo, ocultar columnas 9, 10 y 11
										if (
											hideFinalColumns &&
											(columnIdNum === 9 ||
												columnIdNum === 10 ||
												columnIdNum === 11)
										) {
											return false;
										}

										// For columns 1-8 (IN_PROGRESS)
										if (columnIdNum >= 1 && columnIdNum <= 8) {
											// Only show leads with IN_PROGRESS status AND matching columnId
											return (
												lead.status === "IN_PROGRESS" &&
												lead.columnId === columnIdNum
											);
										}
										// For column 9 (WON)
										else if (columnIdNum === 9) {
											return lead.status === "WON";
										}
										// For column 10 (LOST)
										else if (columnIdNum === 10) {
											return lead.status === "LOST";
										}
										// For column 11 (if exists)
										else if (columnIdNum === 11) {
											return lead.columnId === columnIdNum;
										}

										return false;
									});

									const colConfig = columnConfig[column.id] ?? defaultColumnConfig;
									const ColIcon = colConfig.icon;

									return (
										<div
											key={column.id}
											className="bg-white dark:bg-gray-800/30 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full w-75 shrink-0 flex flex-col"
										>
											<div className={`p-3 border-b ${colConfig.borderColor} dark:border-gray-700`}>
												<div className="flex justify-between items-center">
													<div className="flex items-center gap-2">
														<div className={`p-1.5 rounded-md ${colConfig.bg}`}>
															<ColIcon className={`h-4 w-4 ${colConfig.color}`} />
														</div>
														<h3 className="font-medium text-gray-900 dark:text-white text-sm">
															{column.title}
														</h3>
													</div>
													<span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-0.5 text-xs font-medium">
														{columnLeads.length}
													</span>
												</div>
											</div>
											<Droppable droppableId={column.id}>
												{(provided, snapshot) => (
													<div
														{...provided.droppableProps}
														ref={provided.innerRef}
														className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors ${
															snapshot.isDraggingOver
																? "bg-gray-50 dark:bg-gray-700/20"
																: ""
														}`}
													>
														{columnLeads.map((lead, index) => (
															<Draggable
																key={lead.id.toString()}
																draggableId={lead.id.toString()}
																index={index}
															>
																{(provided) => (
																	<div
																		ref={provided.innerRef}
																		{...provided.draggableProps}
																		{...provided.dragHandleProps}
																	>
																		<LeadCard
																			lead={lead}
																			onEdit={() => handleEditLead(lead)}
																			onDelete={() =>
																				handleDeleteLead(lead.id.toString())
																			}
																		/>
																	</div>
																)}
															</Draggable>
														))}
														{provided.placeholder}

														{/* Empty state */}
														{columnLeads.length === 0 && (
															<div className="flex flex-col items-center justify-center py-8 text-gray-400">
																<ColIcon className="h-8 w-8 mb-2 opacity-50" />
																<p className="text-xs">Sin leads</p>
															</div>
														)}
													</div>
												)}
											</Droppable>
										</div>
									);
								})}
							</div>
						</div>
					</DragDropContext>
				</>
			) : (
				<>
					<KanbanList
						leads={filteredLeads}
						onEditLead={handleEditLead}
						onDeleteLead={handleDeleteLead}
						hideFinalColumns={hideFinalColumns}
						onHideFinalColumnsChange={setHideFinalColumns}
					/>
				</>
			)}

			<LeadFormDialog
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				lead={currentLead}
			/>
		</div>
	);
}

// --- Skeleton para el Kanban ---

function KanbanSkeleton() {
	return (
		<div className="flex gap-4 pb-4 overflow-hidden h-[calc(100vh-280px)]">
			{Array.from({ length: 8 }).map((_, colIdx) => (
				<div
					key={colIdx}
					className="bg-white dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700 h-full w-75 shrink-0 flex flex-col"
				>
					{/* Column header */}
					<div className="p-3 border-b border-gray-200 dark:border-gray-700">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-2">
								<Skeleton className="h-8 w-8 rounded-md" />
								<Skeleton className="h-4 w-20" />
							</div>
							<Skeleton className="h-5 w-7 rounded-full" />
						</div>
					</div>
					{/* Lead cards */}
					<div className="flex-1 p-3 space-y-2">
						{Array.from({ length: 2 + (colIdx % 3) }).map((_, cardIdx) => (
							<div
								key={cardIdx}
								className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
							>
								<div className="flex items-center gap-2">
									<Skeleton className="h-8 w-8 rounded-full shrink-0" />
									<div className="space-y-1 flex-1">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</div>
								<Skeleton className="h-5 w-24 rounded-full" />
								<div className="flex justify-between items-center">
									<Skeleton className="h-3 w-16" />
									<Skeleton className="h-6 w-6 rounded" />
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
