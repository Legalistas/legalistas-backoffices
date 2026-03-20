"use client";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	SETTINGS_COUNTRIES_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import type { User } from "@/types/users";
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

interface CustomerRegistrationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCustomerCreated?: (customer: User) => void;
	onCustomerUpdated?: (customer: User) => void;
	onRefreshCustomers?: () => void;
	editingCustomer?: User | null;
	mode?: "create" | "edit";
}

interface Country {
	id: number;
	name: string;
	states?: State[];
}

interface State {
	id: number;
	name: string;
	countryId: number;
}

interface CustomerForm {
	id?: number;
	name: string;
	email: string;
	image?: string;
	role: number;
	userProfile: {
		id: number;
		userId: number;
		docType: number;
		docNumber: string;
		gender: number;
		birthDate: string;
		phone: string;
	};
	userAddresses: {
		id: number;
		userId: number;
		countryId?: number;
		stateId?: number;
		city: string;
		cp: string;
		street: string;
		streetNumber: string;
		description: string;
		isDefault: boolean;
		state: {
			id: number;
			name: string;
			countryId: number;
			country: {
				id: number;
				name: string;
				code: string;
				phoneCode: string;
			};
		};
	}[];
	roleUser: any[];
	street?: string;
	streetNumber?: string;
	selectedId?: number;
}

const genderOptions = [
	{ value: "1", label: "Masculino" },
	{ value: "2", label: "Femenino" },
	{ value: "3", label: "X" },
];

const docTypeOptions = [
	{ value: "1", label: "DNI" },
	{ value: "2", label: "Pasaporte" },
	{ value: "3", label: "CUIT/CUIL" },
];

const CUSTOMER_ROLE_ID = 34;

const formatDateForInput = (date: any): string => {
	if (!date) return "";
	try {
		let dateObj: Date;
		if (typeof date === "string") {
			dateObj = date.includes("T") ? new Date(date) : new Date(date + "T00:00:00");
		} else if (date instanceof Date) {
			dateObj = date;
		} else {
			return "";
		}
		if (isNaN(dateObj.getTime())) return "";
		return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
	} catch {
		return "";
	}
};

const parseDateFromInput = (dateString: string): Date | null => {
	if (!dateString) return null;
	try {
		const [year, month, day] = dateString.split("-").map(Number);
		if (!year || !month || !day) return null;
		const date = new Date(year, month - 1, day);
		return isNaN(date.getTime()) ? null : date;
	} catch {
		return null;
	}
};

const emptyForm: CustomerForm = {
	name: "",
	email: "",
	image: "",
	role: CUSTOMER_ROLE_ID,
	userProfile: { id: 0, userId: 0, docType: 1, docNumber: "", gender: 1, birthDate: "", phone: "" },
	userAddresses: [],
	roleUser: [],
	street: "",
	streetNumber: "",
	selectedId: undefined,
};

