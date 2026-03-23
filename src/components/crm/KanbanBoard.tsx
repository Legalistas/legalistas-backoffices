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
	Mail,
	MessageSquare,
	Plus,
	SquareKanban,
	Trophy,
	Users,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CrmFilters } from "@/components/crm/CrmFilters";
import LeadCard from "@/components/crm/LeadCard";
import LeadFormDialog from "@/components/crm/LeadFormDialog";
import {
	LAWYERS_ENDPOINT,
	LEADS_ENDPOINT,
	SELLERS_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { CRM_COLUMNS } from "@/constant/crm";
import { Role } from "@/constant/user";
import { servicesType } from "@/lib/constant";
import { sendStageEmail } from "@/lib/send-stage-email";
import type { Lead } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import Can from "../auth/Can";
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
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedService, setSelectedService] = useState<number | undefined>(undefined);
	const [selectedResponsibleLawyer, setSelectedResponsibleLawyer] = useState<string[]>([]);
	const [selectedInternalLawyer, setSelectedInternalLawyer] = useState<string[]>([]);
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	// Monthly filter states - default to current month
	const [monthFilter, setMonthFilter] = useState(
		String(new Date().getMonth() + 1).padStart(2, "0"),
	);
	const [yearFilter, setYearFilter] = useState(
		String(new Date().getFullYear()),
	);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Lawyer options for filters
	const [sellerTypes, setSellerTypes] = useState<LawyerType[]>([]);
	const [lawyerInternalTypes, setLawyerInternalTypes] = useState<LawyerType[]>([]);
	const [responsibleLawyerTypes, setResponsibleLawyerTypes] = useState<LawyerType[]>([]);
	const [referentTypes, setReferentTypes] = useState<LawyerType[]>([]);

	const [view, setView] = useState<"kanban" | "list">("kanban");
	const [showAllLeads, setShowAllLeads] = useState(false);
	const [hideFinalColumns, setHideFinalColumns] = useState(true);

	// Check if current user has seller roles that can see all leads
	const canViewAllLeads = useMemo(() => {
		if (!session?.user?.role) return false;

		const sellerRoles = [
			Role.DIRECTORA_AREA_VENTAS,
			Role.DIRECTOR_GENERAL_CEO,
			Role.GERENTE_GENERAL_COO,
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

	const getColumnIdFromStatus = (status: string): number => {
		switch (status) {
			case "IN_PROGRESS": return 1;
			case "WON": return 2;
			case "LOST": return 3;
			default: return 1;
		}
	};

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

	const getServiceLabel = (serviceId: number) => {
		const service = servicesType.find((s) => s.value === serviceId);
		return service ? service.label : "Servicio desconocido";
	};

	// Fetch leads from the backend with all filters as query params
	const fetchLeads = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const url = new URL(`${LEADS_ENDPOINT}`, window.location.origin);

			// Search filter
			if (searchQuery) {
				url.searchParams.append("search", searchQuery);
			}

			// Service filter
			if (selectedService !== undefined) {
				url.searchParams.append("servicesId", selectedService.toString());
			}

			// Responsible lawyer filter (multi-select)
			if (selectedResponsibleLawyer.length > 0) {
				selectedResponsibleLawyer.forEach((id) => {
					url.searchParams.append("responsibleLawyerId", id);
				});
			}

			// Internal lawyer filter (multi-select)
			if (selectedInternalLawyer.length > 0) {
				selectedInternalLawyer.forEach((id) => {
					url.searchParams.append("internalLawyerId", id);
				});
			}

			// Date range takes priority over month/year
			if (dateFrom || dateTo) {
				if (dateFrom) url.searchParams.append("fromDate", dateFrom);
				if (dateTo) url.searchParams.append("toDate", dateTo);
			} else if (monthFilter && yearFilter) {
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

			const result = await response.json();
			const data = result.data || result;

			// Apply user-based filtering if showAllLeads is false
			let filteredData = data;
			if (!showAllLeads || !canViewAllLeads) {
				const userId = Number(session?.user?.id);
				filteredData = data.filter((item: any) => {
					return (
						item.sellerId === userId ||
						item.internalLawyerId === userId ||
						item.responsibleLawyerId === userId ||
						item.referentId === userId
					);
				});
			}

			// Map leads
			const mappedLeads = filteredData.map((item: any) => {
				const columnId = item.columnId || getColumnIdFromStatus(item.status);
				return {
					id: item.id.toString(),
					name: item.user?.name || "",
					company: item.user?.userAddresses?.[0]?.city || "",
					email: item.user?.email || "",
					phone: item.user?.userProfile?.phone || "",
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
					user: item.user,
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
	}, [
		session?.user?.accessToken,
		session?.user?.id,
		searchQuery,
		selectedService,
		selectedResponsibleLawyer,
		selectedInternalLawyer,
		dateFrom,
		dateTo,
		monthFilter,
		yearFilter,
		showAllLeads,
		canViewAllLeads,
	]);

	// Debounced fetch when filters change
	useEffect(() => {
		if (!session?.user?.accessToken) return;

		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		searchTimeoutRef.current = setTimeout(() => {
			fetchLeads();
		}, 400);

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, [fetchLeads]);

	// Fetch sellers
	useEffect(() => {
		const fetchSellers = async () => {
			try {
				const response = await fetch(SELLERS_ENDPOINT, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});
				if (!response.ok) throw new Error("Error fetching sellers");
				const { data } = await response.json();

				const sellerRoles = [
					Role.DIRECTORA_AREA_VENTAS,
					Role.COORDINADOR_VENTAS,
					Role.GERENTE_VENTAS,
					Role.EJECUTIVO_VENTAS,
					Role.REPRESENTANTE_VENTAS,
					Role.ANALISTA_VENTAS,
				];

				const filteredSellers = data.filter((user: any) =>
					user.roleUser.some((ru: any) => sellerRoles.includes(ru.role.name)),
				);

				setSellerTypes(
					filteredSellers.map((user: any) => ({
						id: user.id.toString(),
						value: user.id.toString(),
						label: user.name,
					})),
				);
			} catch (error) {
				console.error("Error fetching sellers:", error);
				setSellerTypes([]);
			}
		};

		if (session?.user?.accessToken) fetchSellers();
	}, [session?.user?.accessToken]);

	// Fetch lawyers
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
				if (!response.ok) throw new Error("Error fetching lawyers");
				const { data } = await response.json();

				const responsibleLawyerRoles = [
					Role.DIRECTOR_GENERAL_CEO,
					Role.GERENTE_GENERAL_COO,
					Role.DIRECTORA_AREA_LEGAL,
					Role.COORDINADOR_LEGAL,
					Role.ABOGADO_REPRESENTANTE,
				];

				const filteredInternalLawyers = data.filter((user: any) =>
					user.roleUser.some(
						(ru: any) =>
							ru.role.name === Role.ASISTENTE_LEGAL ||
							ru.role.name === Role.GERENTE_GENERAL_COO,
					),
				);

				setLawyerInternalTypes(
					filteredInternalLawyers.map((user: any) => ({
						id: user.id.toString(),
						value: user.id.toString(),
						label: user.name,
					})),
				);

				const filteredResponsibleLawyers = data.filter((user: any) =>
					user.roleUser.some((ru: any) =>
						responsibleLawyerRoles.includes(ru.role.name),
					),
				);

				setResponsibleLawyerTypes(
					filteredResponsibleLawyers.map((user: any) => ({
						id: user.id.toString(),
						value: user.id.toString(),
						label: user.name,
					})),
				);
			} catch (error) {
				console.error("Error fetching lawyers:", error);
			}
		};

		if (session?.user?.accessToken) fetchLawyers();
	}, [session?.user?.accessToken]);

	// Fetch referents
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
				if (!response.ok) throw new Error("Error fetching referents");
				const { data } = await response.json();

				const filteredReferents = data.filter((user: any) =>
					user.roleUser.some((ru: any) => ru.role.name === Role.REFERENTES),
				);

				setReferentTypes(
					filteredReferents.map((user: any) => ({
						id: user.id.toString(),
						value: user.id.toString(),
						label: user.name,
					})),
				);
			} catch (error) {
				console.error("Error fetching referents:", error);
			}
		};

		if (session?.user?.accessToken) fetchReferents();
	}, [session?.user?.accessToken]);

	const handleDragEnd = async (result: DropResult) => {
		const { destination, source, draggableId } = result;

		if (!destination) return;
		if (
			destination.droppableId === source.droppableId &&
			destination.index === source.index
		) return;

		const leadBeingDragged = leads.find(
			(lead) => lead.id.toString() === draggableId,
		);
		if (!leadBeingDragged) return;

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
		const updatedLeads = leads.map((lead) =>
			lead.id.toString() === draggableId
				? { ...lead, status: newStatus, columnId: newColumnId }
				: lead,
		);
		setLeads(updatedLeads);

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

			// Enviar email de notificación (no bloquea el flujo)
			sendStageEmail({
				email: leadBeingDragged.email,
				leadName: leadBeingDragged.name,
				columnId: newColumnId,
				phoneNumber: leadBeingDragged.phone,
			});

			toast.success("Etapa actualizada correctamente");
		} catch (error) {
			console.error("Error actualizando lead en backend:", error);
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
			if (!response.ok) throw new Error(`Error: ${response.status}`);
			await fetchLeads();
			toast.success("Lead eliminado correctamente");
		} catch (error) {
			console.error("Error deleting lead:", error);
			toast.error("Error al eliminar el lead");
		}
	};

	const handleClearFilters = () => {
		setSearchQuery("");
		setSelectedService(undefined);
		setSelectedResponsibleLawyer([]);
		setSelectedInternalLawyer([]);
		setDateFrom("");
		setDateTo("");
		setMonthFilter(String(new Date().getMonth() + 1).padStart(2, "0"));
		setYearFilter(String(new Date().getFullYear()));
	};

	const handleChangeView = () => {
		setView(view === "kanban" ? "list" : "kanban");
	};

	const hasActiveFilters = Boolean(
		searchQuery ||
			selectedService !== undefined ||
			(selectedResponsibleLawyer && selectedResponsibleLawyer.length > 0) ||
			(selectedInternalLawyer && selectedInternalLawyer.length > 0) ||
			dateFrom ||
			dateTo,
	);

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
						<Button onClick={handleAddLead}>
							<Plus className="size-4 mr-1.5" />
							Nuevo Lead
						</Button>
					</Can>

					{/* View toggle */}
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

			{/* Filters */}
			<div className="mb-6">
				<CrmFilters
					searchTerm={searchQuery}
					setSearchTerm={setSearchQuery}
					selectedService={selectedService}
					setSelectedService={setSelectedService}
					selectedResponsibleLawyer={selectedResponsibleLawyer}
					setSelectedResponsibleLawyer={setSelectedResponsibleLawyer}
					selectedInternalLawyer={selectedInternalLawyer}
					setSelectedInternalLawyer={setSelectedInternalLawyer}
					dateFrom={dateFrom}
					setDateFrom={setDateFrom}
					dateTo={dateTo}
					setDateTo={setDateTo}
					monthFilter={monthFilter}
					setMonthFilter={setMonthFilter}
					yearFilter={yearFilter}
					setYearFilter={setYearFilter}
					hasActiveFilters={hasActiveFilters}
					handleClearFilters={handleClearFilters}
					responsibleLawyerTypes={responsibleLawyerTypes}
					lawyerInternalTypes={lawyerInternalTypes}
				/>
			</div>

			{isLoading && <KanbanSkeleton />}
			{error && (
				<div className="text-red-500 dark:text-red-400 text-center py-4 text-sm">Error: {error}</div>
			)}

			{view === "kanban" ? (
				<DragDropContext onDragEnd={handleDragEnd}>
					<div className="relative flex-1">
						<div
							ref={scrollContainerRef}
							className="flex gap-4 pb-4 overflow-x-auto h-[calc(100vh-280px)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400"
						>
							{CRM_COLUMNS.filter((column) => {
								const columnIdNum = Number.parseInt(column.id, 10);
								if (
									hideFinalColumns &&
									(columnIdNum === 9 || columnIdNum === 10 || columnIdNum === 11)
								) {
									return false;
								}
								return true;
							}).map((column) => {
								const columnLeads = leads.filter((lead) => {
									const columnIdNum = Number.parseInt(column.id, 10);

									if (
										hideFinalColumns &&
										(columnIdNum === 9 || columnIdNum === 10 || columnIdNum === 11)
									) return false;

									if (columnIdNum >= 1 && columnIdNum <= 8) {
										return lead.status === "IN_PROGRESS" && lead.columnId === columnIdNum;
									} else if (columnIdNum === 9) {
										return lead.status === "WON";
									} else if (columnIdNum === 10) {
										return lead.status === "LOST";
									} else if (columnIdNum === 11) {
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
			) : (
				<KanbanList
					leads={leads}
					onEditLead={handleEditLead}
					onDeleteLead={handleDeleteLead}
					hideFinalColumns={hideFinalColumns}
					onHideFinalColumnsChange={setHideFinalColumns}
				/>
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
					<div className="p-3 border-b border-gray-200 dark:border-gray-700">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-2">
								<Skeleton className="h-8 w-8 rounded-md" />
								<Skeleton className="h-4 w-20" />
							</div>
							<Skeleton className="h-5 w-7 rounded-full" />
						</div>
					</div>
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
