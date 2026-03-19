"use client";

import {
	AlertCircle,
	Check,
	ChevronsUpDown,
	Loader2,
	Plus,
	Search,
	UserPlus,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CustomerRegistrationModal from "@/components/customers/CustomerRegistrationModal";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	CASES_ENDPOINT,
	CUSTOMERS_ENDPOINT,
	LAWYERS_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { Role } from "@/constant/user";
import { servicesType, stageCases } from "@/lib/constant";
import { Badge } from "../ui/badge";

interface Customer {
	id: number;
	name: string;
	email: string;
	phone?: string;
	roleUser: Array<{
		role: {
			id: number;
			name: string;
		};
	}>;
	crmLeads?: Array<{
		id: number;
		sellerId: number;
		internalLawyerId: number;
		responsibleLawyerId: number;
		servicesId: number;
		sourceChannelId: number;
		status: string;
		statusDate: string | null;
		columnId: number;
		notes: string;
		documentationComplete: boolean;
		createdAt: string;
		updatedAt: string;
		userId: number;
		converted: boolean;
	}>;
}

interface CreatedCustomerResponse {
	message: string;
	user: {
		id: number;
		name: string;
		email: string;
		userProfile?: {
			phone?: string;
		};
		roleUser: Array<{
			role: {
				id: number;
				name: string;
			};
		}>;
	};
}

export default function AddNewCase() {
	const router = useRouter();
	const { data: session } = useSession();

	// Referencias para los selectores
	const serviceSelectRef = useRef<HTMLDivElement>(null);
	const stageSelectRef = useRef<HTMLDivElement>(null);
	const responsibleLawyersSelectRef = useRef<HTMLDivElement>(null);
	const customerSelectRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Estados para los selects
	const [isServiceSelectOpen, setIsServiceSelectOpen] = useState(false);
	const [isStageSelectOpen, setIsStageSelectOpen] = useState(false);

	// Estado para el modal de nuevo cliente
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Estados para el multiselect de clientes
	const [customerSearchTerm, setCustomerSearchTerm] = useState("");
	const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
		null,
	);
	const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

	// Estado del formulario
	const [formData, setFormData] = useState({
		number: "",
		title: "",
		customerId: null as number | null,
		isActive: true,
		isArchived: false,
		stageId: 1,
		servicesId: 1,
		responsibleLawyerId: "",
		internalLawyerId: "",
		leadId: null as number | null, // 👈 nuevo campo
		injury: "",
	});

	// Estado para el formulario de nuevo cliente
	const [newCustomer, setNewCustomers] = useState({
		name: "",
		email: "",
		phone: "",
		address: "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// User Lawyer
	const [isLoading, setIsLoading] = useState(true);
	const [responsibleLawyers, setResponsibleLawyers] = useState<any[]>([]);
	const [internalLawyers, setInternalLawyers] = useState<any[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);

	// --- Estados y lógica para el buscador de abogado responsable ---
	const [responsibleLawyerSearch, setResponsibleLawyerSearch] = useState("");
	const [showResponsibleLawyerDropdown, setShowResponsibleLawyerDropdown] =
		useState(false);
	const [filteredResponsibleLawyers, setFilteredResponsibleLawyers] = useState<
		any[]
	>([]);

	useEffect(() => {
		if (!responsibleLawyerSearch.trim()) {
			setFilteredResponsibleLawyers(responsibleLawyers);
			return;
		}
		const search = responsibleLawyerSearch
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.replace(/\s+/g, " ");
		setFilteredResponsibleLawyers(
			responsibleLawyers.filter((lawyer) => {
				const name = (lawyer.name || "")
					.toLowerCase()
					.normalize("NFD")
					.replace(/\p{Diacritic}/gu, "")
					.replace(/\s+/g, " ");
				return String(lawyer.id).includes(search) || name.includes(search);
			}),
		);
	}, [responsibleLawyerSearch, responsibleLawyers]);

	// Si seleccionas un abogado desde el lead, actualiza el input de búsqueda
	useEffect(() => {
		if (formData.responsibleLawyerId) {
			const selected = responsibleLawyers.find(
				(l) => String(l.id) === formData.responsibleLawyerId,
			);
			if (selected) setResponsibleLawyerSearch(selected.name);
		} else {
			setResponsibleLawyerSearch("");
		}
	}, [formData.responsibleLawyerId, responsibleLawyers]);

	useEffect(() => {
		if (!responsibleLawyerSearch.trim()) {
			setFilteredResponsibleLawyers(responsibleLawyers);
			return;
		}
		const search = responsibleLawyerSearch.toLowerCase();
		setFilteredResponsibleLawyers(
			responsibleLawyers.filter(
				(lawyer: any) =>
					String(lawyer.id).includes(search) ||
					(lawyer.name && lawyer.name.toLowerCase().includes(search)),
			),
		);
	}, [responsibleLawyerSearch, responsibleLawyers]);

	// Si seleccionas un abogado desde el lead, actualiza el input de búsqueda
	useEffect(() => {
		if (formData.responsibleLawyerId) {
			const selected = responsibleLawyers.find(
				(l: any) => String(l.id) === formData.responsibleLawyerId,
			);
			if (selected) setResponsibleLawyerSearch(selected.name);
		}
	}, [formData.responsibleLawyerId, responsibleLawyers]);

	const [selectedLead, setSelectedLead] = useState<any>(null);
	const [showLeadSelector, setShowLeadSelector] = useState(false);
	const [availableLeads, setAvailableLeads] = useState<any[]>([]);

	// Fetch customers with role ID 34 only
	const fetchCustomers = useCallback(async () => {
		if (!session?.user?.accessToken) return;

		try {
			setIsLoadingCustomers(true);
			const response = await fetch(`${CUSTOMERS_ENDPOINT}?limit=100000`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Error fetching customers: ${response.status}`);
			}

			const data = await response.json();
			// Filtrar solo usuarios con role ID 34 y eliminar duplicados
			const customersWithRole34 = Array.isArray(data.data)
				? data.data
					.filter((customer: Customer) =>
						customer.roleUser?.some((ru) => ru.role.id === 34),
					)
					.filter(
						(customer: Customer, index: number, self: Customer[]) =>
							index === self.findIndex((c) => c.id === customer.id),
					)
				: [];

			setCustomers(customersWithRole34);
			console.log(
				`Cargados ${customersWithRole34.length} clientes con role ID 34`,
			);
			console.log(
				"Clientes cargados:",
				customersWithRole34.map((c: Customer) => ({
					id: c.id,
					name: c.name,
					email: c.email,
				})),
			);
		} catch (error) {
			console.error("Error fetching customers:", error);
			setError("Error al cargar los clientes");
		} finally {
			setIsLoadingCustomers(false);
		}
	}, [session?.user?.accessToken]);


	const fetchDataLawyer = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			const data = await response.json();

			if (data && data.data) {
				// Separar abogados por rol
				const responsible = data.data.filter((lawyer: any) =>
					lawyer.roleUser?.some(
						(ru: any) =>
							ru.role?.name === Role.DIRECTOR_GENERAL_CEO ||
							ru.role?.name === Role.GERENTE_GENERAL_COO ||
							ru.role?.name === Role.ABOGADO_REPRESENTANTE,
					),
				);

				const internal = data.data.filter((lawyer: any) =>
					lawyer.roleUser?.some(
						(ru: any) =>
							ru.role?.name === Role.ASISTENTE_LEGAL ||
							ru.role?.name === Role.GERENTE_GENERAL_COO ||
							ru.role?.name === Role.ASISTENTE_LEGAL,
					),
				);

				setResponsibleLawyers(responsible);
				setInternalLawyers(internal);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			setError("Error al cargar los datos de abogados");
		} finally {
			setIsLoading(false);
		}
	}, [session?.user?.accessToken]);

	// Cargar datos al montar el componente
	useEffect(() => {
		fetchDataLawyer();
		fetchCustomers();
	}, [fetchDataLawyer, fetchCustomers]);

	// Handle customer selection
	const handleSelectCustomer = (customer: Customer, specificLead?: any) => {
		if (selectedCustomer?.id === customer.id) {
			return;
		}

		const nonConvertedLeads =
			customer.crmLeads?.filter((lead) => !lead.converted) || [];

		// If customer has multiple non-converted leads and no specific lead is provided
		if (nonConvertedLeads.length > 1 && !specificLead) {
			setAvailableLeads(nonConvertedLeads);
			setShowLeadSelector(true);
			setSelectedCustomer(customer);
			setFormData((prev) => ({
				...prev,
				customerId: customer.id,
			}));

			// Update title
			setFormData((prev) => ({
				...prev,
				title: `${customer.name}`,
			}));

			setCustomerSearchTerm("");
			setShowCustomerSuggestions(false);
			return;
		}

		// Use specific lead or first available lead
		const leadToUse = specificLead || nonConvertedLeads[0];

		setSelectedCustomer(customer);
		setFormData((prev) => ({
			...prev,
			customerId: customer.id,
		}));

		// Auto-populate form fields if customer has non-converted leads
		if (leadToUse) {
			setFormData((prev) => ({
				...prev,
				internalLawyerId: leadToUse.internalLawyerId.toString(),
				responsibleLawyerId: leadToUse.responsibleLawyerId.toString(),
				servicesId: leadToUse.servicesId,
				customerId: customer.id,
				leadId: leadToUse.id, // 👈 acá también
			}));
			setSelectedLead(leadToUse);
		}

		// Update title
		setFormData((prev) => ({
			...prev,
			title: `${customer.name}`,
		}));

		setCustomerSearchTerm("");
		setShowCustomerSuggestions(false);
		// Focus back to input after selection
		setTimeout(() => {
			searchInputRef.current?.focus();
		}, 100);
	};

	const handleSelectLead = (lead: any) => {
		setFormData((prev) => ({
			...prev,
			internalLawyerId: lead.internalLawyerId.toString(),
			responsibleLawyerId: lead.responsibleLawyerId.toString(),
			servicesId: lead.servicesId,
			leadId: lead.id, // 👈 aquí
		}));
		setSelectedLead(lead);
		setShowLeadSelector(false);
		setAvailableLeads([]);
	};

	// Remove customer from selection
	const handleRemoveCustomer = () => {
		setSelectedCustomer(null);
		setFormData((prev) => ({
			...prev,
			customerId: null,
			title: "",
		}));

		// Focus back to input after removal
		setTimeout(() => {
			searchInputRef.current?.focus();
		}, 100);
	};

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	// Manejadores para los selects
	const handleServicesIdChange = (value: number) => {
		console.log("Tipo de servicio seleccionado:", value);
		setFormData((prev) => ({ ...prev, servicesId: value }));
		setIsServiceSelectOpen(false);
	};

	// Handler for stageId
	const handleStageIdChange = (value: number) => {
		console.log("Etapa seleccionada:", value);
		setFormData((prev) => ({ ...prev, stageId: value }));
		setIsStageSelectOpen(false);
	};

	// Separate handler for the isActive switch (now boolean)
	const handleIsActiveChange = (checked: boolean) => {
		console.log("isActive cambiado:", checked);
		setFormData((prev) => ({ ...prev, isActive: checked }));
	};

	// Handler for isArchived
	const handleIsArchivedChange = (checked: boolean) => {
		console.log("isArchived cambiado:", checked);
		setFormData((prev) => ({ ...prev, isArchived: checked }));
	};

	const handleCustomerSearchChange = (value: string) => {
		setCustomerSearchTerm(value);
		setShowCustomerSuggestions(true);
	};

	const handleNuevoClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setNewCustomers((prev) => ({ ...prev, [name]: value }));
	};

	const openModal = (e: React.MouseEvent) => {
		e.preventDefault();
		console.log("Abriendo modal de nuevo cliente");
		setIsModalOpen(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.title.trim()) {
			toast.error("Por favor, ingrese un título para el caso");
			return;
		}

		if (!formData.customerId) {
			toast.error("Por favor, seleccione al menos un cliente");
			return;
		}

		if (!formData.responsibleLawyerId && !formData.internalLawyerId) {
			toast.error("Por favor, seleccione al menos un abogado");
			return;
		}

		try {
			setIsSubmitting(true);
			setError(null);

			const nuevoCaso = {
				createdByUserId: Number(session?.user?.id),
				number:
					formData.number || String(Math.floor(Math.random() * 10000) + 1),
				title: formData.title,
				isActive: formData.isActive,
				isArchived: formData.isArchived,
				status: "IN_PROGRESS",
				stageId: formData.stageId,
				servicesId: formData.servicesId,
				userId: formData.customerId,
				leadId: formData.leadId,
				injury: formData.injury || undefined,
				responsibleLawyerId: formData.responsibleLawyerId
					? Number.parseInt(formData.responsibleLawyerId, 10)
					: undefined,
				internalLawyerId: formData.internalLawyerId
					? Number.parseInt(formData.internalLawyerId, 10)
					: undefined,
				files: [],
			};

			console.log("Enviando caso:", nuevoCaso);
			const response = await fetch(`${CASES_ENDPOINT}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(nuevoCaso),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to create case");
			}

			const data = await response.json();
			console.log("Caso creado:", data);
			toast.success("Caso creado exitosamente!");
			router.push("/admin/legal-cases");
		} catch (err) {
			console.error("Error creating case:", err);
			setError(
				`Failed to create case: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Función para abrir el modal

	// Función para cerrar los selectores al hacer clic fuera de ellos
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				serviceSelectRef.current &&
				!serviceSelectRef.current.contains(event.target as Node) &&
				isServiceSelectOpen
			) {
				setIsServiceSelectOpen(false);
			}

			if (
				stageSelectRef.current &&
				!stageSelectRef.current.contains(event.target as Node) &&
				isStageSelectOpen
			) {
				setIsStageSelectOpen(false);
			}

			// Only close customer suggestions if clicking outside AND not on the search input
			if (
				customerSelectRef.current &&
				!customerSelectRef.current.contains(event.target as Node) &&
				searchInputRef.current !== event.target
			) {
				setShowCustomerSuggestions(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isServiceSelectOpen, isStageSelectOpen]);

	// Add this after the fetchCustomers function completes

	const [customerCreated, setCustomerCreated] = useState(null);

	useEffect(() => {
		console.log("Lista de customers actualizada:", customers.length);
		if (customers.length > 0) {
			console.log(
				"Primeros 3 customers:",
				customers.slice(0, 3).map((c) => ({
					id: c.id,
					name: c.name,
					email: c.email,
				})),
			);
		}
	}, [customers]);

	useEffect(() => {
		console.log("selectedCustomer cambió:", selectedCustomer);
		console.log("formData.customerId:", formData.customerId);
	}, [selectedCustomer, formData.customerId]);

	return (
		<>
			<div className="mx-auto max-w-2xl z-0">
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
					<div className="border-b border-gray-200 bg-white px-6 py-4">
						<div className="flex justify-between items-center mb-1">
							<h2 className="text-xl font-semibold text-gray-900">
								Crear nuevo caso
							</h2>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<span className="text-sm text-gray-700">
										{formData.isArchived ? "Archivado" : "No archivado"}
									</span>
									<Switch
										id="switch-archive"
										defaultChecked={formData.isArchived}
										onCheckedChange={handleIsArchivedChange}
									/>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-gray-700">
										{formData.isActive ? "Activo" : "Inactivo"}
									</span>
									<Switch
										id="switch-case"
										defaultChecked={formData.isActive}
										onCheckedChange={handleIsActiveChange}
									/>
								</div>
							</div>
						</div>
						<p className="mt-1 text-sm text-gray-500">
							Complete la información para crear un nuevo caso
						</p>
					</div>
					{error && (
						<div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
							<div className="flex">
								<div className="shrink-0">
									<AlertCircle className="h-5 w-5 text-red-400" />
								</div>
								<div className="ml-3">
									<p className="text-sm text-red-700">{error}</p>
								</div>
							</div>
						</div>
					)}
					<form onSubmit={handleSubmit}>
						<div className="space-y-4 px-6 py-4">
							{/* Multiselect de Clientes con chips dentro del input */}
							<div className="space-y-2">
								<Label htmlFor="cliente-search">Clientes</Label>

								<div className="flex items-center gap-2">
									<Popover open={showCustomerSuggestions} onOpenChange={setShowCustomerSuggestions}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												className="flex-1 justify-between h-auto min-h-10"
											>
												{selectedCustomer ? (
													<Badge className="flex items-center gap-1">
														{selectedCustomer.name}
														<span
															onClick={(e) => {
																e.stopPropagation();
																handleRemoveCustomer();
															}}
															className="ml-1 cursor-pointer"
														>
															<X className="w-3 h-3" />
														</span>
													</Badge>
												) : (
													<span className="text-muted-foreground">
														Buscar cliente...
													</span>
												)}
												<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
											</Button>
										</PopoverTrigger>

										<PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
											<Command shouldFilter={true}>
												<CommandInput placeholder="Buscar cliente..." />
												<CommandEmpty>
													{isLoadingCustomers ? "Buscando..." : "No se encontraron clientes"}
												</CommandEmpty>
												<CommandGroup className="max-h-60 overflow-auto">
													{customers.map((customer) => {
														const isSelected = selectedCustomer?.id === customer.id;
														const nonConvertedLeads =
															customer.crmLeads?.filter((lead) => !lead.converted) || [];

														return (
															<CommandItem
																key={customer.id}
																value={customer.name}
																onSelect={() => handleSelectCustomer(customer)}
															>
																<div className="flex flex-col flex-1">
																	<span className="font-medium">{customer.name}</span>
																	<span className="text-xs text-muted-foreground">
																		{customer.email}
																	</span>
																	{nonConvertedLeads.length > 0 && (
																		<span className="text-xs text-blue-600 mt-0.5">
																			{nonConvertedLeads.length} oportunidad
																			{nonConvertedLeads.length > 1 ? "es" : ""} disponible
																			{nonConvertedLeads.length > 1 ? "s" : ""}
																		</span>
																	)}
																</div>
																{isSelected && (
																	<Check className="ml-auto h-4 w-4 text-blue-600 shrink-0" />
																)}
															</CommandItem>
														);
													})}
												</CommandGroup>
											</Command>
										</PopoverContent>
									</Popover>

									<Button
										type="button"
										onClick={openModal}
									>
										<UserPlus className="w-4 h-4" />
										Nuevo
									</Button>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex gap-4">
									<div className="w-3/4 space-y-2">
										<Label htmlFor="title">Titulo</Label>
										<Input
											id="title"
											name="title"
											placeholder="Ingrese título del caso"
											value={formData.title}
											onChange={handleChange}
											required
										/>
									</div>
									<div className="w-1/4 space-y-2">
										<Label htmlFor="number">Nº de caso</Label>
										<Input
											id="number"
											name="number"
											placeholder="Auto"
											value={formData.number}
											onChange={handleChange}
										/>
									</div>
								</div>
							</div>

							{/* Lesión */}
							<div className="space-y-2">
								<Label htmlFor="injury">Lesión</Label>
								<Input
									id="injury"
									name="injury"
									placeholder="Ej: Fractura de muñeca, lumbalgia, etc."
									value={formData.injury}
									onChange={handleChange}
								/>
							</div>

						{/* Tipo de Servicio y Estado del Caso en layout 1/2 + 1/2 */}
							<div className="flex gap-4">
								<div className="w-1/2 space-y-2">
									<Label htmlFor="servicesId">Tipo de Servicio</Label>
									<Select
										value={formData.servicesId?.toString()}
										onValueChange={(value) => handleServicesIdChange(Number(value))}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Seleccionar servicio" />
										</SelectTrigger>
										<SelectContent>
											{servicesType.map((type) => (
												<SelectItem key={type.id} value={type.value.toString()}>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="w-1/2 space-y-2">
									<Label htmlFor="stageId">Etapa del Caso</Label>
									<Select
										value={formData.stageId?.toString()}
										onValueChange={(value) => handleStageIdChange(Number(value))}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Seleccionar etapa" />
										</SelectTrigger>
										<SelectContent>
											{stageCases.map((stage, index) => (
												<SelectItem key={index} value={stage.value.toString()}>
													{stage.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{isLoading ? (
								<div className="flex items-center justify-center mt-4">
									<Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin text-blue-500" />
									<span className="text-sm text-gray-500">
										Cargando abogados...
									</span>
								</div>
							) : (
								<div className="flex gap-4">
									<div className="w-1/2 space-y-2">
										<Label htmlFor="responsibleLawyerId">Abogado Responsable</Label>
										<Popover open={showResponsibleLawyerDropdown} onOpenChange={setShowResponsibleLawyerDropdown}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													className="w-full justify-between"
												>
													{formData.responsibleLawyerId
														? filteredResponsibleLawyers.find(
															(l) => String(l.id) === formData.responsibleLawyerId,
														)?.name
														: "Buscar abogado responsable..."}
													<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="p-0" side="top" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
												<Command className="flex flex-col-reverse">
													<CommandInput
														placeholder="Buscar abogado..."
														value={responsibleLawyerSearch}
														onValueChange={(value) => {
															setResponsibleLawyerSearch(value);
															if (value === "") {
																setFormData((prev) => ({
																	...prev,
																	responsibleLawyerId: "",
																}));
															}
														}}
													/>
													<div className="max-h-60 overflow-auto">
														<CommandEmpty>No se encontraron abogados</CommandEmpty>
														<CommandGroup>
															{filteredResponsibleLawyers.map((lawyer) => (
																<CommandItem
																	key={lawyer.id}
																	value={lawyer.name}
																	onSelect={() => {
																		setFormData((prev) => ({
																			...prev,
																			responsibleLawyerId: String(lawyer.id),
																		}));
																		setResponsibleLawyerSearch(lawyer.name);
																		setShowResponsibleLawyerDropdown(false);
																	}}
																>
																	{lawyer.id} - {lawyer.name}
																	{String(lawyer.id) === formData.responsibleLawyerId && (
																		<Check className="ml-auto h-4 w-4 text-blue-600" />
																	)}
																</CommandItem>
															))}
														</CommandGroup>
													</div>
												</Command>
											</PopoverContent>
										</Popover>
									</div>

									<div className="w-1/2 space-y-2">
										<Label htmlFor="internalLawyerId">Abogado Interno</Label>
										<Select
											value={formData.internalLawyerId?.toString() || ""}
											onValueChange={(value) => {
												const syntheticEvent = {
													target: { name: "internalLawyerId", value },
												} as React.ChangeEvent<HTMLSelectElement>;
												handleSelectChange(syntheticEvent);
											}}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Seleccione un abogado externo" />
											</SelectTrigger>
											<SelectContent>
												{internalLawyers.map((lawyer) => (
													<SelectItem key={lawyer.id} value={lawyer.id.toString()}>
														{lawyer.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							)}
						</div>
						<div className="flex justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
							<Button
								variant="outline"
								onClick={() => router.back()}
								className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting}
								variant="default"
								className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm bg-primary text-white hover:bg-primary/85 focus:outline-none focus:ring-2 focus:ring-primary/55 focus:ring-offset-2 ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin text-white" />
										Creando...
									</>
								) : (
									<div className="flex items-center">
										<Plus className="mr-2 h-4 w-4" />
										Crear caso
									</div>
								)}
							</Button>
						</div>
					</form>
				</div>
			</div>
			<CustomerRegistrationModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onCustomerCreated={(createdCustomer: any) => {
					try {
						// Verificar que createdCustomer existe
						if (!createdCustomer) {
							console.error("createdCustomer es null o undefined");
							toast.error("Error: No se recibió información del cliente");
							return;
						}

						// Crear un objeto customer con la estructura correcta basada en la respuesta real
						const user = createdCustomer.user;

						const newCustomerForSelection: Customer = {
							id: user.id,
							name: user.name || "Cliente sin nombre",
							email: user.email || "",
							phone: user.userProfile?.phone || "",
							roleUser: user.roleUser || [
								{ role: { id: 34, name: "customer" } },
							],
							crmLeads: [],
						};

						// Agregar el cliente al estado local
						setCustomers((prevCustomers) => {
							const exists = prevCustomers.some(
								(c) =>
									c.id === newCustomerForSelection.id ||
									c.email === newCustomerForSelection.email,
							);
							if (exists) {
								return prevCustomers;
							}
							return [newCustomerForSelection, ...prevCustomers];
						});

						// Seleccionar el cliente directamente
						setSelectedCustomer(newCustomerForSelection);
						setFormData((prev) => ({
							...prev,
							customerId: newCustomerForSelection.id,
							title: `${newCustomerForSelection.name}`,
						}));

						// Limpiar estados
						setCustomerSearchTerm("");
						setShowCustomerSuggestions(false);
						setIsModalOpen(false);

						toast.success("Cliente creado y seleccionado correctamente");
					} catch (error) {
						console.error("Error al procesar el cliente creado:", error);
						toast.error(
							"Error al procesar el cliente. Por favor, inténtelo de nuevo.",
						);
					}
				}}
			/>
		</>
	);
}
