"use client";

import {
	ArrowDown,
	ArrowUp,
	DollarSign,
	FileText,
	ListFilter,
	Plus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	CASH_ENDPOINT,
	CLOSINGS_ENDPOINT,
	CREDIT_CARDS_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { MOVEMENTS } from "@/constant/cash";
import { Role } from "@/constant/user";
import { cn } from "@/lib/utils";
import type { User } from "@/types/users";
import { Autocomplete } from "@/components/shared/Autocomplete";
import { ClosingsCombobox, type ClosingOption } from "@/components/shared/ClosingsCombobox";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Select from "@/components/shared/SelectSimple";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreditCardWithPending } from "@/components/cash/CreditCardsPanel";

export default function MyCashboxContent() {
	const { data: session } = useSession();
	const userId = session?.user?.id;
	const [myCashbox, setMyCashbox] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isRegisterMovementModalOpen, setIsRegisterMovementModalOpen] =
		useState(false);
	const [apiUsers, setApiUsers] = useState<User[]>([]); // Nuevo estado para los usuarios de la API

	const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
	const currentYear = String(new Date().getFullYear());

	const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
	const [selectedYear, setSelectedYear] = useState<string>(currentYear);

	const [filterPeriod, setFilterPeriod] = useState<
		"currentMonth" | "3months" | "6months" | "1year" | "all"
	>("currentMonth");

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 15;

	// State for sorting
	const [sortColumn, setSortColumn] = useState<string | null>(null);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

	// Form states for new movement
	const [newType, setNewType] = useState<string>(""); // Cambiado a string para incluir "transfer"
	const [newSubtype, setNewSubtype] = useState<string>("");
	const [newUser, setNewUser] = useState<number | null>(null);
	const [newAmount, setNewAmount] = useState<string>("");
	const [newDate, setNewDate] = useState<string>(
		new Date().toISOString().substring(0, 10),
	);
	const [newDescription, setNewDescription] = useState<string>("");
	const [newClosingId, setNewClosingId] = useState<string>("");
	const [closingsOptions, setClosingsOptions] = useState<ClosingOption[]>([]);
	// "cash" (Efectivo/Transferencia, default) o el id de una tarjeta —
	// pagar con tarjeta no descuenta el saldo hasta liquidar el resumen.
	const [newPaymentMethod, setNewPaymentMethod] = useState<string>("cash");
	const [creditCards, setCreditCards] = useState<CreditCardWithPending[]>([]);

	const formatCurrency = (amount: number) => {
		if (typeof amount !== "number" || isNaN(amount)) {
			return "$ 0.00";
		}
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
		}).format(amount);
	};

	const getMonthName = (monthNumber: string) => {
		const date = new Date(0, Number(monthNumber) - 1);
		return date.toLocaleString("es-AR", { month: "long" });
	};

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(`${CASH_ENDPOINT}/user/${userId}`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			const result = await response.json();

			if (!response.ok) {
				setError(result.error || "Error al obtener los datos del usuario.");
				setMyCashbox(null);
			} else {
				setMyCashbox(result.data);
				setError(null);
			}
			setLoading(false);
		} catch (error) {
			console.error("Error al obtener los datos del usuario:", error);
			setError("Error al obtener los datos del usuario.");
			setLoading(false);
		}
	}, [session?.user?.id, session?.user?.accessToken]);

	useEffect(() => {
		if (userId && session?.user?.accessToken) {
			fetchData();
		}
	}, [userId, session?.user?.accessToken]);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const response = await fetch(`${USERS_ENDPOINT}?limit=1000000`, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});
				if (!response.ok) {
					throw new Error(`Failed to fetch users: ${response.statusText}`);
				}
				const data = await response.json();

				// Filter out users with roleId 6 (Role.responsible lawyer)
				const filteredUsers = data.data.filter((user: User) => {
					const hasRepresentativeRole = user.roleUser.some((roleUser) => {
						const isAbogadoRepresentante =
							roleUser.role.name === Role.ABOGADO_REPRESENTANTE;
						return isAbogadoRepresentante;
					});
					return !hasRepresentativeRole;
				});

				setApiUsers(filteredUsers);
			} catch (err) {
				console.error("Error fetching users:", err);
				setError((prev) =>
					prev
						? `${prev}\nError al cargar usuarios: ${(err as Error).message}`
						: `Error al cargar usuarios: ${(err as Error).message}`,
				);
			}
		};
		if (session?.user?.accessToken) {
			// Only fetch if session token is available
			fetchUsers();
		}
	}, [session?.user?.accessToken]); // Re-fetch if session token changes

	const fetchCreditCards = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		try {
			const response = await fetch(CREDIT_CARDS_ENDPOINT, {
				headers: { Authorization: `Bearer ${session.user.accessToken}` },
			});
			if (!response.ok) return;
			const { data } = await response.json();
			setCreditCards(data || []);
		} catch (err) {
			console.error("Error fetching credit cards:", err);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		fetchCreditCards();
	}, [fetchCreditCards]);

	// Cargar cierres con el cobro correspondiente pendiente cuando se abre el
	// modal. Aplica a ingresos con subtype `fee` (Honorarios) o `pcl`. Filtra
	// según el subtype elegido — solo muestra cierres con ESE cobro pendiente.
	useEffect(() => {
		const isPayableIngreso =
			newType === "income" && (newSubtype === "fee" || newSubtype === "pcl");
		if (
			!isRegisterMovementModalOpen ||
			!isPayableIngreso ||
			!session?.user?.accessToken
		) {
			return;
		}
		const controller = new AbortController();
		(async () => {
			try {
				const year = new Date().getFullYear();
				const url = `${CLOSINGS_ENDPOINT}?viewAll=true&year=${year}&limit=1000`;
				const res = await fetch(url, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
					signal: controller.signal,
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const json = await res.json();
				const items: ClosingOption[] = (json?.data ?? [])
					.filter((c: any) => {
						if (newSubtype === "fee") {
							// Honorarios: cierre existe → siempre tiene HP acordado.
							// Mostrar solo si feeStatus !== CHARGED.
							return c.feeStatus !== "CHARGED";
						}
						// PCL: puede no existir (pclStatus null) o estar ya cobrado.
						return c.pclStatus != null && c.pclStatus !== "CHARGED";
					})
					.map((c: any) => ({
						id: c.id,
						number: c.case?.number,
						title: c.case?.title,
						date: c.date,
						hpTotal: c.hpTotal,
						hpPaid: c.hpPaid,
						hpRemaining: c.hpRemaining,
						pclTotal: c.pclTotal,
						pclPaid: c.pclPaid,
						pclRemaining: c.pclRemaining,
					}));
				setClosingsOptions(items);
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					console.error("Error cargando cierres:", err);
				}
			}
		})();
		return () => controller.abort();
	}, [
		isRegisterMovementModalOpen,
		newType,
		newSubtype,
		session?.user?.accessToken,
	]);

	// Si el usuario cambia tipo/subtipo y deja de aplicar (fee/pcl), limpiar
	// la selección de cierre.
	useEffect(() => {
		const isPayableIngreso =
			newType === "income" && (newSubtype === "fee" || newSubtype === "pcl");
		if (!isPayableIngreso && newClosingId) {
			setNewClosingId("");
		}
	}, [newType, newSubtype, newClosingId]);

	const years = useMemo(() => {
		const currentYearNum = new Date().getFullYear();
		return Array.from({ length: 10 }, (_, i) => String(currentYearNum - 5 + i));
	}, []);

	const monthOptions = useMemo(() => {
		return Array.from({ length: 12 }, (_, i) => ({
			value: String(i + 1).padStart(2, "0"),
			label: new Date(0, i).toLocaleString("es-AR", { month: "long" }),
		}));
	}, []);

	const getSubtypeLabel = useCallback((type: string, subtypeValue: string) => {
		const movement = MOVEMENTS.find((m) => m.value === type);
		if (movement && movement.subMovements) {
			const subMovement = movement.subMovements.find(
				(smItem) => smItem.value === subtypeValue,
			); // Renamed sm to smItem
			return subMovement ? subMovement.label : subtypeValue; // Retorna el label o el valor si no se encuentra
		}
		return subtypeValue; // Retorna el valor si no hay subtipos definidos para el tipo
	}, []);

	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortColumn(column);
			setSortDirection("asc"); // Default to ascending when changing column
		}
	};

	const filteredTransactions = useMemo(() => {
		if (!myCashbox?.transaction) return [];

		let transactionsToFilter = [...myCashbox.transaction]; // Create a copy to avoid direct mutation

		if (filterPeriod === "currentMonth") {
			// Include all transactions from beginning of time up to end of selected month
			transactionsToFilter = transactionsToFilter.filter((t) => {
				const transactionDate = new Date(t.date);
				const selectedDate = new Date(
					Number(selectedYear),
					Number(selectedMonth) - 1,
					31,
					23,
					59,
					59,
				); // End of selected month
				return transactionDate <= selectedDate;
			});
		} else if (filterPeriod !== "all") {
			const now = new Date();
			const startDate = new Date(now);

			if (filterPeriod === "3months") {
				startDate.setUTCMonth(now.getUTCMonth() - 3);
			} else if (filterPeriod === "6months") {
				startDate.setUTCMonth(now.getUTCMonth() - 6);
			} else if (filterPeriod === "1year") {
				startDate.setUTCFullYear(now.getUTCFullYear() - 1);
			}
			// Ensure startDate is at the beginning of the day for comparison
			startDate.setUTCHours(0, 0, 0, 0);

			transactionsToFilter = transactionsToFilter.filter((t) => {
				const transactionDate = new Date(t.date);
				// Ensure transactionDate is also at the beginning of the day for comparison
				transactionDate.setUTCHours(0, 0, 0, 0);
				return transactionDate >= startDate;
			});
		}
		// If filterPeriod is "all", no date filtering is applied here.

		// Apply sorting
		if (sortColumn) {
			transactionsToFilter.sort((a, b) => {
				let valA: any;
				let valB: any;

				switch (sortColumn) {
					case "date":
						valA = new Date(a.date).getTime();
						valB = new Date(b.date).getTime();
						break;
					case "type": {
						// For sorting, we need a consistent value. Let's use a derived type.
						const typeA =
							a.type === "transfer"
								? a.userId === userId
									? "expense"
									: "income"
								: a.type;
						const typeB =
							b.type === "transfer"
								? b.userId === userId
									? "expense"
									: "income"
								: b.type;
						valA = typeA;
						valB = typeB;
						break;
					}
					case "subtype":
						valA = a.subtype;
						valB = b.subtype;
						break;
					case "amount":
						valA = a.amount;
						valB = b.amount;
						break;
					case "description":
						valA = a.description;
						valB = b.description;
						break;
					default:
						return 0;
				}

				if (valA < valB) return sortDirection === "asc" ? -1 : 1;
				if (valA > valB) return sortDirection === "asc" ? 1 : -1;
				return 0;
			});
		} else {
			// Default sort by date descending if no specific sort column is selected
			transactionsToFilter.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);
		}

		return transactionsToFilter;
	}, [
		myCashbox?.transaction,
		selectedMonth,
		selectedYear,
		filterPeriod,
		sortColumn,
		sortDirection,
		userId,
	]);

	const { totalIncome, totalExpenses, netBalance, totalMovements } =
		useMemo(() => {
			let incomeSum = 0; // Suma solo para movimientos de tipo 'income'
			let expenseSum = 0; // Suma solo para movimientos de tipo 'expense'
			let transferNetEffect = 0; // Efecto neto de las transferencias en el saldo

			filteredTransactions.forEach((t) => {
				if (t.type === "income") {
					incomeSum += t.amount;
				} else if (t.type === "expense") {
					expenseSum += t.amount;
				} else if (t.type === "transfer") {
					if (t.subtype === "Enviado") {
						// Transferencia enviada, restar del saldo
						transferNetEffect -= t.amount;
					} else if (t.subtype === "Recibido") {
						// Transferencia recibida, sumar al saldo
						transferNetEffect += t.amount;
					}
				}
			});

			return {
				totalIncome: incomeSum,
				totalExpenses: expenseSum,
				netBalance: incomeSum - expenseSum + transferNetEffect, // El saldo neto considera ingresos, gastos y el efecto de las transferencias
				totalMovements: filteredTransactions.length,
			};
		}, [filteredTransactions, userId]);

	// Define esta nueva función para manejar la selección del usuario desde el Autocomplete
	const handleUserSelect = useCallback((selectedUserId: number | null) => {
		setNewUser(selectedUserId);
	}, []);

	const handleAddMovement = async () => {
		const amount = Number.parseFloat(newAmount);

		// Determina el userId final a usar: si newUser está seleccionado, úsalo; de lo contrario, usa session.user.id
		const isSubtypeRequired = newType !== "transfer";
		if (
			!newType ||
			(isSubtypeRequired && !newSubtype) ||
			isNaN(amount) ||
			amount <= 0 ||
			!newDate ||
			!newDescription
		) {
			toast.error(
				"Por favor, completa todos los campos y asegúrate de que el monto sea válido y un usuario esté seleccionado.",
			);
			return;
		}

		// Cierre asociado ya NO es obligatorio para ingresos de Honorarios/PCL —
		// si se selecciona, el backend lo vincula al Closing y lo marca CHARGED;
		// si no, se registra como transacción suelta.

		setLoading(true);

		const bodyPayload: {
			type: string;
			subtype: string;
			userId: any;
			amount: number;
			date: Date;
			description: string;
			userTransferId?: number;
			closingId?: number;
			paymentMethod?: string;
			creditCardId?: number;
		} = {
			type: newType, // Send the actual type, including "transfer"
			subtype: newSubtype,
			userId,
			amount: amount,
			date: new Date(newDate),
			description: newDescription,
		};

		if (newType === "transfer" && newUser !== null) {
			bodyPayload.userTransferId = newUser;
		}

		if (newClosingId) {
			bodyPayload.closingId = Number(newClosingId);
		}

		if (newType === "expense" && newPaymentMethod !== "cash") {
			bodyPayload.paymentMethod = "card";
			bodyPayload.creditCardId = Number(newPaymentMethod);
		}

		const response = await fetch(`${CASH_ENDPOINT}/movements`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
			body: JSON.stringify(bodyPayload),
		});

		const result = await response.json();

		if (result.success) {
			setNewType(""); // Resetear el tipo
			setNewSubtype("");
			setNewUser(null);
			setNewAmount("");
			setNewDescription("");
			setNewDate(new Date().toISOString().substring(0, 10));
			setNewClosingId("");
			setNewPaymentMethod("cash");
			setIsRegisterMovementModalOpen(false); // Close modal
			toast.success(result.message);
			await fetchData(); // Recargar datos para obtener los movimientos actualizados
			if (bodyPayload.creditCardId) await fetchCreditCards();
		} else {
			toast.error(`Error al registrar movimiento: ${result.message}`);
		}
		setLoading(false);
	};

	const handleExportToExcel = async () => {
		try {
			const response = await fetch(`${CASH_ENDPOINT}/user/${userId}/export`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);

			// Obtener fecha actual formateada
			const fecha = new Date();
			const mes = fecha.toLocaleString("default", { month: "long" }); // ejemplo: "junio"
			const anio = fecha.getFullYear();

			// Nombre del archivo
			const fileName = `mis_transacciones_${mes}_${anio}.xlsx`;

			const a = document.createElement("a");
			a.href = url;
			a.download = fileName;
			a.click();
			window.URL.revokeObjectURL(url);

			toast.success("Transacciones exportadas a Excel correctamente");
		} catch (error) {
			console.error("Error al exportar a Excel:", error);
			toast.error("Error al exportar a Excel");
		}
	};

	// Opciones para el Select de Tipo de Movimiento
	const movementTypeOptions = useMemo(() => {
		return MOVEMENTS.map((m) => ({
			value: m.value,
			label: m.label,
		}));
	}, []);

	const subMovementOptions = useMemo(() => {
		const selectedMovement = MOVEMENTS.find((m) => m.value === newType);
		return (
			selectedMovement?.subMovements.map((smItem) => ({
				// Renamed sm to smItem
				value: smItem.value,
				label: smItem.label,
			})) || []
		);
	}, [newType]);

	const filterPeriodOptions = useMemo(() => {
		return [
			{ value: "currentMonth", label: "Mes Actual" },
			{ value: "3months", label: "Últimos 3 Meses" },
			{ value: "6months", label: "Últimos 6 Meses" },
			{ value: "1year", label: "Último Año" },
			{ value: "all", label: "Todas las Transacciones" },
		];
	}, []);

	// Manejar el cambio del tipo de movimiento
	const handleMovementTypeChange = (value: string) => {
		setNewType(value);
		setNewSubtype(""); // Resetear el subtipo cuando el tipo cambia
		setNewPaymentMethod("cash"); // El pago con tarjeta solo aplica a egresos
	};

	const paymentMethodOptions = useMemo(() => {
		return [
			{ value: "cash", label: "Efectivo / Transferencia" },
			...creditCards
				.filter((c) => c.isActive)
				.map((c) => ({ value: String(c.id), label: c.name })),
		];
	}, [creditCards]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<Skeleton className="h-7 w-32" />
						<Skeleton className="h-4 w-64 mt-2" />
					</div>
					<Skeleton className="h-9 w-44" />
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i} className="shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-9 w-9 rounded-full" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-24" />
								<Skeleton className="h-3 w-20 mt-2" />
							</CardContent>
						</Card>
					))}
				</div>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-6 w-28" />
						<div className="flex gap-2">
							<Skeleton className="h-9 w-36" />
							<Skeleton className="h-9 w-28" />
							<Skeleton className="h-9 w-24" />
						</div>
					</div>
					<div className="rounded-xl border overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									{Array.from({ length: 5 }).map((_, i) => (
										<TableCell key={i} className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 6 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 5 }).map((_, j) => (
											<TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<p className="text-lg text-red-600">Error: {error}</p>
			</div>
		);
	}

	if (!myCashbox) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<p className="text-lg text-muted-foreground">
					No se encontraron datos para este usuario.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Mi Caja</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Gestiona tus ingresos, gastos y transferencias
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						onClick={() => setIsRegisterMovementModalOpen(true)}
					>
						<Plus className="h-4 w-4" />
						Registrar Movimiento
					</Button>
					{/* Modal para Registrar Nuevo Movimiento */}
					<Dialog open={isRegisterMovementModalOpen} onOpenChange={(open) => !open && setIsRegisterMovementModalOpen(false)}>
						<DialogContent className="sm:max-w-106.5">
							<DialogHeader>
								<DialogTitle>Registrar Nuevo Movimiento</DialogTitle>
								<DialogDescription>
									Añade un nuevo ingreso, gasto o transferencia entre usuarios.
								</DialogDescription>
							</DialogHeader>

							<div className="grid gap-4 py-4">
								{/* Tipo de movimiento */}
								<div className="space-y-2">
									<Label htmlFor="movement-type">Tipo de Movimiento</Label>
									<Select
										id="movement-type"
										value={newType}
										onValueChange={handleMovementTypeChange}
										options={movementTypeOptions}
										placeholder="Selecciona tipo"
									/>
								</div>

								{/* Subtipo solo si no es transferencia */}
								{newType && newType !== "transfer" && (
									<div className="space-y-2">
										<Label htmlFor="movement-subtype">Subtipo</Label>
										<Select
											id="movement-subtype"
											value={newSubtype}
											onValueChange={setNewSubtype}
											options={subMovementOptions}
											placeholder="Selecciona subtipo"
											disabled={!newType || subMovementOptions.length === 0}
										/>
									</div>
								)}

								{/* Medio de pago: solo para egresos. Con tarjeta, el gasto se
								    acumula y no descuenta el saldo hasta liquidar el resumen. */}
								{newType === "expense" && (
									<div className="space-y-2">
										<Label htmlFor="movement-payment-method">Medio de pago</Label>
										<Select
											id="movement-payment-method"
											value={newPaymentMethod}
											onValueChange={setNewPaymentMethod}
											options={paymentMethodOptions}
											placeholder="Selecciona medio de pago"
										/>
									</div>
								)}

								{/* Usuario destino solo si es transferencia */}
								{newType === "transfer" && (
									<div className="space-y-2">
										<Label htmlFor="movement-user">Usuario Destino</Label>
										<Autocomplete
											id="movement-user"
											value={newUser}
											onSelect={handleUserSelect}
											options={apiUsers}
											placeholder="Selecciona usuario"
										/>
									</div>
								)}

								{/* Monto */}
								<div className="space-y-2">
									<Label htmlFor="movement-amount">Monto</Label>
									<Input
										id="movement-amount"
										type="number"
										value={newAmount}
										onChange={(e) => setNewAmount(e.target.value)}
										placeholder="0.00"
									/>
								</div>

								{/* Fecha */}
								<div className="space-y-2">
									<Label htmlFor="movement-date">Fecha de Carga</Label>
									<Input
										id="movement-date"
										type="date"
										value={newDate}
										onChange={(e) => setNewDate(e.target.value)}
									/>
								</div>

								{/* Cierre asociado — requerido en Ingreso + Honorarios o PCL.
								    Al guardar, el backend marca ese cobro del cierre como CHARGED. */}
								{newType === "income" &&
									(newSubtype === "fee" || newSubtype === "pcl") && (
										<div className="space-y-2">
											<Label htmlFor="movement-closing">
												Cierre asociado{" "}
												<span className="text-xs text-red-600 font-normal">
													(requerido)
												</span>
											</Label>
											<ClosingsCombobox
												id="movement-closing"
												value={newClosingId}
												onChange={setNewClosingId}
												options={closingsOptions}
												placeholder={
													newSubtype === "fee"
														? "Buscar cierre con HP pendiente..."
														: "Buscar cierre con PCL pendiente..."
												}
											/>
											{closingsOptions.length === 0 && (
												<p className="text-xs text-muted-foreground">
													No hay cierres con{" "}
													{newSubtype === "fee" ? "HP" : "PCL"} pendiente en el
													año actual.
												</p>
											)}
											{newClosingId &&
												(() => {
													const selectedClosing = closingsOptions.find(
														(c) => String(c.id) === newClosingId,
													);
													if (!selectedClosing) return null;
													const remaining =
														newSubtype === "fee"
															? selectedClosing.hpRemaining
															: selectedClosing.pclRemaining;
													if (remaining == null) return null;
													return (
														<p className="text-xs text-muted-foreground">
															Falta pagar: <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
														</p>
													);
												})()}
										</div>
									)}

								{/* Descripción */}
								<div className="space-y-2">
									<Label htmlFor="movement-description">
										Descripción / Detalle
									</Label>
									<textarea
										id="movement-description"
										value={newDescription}
										onChange={(e) => setNewDescription(e.target.value)}
										placeholder="Detalle del movimiento..."
										rows={4}
										className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
									/>
								</div>
							</div>

							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsRegisterMovementModalOpen(false)}
								>
									Cancelar
								</Button>
								<Button onClick={handleAddMovement}>
									Registrar Movimiento
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				{/* Saldo - Card destacada */}
				<Card className="bg-blue-50/60 border-blue-200 shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-blue-700">
							{filterPeriod === "currentMonth"
								? "Saldo Acumulado"
								: "Saldo del Período"}
						</CardTitle>
						<div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-100">
							<DollarSign className="h-5 w-5 text-blue-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div
							className={cn(
								"text-2xl font-bold tabular-nums",
								netBalance >= 0 ? "text-blue-700" : "text-red-600",
							)}
						>
							{formatCurrency(netBalance)}
						</div>
						<p className="text-xs text-blue-600/70 mt-1">
							{filterPeriod === "currentMonth"
								? `Hasta ${getMonthName(selectedMonth)} ${selectedYear}`
								: `${getMonthName(selectedMonth)} ${selectedYear}`}
						</p>
					</CardContent>
				</Card>

				{/* Ingresos */}
				<Card className="shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							{filterPeriod === "currentMonth"
								? "Ingresos Acumulados"
								: "Ingresos del Período"}
						</CardTitle>
						<div className="flex items-center justify-center h-9 w-9 rounded-full bg-emerald-100">
							<ArrowUp className="h-5 w-5 text-emerald-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-emerald-600 tabular-nums">
							{formatCurrency(totalIncome)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{filterPeriod === "currentMonth"
								? "Total acumulado"
								: "Total del período"}
						</p>
					</CardContent>
				</Card>

				{/* Gastos */}
				<Card className="shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							{filterPeriod === "currentMonth"
								? "Gastos Acumulados"
								: "Gastos del Período"}
						</CardTitle>
						<div className="flex items-center justify-center h-9 w-9 rounded-full bg-rose-100">
							<ArrowDown className="h-5 w-5 text-rose-500" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-rose-500 tabular-nums">
							{formatCurrency(totalExpenses)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{filterPeriod === "currentMonth"
								? "Total acumulado"
								: "Total del período"}
						</p>
					</CardContent>
				</Card>

				{/* Movimientos */}
				<Card className="shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Total de Movimientos
						</CardTitle>
						<div className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-100">
							<FileText className="h-5 w-5 text-gray-500" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-800 tabular-nums">
							{totalMovements}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{filterPeriod === "currentMonth"
								? "Movimientos acumulados"
								: "Transacciones en el período"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Transactions Table */}
			<div className="space-y-4">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
					<h2 className="text-lg font-semibold text-gray-900">Movimientos</h2>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							className="w-40"
							value={filterPeriod}
							onValueChange={(value) => {
								setFilterPeriod(
									value as
									| "currentMonth"
									| "3months"
									| "6months"
									| "1year"
									| "all",
								);
								setCurrentPage(1);
							}}
							options={filterPeriodOptions}
							placeholder="Período"
						/>
						<Select
							className="w-36"
							value={selectedMonth}
							onValueChange={(v) => { setSelectedMonth(v); setCurrentPage(1); }}
							options={monthOptions}
							placeholder="Mes"
							disabled={filterPeriod !== "currentMonth"}
						/>
						<Select
							className="w-28"
							value={selectedYear}
							onValueChange={(v) => { setSelectedYear(v); setCurrentPage(1); }}
							options={years.map((year) => ({
								value: year,
								label: year,
							}))}
							placeholder="Año"
						/>
						<Button
							variant="outline"
							onClick={handleExportToExcel}
						>
							<FileText className="h-4 w-4" />
							Exportar
						</Button>
					</div>
				</div>

				<div>
					{filteredTransactions.length === 0 ? (
						<div className="py-4 text-center text-gray-500">
							<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
								<ListFilter className="mb-4 h-10 w-10 text-gray-500" />
								<h3 className="mb-2 text-lg font-medium">
									No hay movimientos
								</h3>
								<p className="text-sm text-gray-500">
									No hay transacciones para el período seleccionado.
								</p>
							</div>
						</div>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
											<div
												className="flex items-center cursor-pointer select-none"
												onClick={() => handleSort("date")}
											>
												Fecha
												{sortColumn === "date" &&
													(sortDirection === "asc" ? (
														<ArrowUp className="inline-block h-4 w-4 ml-1" />
													) : (
														<ArrowDown className="inline-block h-4 w-4 ml-1" />
													))}
											</div>
										</TableCell>
										<TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
											<div
												className="flex items-center cursor-pointer select-none"
												onClick={() => handleSort("type")}
											>
												Tipo
												{sortColumn === "type" &&
													(sortDirection === "asc" ? (
														<ArrowUp className="inline-block h-4 w-4 ml-1" />
													) : (
														<ArrowDown className="inline-block h-4 w-4 ml-1" />
													))}
											</div>
										</TableCell>
										<TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
											<div
												className="flex items-center cursor-pointer select-none"
												onClick={() => handleSort("subtype")}
											>
												Subtipo
												{sortColumn === "subtype" &&
													(sortDirection === "asc" ? (
														<ArrowUp className="inline-block h-4 w-4 ml-1" />
													) : (
														<ArrowDown className="inline-block h-4 w-4 ml-1" />
													))}
											</div>
										</TableCell>
										<TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
											<div
												className="flex items-center cursor-pointer select-none"
												onClick={() => handleSort("amount")}
											>
												Monto
												{sortColumn === "amount" &&
													(sortDirection === "asc" ? (
														<ArrowUp className="inline-block h-4 w-4 ml-1" />
													) : (
														<ArrowDown className="inline-block h-4 w-4 ml-1" />
													))}
											</div>
										</TableCell>
										<TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
											<div
												className="flex items-center cursor-pointer select-none"
												onClick={() => handleSort("description")}
											>
												Descripción
												{sortColumn === "description" &&
													(sortDirection === "asc" ? (
														<ArrowUp className="inline-block h-4 w-4 ml-1" />
													) : (
														<ArrowDown className="inline-block h-4 w-4 ml-1" />
													))}
											</div>
										</TableCell>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((transaction, index) => {
										let displayType = transaction.type;

										if (transaction.type === "transfer") {
											if (transaction.subtype === "Enviado") {
												displayType = "Transferencia";
											} else if (transaction.subtype === "Recibido") {
												displayType = "Transferencia";
											} else {
												displayType = "Transferencia";
											}
										} else {
											displayType =
												transaction.type === "income" ? "Ingreso" : "Gasto";
										}

										return (
											<TableRow
												key={transaction.id}
												className={cn(
													index % 2 === 0 ? "bg-white" : "bg-gray-50",
													"hover:bg-gray-100",
												)}
											>
												<TableCell className="px-4 py-3 text-sm text-gray-700">
													{new Date(transaction.date).toLocaleDateString(
														"es-AR",
													)}
												</TableCell>
												<TableCell>
													<span className={cn(
														"inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
														transaction.type === "income"
															? "bg-emerald-50 text-emerald-700"
															: transaction.type === "transfer"
																? "bg-blue-50 text-blue-700"
																: "bg-rose-50 text-rose-600"
													)}>
														{displayType}
													</span>
												</TableCell>
												<TableCell className="px-4 py-3 text-sm text-gray-700">
													{getSubtypeLabel(
														transaction.type,
														transaction.subtype,
													)}
												</TableCell>
												<TableCell
													className={cn(
														"text-right font-medium tabular-nums",
														displayType === "Ingreso"
															? "text-emerald-600"
															: "text-rose-500",
													)}
												>
													{formatCurrency(transaction.amount)}
												</TableCell>
												<TableCell className="px-4 py-3 text-sm text-gray-700">
													{transaction.description}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
							<Pagination
								currentPage={currentPage}
								totalPages={Math.ceil(filteredTransactions.length / itemsPerPage)}
								totalItems={filteredTransactions.length}
								itemsPerPage={itemsPerPage}
								onPageChange={setCurrentPage}
							/>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

