"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import type { CalculatedUserBalance, ClosedMonthReport, Transaction } from "@/types/cash"
import dynamic from "next/dynamic"
import type ApexCharts from "react-apexcharts"

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })

import {
    Calculator,
    ArrowUp,
    ArrowDown,
    DollarSign,
    Eye,
    Trash2,
    Plus,
    ArrowRightLeft,
    HandCoins,
    Ban,
    Sheet,
} from "lucide-react"

// Importar tu componente Modal
import Input from "@/components/ui/input/Input"
import Button from "@/components/ui/button/Button"
import Label from "@/components/ui/label/Label"
import Badge from "@/components/ui/badge/Badge"
import Select from "@/components/ui/select/Select"
import { Autocomplete } from "@/components/ui/Autocomplete" // Importa el nuevo Autocomplete

// Importar los componentes de la tabla y el modal
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Modal } from "@/components/ui/modal/Modal"

import { cn } from "@/lib/utils"
import { CASH_ENDPOINT, USERS_ENDPOINT } from "@/constant/api-endpoints"
import { toast } from "sonner"
import Image from "next/image"
import { useSession } from "next-auth/react"
import type { User } from "@/types/users"
import { Role } from "@/constant/user"
import { MOVEMENTS } from "@/constant/cash" // Importar MOVEMENTS y su tipo
import { useRouter } from "next/navigation"

