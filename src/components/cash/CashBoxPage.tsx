"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type ApexCharts from "react-apexcharts";
import type {
	CalculatedUserBalance,
	ClosedMonthReport,
	Transaction,
} from "@/types/cash";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
	ssr: false,
});

import {
	ArrowRightLeft,
	Ban,
	Calculator,
	CalendarIcon,
	DollarSign,
	HandCoins,
	Plus,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { Autocomplete } from "@/components/shared/Autocomplete"; // Importa el nuevo Autocomplete
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select as ShadcnSelect,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import Select from "@/components/shared/SelectSimple";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CASH_ENDPOINT, CLOSINGS_ENDPOINT, USERS_ENDPOINT } from "@/constant/api-endpoints";
import { MOVEMENTS } from "@/constant/cash"; // Importar MOVEMENTS y su tipo
import { Role } from "@/constant/user";
import { cn } from "@/lib/utils";
import type { User } from "@/types/users";

export default function CashBoxPage() {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const router = useRouter();
	// Estado para el saldo inicial del período (viene del backend)
	const [initialBalanceForPeriod, setInitialBalanceForPeriod] =
		useState<number>(0);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // Nuevo estado para todas las transacciones (cerradas y no cerradas)
	const [closedMonths, setClosedMonths] = useState<ClosedMonthReport[]>([]);
	const [apiUsers, setApiUsers] = useState<User[]>([]); // Nuevo estado para los usuarios de la API
	const [userTransfers, setUserTransfers] = useState<
		{
			id: number;
			fromUserId: number;
			toUserId: number;
			amount: number;
			createdAt: string;
		}[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Modal states
	const [isNewBoxModalOpen, setIsNewBoxModalOpen] = useState(false);
	const [isRegisterMovementModalOpen, setIsRegisterMovementModalOpen] =
		useState(false);

	// Form states for new movement
	const [newType, setNewType] = useState<string>(""); // Cambiado a string para incluir "transfer"
	const [newSubtype, setNewSubtype] = useState<string>("");
	// Para transferencias: usuario origen y destino
	const [newUserFrom, setNewUserFrom] = useState<number | null>(null);
	const [newUserTo, setNewUserTo] = useState<number | null>(null);
	const [newAmount, setNewAmount] = useState<string>("");
	const [newDate, setNewDate] = useState<string>(
		new Date().toISOString().substring(0, 10),
	);
	const [newDescription, setNewDescription] = useState<string>("");
	const [newClosingId, setNewClosingId] = useState<string>("");
	const [closingsOptions, setClosingsOptions] = useState<
		Array<{ id: number; number?: number | null; title?: string | null; date: string }>
	>([]);

	// State para el input del modal "Abrir Caja"
	const [newBoxInitialAmount, setNewBoxInitialAmount] = useState<string>("");

	// Report states
	const [selectedMonth, setSelectedMonth] = useState<string>(
		String(new Date().getMonth() + 1).padStart(2, "0"),
	);
	const [selectedYear, setSelectedYear] = useState<string>(
		String(new Date().getFullYear()),
	);

	// Filter states (not directly used in UI yet, but kept for future)
	const [filterStartDate, setFilterStartDate] = useState<string>("");
	const [filterEndDate, setFilterEndDate] = useState<string>("");
	const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
		"all",
	);
	const [filterSubtype, setFilterSubtype] = useState<string>("");

	// Accumulated balance state
	const [accumulatedBalanceDate, setAccumulatedBalanceDate] = useState<string>(
		new Date().toISOString().substring(0, 10),
	);

	// Ref for scrolling to monthly movements table
	const monthlyMovementsRef = useRef<HTMLDivElement>(null);

	// Calculated user balances state
	const [calculatedUserBalances, setCalculatedUserBalances] = useState<
		CalculatedUserBalance[]
	>([]);
	const [totalCalculatedUsersBalance, setTotalCalculatedUsersBalance] =
		useState<number>(0);
	const [totalCalculatedUsersIncome, setTotalCalculatedUsersIncome] =
		useState<number>(0);
	const [totalCalculatedUsersExpenses, setTotalCalculatedUsersExpenses] =
		useState<number>(0);

	// Pagination states
	const [page, setPage] = useState(1);
	const rowsPerPage = 10;
	const totalPages = Math.ceil(closedMonths.length / rowsPerPage);

	// Helper para convertir fechas a ISO
	const toISODate = (dateStr: string) => {
		if (dateStr.includes("T") && dateStr.endsWith("Z")) return dateStr;
		if (dateStr.includes("T")) return dateStr + "Z";
		return dateStr.replace(" ", "T") + "Z";
	};

	// Filtra transacciones solo del mes/año seleccionado
	const transaccionesMes = useMemo(() => {
		return transactions
			.filter((t) => {
				const d = new Date(toISODate(t.date));
				return (
					d.getUTCMonth() + 1 === Number(selectedMonth) &&
					d.getUTCFullYear() === Number(selectedYear)
				);
			})
			.sort(
				(a, b) =>
					new Date(toISODate(b.date)).getTime() -
					new Date(toISODate(a.date)).getTime(),
			);
	}, [transactions, selectedMonth, selectedYear]);

	// Estado para la paginación de movimientos del mes
	const [movementsPage, setMovementsPage] = useState(1);
	const movementsRowsPerPage = 10;
	const movementsTotalPages = Math.ceil(
		transaccionesMes.length / movementsRowsPerPage,
	);

	// Resetear página si cambia el mes/año o la cantidad de movimientos
	useEffect(() => {
		setMovementsPage(1);
	}, [selectedMonth, selectedYear, transaccionesMes.length]);

	// Obtener los movimientos paginados
	const paginatedMovements = useMemo(() => {
		const start = (movementsPage - 1) * movementsRowsPerPage;
		const end = movementsPage * movementsRowsPerPage;
		return transaccionesMes.slice(start, end);
	}, [transaccionesMes, movementsPage]);

	// Define esta nueva función para manejar la selección del usuario desde el Autocomplete
	// Manejo para usuario origen
	const handleUserFromSelect = useCallback((selectedUserId: number | null) => {
		setNewUserFrom(selectedUserId);
	}, []);
	// Manejo para usuario destino
	const handleUserToSelect = useCallback((selectedUserId: number | null) => {
		setNewUserTo(selectedUserId);
	}, []);

	// Añade esta función auxiliar para obtener el label del subtipo
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

	// Cargar datos de la base de datos al montar el componente
	const loadData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`${CASH_ENDPOINT}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			const result = await response.json();

			if (response.status !== 200) {
				setError(result.error);
			} else {
				// Asignar el saldo inicial del período, asegurando que sea un número
				setInitialBalanceForPeriod(Number(result.initialBalance) || 0);

				// Asegurarse de que las transacciones sean un array y filtrar por closed=false para la vista principal
				const formattedTransactions = Array.isArray(result.transactions)
					? result.transactions
							.filter((t: { closed?: boolean }) => !t.closed) // Solo transacciones no cerradas para la vista de caja actual
							.map((t: { date: string | number | Date }) => ({
								...t,
								date: new Date(t.date).toISOString().substring(0, 10),
							}))
					: [];
				setTransactions(formattedTransactions);

				// Guardar TODAS las transacciones para el cálculo de saldos de usuario
				const allFormattedTransactions = Array.isArray(result.transactions)
					? result.transactions.map((t: { date: string | number | Date }) => ({
							...t,
							date: new Date(t.date).toISOString().substring(0, 10),
						}))
					: [];
				setAllTransactions(allFormattedTransactions); // Nuevo estado para todas las transacciones

				// Cargar transferencias entre usuarios
				if (Array.isArray(result.userTransfers)) {
					setUserTransfers(result.userTransfers);
				}

				// Asegurarse de que los cierres de mes sean un array y formatear fechas
				const formattedClosedMonths = Array.isArray(result.closedMonths)
					? result.closedMonths.map(
							(cm: { closingDate: string | number | Date }) => ({
								...cm,
								closingDate: new Date(cm.closingDate)
									.toISOString()
									.substring(0, 10),
							}),
						)
					: [];
				setClosedMonths(formattedClosedMonths);
			}
		} catch (error) {
			setError((error as Error).message);
		}
		setLoading(false);
	}, [session?.user?.accessToken]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Nuevo useEffect para pre-llenar el saldo inicial al abrir el modal
	useEffect(() => {
		if (isNewBoxModalOpen && closedMonths.length > 0) {
			// Ordenar los reportes por año y mes para encontrar el más reciente
			const latestReport = closedMonths.sort((a, b) => {
				const dateA = new Date(
					Number.parseInt(a.year),
					Number.parseInt(a.month) - 1,
				);
				const dateB = new Date(
					Number.parseInt(b.year),
					Number.parseInt(b.month) - 1,
				);
				return dateB.getTime() - dateA.getTime();
			})[0];

			if (latestReport) {
				setNewBoxInitialAmount(latestReport.monthlyBalance.toFixed(2)); // Pre-llenar con el saldo final del mes anterior
			}
		} else if (!isNewBoxModalOpen) {
			// Limpiar el input cuando el modal se cierra
			setNewBoxInitialAmount("");
		}
	}, [isNewBoxModalOpen, closedMonths]);

	// Cargar cierres del año actual al abrir el modal de movimiento.
	useEffect(() => {
		if (!isRegisterMovementModalOpen || !session?.user?.accessToken) return;
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
				const items = (json?.data ?? []).map((c: any) => ({
					id: c.id,
					number: c.case?.number,
					title: c.case?.title,
					date: c.date,
				}));
				setClosingsOptions(items);
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					console.error("Error cargando cierres:", err);
				}
			}
		})();
		return () => controller.abort();
	}, [isRegisterMovementModalOpen, session?.user?.accessToken]);

	const formatCurrency = (amount: number) => {
		// Asegurarse de que el monto sea un número antes de formatear
		if (typeof amount !== "number" || isNaN(amount)) {
			return "$ NaN"; // O cualquier otro valor por defecto que prefieras
		}
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
		}).format(amount);
	};

	const handleOpenCashbox = async () => {
		const amount = Number.parseFloat(newBoxInitialAmount);
		if (isNaN(amount)) {
			toast.error("Monto inválido. Por favor, introduce un número.");
			return;
		}

		const confirmAction = await confirm({
			description: `¿Estás seguro de que quieres establecer el saldo de la caja a ${formatCurrency(amount)}? Esto NO eliminará movimientos ni historial de cierres.`,
			confirmLabel: "Continuar",
			variant: "default",
		});

		if (!confirmAction) {
			return;
		}

		setLoading(true);

		const response = await fetch(`${CASH_ENDPOINT}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
			body: JSON.stringify({ amount }),
		});

		const result = await response.json();

		if (result.success) {
			setIsNewBoxModalOpen(false); // Cierra el modal
			setNewBoxInitialAmount(""); // Limpia el input
			toast.success(result.message);
			await loadData(); // Recargar datos para obtener el nuevo initialBalanceForPeriod
		} else {
			toast.error(`Error al abrir caja: ${result.message}`);
		}
		setLoading(false);
	};

	const handleAddMovement = async () => {
		const amount = Number.parseFloat(newAmount);
		let valid = true;
		let errorMsg =
			"Por favor, completa todos los campos y asegúrate de que el monto sea válido y un usuario esté seleccionado.";

		if (!newType || isNaN(amount) || amount <= 0 || !newDate || !newDescription)
			valid = false;

		if (newType === "transfer") {
			if (
				newUserFrom === null ||
				newUserTo === null ||
				newUserFrom === newUserTo
			) {
				valid = false;
				errorMsg = "Selecciona usuario de origen y destino distintos.";
			}
		} else {
			if (!newSubtype || newUserFrom === null) valid = false;
		}

		if (!valid) {
			toast.error(errorMsg);
			return;
		}

		setLoading(true);

		const payload: any = {
			type: newType as "income" | "expense" | "transfer",
			subtype: newType !== "transfer" ? newSubtype : undefined,
			userId: newType === "transfer" ? newUserFrom : newUserFrom,
			amount: amount,
			date: new Date(newDate),
			description: newDescription,
		};
		if (newType === "transfer") {
			payload.userTransferId = newUserTo;
		}
		if (newClosingId) {
			payload.closingId = Number(newClosingId);
		}

		const response = await fetch(`${CASH_ENDPOINT}/movements`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
			body: JSON.stringify(payload),
		});

		const result = await response.json();

		if (result.success) {
			setNewType("");
			setNewSubtype("");
			setNewUserFrom(null);
			setNewUserTo(null);
			setNewAmount("");
			setNewDescription("");
			setNewDate(new Date().toISOString().substring(0, 10));
			setNewClosingId("");
			setIsRegisterMovementModalOpen(false);
			toast.success(result.message);
			await loadData();
		} else {
			toast.error(`Error al registrar movimiento: ${result.message}`);
		}
		setLoading(false);
	};

	// Saldo de Caja: Calculado como el saldo inicial del período + ingresos - gastos (sin transferencias)
	const currentCashBalance = useMemo(() => {
		let balance = initialBalanceForPeriod;
		transactions.forEach((t) => {
			if (t.type === "income") {
				balance += t.amount;
			} else if (t.type === "expense") {
				balance -= t.amount;
			}
			// transfers no afectan la caja
		});
		return balance;
	}, [initialBalanceForPeriod, transactions]);

	// Calculate overall totals for summary cards (Ingresos y Gastos acumulados del período actual, sin transferencias)
	const { totalIncomeAll, totalExpensesAll } = useMemo(() => {
		let incomeAll = 0;
		let expensesAll = 0;

		transactions.forEach((t) => {
			if (t.type === "income") {
				incomeAll += t.amount;
			} else if (t.type === "expense") {
				expensesAll += t.amount;
			}
		});
		return { totalIncomeAll: incomeAll, totalExpensesAll: expensesAll };
	}, [transactions]);

	// Función para obtener el mes y año anterior
	const getPreviousMonthYear = (month: string, year: string) => {
		let m = Number(month) - 1;
		let y = Number(year);
		if (m === 0) {
			m = 12;
			y = y - 1;
		}
		return { prevMonth: String(m).padStart(2, "0"), prevYear: String(y) };
	};

	// Saldo inicial del mes seleccionado: saldo final del último mes cerrado anterior
	const saldoInicialMes = useMemo(() => {
		const selectedKey = `${selectedYear}-${selectedMonth.padStart(2, "0")}`;
		const previousClosed = closedMonths
			.filter((cm) => {
				const cmKey = `${cm.year}-${cm.month.padStart(2, "0")}`;
				return cmKey < selectedKey;
			})
			.sort((a, b) => {
				const aKey = `${a.year}-${a.month.padStart(2, "0")}`;
				const bKey = `${b.year}-${b.month.padStart(2, "0")}`;
				return bKey.localeCompare(aKey);
			});
		return previousClosed.length > 0 ? previousClosed[0].monthlyBalance : 0;
	}, [closedMonths, selectedMonth, selectedYear]);

	// Calcula ingresos, gastos y saldo del mes seleccionado
	const ingresosMes = transaccionesMes
		.filter((t) => t.type === "income")
		.reduce((sum, t) => sum + t.amount, 0);
	const gastosMes = transaccionesMes
		.filter((t) => t.type === "expense")
		.reduce((sum, t) => sum + t.amount, 0);
	const saldoMes = ingresosMes - gastosMes;

	// Filtered movements for the table (not directly used in UI yet, but kept for future)
	const filteredMovements = useMemo(() => {
		return transactions
			.filter((t) => {
				const transactionDate = new Date(t.date);
				const start = filterStartDate ? new Date(filterStartDate) : null;
				const end = filterEndDate ? new Date(filterEndDate) : null;

				if (start && transactionDate < start) return false;
				if (end && transactionDate > end) return false;
				if (filterType !== "all" && t.type !== filterType) return false;
				if (
					filterSubtype &&
					!t.subtype.toLowerCase().includes(filterSubtype.toLowerCase())
				)
					return false;

				return true;
			})
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
	}, [transactions, filterStartDate, filterEndDate, filterType, filterSubtype]);

	// Calculate accumulated balance up to a specific date (sin transferencias)
	const accumulatedBalance = useMemo(() => {
		const targetDate = new Date(accumulatedBalanceDate);
		let balance = initialBalanceForPeriod;
		transactions.forEach((t) => {
			const transactionDate = new Date(t.date);
			if (transactionDate <= targetDate) {
				if (t.type === "income") {
					balance += t.amount;
				} else if (t.type === "expense") {
					balance -= t.amount;
				}
			}
		});
		return balance;
	}, [transactions, initialBalanceForPeriod, accumulatedBalanceDate]);

	// Calculate user balances
	useEffect(() => {
		const calculateUserBalances = () => {
			const userMap = new Map<number, CalculatedUserBalance>();

			apiUsers.forEach((user) => {
				userMap.set(user.id, {
					id: user.id,
					name: user.name,
					avatar: user?.image?.startsWith("http")
						? user?.image
						: `${process.env.NEXT_PUBLIC_BACKEND_URL}${user?.image || ""}`,
					totalBalance: 0,
					income: 0,
					expenses: 0,
				});
			});

			// Desduplicar transacciones por ID
			const uniqueTransactions = Array.from(
				new Map(allTransactions.map((t) => [t.id, t])).values(),
			);

			uniqueTransactions.forEach((t) => {
				const amount = Number(t.amount) || 0;
				const type = t.type?.toLowerCase() || "";

				let userBalance = userMap.get(t.userId);

				if (!userBalance) {
					userMap.set(t.userId, {
						id: t.userId,
						name: `Usuario Desconocido (${t.userId})`,
						avatar: "/placeholder.svg",
						totalBalance: 0,
						income: 0,
						expenses: 0,
					});
					userBalance = userMap.get(t.userId)!;
				}

				if (type === "income") userBalance.income += amount;
				else if (type === "expense") userBalance.expenses += amount;
				else if (type === "transfer") userBalance.expenses += amount; // transferencias enviadas → gasto del emisor
			});

			// Transferencias recibidas → ingreso del receptor
			userTransfers.forEach((t) => {
				const amount = Number(t.amount) || 0;

				let userBalance = userMap.get(t.toUserId);
				if (!userBalance) {
					const toUser = apiUsers.find((u) => u.id === t.toUserId);
					userMap.set(t.toUserId, {
						id: t.toUserId,
						name: toUser?.name || `Usuario ${t.toUserId}`,
						avatar: toUser?.image
							? toUser.image.startsWith("http")
								? toUser.image
								: `${process.env.NEXT_PUBLIC_BACKEND_URL}${toUser.image}`
							: "/placeholder.svg",
						totalBalance: 0,
						income: 0,
						expenses: 0,
					});
					userBalance = userMap.get(t.toUserId)!;
				}
				userBalance.income += amount;
			});

			userMap.forEach((userBalance) => {
				userBalance.totalBalance = userBalance.income - userBalance.expenses;
			});

			const filteredUserBalances = Array.from(userMap.values()).filter(
				(u) => u.totalBalance !== 0 || u.income > 0 || u.expenses > 0,
			);

			setCalculatedUserBalances(
				filteredUserBalances.sort((a, b) => a.name.localeCompare(b.name)),
			);
			setTotalCalculatedUsersBalance(
				filteredUserBalances.reduce((sum, u) => sum + u.totalBalance, 0),
			);
			setTotalCalculatedUsersIncome(
				filteredUserBalances.reduce((sum, u) => sum + u.income, 0),
			);
			setTotalCalculatedUsersExpenses(
				filteredUserBalances.reduce((sum, u) => sum + u.expenses, 0),
			);
		};

		calculateUserBalances();
	}, [apiUsers, allTransactions, userTransfers]);

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 10 }, (_, i) =>
		String(currentYear - 5 + i),
	); // Last 5 years, current, next 4

	// Opciones para el Select de Mes
	const monthOptions = useMemo(() => {
		return Array.from({ length: 12 }, (_, i) => ({
			value: String(i + 1).padStart(2, "0"),
			label: new Date(0, i).toLocaleString("es-AR", { month: "long" }),
		}));
	}, []);

	// Opciones para el Select de Año
	const yearOptions = useMemo(() => {
		return years.map((year) => ({ value: year, label: year }));
	}, [years]);

	// Opciones para el Select de Tipo de Movimiento
	const movementTypeOptions = useMemo(() => {
		return MOVEMENTS.map((m) => ({
			value: m.value,
			label: m.label,
		}));
	}, []);

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

	// Manejar el cambio del tipo de movimiento
	const handleMovementTypeChange = (value: string) => {
		setNewType(value);
		setNewSubtype(""); // Resetear el subtipo cuando el tipo cambia
	};

	const handleCloseMonth = async () => {
		const monthToClose = selectedMonth;
		const yearToClose = selectedYear;

		// El monthlyBalance aquí es el cambio neto del mes, no el saldo final de la caja.
		// El saldo final de la caja es currentCashBalance.
		const finalCashBalanceForMonth = currentCashBalance; // Este es el saldo que debería arrastrarse al siguiente mes

		const confirmClose = await confirm({
			description: `¿Estás seguro de que quieres cerrar la caja para ${monthToClose}/${yearToClose}? El saldo final de este mes (${formatCurrency(finalCashBalanceForMonth)}) se convertirá en el nuevo saldo inicial del próximo período. Todos los movimientos de este mes serán marcados como cerrados y no aparecerán en el registro actual.`,
			confirmLabel: "Continuar",
			variant: "default",
		});

		if (!confirmClose) {
			return;
		}

		setLoading(true);

		const response = await fetch(`${CASH_ENDPOINT}/close`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
			body: JSON.stringify({
				month: monthToClose,
				year: yearToClose,
				initialBalance: initialBalanceForPeriod, // Enviar el initialBalanceForPeriod actual
				monthlyIncome: totalIncomeAll, // Enviar los ingresos del período actual
				monthlyExpenses: totalExpensesAll, // Enviar los gastos del período actual
				monthlyBalance: finalCashBalanceForMonth, // Enviar el saldo final de la caja
			}),
		});

		const result = await response.json();

		if (result.success) {
			let nextMonth = Number.parseInt(monthToClose) + 1;
			let nextYear = Number.parseInt(yearToClose);
			if (nextMonth > 12) {
				nextMonth = 1;
				nextYear++;
			}
			setSelectedMonth(String(nextMonth).padStart(2, "0"));
			setSelectedYear(String(nextYear));
			toast.success(result.message);
			await loadData(); // Recargar datos para obtener el nuevo initialBalanceForPeriod y currentCashBalance
		} else {
			toast.error(`Error al cerrar el mes: ${result.message}`);
		}
		setLoading(false);
	};

	const handleViewDetailedMovements = () => {
		if (monthlyMovementsRef.current) {
			monthlyMovementsRef.current.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	};

	// Calcula el saldo acumulado solo con movimientos del mes/año seleccionado hasta la fecha seleccionada
	const saldoAcumulado = useMemo(() => {
		const targetDate = new Date(accumulatedBalanceDate);
		let balance = saldoInicialMes;
		transactions.forEach((t) => {
			const d = new Date(toISODate(t.date));
			if (
				d.getUTCMonth() + 1 === Number(selectedMonth) &&
				d.getUTCFullYear() === Number(selectedYear) &&
				d <= targetDate
			) {
				if (t.type === "income") {
					balance += t.amount;
				} else {
					balance -= t.amount;
				}
			}
		});
		return balance;
	}, [
		transactions,
		saldoInicialMes,
		accumulatedBalanceDate,
		selectedMonth,
		selectedYear,
	]);

	// ── Gráficos ──────────────────────────────────────────────────────────────
	const [chartView, setChartView] = useState<"month" | "year" | "user">(
		"month",
	);

	const formatCurrencyShort = (v: number) => {
		if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
		if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
		return `$${v}`;
	};

	const chartDataByMonth = useMemo(() => {
		const MONTHS = [
			"Ene",
			"Feb",
			"Mar",
			"Abr",
			"May",
			"Jun",
			"Jul",
			"Ago",
			"Sep",
			"Oct",
			"Nov",
			"Dic",
		];
		const income = Array(12).fill(0);
		const expenses = Array(12).fill(0);
		allTransactions.forEach((t) => {
			if (t.type === "transfer") return;
			const d = new Date(toISODate(t.date));
			if (d.getUTCFullYear() !== Number(selectedYear)) return;
			const m = d.getUTCMonth();
			if (t.type === "income") income[m] += Number(t.amount);
			else if (t.type === "expense") expenses[m] += Number(t.amount);
		});
		return {
			options: {
				chart: {
					type: "bar" as const,
					fontFamily: "inherit",
					toolbar: { show: false },
				},
				plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
				colors: ["#10b981", "#ef4444"],
				dataLabels: { enabled: false },
				legend: { position: "top" as const, fontFamily: "inherit" },
				xaxis: {
					categories: MONTHS,
					axisBorder: { show: false },
					axisTicks: { show: false },
				},
				yaxis: { labels: { formatter: formatCurrencyShort } },
				tooltip: {
					y: {
						formatter: (v: number) =>
							new Intl.NumberFormat("es-AR", {
								style: "currency",
								currency: "ARS",
							}).format(v),
					},
				},
				grid: { borderColor: "#334155", strokeDashArray: 4 },
			} as ApexCharts.ApexOptions,
			series: [
				{ name: "Ingresos", data: income },
				{ name: "Egresos", data: expenses },
			],
		};
	}, [allTransactions, selectedYear]);

	const chartDataByYear = useMemo(() => {
		const yearMap: Record<string, { income: number; expenses: number }> = {};
		allTransactions.forEach((t) => {
			if (t.type === "transfer") return;
			const d = new Date(toISODate(t.date));
			const y = String(d.getUTCFullYear());
			if (!yearMap[y]) yearMap[y] = { income: 0, expenses: 0 };
			if (t.type === "income") yearMap[y].income += Number(t.amount);
			else if (t.type === "expense") yearMap[y].expenses += Number(t.amount);
		});
		const sortedYears = Object.keys(yearMap).sort();
		return {
			options: {
				chart: {
					type: "bar" as const,
					fontFamily: "inherit",
					toolbar: { show: false },
				},
				plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
				colors: ["#10b981", "#ef4444"],
				dataLabels: { enabled: false },
				legend: { position: "top" as const, fontFamily: "inherit" },
				xaxis: {
					categories: sortedYears,
					axisBorder: { show: false },
					axisTicks: { show: false },
				},
				yaxis: { labels: { formatter: formatCurrencyShort } },
				tooltip: {
					y: {
						formatter: (v: number) =>
							new Intl.NumberFormat("es-AR", {
								style: "currency",
								currency: "ARS",
							}).format(v),
					},
				},
				grid: { borderColor: "#334155", strokeDashArray: 4 },
			} as ApexCharts.ApexOptions,
			series: [
				{ name: "Ingresos", data: sortedYears.map((y) => yearMap[y].income) },
				{ name: "Egresos", data: sortedYears.map((y) => yearMap[y].expenses) },
			],
		};
	}, [allTransactions]);
	const chartDataByUser = useMemo(() => {
		const users = calculatedUserBalances.filter(
			(u) => u.income > 0 || u.expenses > 0,
		);
		return {
			options: {
				chart: {
					type: "bar" as const,
					fontFamily: "inherit",
					toolbar: { show: false },
				},
				plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
				colors: ["#10b981", "#ef4444"],
				dataLabels: { enabled: false },
				legend: { position: "top" as const, fontFamily: "inherit" },
				xaxis: {
					categories: users.map((u) => u.name.split(" ")[0]), // primer nombre para q entre
					axisBorder: { show: false },
					axisTicks: { show: false },
					labels: { rotate: -30, style: { fontSize: "11px" } },
				},
				yaxis: { labels: { formatter: formatCurrencyShort } },
				tooltip: {
					x: {
						formatter: (_: number, opts: { dataPointIndex: number }) =>
							users[opts.dataPointIndex]?.name ?? "",
					},
					y: {
						formatter: (v: number) =>
							new Intl.NumberFormat("es-AR", {
								style: "currency",
								currency: "ARS",
							}).format(v),
					},
				},
				grid: { borderColor: "#334155", strokeDashArray: 4 },
			} as ApexCharts.ApexOptions,
			series: [
				{ name: "Ingresos", data: users.map((u) => u.income) },
				{ name: "Egresos", data: users.map((u) => u.expenses) },
			],
		};
	}, [calculatedUserBalances]);
	// ──────────────────────────────────────────────────────────────────────────

	const handleDeleteTransaction = async (id: number) => {
		const response = await fetch(`${CASH_ENDPOINT}/movements/${id}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
		});
		if (response.ok) {
			toast.success("Transacción eliminada correctamente");
			await loadData();
		} else {
			toast.error("Error al eliminar la transacción");
		}
	};

	const paginatedClosedMonths = closedMonths.slice(
		(page - 1) * rowsPerPage,
		page * rowsPerPage,
	);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<Skeleton className="h-7 w-40" />
					<div className="flex gap-2">
						<Skeleton className="h-9 w-32" />
						<Skeleton className="h-9 w-32" />
					</div>
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
				<div className="rounded-xl border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								{Array.from({ length: 6 }).map((_, i) => (
									<TableCell key={i} className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 6 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 6 }).map((_, j) => (
										<TableCell key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-lg text-red-600 dark:text-red-400">Error: {error}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-bold text-foreground tracking-tight">Caja Principal</h1>
						<p className="text-sm text-muted-foreground">Gestión de ingresos, gastos y movimientos</p>
					</div>
					<div className="flex items-center gap-2">
						<Button size="sm" variant="outline" onClick={() => setIsNewBoxModalOpen(true)}>
							Abrir Caja
						</Button>
						<Button size="sm" variant="outline" onClick={() => {
							setNewType("transfer");
							setIsRegisterMovementModalOpen(true);
						}}>
							<ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
							Transferencia
						</Button>
						<Button size="sm" onClick={() => setIsRegisterMovementModalOpen(true)}>
							<Plus className="h-3.5 w-3.5 mr-1.5" />
							Nuevo movimiento
						</Button>
					</div>
				</div>

				{/* Saldo acumulado bar */}
				<div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-card/50 px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
							<Calculator className="h-4 w-4 text-blue-600" />
						</div>
						<div>
							<p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Saldo Acumulado</p>
							<p className={cn("text-lg font-bold tabular-nums", saldoAcumulado >= 0 ? "text-blue-600" : "text-red-600")}>
								{formatCurrency(saldoAcumulado)}
							</p>
						</div>
					</div>
					<div className="hidden sm:block h-8 w-px bg-border" />
					<div className="flex items-center gap-2">
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" size="sm" className="w-[170px] justify-start text-left font-normal">
									<CalendarIcon className="mr-2 h-3.5 w-3.5" />
									{accumulatedBalanceDate
										? new Date(accumulatedBalanceDate + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
										: "Seleccionar fecha"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={accumulatedBalanceDate ? new Date(accumulatedBalanceDate + "T12:00:00") : undefined}
									onSelect={(date) => {
										if (date) {
											const y = date.getFullYear();
											const m = String(date.getMonth() + 1).padStart(2, "0");
											const d = String(date.getDate()).padStart(2, "0");
											setAccumulatedBalanceDate(`${y}-${m}-${d}`);
										}
									}}
								/>
							</PopoverContent>
						</Popover>
						<ShadcnSelect
							value=""
							onValueChange={(value) => {
								const hoy = new Date();
								let nuevaFecha = "";
								if (value === "hoy") {
									nuevaFecha = hoy.toISOString().slice(0, 10);
								} else if (value === "fin-mes") {
									const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
									nuevaFecha = finMes.toISOString().slice(0, 10);
								} else if (value === "inicio-mes") {
									const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
									nuevaFecha = inicioMes.toISOString().slice(0, 10);
								}
								if (nuevaFecha) setAccumulatedBalanceDate(nuevaFecha);
							}}
						>
							<SelectTrigger className="w-[120px] h-8 text-xs">
								<SelectValue placeholder="Rápido" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="hoy">Hoy</SelectItem>
								<SelectItem value="inicio-mes">Inicio de mes</SelectItem>
								<SelectItem value="fin-mes">Fin de mes</SelectItem>
							</SelectContent>
						</ShadcnSelect>
					</div>
				</div>

				{/* Modal para Registrar Nuevo Movimiento */}
				<Dialog open={isRegisterMovementModalOpen} onOpenChange={(open) => !open && setIsRegisterMovementModalOpen(false)}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Registrar Nuevo Movimiento</DialogTitle>
							<DialogDescription>
								Añade un nuevo ingreso o gasto a la caja.
							</DialogDescription>
						</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="movement-type">Tipo de Movimiento</Label>
									<Select
										id="movement-type"
										value={newType}
										onValueChange={handleMovementTypeChange} // Usar la nueva función de manejo
										options={movementTypeOptions}
										placeholder="Selecciona tipo"
									/>
								</div>
								{newType &&
									newType !== "transfer" && ( // Mostrar subtipo solo si se selecciona income/expense
										<div className="space-y-2">
											<Label htmlFor="movement-subtype">Subtipo</Label>
											<Select
												id="movement-subtype"
												value={newSubtype}
												onValueChange={setNewSubtype}
												options={subMovementOptions}
												placeholder="Selecciona subtipo"
												disabled={!newType || subMovementOptions.length === 0} // Deshabilitar si no hay tipo o subtipos
											/>
										</div>
									)}
								{/* Selección de usuario origen y destino solo para transferencias */}
								{newType === "transfer" ? (
									<>
										<div className="space-y-2">
											<Label htmlFor="movement-user-from">Usuario Origen</Label>
											<Autocomplete
												id="movement-user-from"
												value={newUserFrom}
												onSelect={handleUserFromSelect}
												options={apiUsers}
												placeholder="Selecciona usuario origen"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="movement-user-to">Usuario Destino</Label>
											<Autocomplete
												id="movement-user-to"
												value={newUserTo}
												onSelect={handleUserToSelect}
												options={apiUsers}
												placeholder="Selecciona usuario destino"
											/>
										</div>
									</>
								) : (
									<div className="space-y-2">
										<Label htmlFor="movement-user-from">Usuario</Label>
										<Autocomplete
											id="movement-user-from"
											value={newUserFrom}
											onSelect={handleUserFromSelect}
											options={apiUsers}
											placeholder="Nombre del usuario"
										/>
									</div>
								)}
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
								<div className="space-y-2">
									<Label htmlFor="movement-date">Fecha de Carga</Label>
									<Input
										id="movement-date"
										type="date"
										value={newDate}
										onChange={(e) => setNewDate(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="movement-closing">
										Cierre asociado{" "}
										<span className="text-xs text-muted-foreground font-normal">
											(opcional)
										</span>
									</Label>
									<ShadcnSelect
										value={newClosingId || "none"}
										onValueChange={(v) =>
											setNewClosingId(v === "none" ? "" : v)
										}
									>
										<SelectTrigger id="movement-closing">
											<SelectValue placeholder="Sin cierre asociado" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Sin cierre asociado</SelectItem>
											{closingsOptions.map((c) => {
												const fecha = new Date(c.date).toLocaleDateString(
													"es-AR",
													{ day: "2-digit", month: "2-digit", year: "numeric" },
												);
												const label = `#${c.number ?? c.id} – ${c.title ?? "Sin título"} (${fecha})`;
												return (
													<SelectItem key={c.id} value={String(c.id)}>
														{label}
													</SelectItem>
												);
											})}
										</SelectContent>
									</ShadcnSelect>
								</div>
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
										className="w-full p-3 rounded-lg border bg-background text-foreground appearance-none px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
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

					{/* Modal para Abrir Nueva Caja */}
				<Dialog open={isNewBoxModalOpen} onOpenChange={(open) => !open && setIsNewBoxModalOpen(false)}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Abrir Caja</DialogTitle>
							<DialogDescription>
								Establece el saldo inicial de la caja para el período actual.
							</DialogDescription>
						</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="new-box-amount">Monto Inicial</Label>
									<Input
										id="new-box-amount"
										type="number"
										value={newBoxInitialAmount}
										onChange={(e) => setNewBoxInitialAmount(e.target.value)}
										placeholder="0.00"
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsNewBoxModalOpen(false)}
								>
									Cancelar
								</Button>
								<Button onClick={handleOpenCashbox}>Confirmar Apertura</Button>
							</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Top Summary Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
				<Card className="relative overflow-hidden border-l-4 border-l-primary transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
					<CardContent className="p-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo de Caja</span>
							<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
								<Calculator className="h-4 w-4 text-primary" />
							</div>
						</div>
						<p className={cn("text-xl font-bold tabular-nums", currentCashBalance >= 0 ? "text-foreground" : "text-red-600")}>
							{formatCurrency(currentCashBalance)}
						</p>
						<p className="text-[11px] text-muted-foreground mt-1">Total Actual</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-l-4 border-l-green-500 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
					<CardContent className="p-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ingresos</span>
							<div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
								<HandCoins className="h-4 w-4 text-green-600" />
							</div>
						</div>
						<p className="text-xl font-bold text-green-600 tabular-nums">
							{formatCurrency(ingresosMes)}
						</p>
						<p className="text-[11px] text-muted-foreground mt-1">Total del mes</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-l-4 border-l-red-500 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
					<CardContent className="p-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gastos</span>
							<div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
								<ArrowRightLeft className="h-4 w-4 text-red-600" />
							</div>
						</div>
						<p className="text-xl font-bold text-red-600 tabular-nums">
							{formatCurrency(gastosMes)}
						</p>
						<p className="text-[11px] text-muted-foreground mt-1">Total del mes</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-l-4 border-l-blue-500 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
					<CardContent className="p-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo del Mes</span>
							<div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
								<DollarSign className="h-4 w-4 text-blue-600" />
							</div>
						</div>
						<p className={cn("text-xl font-bold tabular-nums", saldoMes >= 0 ? "text-blue-600" : "text-red-600")}>
							{formatCurrency(saldoMes)}
						</p>
						<p className="text-[11px] text-muted-foreground mt-1 capitalize">
							{new Date(0, Number.parseInt(selectedMonth) - 1).toLocaleString("es-AR", { month: "long" })} {selectedYear}
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-l-4 border-l-amber-500 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
					<CardContent className="p-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Inicial</span>
							<div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
								<DollarSign className="h-4 w-4 text-amber-600" />
							</div>
						</div>
						<p className="text-xl font-bold text-foreground tabular-nums">
							{formatCurrency(saldoInicialMes)}
						</p>
						<p className="text-[11px] text-muted-foreground mt-1">Inicio del período</p>
					</CardContent>
				</Card>
			</div>

			{/* Saldo Cajas Usuarios */}
			{/* Saldo Cajas Usuarios */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-foreground">Saldo Cajas Usuarios</h2>
					<Button variant="outline" size="sm" onClick={handleViewDetailedMovements}>
						Ver Movimientos Detallados
					</Button>
				</div>
				<Card className="overflow-hidden">
					<Table className="w-full">
						<TableHeader>
							<TableRow className="bg-muted/40 hover:bg-muted/40">
								<TableCell className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">Miembro</TableCell>
								<TableCell className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Saldo Total</TableCell>
								<TableCell className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Ingresos</TableCell>
								<TableCell className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Gastos</TableCell>
								<TableCell className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-25" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{calculatedUserBalances.length > 0 ? (
								calculatedUserBalances.map((user, index) => (
									<TableRow
										key={user.id}
										className="group transition-colors hover:bg-muted/30 cursor-pointer"
										onClick={() => router.push(`/admin/cashbox/${user.id}`)}
									>
										<TableCell className="px-4 py-2.5">
											<div className="flex items-center gap-3">
												<Image
													src={user.avatar || "/placeholder.svg"}
													alt={user.name}
													width={28}
													height={28}
													className="h-7 w-7 rounded-full object-cover ring-2 ring-background"
												/>
												<span className="text-sm font-medium">{user.name}</span>
											</div>
										</TableCell>
										<TableCell className={cn("px-4 py-2.5 text-sm text-right font-semibold tabular-nums", user.totalBalance >= 0 ? "text-green-600" : "text-red-600")}>
											{formatCurrency(user.totalBalance)}
										</TableCell>
										<TableCell className="px-4 py-2.5 text-sm text-right text-green-600 tabular-nums">
											{formatCurrency(user.income)}
										</TableCell>
										<TableCell className="px-4 py-2.5 text-sm text-right text-red-600 tabular-nums">
											{formatCurrency(user.expenses)}
										</TableCell>
										<TableCell className="px-4 py-2.5 text-right">
											<Button
												variant="ghost"
												size="sm"
												className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
												onClick={(e) => {
													e.stopPropagation();
													router.push(`/admin/cashbox/${user.id}`);
												}}
											>
												Detalles
											</Button>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={5} className="py-12 text-center">
										<HandCoins className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
										<p className="text-sm text-muted-foreground">No hay transacciones en este período.</p>
									</TableCell>
								</TableRow>
							)}
							<TableRow className="bg-muted/40 hover:bg-muted/40 border-t-2">
								<TableCell className="px-4 py-2.5 text-sm font-bold">Totales</TableCell>
								<TableCell className={cn("px-4 py-2.5 text-sm text-right font-bold tabular-nums", totalCalculatedUsersBalance >= 0 ? "text-green-700" : "text-red-700")}>
									{formatCurrency(totalCalculatedUsersBalance)}
								</TableCell>
								<TableCell className="px-4 py-2.5 text-sm text-right font-bold text-green-700 tabular-nums">
									{formatCurrency(totalCalculatedUsersIncome)}
								</TableCell>
								<TableCell className="px-4 py-2.5 text-sm text-right font-bold text-red-700 tabular-nums">
									{formatCurrency(totalCalculatedUsersExpenses)}
								</TableCell>
								<TableCell />
							</TableRow>
						</TableBody>
					</Table>
				</Card>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
				{/* Left Column: Monthly Movements */}
				<div
					className="lg:col-span-2 flex flex-col gap-4"
					ref={monthlyMovementsRef}
				>
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<h2 className="text-lg font-semibold text-foreground">Movimientos del Mes</h2>
						<div className="flex items-center gap-2">
							<Select
								value={selectedMonth}
								onValueChange={setSelectedMonth}
								options={monthOptions}
								placeholder="Mes"
								className="w-[120px]"
							/>
							<Select
								value={selectedYear}
								onValueChange={setSelectedYear}
								options={yearOptions}
								placeholder="Año"
								className="w-24"
							/>
							<Button
								onClick={handleCloseMonth}
								variant="destructive"
								size="sm"
								disabled={loading}
							>
								<Ban className="h-3.5 w-3.5 mr-1" /> Cerrar
							</Button>
						</div>
					</div>
					<div className="overflow-hidden rounded-xl border">
						<Table className="w-full">
							<TableHeader className="bg-muted/50">
									<TableRow>
										<TableCell
											className="px-4 py-3 text-sm font-semibold text-foreground text-left"
										>
											Fecha
										</TableCell>
										<TableCell
											className="px-4 py-3 text-sm font-semibold text-foreground text-left"
										>
											Tipo
										</TableCell>
										<TableCell
											className="px-4 py-3 text-sm font-semibold text-foreground text-left"
										>
											Subtipo
										</TableCell>
										<TableCell
											className="px-4 py-3 text-sm font-semibold text-foreground text-left"
										>
											Usuario
										</TableCell>
										<TableCell
											className="px-4 py-3 text-sm font-semibold text-foreground text-right"
										>
											Monto
										</TableCell>
										<TableCell
											className="px-4 py-3 text-sm font-semibold text-foreground text-left"
										>
											Descripción
										</TableCell>
										<TableCell
											className="px-4 py-3 text-sm font-semibold text-foreground text-right"
										>
											Acciones
										</TableCell>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedMovements.length === 0 ? (
										<TableRow className="hover:bg-muted/50">
											<TableCell
												colSpan={6}
												className="px-4 py-3 text-sm text-center text-muted-foreground"
											>
												<div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
													<ArrowRightLeft className="h-10 w-10 text-muted-foreground" />
													<h3 className="mb-2 text-lg font-medium">
														No hay movimientos
													</h3>
													<p className="mb-4 mt-2 text-sm text-muted-foreground">
														No hay movimientos asociados a este mes.
													</p>
												</div>
											</TableCell>
										</TableRow>
									) : (
										paginatedMovements.map((t, index) => {
											const d = new Date(toISODate(t.date));
											d.toLocaleDateString("es-AR", { timeZone: "UTC" });
											return (
												<TableRow
													key={
														index + (movementsPage - 1) * movementsRowsPerPage
													}
													className={`hover:bg-muted/50 ${index % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
												>
													<TableCell className="px-4 py-3 text-sm text-foreground">
														{new Date(toISODate(t.date)).toLocaleDateString(
															"es-AR",
															{ timeZone: "UTC" },
														)}
													</TableCell>
													<TableCell className="px-4 py-3 text-sm text-foreground">
														<Badge
															variant="secondary"
														>
															{t.type === "income"
																? "Ingreso"
																: t.type === "transfer"
																	? "Transferencia"
																	: "Gasto"}
														</Badge>
													</TableCell>
													<TableCell className="px-4 py-3 text-sm text-foreground">
														{t.type === "transfer"
															? `Enviado a ${t.transferUser?.name || `Usuario ${t.userTransferId}`}`
															: getSubtypeLabel(t.type, t.subtype)}
													</TableCell>
													<TableCell className="px-4 py-3 text-sm text-foreground">
														<div className="flex items-center gap-2">
															<Image
																src={
																	t.user?.image
																		? t.user.image.startsWith("http")
																			? t.user.image
																			: `${process.env.NEXT_PUBLIC_BACKEND_URL}${t.user.image}`
																		: "/placeholder.svg"
																}
																alt="User Avatar"
																width={24}
																height={24}
																className="h-6 w-6 rounded-full object-cover"
															/>
															<span>
																{typeof t.user === "string"
																	? t.user
																	: t.user?.name || "Unknown User"}
															</span>
														</div>
													</TableCell>
													<TableCell
														className={cn(
															"text-right font-medium px-4 py-3 text-sm text-foreground",
															t.type === "income"
																? "text-green-600"
																: t.type === "transfer"
																	? "text-orange-500"
																	: "text-red-600",
														)}
													>
														{formatCurrency(t.amount)}
													</TableCell>
													<TableCell className="px-4 py-3 text-sm text-foreground">
														{t.description}
													</TableCell>
													<TableCell className="px-4 py-3 text-sm text-foreground text-right">
														<Button
															onClick={() => handleDeleteTransaction(t.id)}
															variant="default"
															className="h-7 w-7 bg-red-500 hover:bg-red-700 text-white"
															title="Eliminar"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</div>
						{/* Controles de paginación para movimientos del mes */}
						{transaccionesMes.length > movementsRowsPerPage && (
							<div className="flex justify-center items-center gap-2 mt-2">
								<Button
									variant="outline"
									disabled={movementsPage === 1}
									onClick={() => setMovementsPage(movementsPage - 1)}
								>
									Anterior
								</Button>
								<span className="text-sm">
									Página {movementsPage} de {movementsTotalPages}
								</span>
								<Button
									variant="outline"
									disabled={movementsPage === movementsTotalPages}
									onClick={() => setMovementsPage(movementsPage + 1)}
								>
									Siguiente
								</Button>
							</div>
						)}
				</div>

				{/* Gráfico Ingresos vs Egresos */}
				<Card className="overflow-hidden">
					<CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
						<CardTitle className="text-sm font-semibold">Ingresos vs Egresos</CardTitle>
						<div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
							{(["month", "year", "user"] as const).map((view) => (
								<button
									key={view}
									onClick={() => setChartView(view)}
									className={cn(
										"px-2.5 py-1 transition-colors",
										chartView === view
											? "bg-primary text-primary-foreground"
											: "bg-background text-muted-foreground hover:bg-muted/50",
									)}
								>
									{view === "month" ? "Mes" : view === "year" ? "Año" : "Usuario"}
								</button>
							))}
						</div>
					</CardHeader>
					<CardContent>
						{chartView === "month" && (
							<ReactApexChart
								key={`month-${selectedYear}`}
								options={chartDataByMonth.options}
								series={chartDataByMonth.series}
								type="bar"
								height={280}
							/>
						)}
						{chartView === "year" && (
							<ReactApexChart
								key="year"
								options={chartDataByYear.options}
								series={chartDataByYear.series}
								type="bar"
								height={280}
							/>
						)}
						{chartView === "user" && (
							<ReactApexChart
								key="user"
								options={chartDataByUser.options}
								series={chartDataByUser.series}
								type="bar"
								height={280}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Historial de Cierres */}
			<div className="mb-8">
				<h2 className="text-lg font-semibold text-foreground mb-4">Historial de Cierres</h2>
				<div className="overflow-hidden rounded-xl border">
					<Table className="w-full">
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableCell
										className="px-4 py-3 text-sm font-semibold text-start"
									>
										Mes/Año
									</TableCell>
									<TableCell
										className="px-4 py-3 text-sm font-semibold text-right"
									>
										Monto Inicial
									</TableCell>
									<TableCell
										className="px-4 py-3 text-sm font-semibold text-right text-green-700"
									>
										Ingresos
									</TableCell>
									<TableCell
										className="px-4 py-3 text-sm font-semibold text-right text-red-700"
									>
										Gastos
									</TableCell>
									<TableCell
										className="px-4 py-3 text-sm font-semibold text-right"
									>
										Saldo Total
									</TableCell>
									<TableCell
										className="px-4 py-3 text-sm font-semibold text-center"
									>
										Fecha de Cierre
									</TableCell>
									<TableCell
										className="px-4 py-3 text-sm font-semibold text-center"
									>
										Estatus
									</TableCell>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedClosedMonths.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={8}
											className="text-center text-muted-foreground"
										>
											No hay cierres de caja registrados.
										</TableCell>
									</TableRow>
								) : (
									paginatedClosedMonths.map((report, index) => (
										<TableRow
											key={index}
											className={`hover:bg-muted/50 ${index % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
										>
											<TableCell className="px-4 py-3 text-sm font-medium text-start capitalize">
												{new Date(
													0,
													Number.parseInt(report.month) - 1,
												).toLocaleString("es-AR", { month: "long" })}{" "}
												{report.year}
											</TableCell>
											<TableCell className="px-4 py-3 text-sm  text-right font-semibold text-foreground">
												{formatCurrency(report.initialBalance)}
											</TableCell>
											<TableCell className="px-4 py-3 text-sm  text-right font-semibold text-green-600">
												{formatCurrency(report.monthlyIncome)}
											</TableCell>
											<TableCell className="px-4 py-3 text-sm  text-right font-semibold text-red-600">
												{formatCurrency(report.monthlyExpenses)}
											</TableCell>
											<TableCell
												className={cn(
													"px-4 py-3 text-sm  text-right font-bold",
													report.monthlyBalance >= 0
														? "text-blue-600"
														: "text-red-600",
												)}
											>
												{formatCurrency(report.monthlyBalance)}
											</TableCell>
											<TableCell className="px-4 py-3 text-sm  text-center text-muted-foreground">
												{new Date(report.closingDate).toLocaleDateString(
													"es-AR",
													{ day: "2-digit", month: "short", year: "numeric" },
												)}
											</TableCell>
											<TableCell className="px-4 py-3 text-sm  text-center">
												<Badge
													variant="secondary"
													className="bg-green-100 text-green-800 border border-green-200"
												>
													Cerrada
												</Badge>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
					<div className="flex justify-center items-center gap-2 mt-2">
						<Button
							variant="outline"
							disabled={page === 1}
							onClick={() => setPage(page - 1)}
						>
							Anterior
						</Button>
						<span className="text-sm">
							Página {page} de {totalPages}
						</span>
						<Button
							variant="outline"
							disabled={page === totalPages}
							onClick={() => setPage(page + 1)}
						>
							Siguiente
						</Button>
					</div>
			</div>
			{ConfirmationDialog}
		</div>
	);
}
