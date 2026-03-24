"use client";

import { Loader2, Pencil, Plus, RefreshCw, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	CUSTOMERS_ENDPOINT,
	LAWYERS_ENDPOINT,
	LEADS_ENDPOINT,
	SELLERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { ART_COMPANIES, INSURANCE_COMPANIES, SERVICES_TYPE, SOURCE_CHANNEL } from "@/constant/crm";
import { Role } from "@/constant/user";
import type { Lead } from "@/types/crm";
import type { User } from "@/types/users";
import CustomerRegistrationModal from "../customers/CustomerRegistrationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

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
	});
	const router = useRouter();
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
	const [isRefreshingCustomers, setIsRefreshingCustomers] = useState(false);
	const [selectedCustomerName, setSelectedCustomerName] = useState("");
	const [customerModalOpen, setCustomerModalOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<User | null>(null);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");

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
								ru.role?.name === Role.GERENTE_GENERAL_COO,
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
			});
			setSearchQuery("");
			setSelectedCustomerName("");
			setHasSelectedCustomer(false);
		}
	}, [lead, open]);

	useEffect(() => {
		if (searchQuery) {
			const filtered = customers.filter(
				(c) =>
					c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					c.email?.toLowerCase().includes(searchQuery.toLowerCase()),
			);
			setFilteredCustomers(
				filtered.filter((c, i, self) => i === self.findIndex((x) => x.id === c.id)),
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
		setFormData((prev) => ({ ...prev, [name]: Number.parseInt(value) }));
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
			};

			const endpoint = lead?.id
				? `${LEADS_ENDPOINT}/${lead.id}`
				: LEADS_ENDPOINT;
			const method = lead?.id ? "PUT" : "POST";

			const response = await fetch(endpoint, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(dataToSend),
			});

			if (!response.ok) throw new Error(`Error: ${response.status}`);

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
					<DialogTitle>{lead ? "Editar Lead" : "Crear Lead"}</DialogTitle>
					<DialogDescription>
						{lead
							? "Modificá los datos del lead y guardá los cambios."
							: "Completá los datos para registrar un nuevo lead."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-2">
					{/* Cliente */}
					<section>
						<h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
							<span className="text-destructive mr-1">*</span> Cliente
						</h3>
						<div className="relative">
							<div className="relative flex-1" ref={searchInputRef}>
								<Input
									id="customerSearch"
									placeholder="Buscar cliente por nombre o email..."
									value={searchQuery}
									onChange={handleSearchChange}
									onFocus={() => setShowResults(true)}
									onClick={() => setShowResults(true)}
									className="pl-10 pr-12"
									disabled={isLoadingCustomers}
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
									<div className="absolute right-0 top-0 flex items-center h-full gap-1 pr-1">
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
									<div className="absolute right-0 top-0 flex items-center h-full gap-1 pr-1">
										<Button
											size="sm"
											onClick={() => setCustomerModalOpen(true)}
										>
											<Plus className="h-3.5 w-3.5 mr-1" />
											Nuevo
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
												<div
													key={customer.id}
													className={`px-3 py-2 hover:bg-muted cursor-pointer transition-colors ${
														formData.userId === customer.id ? "bg-primary/5" : ""
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
												</div>
											))
										) : (
											<div className="p-3 text-sm text-muted-foreground">
												No se encontraron clientes
											</div>
										)}
									</div>
								)}
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
						<h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
							Asignación
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<FormSelect
								label="Vendedor"
								value={formData.sellerId}
								onChange={(v) => handleSelectChange("sellerId", v)}
								placeholder="Seleccionar"
								options={sellers}
								disabled={isSellerLoading}
							/>
							<FormSelect
								label="Abogado Interno"
								value={formData.internalLawyerId}
								onChange={(v) => handleSelectChange("internalLawyerId", v)}
								placeholder="Seleccionar"
								options={internalLawyers}
								disabled={isLoading}
							/>
							<FormSelect
								label="Abogado Responsable"
								value={formData.responsibleLawyerId}
								onChange={(v) => handleSelectChange("responsibleLawyerId", v)}
								placeholder="Seleccionar"
								options={responsibleLawyers}
								disabled={isLoading}
							/>
						</div>
					</section>

					{/* Detalle del Caso */}
					<section>
						<h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
							Detalle del Caso
						</h3>
						<div className="space-y-2 mb-4">
							<Label htmlFor="injury">Lesión</Label>
							<Input
								id="injury"
								placeholder="Ej: Fractura de muñeca, lumbalgia, etc."
								value={formData.injury}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										injury: e.target.value,
									}))
								}
							/>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label>Servicios</Label>
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
								<Label>Canal de Ingreso</Label>
								<Select
									value={formData.sourceChannelId ? String(formData.sourceChannelId) : ""}
									onValueChange={(v) => handleSelectChange("sourceChannelId", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar canal" />
									</SelectTrigger>
									<SelectContent>
										{SOURCE_CHANNEL.map((c) => (
											<SelectItem key={c.id} value={String(c.id)}>
												{c.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Fecha de accidente</Label>
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
						<h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
							Seguros
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>ART (opcional)</Label>
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
								<Label>Seguro (opcional)</Label>
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

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
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
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// --- Select reutilizable ---

function FormSelect({
	label,
	value,
	onChange,
	placeholder,
	options,
	disabled,
	allowEmpty,
}: {
	label: string;
	value: number;
	onChange: (value: string) => void;
	placeholder: string;
	options: { id: number; name: string }[];
	disabled?: boolean;
	allowEmpty?: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
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