export default function CashBoxPage() {
    const { data: session } = useSession()
    const router = useRouter()
    // Estado para el saldo inicial del período (viene del backend)
    const [initialBalanceForPeriod, setInitialBalanceForPeriod] = useState<number>(0)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]) // Nuevo estado para todas las transacciones (cerradas y no cerradas)
    const [closedMonths, setClosedMonths] = useState<ClosedMonthReport[]>([])
    const [apiUsers, setApiUsers] = useState<User[]>([]) // Nuevo estado para los usuarios de la API
    const [userTransfers, setUserTransfers] = useState<{ id: number; fromUserId: number; toUserId: number; amount: number; createdAt: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal states
    const [isNewBoxModalOpen, setIsNewBoxModalOpen] = useState(false)
    const [isRegisterMovementModalOpen, setIsRegisterMovementModalOpen] = useState(false)

    // Form states for new movement
    const [newType, setNewType] = useState<string>("") // Cambiado a string para incluir "transfer"
    const [newSubtype, setNewSubtype] = useState<string>("")
    // Para transferencias: usuario origen y destino
    const [newUserFrom, setNewUserFrom] = useState<number | null>(null)
    const [newUserTo, setNewUserTo] = useState<number | null>(null)
    const [newAmount, setNewAmount] = useState<string>("")
    const [newDate, setNewDate] = useState<string>(new Date().toISOString().substring(0, 10))
    const [newDescription, setNewDescription] = useState<string>("")

    // State para el input del modal "Abrir Caja"
    const [newBoxInitialAmount, setNewBoxInitialAmount] = useState<string>("")

    // Report states
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"))
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))

    // Filter states (not directly used in UI yet, but kept for future)
    const [filterStartDate, setFilterStartDate] = useState<string>("")
    const [filterEndDate, setFilterEndDate] = useState<string>("")
    const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
    const [filterSubtype, setFilterSubtype] = useState<string>("")

    // Accumulated balance state
    const [accumulatedBalanceDate, setAccumulatedBalanceDate] = useState<string>(
        new Date().toISOString().substring(0, 10),
    )

    // Ref for scrolling to monthly movements table
    const monthlyMovementsRef = useRef<HTMLDivElement>(null)

    // Calculated user balances state
    const [calculatedUserBalances, setCalculatedUserBalances] = useState<CalculatedUserBalance[]>([])
    const [totalCalculatedUsersBalance, setTotalCalculatedUsersBalance] = useState<number>(0)
    const [totalCalculatedUsersIncome, setTotalCalculatedUsersIncome] = useState<number>(0)
    const [totalCalculatedUsersExpenses, setTotalCalculatedUsersExpenses] = useState<number>(0)

    // Pagination states
    const [page, setPage] = useState(1)
    const rowsPerPage = 10
    const totalPages = Math.ceil(closedMonths.length / rowsPerPage)

    // Helper para convertir fechas a ISO
    const toISODate = (dateStr: string) => {
        if (dateStr.includes('T') && dateStr.endsWith('Z')) return dateStr;
        if (dateStr.includes('T')) return dateStr + 'Z';
        return dateStr.replace(' ', 'T') + 'Z';
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
            .sort((a, b) => new Date(toISODate(b.date)).getTime() - new Date(toISODate(a.date)).getTime());
    }, [transactions, selectedMonth, selectedYear]);

    // Estado para la paginación de movimientos del mes
    const [movementsPage, setMovementsPage] = useState(1);
    const movementsRowsPerPage = 10;
    const movementsTotalPages = Math.ceil(transaccionesMes.length / movementsRowsPerPage);

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
        setNewUserFrom(selectedUserId)
    }, [])
    // Manejo para usuario destino
    const handleUserToSelect = useCallback((selectedUserId: number | null) => {
        setNewUserTo(selectedUserId)
    }, [])

    // Añade esta función auxiliar para obtener el label del subtipo
    const getSubtypeLabel = useCallback((type: string, subtypeValue: string) => {
        const movement = MOVEMENTS.find((m) => m.value === type)
        if (movement && movement.subMovements) {
            const subMovement = movement.subMovements.find((smItem) => smItem.value === subtypeValue) // Renamed sm to smItem
            return subMovement ? subMovement.label : subtypeValue // Retorna el label o el valor si no se encuentra
        }
        return subtypeValue // Retorna el valor si no hay subtipos definidos para el tipo
    }, [])

    // Cargar datos de la base de datos al montar el componente
    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`${CASH_ENDPOINT}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            const result = await response.json()

            if (response.status !== 200) {
                setError(result.error)
            } else {
                // Asignar el saldo inicial del período, asegurando que sea un número
                setInitialBalanceForPeriod(Number(result.initialBalanceForPeriod) || 0)

                // Asegurarse de que las transacciones sean un array y filtrar por closed=false para la vista principal
                const formattedTransactions = Array.isArray(result.transactions)
                    ? result.transactions
                        .filter((t: { closed?: boolean }) => !t.closed) // Solo transacciones no cerradas para la vista de caja actual
                        .map((t: { date: string | number | Date }) => ({
                            ...t,
                            date: new Date(t.date).toISOString().substring(0, 10),
                        }))
                    : []
                setTransactions(formattedTransactions)

                // Guardar TODAS las transacciones para el cálculo de saldos de usuario
                const allFormattedTransactions = Array.isArray(result.transactions)
                    ? result.transactions.map((t: { date: string | number | Date }) => ({
                        ...t,
                        date: new Date(t.date).toISOString().substring(0, 10),
                    }))
                    : []
                setAllTransactions(allFormattedTransactions) // Nuevo estado para todas las transacciones

                // Cargar transferencias entre usuarios
                if (Array.isArray(result.userTransfers)) {
                    setUserTransfers(result.userTransfers)
                }

                // Asegurarse de que los cierres de mes sean un array y formatear fechas
                const formattedClosedMonths = Array.isArray(result.closedMonths)
                    ? result.closedMonths.map((cm: { closingDate: string | number | Date }) => ({
                        ...cm,
                        closingDate: new Date(cm.closingDate).toISOString().substring(0, 10),
                    }))
                    : []
                setClosedMonths(formattedClosedMonths)
            }
        } catch (error) {
            setError((error as Error).message)
        }
        setLoading(false)
    }, [session?.user?.accessToken])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Nuevo useEffect para pre-llenar el saldo inicial al abrir el modal
    useEffect(() => {
        if (isNewBoxModalOpen && closedMonths.length > 0) {
            // Ordenar los reportes por año y mes para encontrar el más reciente
            const latestReport = closedMonths.sort((a, b) => {
                const dateA = new Date(Number.parseInt(a.year), Number.parseInt(a.month) - 1)
                const dateB = new Date(Number.parseInt(b.year), Number.parseInt(b.month) - 1)
                return dateB.getTime() - dateA.getTime()
            })[0]

            if (latestReport) {
                setNewBoxInitialAmount(latestReport.monthlyBalance.toFixed(2)) // Pre-llenar con el saldo final del mes anterior
            }
        } else if (!isNewBoxModalOpen) {
            // Limpiar el input cuando el modal se cierra
            setNewBoxInitialAmount("")
        }
    }, [isNewBoxModalOpen, closedMonths])

    const formatCurrency = (amount: number) => {
        // Asegurarse de que el monto sea un número antes de formatear
        if (typeof amount !== "number" || isNaN(amount)) {
            return "$ NaN" // O cualquier otro valor por defecto que prefieras
        }
        return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount)
    }

    const handleOpenCashbox = async () => {
        const amount = Number.parseFloat(newBoxInitialAmount)
        if (isNaN(amount)) {
            alert("Monto inválido. Por favor, introduce un número.")
            return
        }

        const confirmAction = window.confirm(
            `¿Estás seguro de que quieres establecer el saldo de la caja a ${formatCurrency(amount)}? \n\n` +
            `Esto NO eliminará movimientos ni historial de cierres.`,
        )

        if (!confirmAction) {
            return
        }

        setLoading(true)

        const response = await fetch(`${CASH_ENDPOINT}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.user?.accessToken}`,
            },
            body: JSON.stringify({ amount }),
        })

        const result = await response.json()

        if (result.success) {
            setIsNewBoxModalOpen(false) // Cierra el modal
            setNewBoxInitialAmount("") // Limpia el input
            toast.success(result.message)
            await loadData() // Recargar datos para obtener el nuevo initialBalanceForPeriod
        } else {
            toast.error(`Error al abrir caja: ${result.message}`)
        }
        setLoading(false)
    }

    const handleAddMovement = async () => {
        const amount = Number.parseFloat(newAmount)
        let valid = true
        let errorMsg = "Por favor, completa todos los campos y asegúrate de que el monto sea válido y un usuario esté seleccionado."

        if (!newType || isNaN(amount) || amount <= 0 || !newDate || !newDescription) valid = false

        if (newType === "transfer") {
            if (newUserFrom === null || newUserTo === null || newUserFrom === newUserTo) {
                valid = false
                errorMsg = "Selecciona usuario de origen y destino distintos."
            }
        } else {
            if (!newSubtype || newUserFrom === null) valid = false
        }

        if (!valid) {
            toast.error(errorMsg)
            return
        }

        setLoading(true)

        const payload: any = {
            type: newType as "income" | "expense" | "transfer",
            subtype: newType !== "transfer" ? newSubtype : undefined,
            userId: newType === "transfer" ? newUserFrom : newUserFrom,
            amount: amount,
            date: new Date(newDate),
            description: newDescription,
        }
        if (newType === "transfer") {
            payload.userTransferId = newUserTo
        }

        const response = await fetch(`${CASH_ENDPOINT}/movements`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.user?.accessToken}`,
            },
            body: JSON.stringify(payload),
        })

        const result = await response.json()

        if (result.success) {
            setNewType("")
            setNewSubtype("")
            setNewUserFrom(null)
            setNewUserTo(null)
            setNewAmount("")
            setNewDescription("")
            setNewDate(new Date().toISOString().substring(0, 10))
            setIsRegisterMovementModalOpen(false)
            toast.success(result.message)
            await loadData()
        } else {
            toast.error(`Error al registrar movimiento: ${result.message}`)
        }
        setLoading(false)
    }

    // Saldo de Caja: Calculado como el saldo inicial del período + todos los movimientos NO CERRADOS
    const currentCashBalance = useMemo(() => {
        let balance = initialBalanceForPeriod
        transactions.forEach((t) => {
            if (t.type === "income") {
                balance += t.amount
            } else {
                balance -= t.amount
            }
        })
        return balance
    }, [initialBalanceForPeriod, transactions])

    // Calculate overall totals for summary cards (Ingresos y Gastos acumulados del período actual)
    const { totalIncomeAll, totalExpensesAll } = useMemo(() => {
        let incomeAll = 0
        let expensesAll = 0

        transactions.forEach((t) => {
            if (t.type === "income") {
                incomeAll += t.amount
            } else {
                expensesAll += t.amount
            }
        })
        return { totalIncomeAll: incomeAll, totalExpensesAll: expensesAll }
    }, [transactions])

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

    // Saldo inicial del mes seleccionado: saldo final del mes anterior
    const saldoInicialMes = useMemo(() => {
        const { prevMonth, prevYear } = getPreviousMonthYear(selectedMonth, selectedYear);
        const closed = closedMonths.find(
            (cm) => cm.month === prevMonth && cm.year === prevYear
        );
        return closed ? closed.monthlyBalance : 0;
    }, [closedMonths, selectedMonth, selectedYear]);

    // Calcula ingresos, gastos y saldo del mes seleccionado
    const ingresosMes = transaccionesMes.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const gastosMes = transaccionesMes.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const saldoMes = ingresosMes - gastosMes;

    // Filtered movements for the table (not directly used in UI yet, but kept for future)
    const filteredMovements = useMemo(() => {
        return transactions
            .filter((t) => {
                const transactionDate = new Date(t.date)
                const start = filterStartDate ? new Date(filterStartDate) : null
                const end = filterEndDate ? new Date(filterEndDate) : null

                if (start && transactionDate < start) return false
                if (end && transactionDate > end) return false
                if (filterType !== "all" && t.type !== filterType) return false
                if (filterSubtype && !t.subtype.toLowerCase().includes(filterSubtype.toLowerCase())) return false

                return true
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date descending
    }, [transactions, filterStartDate, filterEndDate, filterType, filterSubtype])

    // Calculate accumulated balance up to a specific date
    const accumulatedBalance = useMemo(() => {
        const targetDate = new Date(accumulatedBalanceDate)
        let balance = initialBalanceForPeriod // Ahora comienza desde el saldo inicial del período
        transactions.forEach((t) => {
            const transactionDate = new Date(t.date)
            if (transactionDate <= targetDate) {
                if (t.type === "income") {
                    balance += t.amount
                } else {
                    balance -= t.amount
                }
            }
        })
        return balance
    }, [transactions, initialBalanceForPeriod, accumulatedBalanceDate])

    // Calculate user balances
    useEffect(() => {
        const calculateUserBalances = () => {
            const userMap = new Map<number, CalculatedUserBalance>();

            apiUsers.forEach(user => {
                userMap.set(user.id, {
                    id: user.id,
                    name: user.name,
                    avatar: user?.image?.startsWith("http")
                        ? user?.image
                        : `${process.env.NEXT_PUBLIC_BACKEND_URL}${user?.image || ""}`,
                    totalBalance: 0,
                    income: 0,
                    expenses: 0
                });
            });

            // Desduplicar transacciones por ID
            const uniqueTransactions = Array.from(
                new Map(allTransactions.map(t => [t.id, t])).values()
            );

            uniqueTransactions.forEach(t => {
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
            userTransfers.forEach(t => {
                const amount = Number(t.amount) || 0;

                let userBalance = userMap.get(t.toUserId);
                if (!userBalance) {
                    const toUser = apiUsers.find(u => u.id === t.toUserId);
                    userMap.set(t.toUserId, {
                        id: t.toUserId,
                        name: toUser?.name || `Usuario ${t.toUserId}`,
                        avatar: toUser?.image
                            ? (toUser.image.startsWith("http") ? toUser.image : `${process.env.NEXT_PUBLIC_BACKEND_URL}${toUser.image}`)
                            : "/placeholder.svg",
                        totalBalance: 0,
                        income: 0,
                        expenses: 0,
                    });
                    userBalance = userMap.get(t.toUserId)!;
                }
                userBalance.income += amount;
            });

            userMap.forEach(userBalance => {
                userBalance.totalBalance = userBalance.income - userBalance.expenses;
            });

            const filteredUserBalances = Array.from(userMap.values()).filter(
                (u) => u.totalBalance !== 0 || u.income > 0 || u.expenses > 0
            );

            setCalculatedUserBalances(filteredUserBalances.sort((a, b) => a.name.localeCompare(b.name)));
            setTotalCalculatedUsersBalance(filteredUserBalances.reduce((sum, u) => sum + u.totalBalance, 0));
            setTotalCalculatedUsersIncome(filteredUserBalances.reduce((sum, u) => sum + u.income, 0));
            setTotalCalculatedUsersExpenses(filteredUserBalances.reduce((sum, u) => sum + u.expenses, 0));
        };

        calculateUserBalances();
    }, [apiUsers, allTransactions, userTransfers]);

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i)) // Last 5 years, current, next 4

    // Opciones para el Select de Mes
    const monthOptions = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1).padStart(2, "0"),
            label: new Date(0, i).toLocaleString("es-AR", { month: "long" }),
        }))
    }, [])

    // Opciones para el Select de Año
    const yearOptions = useMemo(() => {
        return years.map((year) => ({ value: year, label: year }))
    }, [years])

    // Opciones para el Select de Tipo de Movimiento
    const movementTypeOptions = useMemo(() => {
        return MOVEMENTS.map((m) => ({
            value: m.value,
            label: m.label,
        }))
    }, [])

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${USERS_ENDPOINT}?limit=1000000`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })
                if (!response.ok) {
                    throw new Error(`Failed to fetch users: ${response.statusText}`)
                }
                const data = await response.json()

                // Filter out users with roleId 6 (Role.responsible lawyer)
                const filteredUsers = data.data.filter((user: User) => {
                    const hasRepresentativeRole = user.roleUser.some((roleUser) => {
                        const isAbogadoRepresentante = roleUser.role.name === Role.ABOGADO_REPRESENTANTE
                        return isAbogadoRepresentante
                    })
                    return !hasRepresentativeRole
                })

                setApiUsers(filteredUsers)
            } catch (err) {
                console.error("Error fetching users:", err)
                setError((prev) =>
                    prev
                        ? `${prev}\nError al cargar usuarios: ${(err as Error).message}`
                        : `Error al cargar usuarios: ${(err as Error).message}`,
                )
            }
        }
        if (session?.user?.accessToken) {
            // Only fetch if session token is available
            fetchUsers()
        }
    }, [session?.user?.accessToken]) // Re-fetch if session token changes

    const subMovementOptions = useMemo(() => {
        const selectedMovement = MOVEMENTS.find((m) => m.value === newType)
        return (
            selectedMovement?.subMovements.map((smItem) => ({
                // Renamed sm to smItem
                value: smItem.value,
                label: smItem.label,
            })) || []
        )
    }, [newType])

    // Manejar el cambio del tipo de movimiento
    const handleMovementTypeChange = (value: string) => {
        setNewType(value)
        setNewSubtype("") // Resetear el subtipo cuando el tipo cambia
    }

    const handleCloseMonth = async () => {
        const monthToClose = selectedMonth
        const yearToClose = selectedYear

        // El monthlyBalance aquí es el cambio neto del mes, no el saldo final de la caja.
        // El saldo final de la caja es currentCashBalance.
        const finalCashBalanceForMonth = currentCashBalance // Este es el saldo que debería arrastrarse al siguiente mes

        const confirmClose = window.confirm(
            `¿Estás seguro de que quieres cerrar la caja para ${monthToClose}/${yearToClose}? \n\n` +
            `El saldo final de este mes (${formatCurrency(finalCashBalanceForMonth)}) se convertirá en el nuevo saldo inicial del próximo período. \n` +
            `¡Todos los movimientos de este mes serán marcados como cerrados y no aparecerán en el registro actual!`,
        )

        if (!confirmClose) {
            return
        }

        setLoading(true)

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
        })

        const result = await response.json()

        if (result.success) {
            let nextMonth = Number.parseInt(monthToClose) + 1
            let nextYear = Number.parseInt(yearToClose)
            if (nextMonth > 12) {
                nextMonth = 1
                nextYear++
            }
            setSelectedMonth(String(nextMonth).padStart(2, "0"))
            setSelectedYear(String(nextYear))
            toast.success(result.message)
            await loadData() // Recargar datos para obtener el nuevo initialBalanceForPeriod y currentCashBalance
        } else {
            toast.error(`Error al cerrar el mes: ${result.message}`)
        }
        setLoading(false)
    }

    const handleViewDetailedMovements = () => {
        if (monthlyMovementsRef.current) {
            monthlyMovementsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

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
    }, [transactions, saldoInicialMes, accumulatedBalanceDate, selectedMonth, selectedYear]);

    // ── Gráficos ──────────────────────────────────────────────────────────────
    const [chartView, setChartView] = useState<"month" | "year" | "user">("month")

    const formatCurrencyShort = (v: number) => {
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
        return `$${v}`
    }

    const chartDataByMonth = useMemo(() => {
        const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        const income = Array(12).fill(0)
        const expenses = Array(12).fill(0)
        allTransactions.forEach((t) => {
            if (t.type === "transfer") return
            const d = new Date(toISODate(t.date))
            if (d.getUTCFullYear() !== Number(selectedYear)) return
            const m = d.getUTCMonth()
            if (t.type === "income") income[m] += Number(t.amount)
            else if (t.type === "expense") expenses[m] += Number(t.amount)
        })
        return {
            options: {
                chart: { type: "bar" as const, fontFamily: "inherit", toolbar: { show: false } },
                plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
                colors: ["#10b981", "#ef4444"],
                dataLabels: { enabled: false },
                legend: { position: "top" as const, fontFamily: "inherit" },
                xaxis: { categories: MONTHS, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { formatter: formatCurrencyShort } },
                tooltip: {
                    y: { formatter: (v: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v) },
                },
                grid: { borderColor: "#f1f1f1", strokeDashArray: 4 },
            } as ApexCharts.ApexOptions,
            series: [
                { name: "Ingresos", data: income },
                { name: "Egresos", data: expenses },
            ],
        }
    }, [allTransactions, selectedYear])

    const chartDataByYear = useMemo(() => {
        const yearMap: Record<string, { income: number; expenses: number }> = {}
        allTransactions.forEach((t) => {
            if (t.type === "transfer") return
            const d = new Date(toISODate(t.date))
            const y = String(d.getUTCFullYear())
            if (!yearMap[y]) yearMap[y] = { income: 0, expenses: 0 }
            if (t.type === "income") yearMap[y].income += Number(t.amount)
            else if (t.type === "expense") yearMap[y].expenses += Number(t.amount)
        })
        const sortedYears = Object.keys(yearMap).sort()
        return {
            options: {
                chart: { type: "bar" as const, fontFamily: "inherit", toolbar: { show: false } },
                plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
                colors: ["#10b981", "#ef4444"],
                dataLabels: { enabled: false },
                legend: { position: "top" as const, fontFamily: "inherit" },
                xaxis: { categories: sortedYears, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { formatter: formatCurrencyShort } },
                tooltip: {
                    y: { formatter: (v: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v) },
                },
                grid: { borderColor: "#f1f1f1", strokeDashArray: 4 },
            } as ApexCharts.ApexOptions,
            series: [
                { name: "Ingresos", data: sortedYears.map((y) => yearMap[y].income) },
                { name: "Egresos", data: sortedYears.map((y) => yearMap[y].expenses) },
            ],
        }
    }, [allTransactions])
    const chartDataByUser = useMemo(() => {
        const users = calculatedUserBalances.filter((u) => u.income > 0 || u.expenses > 0)
        return {
            options: {
                chart: { type: "bar" as const, fontFamily: "inherit", toolbar: { show: false } },
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
                    x: { formatter: (_: number, opts: { dataPointIndex: number }) => users[opts.dataPointIndex]?.name ?? "" },
                    y: { formatter: (v: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v) },
                },
                grid: { borderColor: "#f1f1f1", strokeDashArray: 4 },
            } as ApexCharts.ApexOptions,
            series: [
                { name: "Ingresos", data: users.map((u) => u.income) },
                { name: "Egresos", data: users.map((u) => u.expenses) },
            ],
        }
    }, [calculatedUserBalances])
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
    }

    const paginatedClosedMonths = closedMonths.slice(
        (page - 1) * rowsPerPage,
        page * rowsPerPage
    );

    if (loading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
                <p className="text-lg text-gray-600">Cargando datos de la caja...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
                <p className="text-lg text-red-600">Error: {error}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Caja Principal</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {/* Modal para Abrir Nueva Caja */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-8">
                        <div className="flex flex-row items-center gap-6 w-full md:w-auto max-w-xl bg-[#f1f1f1]">
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">Saldo Acumulado</div>
                                <div className="text-2xl font-bold text-blue-700">{formatCurrency(saldoAcumulado)}</div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-2 ">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="accumulated-date-input" className="mb-0">Fecha:</Label>
                                    <input
                                        id="accumulated-date-input"
                                        type="date"
                                        min="2019-01-15"
                                        max="2032-01-01"
                                        value={accumulatedBalanceDate}
                                        onChange={e => setAccumulatedBalanceDate(e.target.value)}
                                        className="border rounded px-2 py-2 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="accumulated-date-quick" className="mb-0">Rápido:</Label>
                                    <select
                                        id="accumulated-date-quick"
                                        className="border rounded px-2 py-2 text-sm"
                                        value=""
                                        onChange={e => {
                                            const hoy = new Date();
                                            let nuevaFecha = "";
                                            if (e.target.value === "hoy") {
                                                nuevaFecha = hoy.toISOString().slice(0, 10);
                                            } else if (e.target.value === "fin-mes") {
                                                const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
                                                nuevaFecha = finMes.toISOString().slice(0, 10);
                                            } else if (e.target.value === "inicio-mes") {
                                                const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                                                nuevaFecha = inicioMes.toISOString().slice(0, 10);
                                            }
                                            if (nuevaFecha) setAccumulatedBalanceDate(nuevaFecha);
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="hoy">Hoy</option>
                                        <option value="inicio-mes">Inicio de mes</option>
                                        <option value="fin-mes">Fin de mes</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsNewBoxModalOpen(true)} variant="custom" className="w-full p-2.5 md:w-auto bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80">
                                <Plus className="h-4 w-4" />
                                Abrir Caja
                            </Button>
                            <Button onClick={() => setIsRegisterMovementModalOpen(true)} variant="outline" className="w-full md:w-auto">
                                <Plus className="h-4 w-4" />
                                Registrar Movimiento
                            </Button>
                            <Button variant="outline" className="w-full md:w-auto">
                                <Sheet className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    {/* Modal para Registrar Nuevo Movimiento */}
                    <Modal
                        isOpen={isRegisterMovementModalOpen}
                        onClose={() => setIsRegisterMovementModalOpen(false)}
                        className="sm:max-w-[425px]"
                    >
                        <div className="p-6">
                            {" "}
                            {/* Añadir padding para simular DialogContent */}
                            <h2 className="text-xl font-semibold mb-2">Registrar Nuevo Movimiento</h2> {/* Simular DialogTitle */}
                            <p className="text-sm text-muted-foreground mb-4">Añade un nuevo ingreso o gasto a la caja.</p>
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
                                    <Input id="movement-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="movement-description">Descripción / Detalle</Label>
                                    <textarea
                                        id="movement-description"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Detalle del movimiento..."
                                        rows={4}
                                        className="w-full p-3 rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                {" "}
                                {/* Simular DialogFooter */}
                                <Button variant="outline" onClick={() => setIsRegisterMovementModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleAddMovement}>Registrar Movimiento</Button>
                            </div>
                        </div>
                    </Modal>
                              
                    {/* Modal para Abrir Nueva Caja */}
                    <Modal isOpen={isNewBoxModalOpen} onClose={() => setIsNewBoxModalOpen(false)} className="sm:max-w-[425px]">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-2">Abrir Caja</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Establece el saldo inicial de la caja para el período actual.
                            </p>
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
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setIsNewBoxModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleOpenCashbox}>Confirmar Apertura</Button>
                            </div>
                        </div>
                    </Modal>
                </div>
            </div>

            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <Card className="bg-white shadow-sm border border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Saldo de Caja</CardTitle>
                        <Calculator className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        {/* Ahora muestra directamente el saldo actual de la caja */}
                        <div className="text-2xl font-bold text-gray-800">{formatCurrency(currentCashBalance)}</div>
                        <p className="text-xs text-muted-foreground">Total Actual</p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-200">
                    <CardHeader>
                        <CardTitle>Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(ingresosMes)}</div>
                        <p className="text-xs text-muted-foreground">Total del mes</p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-200">
                    <CardHeader>
                        <CardTitle>Gastos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(gastosMes)}</div>
                        <p className="text-xs text-muted-foreground">Total del mes</p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-600">Saldo del Mes</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", saldoMes >= 0 ? "text-blue-600" : "text-red-600")}>
                            {formatCurrency(saldoMes)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {new Date(0, Number.parseInt(selectedMonth) - 1).toLocaleString("es-AR", { month: "long" })}{" "}
                            {selectedYear}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-600">Total Inicial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Ahora muestra el saldo inicial del período */}
                        <div className="text-2xl font-bold text-gray-800">{formatCurrency(saldoInicialMes)}</div>
                        <p className="text-xs text-muted-foreground">Saldo al inicio del período actual</p>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Saldo Cajas Usuarios & Saldo Acumulado */}
            <div className="lg:col-span-1 flex flex-col gap-8 mb-8">
                {/* Saldo Cajas Usuarios (Fake Data) */}
                <Card className="bg-white shadow-sm border border-gray-200">
                    <CardHeader>
                        <CardTitle>Saldo Cajas Usuarios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="w-full border border-gray-200">
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                            Miembro
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                            Saldo Total
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                            Ingresos
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                            Gastos
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                            Accion
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calculatedUserBalances.length > 0 ? (
                                        calculatedUserBalances.map((user, index) => (
                                            <TableRow
                                                key={index}
                                                className={cn(index % 2 === 0 ? "bg-white" : "bg-gray-50", "hover:bg-gray-100")}
                                            >
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <Image
                                                            src={user.avatar || "/placeholder.svg"}
                                                            alt="User Avatar"
                                                            width={32}
                                                            height={32}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                        <span>{user.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell
                                                    className={cn(
                                                        "px-4 py-3 text-sm text-right font-medium",
                                                        user.totalBalance >= 0 ? "text-green-600" : "text-red-600",
                                                    )}
                                                >
                                                    {formatCurrency(user.totalBalance)}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-right text-green-600">
                                                    {formatCurrency(user.income)}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-right text-red-600">
                                                    {formatCurrency(user.expenses)}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/admin/cashbox/${user.id}`)}
                                                    >
                                                        Detalles
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="px-4 py-3 text-center text-gray-500">
                                                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                                    <HandCoins className="h-10 w-10 text-gray-500" />
                                                    <h3 className="mb-2 text-lg font-medium">No hay transacciones</h3>
                                                    <p className="mb-4 mt-2 text-sm text-gray-500">
                                                        No hay transacciones asociadas a este periodo.
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow className="font-bold bg-gray-50">
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">Totales:</TableCell>
                                        <TableCell
                                            className={cn(
                                                "px-4 py-3 text-sm text-right",
                                                totalCalculatedUsersBalance >= 0 ? "text-green-700" : "text-red-700",
                                            )}
                                        >
                                            {formatCurrency(totalCalculatedUsersBalance)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-right text-green-700">
                                            {formatCurrency(totalCalculatedUsersIncome)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-right text-red-700">
                                            {formatCurrency(totalCalculatedUsersExpenses)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-right">&nbsp;</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 text-center">
                            <Button variant="outline" onClick={handleViewDetailedMovements}>
                                Ver Movimientos Detallados
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Left Column: Monthly Movements & Chart Placeholder */}
                <Card
                    className="lg:col-span-2 flex flex-col gap-2 bg-white shadow-sm border border-gray-200"
                    ref={monthlyMovementsRef}
                >
                    {/* Detalle de Movimientos del Mes */}
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Detalle de Movimientos del Mes</CardTitle>
                        <div className="flex gap-2">
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
                                className="w-[100px]"
                            />
                            <Button
                                onClick={handleCloseMonth}
                                variant="custom"
                                disabled={loading}
                                className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-1 px-2"
                            >
                                <Ban className="h-4 w-4" /> Cerrar Caja
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="w-full border border-gray-200">
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                            Fecha
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                            Tipo
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                            Subtipo
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                            Usuario
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                            Monto
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                            Descripción
                                        </TableCell>
                                        <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                            Acciones
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedMovements.length === 0 ? (
                                        <TableRow className="hover:bg-gray-50">
                                            <TableCell colSpan={6} className="px-4 py-3 text-sm text-center text-gray-500">
                                                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                                    <ArrowRightLeft className="h-10 w-10 text-gray-500" />
                                                    <h3 className="mb-2 text-lg font-medium">No hay movimientos</h3>
                                                    <p className="mb-4 mt-2 text-sm text-gray-500">No hay movimientos asociados a este mes.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedMovements.map((t, index) => {
                                            const d = new Date(toISODate(t.date));
                                            d.toLocaleDateString('es-AR', { timeZone: 'UTC' });
                                            return (
                                                <TableRow
                                                    key={index + (movementsPage - 1) * movementsRowsPerPage}
                                                    className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-100"}`}
                                                >
                                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                        {new Date(toISODate(t.date)).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                        <Badge
                                                            variant="light"
                                                            color={t.type === "income" ? "success" : t.type === "transfer" ? "info" : "error"}
                                                            size="sm"
                                                        >
                                                            {t.type === "income" ? "Ingreso" : t.type === "transfer" ? "Transferencia" : "Gasto"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                        {t.type === "transfer"
                                                            ? `Enviado a ${t.transferUser?.name || `Usuario ${t.userTransferId}`}`
                                                            : getSubtypeLabel(t.type, t.subtype)}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
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
                                                            <span>{typeof t.user === "string" ? t.user : t.user?.name || "Unknown User"}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell
                                                        className={cn(
                                                            "text-right font-medium px-4 py-3 text-sm text-gray-700",
                                                            t.type === "income" ? "text-green-600" : t.type === "transfer" ? "text-orange-500" : "text-red-600",
                                                        )}
                                                    >
                                                        {formatCurrency(t.amount)}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{t.description}</TableCell>
                                                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                                        <Button onClick={() => handleDeleteTransaction(t.id)} variant="custom" size="sm" className="h-7 w-7 bg-red-500 hover:bg-red-700 text-white" title="Eliminar">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
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
                                    size="sm"
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
                                    size="sm"
                                    disabled={movementsPage === movementsTotalPages}
                                    onClick={() => setMovementsPage(movementsPage + 1)}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Gráfico Ingresos vs Egresos */}
                <Card className="bg-white shadow-sm border border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Ingresos vs Egresos</CardTitle>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                            <button
                                onClick={() => setChartView("month")}
                                className={cn(
                                    "px-3 py-1.5 transition-colors",
                                    chartView === "month"
                                        ? "bg-[#09A4B5] text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                Por Mes
                            </button>
                            <button
                                onClick={() => setChartView("year")}
                                className={cn(
                                    "px-3 py-1.5 transition-colors",
                                    chartView === "year"
                                        ? "bg-[#09A4B5] text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                Por Año
                            </button>
                            <button
                                onClick={() => setChartView("user")}
                                className={cn(
                                    "px-3 py-1.5 transition-colors",
                                    chartView === "user"
                                        ? "bg-[#09A4B5] text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                Por Usuario
                            </button>
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

            {/* Historial de Cierres de Caja */}
            <Card className="mb-8 bg-white shadow-sm border border-gray-200">
                <CardHeader>
                    <CardTitle>Historial de Cierres de Caja</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="w-full border border-gray-200">
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-start">Mes/Año</TableCell>
                                    <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-right">Monto Inicial</TableCell>
                                    <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-right text-green-700">Ingresos</TableCell>
                                    <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-right text-red-700">Gastos</TableCell>
                                    <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-right">Saldo Total</TableCell>
                                    <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-center">Fecha de Cierre</TableCell>
                                    <TableCell isHeader className="px-4 py-3 text-sm font-semibold text-center">Estatus</TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClosedMonths.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                                            No hay cierres de caja registrados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedClosedMonths.map((report, index) => (
                                        <TableRow key={index} className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-100"}`}>
                                            <TableCell className="px-4 py-3 text-sm font-medium text-start capitalize">
                                                {new Date(0, Number.parseInt(report.month) - 1).toLocaleString("es-AR", { month: "long" })} {report.year}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm  text-right font-semibold text-gray-700">{formatCurrency(report.initialBalance)}</TableCell>
                                            <TableCell className="px-4 py-3 text-sm  text-right font-semibold text-green-600">{formatCurrency(report.monthlyIncome)}</TableCell>
                                            <TableCell className="px-4 py-3 text-sm  text-right font-semibold text-red-600">{formatCurrency(report.monthlyExpenses)}</TableCell>
                                            <TableCell className={cn("px-4 py-3 text-sm  text-right font-bold", report.monthlyBalance >= 0 ? "text-blue-600" : "text-red-600")}>{formatCurrency(report.monthlyBalance)}</TableCell>
                                            <TableCell className="px-4 py-3 text-sm  text-center text-gray-500">
                                                {new Date(report.closingDate).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm  text-center">
                                                <Badge variant="light" className="bg-green-100 text-green-800 border border-green-200">Cerrada</Badge>
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
                            size="sm"
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
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