export default function CustomerRegistrationModal({
	isOpen,
	onClose,
	onCustomerCreated,
	onCustomerUpdated,
	onRefreshCustomers,
	editingCustomer = null,
	mode = "create",
}: CustomerRegistrationModalProps) {
	const { data: session } = useSession();
	const [newCustomer, setNewCustomer] = useState<CustomerForm>({ ...emptyForm });
	const [countries, setCountries] = useState<Country[]>([]);
	const [states, setStates] = useState<State[]>([]);
	const [isCreating, setIsCreating] = useState(false);
	const [isLoadingCountries, setIsLoadingCountries] = useState(false);

	const fetchCountries = useCallback(async () => {
		try {
			setIsLoadingCountries(true);
			const response = await fetch(`${SETTINGS_COUNTRIES_ENDPOINT}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!response.ok) throw new Error(`Error: ${response.status}`);
			const data = await response.json();
			setCountries(data.data || []);
		} catch {
			toast.error("Error al cargar los países");
		} finally {
			setIsLoadingCountries(false);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		if (isOpen) fetchCountries();
	}, [fetchCountries, isOpen]);

	useEffect(() => {
		if (!isOpen) {
			setNewCustomer({ ...emptyForm });
		} else if (mode === "create") {
			setNewCustomer({
				...emptyForm,
				userAddresses: [createEmptyAddress(0)],
			});
		} else if (mode === "edit" && editingCustomer) {
			setNewCustomer({
				id: editingCustomer.id,
				name: editingCustomer.name || "",
				email: editingCustomer.email || "",
				image: editingCustomer.image || "",
				role: editingCustomer.role || CUSTOMER_ROLE_ID,
				userProfile: {
					id: editingCustomer.userProfile?.id || 0,
					userId: editingCustomer.id || 0,
					docType: editingCustomer.userProfile?.docType || 1,
					docNumber: editingCustomer.userProfile?.docNumber || "",
					gender: editingCustomer.userProfile?.gender || 1,
					birthDate: formatDateForInput(editingCustomer.userProfile?.birthDate),
					phone: editingCustomer.userProfile?.phone || "",
				},
				userAddresses: (editingCustomer.userAddresses || []).map((addr) => ({
					id: addr.id, userId: addr.userId, countryId: addr.countryId, stateId: addr.stateId,
					city: addr.city, cp: addr.cp || "", street: addr.street || "", streetNumber: addr.streetNumber,
					description: addr.description, isDefault: addr.isDefault,
					state: { id: addr.state.id, name: addr.state.name, countryId: addr.state.countryId,
						country: { id: addr.country.id, name: addr.country.name, code: addr.country.code, phoneCode: addr.country.prefix } },
				})),
				roleUser: editingCustomer.roleUser || [],
				street: editingCustomer.userAddresses?.[0]?.street || "",
				streetNumber: editingCustomer.userAddresses?.[0]?.streetNumber || "",
			});
		}
	}, [isOpen, mode, editingCustomer]);

	useEffect(() => {
		const countryId = newCustomer.userAddresses?.[0]?.countryId;
		if (countryId && countries.length > 0) {
			const country = countries.find((c) => c.id === countryId);
			setStates(country?.states || []);
		}
	}, [newCustomer.userAddresses, countries]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		if (name === "street") {
			setNewCustomer((prev) => ({ ...prev, street: value }));
		} else if (name === "streetNumber") {
			setNewCustomer((prev) => ({ ...prev, streetNumber: value }));
		} else if (name === "city") {
			setNewCustomer((prev) => {
				const addr = prev.userAddresses[0] || createEmptyAddress(prev.id || 0);
				return { ...prev, userAddresses: [{ ...addr, city: value }, ...prev.userAddresses.slice(1)] };
			});
		} else if (name.startsWith("profile.")) {
			const field = name.replace("profile.", "");
			setNewCustomer((prev) => ({
				...prev,
				userProfile: { ...prev.userProfile, [field]: field === "docType" || field === "gender" ? Number(value) : value },
			}));
		} else {
			setNewCustomer((prev) => ({ ...prev, [name]: value }));
		}
	};

	const handleAddressSelect = (name: string, value: string) => {
		const numValue = value === "" ? undefined : Number.parseInt(value);
		setNewCustomer((prev) => {
			const addr = prev.userAddresses[0] || createEmptyAddress(prev.id || 0);
			const updated = { ...addr, [name]: numValue, ...(name === "countryId" && { stateId: undefined }) };
			return { ...prev, userAddresses: [updated, ...prev.userAddresses.slice(1)] };
		});
	};

	const createEmptyAddress = (userId: number) => ({
		id: 0, userId, countryId: 1, stateId: undefined as number | undefined, city: "", cp: "", street: "", streetNumber: "",
		description: "", isDefault: true, state: { id: 0, name: "", countryId: 1, country: { id: 1, name: "", code: "", phoneCode: "" } },
	});

	const handleSaveClient = async () => {
		if (!newCustomer.name?.trim()) { toast.error("El nombre es obligatorio"); return; }
		if (!newCustomer.email?.trim()) { toast.error("El email es obligatorio"); return; }

		try {
			setIsCreating(true);
			const birthDate = parseDateFromInput(newCustomer.userProfile?.birthDate || "");
			const dataToSend = {
				...(mode === "create" && { selectedId: newCustomer.selectedId || null }),
				name: newCustomer.name,
				email: newCustomer.email,
				image: newCustomer.image || "",
				role: newCustomer.role,
				userProfile: {
					docType: mode === "edit" ? (newCustomer.userProfile?.docType || 1) : null,
					docNumber: mode === "edit" ? (newCustomer.userProfile?.docNumber || "") : null,
					gender: mode === "edit" ? (newCustomer.userProfile?.gender || 1) : null,
					birthDate: mode === "edit" ? (birthDate || new Date()) : null,
					phone: newCustomer.userProfile?.phone || "",
				},
				userAddresses: newCustomer.userAddresses?.length
					? [{ countryId: newCustomer.userAddresses[0].countryId, stateId: newCustomer.userAddresses[0].stateId,
						city: newCustomer.userAddresses[0].city || "", cp: newCustomer.userAddresses[0].cp || "",
						street: mode === "edit" ? (newCustomer.street || "") : null,
						streetNumber: mode === "edit" ? (newCustomer.streetNumber || "") : null,
						description: newCustomer.userAddresses[0].description || "", isDefault: true }]
					: [],
			};

			const url = mode === "edit" && editingCustomer ? `${USERS_ENDPOINT}/${editingCustomer.id}` : USERS_ENDPOINT;
			const response = await fetch(url, {
				method: mode === "edit" ? "PUT" : "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
				body: JSON.stringify(dataToSend),
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || "Error");
			}

			const saved = await response.json();
			toast.success(`Cliente ${mode === "edit" ? "actualizado" : "creado"} correctamente`);
			if (mode === "edit") onCustomerUpdated?.(saved);
			else onCustomerCreated?.(saved);
			onRefreshCustomers?.();
			onClose();
		} catch (error: any) {
			toast.error(`Error al ${mode === "edit" ? "actualizar" : "crear"} el cliente`);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{mode === "edit" ? "Editar Cliente" : "Nuevo Cliente"}
					</DialogTitle>
					<DialogDescription>
						{mode === "edit"
							? "Modificá los datos del cliente y guardá los cambios."
							: "Completá los datos para registrar un nuevo cliente."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-2">
					{/* Información Personal */}
					<section>
						<h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
							Información Personal
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="clientName">
									Apellido & Nombre <span className="text-destructive">*</span>
								</Label>
								<Input id="clientName" name="name" value={newCustomer.name} onChange={handleInputChange} placeholder="Nombre completo" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="clientEmail">
									Correo electrónico <span className="text-destructive">*</span>
								</Label>
								<Input id="clientEmail" name="email" type="email" value={newCustomer.email} onChange={handleInputChange} placeholder="cliente@ejemplo.com" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="clientPhone">Teléfono</Label>
								<Input id="clientPhone" name="profile.phone" value={newCustomer.userProfile?.phone || ""} onChange={handleInputChange} placeholder="+54 11 1234-5678" />
							</div>
							{mode === "edit" && (
							<div className="space-y-2">
								<Label htmlFor="birthDate">Fecha de Nacimiento</Label>
								<Input id="birthDate" name="profile.birthDate" type="date" value={newCustomer.userProfile?.birthDate || ""} onChange={handleInputChange} max={new Date().toISOString().split("T")[0]} />
							</div>
							)}
						</div>
					</section>

					{mode === "edit" && (
					<section>
						<h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
							Documentación
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label>Tipo de Documento</Label>
								<Select
									value={String(newCustomer.userProfile?.docType || 1)}
									onValueChange={(v) => setNewCustomer((prev) => ({ ...prev, userProfile: { ...prev.userProfile, docType: Number(v) } }))}
								>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										{docTypeOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="docNumber">Número de Documento</Label>
								<Input id="docNumber" name="profile.docNumber" value={newCustomer.userProfile?.docNumber || ""} onChange={handleInputChange} placeholder="12345678" />
							</div>
							<div className="space-y-2">
								<Label>Género</Label>
								<Select
									value={String(newCustomer.userProfile?.gender || 1)}
									onValueChange={(v) => setNewCustomer((prev) => ({ ...prev, userProfile: { ...prev.userProfile, gender: Number(v) } }))}
								>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										{genderOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</section>
					)}

					{/* Dirección */}
					<section>
						<h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
							{mode === "edit" ? "Dirección" : "Ubicación"}
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{mode === "edit" && (
							<>
							<div className="space-y-2">
								<Label htmlFor="clientStreet">Calle</Label>
								<Input id="clientStreet" name="street" value={newCustomer.street || ""} onChange={handleInputChange} placeholder="Av. Corrientes" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="clientStreetNumber">Número</Label>
								<Input id="clientStreetNumber" name="streetNumber" value={newCustomer.streetNumber || ""} onChange={handleInputChange} placeholder="1234" />
							</div>
							<div className="space-y-2">
								<Label>País</Label>
								<Select
									value={String(newCustomer.userAddresses?.[0]?.countryId || "")}
									onValueChange={(v) => handleAddressSelect("countryId", v)}
									disabled={isLoadingCountries}
								>
									<SelectTrigger>
										<SelectValue placeholder={isLoadingCountries ? "Cargando..." : "Seleccionar país"} />
									</SelectTrigger>
									<SelectContent>
										{countries.map((c) => (
											<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							</>
							)}
							<div className="space-y-2">
								<Label>Provincia</Label>
								<Select
									value={String(newCustomer.userAddresses?.[0]?.stateId || "")}
									onValueChange={(v) => handleAddressSelect("stateId", v)}
									disabled={states.length === 0}
								>
									<SelectTrigger>
										<SelectValue placeholder={states.length === 0 ? "Seleccioná un país" : "Seleccionar provincia"} />
									</SelectTrigger>
									<SelectContent>
										{states.map((s) => (
											<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="clientCity">Ciudad</Label>
								<Input id="clientCity" name="city" value={newCustomer.userAddresses?.[0]?.city || ""} onChange={handleInputChange} placeholder="Buenos Aires" />
							</div>
						</div>
					</section>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isCreating}>
						Cancelar
					</Button>
					<Button onClick={handleSaveClient} disabled={isCreating || !newCustomer.name?.trim()}>
						{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{isCreating
							? mode === "edit" ? "Actualizando..." : "Guardando..."
							: mode === "edit" ? "Actualizar" : "Guardar Cliente"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
