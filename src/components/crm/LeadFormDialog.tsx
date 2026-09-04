"use client";

import {
	Briefcase,
	CalendarDays,
	ChevronDown,
	ChevronUp,
	Folder,
	Gavel,
	HardHat,
	Loader2,
	type LucideIcon,
	Megaphone,
	Pencil,
	Phone,
	Plus,
	RefreshCw,
	Scale,
	Search,
	ShieldCheck,
	Stethoscope,
	Tag,
	Umbrella,
	UserCog,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import InjuryAutocomplete from "@/components/common/InjuryAutocomplete";
import ProvinceCitySelect from "@/components/common/ProvinceCitySelect";
import FilterCombobox from "@/components/crm/FilterCombobox";
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
import { Switch } from "@/components/ui/switch";
import {
	CUSTOMERS_ENDPOINT,
	LAWYERS_ENDPOINT,
	LEADS_ENDPOINT,
	SELLERS_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { ART_COMPANIES, INSURANCE_COMPANIES, SERVICES_TYPE, SOURCE_CHANNEL } from "@/constant/crm";
import { getCrmStoragePrefix } from "@/constant/storage-structure";
import { Role } from "@/constant/user";
import {
	sendStageEmail,
	shouldBlockAutomaticEmail,
} from "@/lib/send-stage-email";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/crm";
import type { User } from "@/types/users";
import CustomerRegistrationModal from "../customers/CustomerRegistrationModal";


interface LeadFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lead: Lead | null;
}

interface Seller {
	id: number;
	name: string;
}

interface Customer {
	id: number;
	name: string;
	email: string;
	userProfile: {
		phone: string;
	};
	userAddresses: {
		city: string;
		state: {
			name: string;
		};
	}[];
	roleUser: any[];
}

// Debe coincidir con CUSTOMER_ROLE_ID de CustomerRegistrationModal.tsx.
const CUSTOMER_ROLE_ID = 34;

const emptyNewClientForm = { fullName: "", email: "", phone: "" };

function FieldLabel({
	icon: Icon,
	htmlFor,
	children,
}: {
	icon: LucideIcon;
	htmlFor?: string;
	children: React.ReactNode;
}) {
	return (
		<Label htmlFor={htmlFor} className="flex items-center gap-1.5">
			<Icon className="h-3.5 w-3.5 text-primary" />
			{children}
		</Label>
	);
}

function SectionHeading({
	icon: Icon,
	children,
}: {
	icon: LucideIcon;
	children: React.ReactNode;
}) {
	return (
		<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2.5 pb-1.5 border-b">
			<span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
				<Icon className="h-3 w-3 text-primary" />
			</span>
			{children}
		</h3>
	);
}

export default function LeadFormDialog({
	open,
	onOpenChange,
	lead,
}: LeadFormDialogProps) {
	const { data: session } = useSession();
	const [formData, setFormData] = useState({
		userId: 0,
		sellerId: 0,
		internalLawyerId: 0,
		responsibleLawyerId: 0,
		servicesId: 0,
		sourceChannelId: 0,
		status: "IN_PROGRESS",
		columnId: 1,
		notes: "",
		documentationComplete: false,
		referentId: null as number | null,
		accidentDate: "",
		artId: null as number | null,
		insuranceId: null as number | null,
		injury: "",
		// Provincia / localidad de la oportunidad (KPIs v1.1, punto 7).
		// Propias del lead: antes se derivaban de la dirección del cliente,
		// que la mayoría de las oportunidades abiertas no tiene cargada.
		stateId: null as number | null,
		cityId: null as number | null,
	});
	const _router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
	const [showResults, setShowResults] = useState(false);
	const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
	const [customersError, setCustomersError] = useState<string | null>(null);
	const [sellers, setSellers] = useState<Seller[]>([]);
	const [isSellerLoading, setIsSellerLoading] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [responsibleLawyers, setResponsibleLawyers] = useState<any[]>([]);
	const [internalLawyers, setInternalLawyers] = useState<any[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasSelectedCustomer, setHasSelectedCustomer] = useState(false);
	const [skipWelcomeEmail, setSkipWelcomeEmail] = useState(false);
	const [isRefreshingCustomers, setIsRefreshingCustomers] = useState(false);
	const [_selectedCustomerName, setSelectedCustomerName] = useState("");
	const [customerModalOpen, setCustomerModalOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<User | null>(null);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");
	const [isNewClientOpen, setIsNewClientOpen] = useState(false);
	const [newClientForm, setNewClientForm] = useState(emptyNewClientForm);
	const [isCreatingClient, setIsCreatingClient] = useState(false);

	const searchInputRef = useRef<HTMLInputElement>(null);

	const fetchCustomers = useCallback(
		async (showLoading = true) => {
			if (showLoading) {
				setIsLoadingCustomers(true);
			} else {
				setIsRefreshingCustomers(true);
			}
			setCustomersError(null);
			try {
				const response = await fetch(`${CUSTOMERS_ENDPOINT}?limit=100000`, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					cache: "no-store",
				});
				if (!response.ok) throw new Error(`Error: ${response.status}`);
				const data = await response.json();

				const uniqueCustomers = Array.isArray(data.data)
					? data.data
						.filter((c: Customer) =>
							c.roleUser?.some((ru: any) => ru.role?.name === Role.CUSTOMER),
						)
						.filter(
							(c: Customer, i: number, self: Customer[]) =>
								i === self.findIndex((x) => x.id === c.id),
						)
					: [];
				setCustomers(uniqueCustomers);
				setFilteredCustomers(uniqueCustomers);
				return uniqueCustomers;
			} catch (error) {
				console.error("Failed to fetch customers:", error);
				setCustomersError("Error al cargar clientes.");
				return [];
			} finally {
				if (showLoading) setIsLoadingCustomers(false);
				else setIsRefreshingCustomers(false);
			}
		},
		[session?.user?.accessToken],
	);

	const refreshCustomers = async () => fetchCustomers(false);

	const fetchSellers = useCallback(async () => {
		setIsSellerLoading(true);
		try {
			const response = await fetch(SELLERS_ENDPOINT, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!response.ok) throw new Error(`Error: ${response.status}`);
			const data = await response.json();
			setSellers(data.data);
		} catch (error) {
			console.error("Failed to fetch sellers:", error);
		} finally {
			setIsSellerLoading(false);
		}
	}, [session?.user?.accessToken]);

	const fetchDataLawyer = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			const data = await response.json();
			if (data?.data) {
				setResponsibleLawyers(
					data.data.filter((l: any) =>
						l.roleUser?.some(
							(ru: any) =>
								ru.role?.name === Role.DIRECTOR_GENERAL_CEO ||
								ru.role?.name === Role.GERENTE_GENERAL_COO ||
								ru.role?.name === Role.ABOGADO_REPRESENTANTE,
						),
					),
				);
				setInternalLawyers(
					data.data.filter((l: any) =>
						l.roleUser?.some(
							(ru: any) =>
								ru.role?.name === Role.ASISTENTE_LEGAL ||
								ru.role?.name === Role.GERENTE_GENERAL_COO ||
								ru.role?.name === Role.DIRECTORA_AREA_LEGAL,
						),
					),
				);
			}
		} catch (error) {
			console.error("Error fetching lawyers:", error);
		} finally {
			setIsLoading(false);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		if (open) {
			fetchCustomers();
			fetchSellers();
			fetchDataLawyer();
		}
	}, [open, fetchCustomers, fetchSellers, fetchDataLawyer]);

	useEffect(() => {
		if (lead) {
			setFormData({
				userId: lead.userId || 0,
				sellerId: lead.sellerId || 0,
				internalLawyerId: lead.internalLawyerId || 0,
				responsibleLawyerId: lead.responsibleLawyerId || 0,
				servicesId: lead.servicesId || 0,
				sourceChannelId: lead.sourceChannelId || 0,
				status: lead.status || "IN_PROGRESS",
				columnId: lead.columnId || 1,
				notes: lead.notes || "",
				documentationComplete: lead.documentationComplete || false,
				referentId: lead.referentId ?? null,
				accidentDate: lead.accidentDate ? lead.accidentDate.slice(0, 10) : "",
				artId: lead.artId ?? null,
				insuranceId: lead.insuranceId ?? null,
				injury: lead.injury || "",
				stateId: lead.stateId ?? null,
				cityId: lead.cityId ?? null,
			});
			if (lead.user) {
				setSearchQuery(lead.user.name);
				setSelectedCustomerName(lead.user.name);
				setHasSelectedCustomer(true);
			}
		} else {
			setFormData({
				userId: 0,
				sellerId: 0,
				internalLawyerId: 0,
				responsibleLawyerId: 0,
				servicesId: 0,
				sourceChannelId: 0,
				status: "IN_PROGRESS",
				columnId: 1,
				notes: "",
				documentationComplete: false,
				referentId: null,
				accidentDate: "",
				artId: null,
				insuranceId: null,
				injury: "",
				stateId: null,
				cityId: null,
			});
			setSearchQuery("");
			setSelectedCustomerName("");
			setHasSelectedCustomer(false);
		}
	}, [lead]);

	useEffect(() => {
		if (searchQuery) {
			// `customers` ya viene deduplicado por id desde fetchCustomers — no hace
			// falta un segundo paso de dedup (O(n²)) en cada tecla que se escribe.
			const query = searchQuery.toLowerCase();
			setFilteredCustomers(
				customers.filter(
					(c) =>
						c.name?.toLowerCase().includes(query) ||
						c.email?.toLowerCase().includes(query),
				),
			);
		} else {
			setFilteredCustomers(customers);
		}
	}, [searchQuery, customers]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				searchInputRef.current &&
				!searchInputRef.current.contains(event.target as Node)
			) {
				setShowResults(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelectChange = (name: string, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: Number.parseInt(value, 10) }));
	};

	const handleCustomerSelect = (customer: Customer) => {
		setFormData((prev) => ({ ...prev, userId: customer.id }));
		setSearchQuery(customer.name);
		setSelectedCustomerName(customer.name);
		setHasSelectedCustomer(true);
		setShowResults(false);
	};

	const handleEdit = useCallback((customer: any) => {
		setEditingCustomer(customer);
		setModalMode("edit");
		setCustomerModalOpen(true);
	}, []);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setShowResults(true);
		if (e.target.value === "" && hasSelectedCustomer) {
			resetCustomerSelection();
		}
	};

	const resetCustomerSelection = () => {
		setFormData((prev) => ({ ...prev, userId: 0 }));
		setSelectedCustomerName("");
		setHasSelectedCustomer(false);
		setTimeout(() => {
			searchInputRef.current?.focus();
			setShowResults(true);
		}, 0);
	};

	const handleClearSearch = () => {
		setSearchQuery("");
		resetCustomerSelection();
		setTimeout(() => setShowResults(true), 0);
	};

	const handleOpenNewClient = () => {
		setShowResults(false);
		setIsNewClientOpen(true);
	};

	// Colapsa el panel sin descartar lo ya tipeado (chevron del panel).
	const handleCollapseNewClient = () => setIsNewClientOpen(false);

	// Cancela y descarta lo tipeado (botón "Cancelar" del panel).
	const handleCancelNewClient = () => {
		setIsNewClientOpen(false);
		setNewClientForm(emptyNewClientForm);
	};

	const handleCreateInlineClient = async () => {
		const { fullName, email, phone } = newClientForm;
		if (!fullName.trim() || !email.trim() || !phone.trim()) {
			toast.error("Completá todos los datos del nuevo cliente");
			return;
		}

		setIsCreatingClient(true);
		try {
			const response = await fetch(USERS_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					name: fullName.trim(),
					email: email.trim(),
					image: "",
					role: CUSTOMER_ROLE_ID,
					userProfile: {
						docType: null,
						docNumber: null,
						gender: null,
						birthDate: null,
						phone: phone.trim(),
					},
					userAddresses: [],
				}),
			});

			if (!response.ok) {
				const err = await response.json().catch(() => null);
				throw new Error(err?.message || "Error al crear el cliente");
			}

			const result = await response.json();
			const created = result?.user;
			if (created?.id) {
				handleCustomerSelect({
					id: created.id,
					name: created.name,
					email: created.email,
					userProfile: created.userProfile ?? { phone: phone.trim() },
					userAddresses: created.userAddresses ?? [],
					roleUser: created.roleUser ?? [],
				});
			}
			fetchCustomers();
			toast.success("Cliente creado correctamente");
			setIsNewClientOpen(false);
			setNewClientForm(emptyNewClientForm);
		} catch (error: any) {
			toast.error(error?.message || "Error al crear el cliente");
		} finally {
			setIsCreatingClient(false);
		}
	};

	const handleCustomerCreated = () => {
		toast.success("Cliente creado correctamente");
		setCustomerModalOpen(false);
		setEditingCustomer(null);
		setModalMode("create");
		fetchCustomers();
	};

	const handleCustomerUpdated = () => {
		toast.success("Cliente actualizado correctamente");
		setEditingCustomer(null);
		setModalMode("create");
		fetchCustomers();
	};

	const handleSubmit = async () => {
		if (!formData.userId || formData.userId === 0) {
			toast.error("Por favor, selecciona un cliente");
			return;
		}

		setIsSubmitting(true);
		try {
			const dataToSend = {
				userId: formData.userId,
				sellerId:
					formData.sellerId ||
					(session?.user?.id ? Number(session.user.id) : 0),
				internalLawyerId: formData.internalLawyerId || 0,
				responsibleLawyerId: formData.responsibleLawyerId || 0,
				servicesId: formData.servicesId || 0,
				sourceChannelId: formData.sourceChannelId || 0,
				status: formData.status,
				columnId: formData.columnId,
				notes: formData.notes || "",
				documentationComplete: formData.documentationComplete || false,
				referentId: formData.referentId ?? null,
				accidentDate: formData.accidentDate || null,
				artId: formData.artId || null,
				insuranceId: formData.insuranceId || null,
				injury: formData.injury || null,
				stateId: formData.stateId ?? null,
				cityId: formData.cityId ?? null,
			};

			const isCreating = !lead?.id;
			const endpoint = isCreating
				? LEADS_ENDPOINT
				: `${LEADS_ENDPOINT}/${lead?.id}`;
			const method = isCreating ? "POST" : "PUT";

			const response = await fetch(endpoint, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(dataToSend),
			});

			if (!response.ok) throw new Error(`Error: ${response.status}`);

			if (isCreating) {
				const responseData = await response.json().catch(() => null);
				const createdLead =
					responseData?.lead ?? responseData?.data ?? responseData;
				const newLeadId = Number(createdLead?.id ?? 0);
				const folderName = createdLead?.folderName as string | undefined;
				const selectedCustomer = customers.find(
					(c) => c.id === formData.userId,
				);
				const blockedAuto = shouldBlockAutomaticEmail(selectedCustomer?.email);
				if (
					selectedCustomer?.email &&
					!skipWelcomeEmail &&
					!blockedAuto
				) {
					await sendStageEmail({
						email: selectedCustomer.email,
						leadName: selectedCustomer.name,
						leadId: newLeadId,
						columnId: dataToSend.columnId,
						phoneNumber: selectedCustomer.userProfile?.phone,
						accessToken: session?.user?.accessToken,
					});
				} else if (blockedAuto && selectedCustomer?.email) {
					console.log(
						`[Lead] Email de bienvenida bloqueado automáticamente para ${selectedCustomer.email} (interno o de prueba).`,
					);
				}

				// Crear la carpeta del lead en MinIO, en el prefix de su columna actual.
				// No bloquea el flujo: si falla, solo se loguea.
				if (folderName) {
					const stagePrefix = getCrmStoragePrefix(dataToSend.columnId);
					if (stagePrefix) {
						try {
							await fetch("/api/storage/folder", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									prefix: stagePrefix,
									name: folderName,
								}),
							});
						} catch (err) {
							console.error("[Storage] Error creando carpeta del lead:", err);
						}
					}
				}
			}

			toast.success(`Lead ${lead ? "actualizado" : "creado"} correctamente`);
			onOpenChange(false);
			window.location.reload();
		} catch {
			toast.error("Error al guardar el lead. Inténtalo de nuevo.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
							<UserPlus className="size-5 text-primary" />
						</div>
						<div>
							<DialogTitle>{lead ? "Editar Lead" : "Crear Lead"}</DialogTitle>
							<DialogDescription>
								{lead
									? "Modificá los datos del lead y guardá los cambios."
									: "Completá los datos para registrar un nuevo lead."}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-5 py-2">
					{/* Cliente */}
					<section>
						<SectionHeading icon={Users}>
							<span className="text-destructive mr-1">*</span> Cliente
						</SectionHeading>
						<div className="relative">
							{/* Buscador — se oculta con animación al abrir "Nuevo cliente" */}
							<div
								className={cn(
									"grid transition-all duration-300 ease-in-out",
									isNewClientOpen
										? "grid-rows-[0fr] opacity-0"
										: "grid-rows-[1fr] opacity-100",
								)}
							>
								{/* overflow-visible una vez expandido: si no, recorta el
								    desplegable de resultados que sobresale del input. */}
								<div className={cn("overflow-hidden", !isNewClientOpen && "overflow-visible")}>
									<div className="relative flex-1" ref={searchInputRef}>
										<Input
											id="customerSearch"
											placeholder="Buscar cliente por nombre o email..."
											value={searchQuery}
											onChange={handleSearchChange}
											onFocus={() => setShowResults(true)}
											onClick={() => setShowResults(true)}
											className="pl-10 pr-42 h-12"
											disabled={isLoadingCustomers}
											autoComplete="off"
										/>
										{searchQuery ? (
											<button
												type="button"
												onClick={handleClearSearch}
												className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												<X className="h-5 w-5" />
											</button>
										) : (
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
										)}

										{hasSelectedCustomer && formData.userId > 0 && (
											<div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
												<Button
													size="sm"
													onClick={() => {
														const selected = customers.find(
															(c) => c.id === formData.userId,
														);
														if (selected) handleEdit(selected);
													}}
													variant="outline"
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={refreshCustomers}
													disabled={isRefreshingCustomers}
												>
													<RefreshCw
														className={`h-3.5 w-3.5 ${isRefreshingCustomers ? "animate-spin" : ""}`}
													/>
												</Button>
											</div>
										)}

										{!searchQuery && !hasSelectedCustomer && (
											<div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
												<Button size="sm" onClick={handleOpenNewClient}>
													<Plus className="h-3.5 w-3.5 mr-1" />
													Nuevo cliente
													<ChevronDown className="h-3.5 w-3.5 ml-1" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={refreshCustomers}
													disabled={isRefreshingCustomers}
												>
													<RefreshCw
														className={`h-3.5 w-3.5 ${isRefreshingCustomers ? "animate-spin" : ""}`}
													/>
												</Button>
											</div>
										)}

										{showResults && (
											<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
												{isLoadingCustomers ? (
													<div className="p-3 text-sm text-muted-foreground">
														Cargando clientes...
													</div>
												) : customersError ? (
													<div className="p-3 text-sm text-red-500">{customersError}</div>
												) : filteredCustomers.length > 0 ? (
													filteredCustomers.map((customer) => (
														<button
															type="button"
															key={customer.id}
															className={`block w-full px-3 py-2 text-left hover:bg-muted transition-colors ${formData.userId === customer.id ? "bg-primary/5" : ""
																}`}
															onClick={() => handleCustomerSelect(customer)}
														>
															<div className="font-medium text-sm">{customer.name}</div>
															<div className="text-xs text-muted-foreground">
																{customer.email && `${customer.email} - `}
																{customer.userAddresses?.[0]?.state?.name &&
																	`${customer.userAddresses[0].state.name}, `}
																{customer.userAddresses?.[0]?.city}
															</div>
														</button>
													))
												) : (
													<div className="p-3 text-sm text-muted-foreground">
														No se encontraron clientes
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Panel inline "Nuevo cliente" — reemplaza al buscador con animación */}
							<div
								className={cn(
									"grid transition-all duration-300 ease-in-out",
									isNewClientOpen
										? "grid-rows-[1fr] opacity-100"
										: "grid-rows-[0fr] opacity-0",
								)}
							>
								<div className="overflow-hidden">
									<div className="rounded-lg border bg-muted/30 p-4 space-y-4">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-semibold flex items-center gap-1.5">
													<UserPlus className="h-4 w-4 text-primary" />
													Nuevo cliente
												</p>
												<p className="text-xs text-muted-foreground">
													Completá los datos del nuevo cliente.
												</p>
											</div>
											<button
												type="button"
												onClick={handleCollapseNewClient}
												className="text-muted-foreground hover:text-foreground"
												aria-label="Colapsar"
											>
												<ChevronUp className="h-4 w-4" />
											</button>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
											<div className="space-y-2">
												<Label htmlFor="newClientFullName">
													<span className="text-destructive mr-1">*</span>Apellido y Nombre
												</Label>
												<Input
													id="newClientFullName"
													placeholder="Apellido y nombre del cliente"
													value={newClientForm.fullName}
													onChange={(e) =>
														setNewClientForm((prev) => ({ ...prev, fullName: e.target.value }))
													}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="newClientEmail">
													<span className="text-destructive mr-1">*</span>Correo
												</Label>
												<Input
													id="newClientEmail"
													type="email"
													placeholder="ejemplo@correo.com"
													value={newClientForm.email}
													onChange={(e) =>
														setNewClientForm((prev) => ({ ...prev, email: e.target.value }))
													}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="newClientPhone">
													<span className="text-destructive mr-1">*</span>Teléfono
												</Label>
												<div className="relative">
													<Input
														id="newClientPhone"
														type="tel"
														placeholder="11 1234 5678"
														className="pr-9"
														value={newClientForm.phone}
														onChange={(e) =>
															setNewClientForm((prev) => ({ ...prev, phone: e.target.value }))
														}
													/>
													<Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
												</div>
											</div>
										</div>

										<div className="flex justify-end gap-2 pt-2 border-t">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleCancelNewClient}
												disabled={isCreatingClient}
											>
												Cancelar
											</Button>
											<Button
												type="button"
												size="sm"
												onClick={handleCreateInlineClient}
												disabled={isCreatingClient}
											>
												{isCreatingClient && (
													<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
												)}
												Guardar cliente
											</Button>
										</div>
									</div>
								</div>
							</div>

							<CustomerRegistrationModal
								isOpen={customerModalOpen}
								onClose={() => {
									setCustomerModalOpen(false);
									setEditingCustomer(null);
									setModalMode("create");
								}}
								onCustomerCreated={handleCustomerCreated}
								onCustomerUpdated={handleCustomerUpdated}
								onRefreshCustomers={refreshCustomers}
								editingCustomer={editingCustomer}
								mode={modalMode}
							/>
						</div>
					</section>

					{/* Asignación */}
					<section>
						<SectionHeading icon={UserCog}>Asignación</SectionHeading>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<FormSelect
								label="Vendedor"
								icon={Briefcase}
								value={formData.sellerId}
								onChange={(v) => handleSelectChange("sellerId", v)}
								placeholder="Seleccionar"
								options={sellers}
								disabled={isSellerLoading}
							/>
							<FormSelect
								label="Abogado Interno"
								icon={Scale}
								value={formData.internalLawyerId}
								onChange={(v) => handleSelectChange("internalLawyerId", v)}
								placeholder="Seleccionar"
								options={internalLawyers}
								disabled={isLoading}
							/>
							<div className="space-y-2">
								<FieldLabel icon={Gavel}>Abogado Responsable</FieldLabel>
								<FilterCombobox
									placeholder="Seleccionar"
									searchPlaceholder="Buscar abogado..."
									options={responsibleLawyers.map((l) => ({ value: l.id, label: l.name }))}
									value={formData.responsibleLawyerId || undefined}
									onSelect={(v) =>
										setFormData((prev) => ({
											...prev,
											responsibleLawyerId: v ? Number(v) : 0,
										}))
									}
									loading={isLoading}
									className="w-full"
								/>
							</div>
						</div>
					</section>

					{/* Detalle del Caso */}
					<section>
						<SectionHeading icon={Folder}>Detalle del Caso</SectionHeading>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="space-y-2">
								<FieldLabel icon={Stethoscope} htmlFor="injury">Lesión</FieldLabel>
								<InjuryAutocomplete
									id="injury"
									placeholder="Ej: Fractura de muñeca, lumbalgia, etc."
									value={formData.injury}
									onChange={(v) =>
										setFormData((prev) => ({
											...prev,
											injury: v,
										}))
									}
								/>
							</div>

							<div className="space-y-2">
								<FieldLabel icon={Tag}>Servicios</FieldLabel>
								<Select
									value={formData.servicesId ? String(formData.servicesId) : ""}
									onValueChange={(v) => handleSelectChange("servicesId", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar servicio" />
									</SelectTrigger>
									<SelectContent>
										{SERVICES_TYPE.map((s) => (
											<SelectItem key={s.id} value={String(s.id)}>
												{s.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<FieldLabel icon={Megaphone}>Canal de Ingreso</FieldLabel>
								<Select
									value={formData.sourceChannelId ? String(formData.sourceChannelId) : ""}
									onValueChange={(v) => handleSelectChange("sourceChannelId", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar canal" />
									</SelectTrigger>
									<SelectContent>
										{/* Solo canales activos: los discontinuados siguen
										    resolviendo nombre en leads viejos, pero no se
										    ofrecen para cargar uno nuevo. */}
										{SOURCE_CHANNEL.filter((c) => c.active).map((c) => (
											<SelectItem key={c.id} value={String(c.id)}>
												{c.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Provincia y localidad de la oportunidad. Alimentan las
							    métricas por provincia del módulo de KPIs. */}
							<div className="sm:col-span-2">
								<ProvinceCitySelect
									stateId={formData.stateId}
									cityId={formData.cityId}
									onChange={({ stateId, cityId }) =>
										setFormData((prev) => ({ ...prev, stateId, cityId }))
									}
								/>
							</div>

							<div className="space-y-2">
								<FieldLabel icon={CalendarDays}>Fecha de accidente</FieldLabel>
								<Input
									type="datetime-local"
									value={formData.accidentDate || ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											accidentDate: e.target.value,
										}))
									}
								/>
							</div>
						</div>
					</section>

					{/* Seguros */}
					<section>
						<SectionHeading icon={ShieldCheck}>Seguros</SectionHeading>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<FieldLabel icon={HardHat}>ART (opcional)</FieldLabel>
								<Select
									value={formData.artId ? String(formData.artId) : ""}
									onValueChange={(v) =>
										setFormData((prev) => ({
											...prev,
											artId: v ? Number(v) : null,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar ART" />
									</SelectTrigger>
									<SelectContent>
										{ART_COMPANIES.map((a) => (
											<SelectItem key={a.id} value={String(a.id)}>
												{a.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<FieldLabel icon={Umbrella}>Seguro (opcional)</FieldLabel>
								<Select
									value={formData.insuranceId ? String(formData.insuranceId) : ""}
									onValueChange={(v) =>
										setFormData((prev) => ({
											...prev,
											insuranceId: v ? Number(v) : null,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar seguro" />
									</SelectTrigger>
									<SelectContent>
										{INSURANCE_COMPANIES.map((i) => (
											<SelectItem key={i.id} value={String(i.id)}>
												{i.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</section>
				</div>

				<DialogFooter className="sm:justify-between sm:items-center gap-3">
					{!lead && (
						<div className="flex items-center gap-2">
							<Switch
								id="skip-welcome-email"
								checked={skipWelcomeEmail}
								onCheckedChange={setSkipWelcomeEmail}
								disabled={isSubmitting}
							/>
							<Label
								htmlFor="skip-welcome-email"
								className="text-xs text-muted-foreground cursor-pointer"
							>
								No enviar mail de bienvenida
							</Label>
						</div>
					)}
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancelar
						</Button>
						<Button onClick={handleSubmit} disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Guardando...
								</>
							) : (
								<>
									<Plus className="h-4 w-4 mr-2" />
									{lead ? "Actualizar Lead" : "Guardar Lead"}
								</>
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// --- Select reutilizable ---

function FormSelect({
	label,
	icon,
	value,
	onChange,
	placeholder,
	options,
	disabled,
	allowEmpty,
}: {
	label: string;
	icon: LucideIcon;
	value: number;
	onChange: (value: string) => void;
	placeholder: string;
	options: { id: number; name: string }[];
	disabled?: boolean;
	allowEmpty?: boolean;
}) {
	return (
		<div className="space-y-2">
			<FieldLabel icon={icon}>{label}</FieldLabel>
			<Select
				value={value ? String(value) : ""}
				onValueChange={onChange}
				disabled={disabled}
			>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{allowEmpty && <SelectItem value="0">Sin referente</SelectItem>}
					{options.map((opt) => (
						<SelectItem key={opt.id} value={String(opt.id)}>
							{opt.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
