"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import type { User } from "@/types/users"
import { CASH_ENDPOINT, USERS_ENDPOINT } from "@/constant/api-endpoints"
import { MOVEMENTS } from "@/constant/cash"
import { ArrowDown, ArrowUp, DollarSign, FileText, ListFilter, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card/Card"
import Label from "../ui/label/Label"
import Button from "../ui/button/Button"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table"
import Badge from "../ui/badge/Badge"

import { toast } from "sonner"
import { Modal } from "../ui/modal/Modal"
import Select from "../ui/select/Select"
import Input from "../ui/input/Input"
import { Autocomplete } from "../ui/Autocomplete"
import { Role } from "@/constant/user"

export default function MyCashboxContent() {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const [myCashbox, setMyCashbox] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRegisterMovementModalOpen, setIsRegisterMovementModalOpen] = useState(false)
    const [apiUsers, setApiUsers] = useState<User[]>([]) // Nuevo estado para los usuarios de la API

    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0")
    const currentYear = String(new Date().getFullYear())

    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
    const [selectedYear, setSelectedYear] = useState<string>(currentYear)

    const [filterPeriod, setFilterPeriod] = useState<"currentMonth" | "3months" | "6months" | "1year" | "all">(
        "currentMonth",
    )

    // State for sorting
    const [sortColumn, setSortColumn] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

    // Form states for new movement
    const [newType, setNewType] = useState<string>("") // Cambiado a string para incluir "transfer"
    const [newSubtype, setNewSubtype] = useState<string>("")
    const [newUser, setNewUser] = useState<number | null>(null)
    const [newAmount, setNewAmount] = useState<string>("")
    const [newDate, setNewDate] = useState<string>(new Date().toISOString().substring(0, 10))
    const [newDescription, setNewDescription] = useState<string>("")

    const formatCurrency = (amount: number) => {
        if (typeof amount !== "number" || isNaN(amount)) {
            return "$ 0.00"
        }
        return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount)
    }

    const getMonthName = (monthNumber: string) => {
        const date = new Date(0, Number(monthNumber) - 1)
        return date.toLocaleString("es-AR", { month: "long" })
    }

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(`${CASH_ENDPOINT}/user/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            const result = await response.json()

            if (!response.ok) {
                setError(result.error || "Error al obtener los datos del usuario.")
                setMyCashbox(null)
            } else {
                setMyCashbox(result.data)
                setError(null)
            }
            setLoading(false)
        } catch (error) {
            console.error("Error al obtener los datos del usuario:", error)
            setError("Error al obtener los datos del usuario.")
            setLoading(false)
        }
    }, [session?.user?.id, session?.user?.accessToken])

    useEffect(() => {
        if (userId && session?.user?.accessToken) {
            fetchData()
        }
    }, [userId, session?.user?.accessToken])

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

    const years = useMemo(() => {
        const currentYearNum = new Date().getFullYear()
        return Array.from({ length: 10 }, (_, i) => String(currentYearNum - 5 + i))
    }, [])

    const monthOptions = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1).padStart(2, "0"),
            label: new Date(0, i).toLocaleString("es-AR", { month: "long" }),
        }))
    }, [])

    const getSubtypeLabel = useCallback((type: string, subtypeValue: string) => {
        const movement = MOVEMENTS.find((m) => m.value === type)
        if (movement && movement.subMovements) {
            const subMovement = movement.subMovements.find((smItem) => smItem.value === subtypeValue) // Renamed sm to smItem
            return subMovement ? subMovement.label : subtypeValue // Retorna el label o el valor si no se encuentra
        }
        return subtypeValue // Retorna el valor si no hay subtipos definidos para el tipo
    }, [])

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortColumn(column)
            setSortDirection("asc") // Default to ascending when changing column
        }
    }

    const filteredTransactions = useMemo(() => {
        if (!myCashbox?.transaction) return []

        let transactionsToFilter = [...myCashbox.transaction] // Create a copy to avoid direct mutation

        if (filterPeriod === "currentMonth") {
            // Include all transactions from beginning of time up to end of selected month
            transactionsToFilter = transactionsToFilter.filter((t) => {
                const transactionDate = new Date(t.date)
                const selectedDate = new Date(Number(selectedYear), Number(selectedMonth) - 1, 31, 23, 59, 59) // End of selected month
                return transactionDate <= selectedDate
            })
        } else if (filterPeriod !== "all") {
            const now = new Date()
            const startDate = new Date(now)

            if (filterPeriod === "3months") {
                startDate.setUTCMonth(now.getUTCMonth() - 3)
            } else if (filterPeriod === "6months") {
                startDate.setUTCMonth(now.getUTCMonth() - 6)
            } else if (filterPeriod === "1year") {
                startDate.setUTCFullYear(now.getUTCFullYear() - 1)
            }
            // Ensure startDate is at the beginning of the day for comparison
            startDate.setUTCHours(0, 0, 0, 0)

            transactionsToFilter = transactionsToFilter.filter((t) => {
                const transactionDate = new Date(t.date)
                // Ensure transactionDate is also at the beginning of the day for comparison
                transactionDate.setUTCHours(0, 0, 0, 0)
                return transactionDate >= startDate
            })
        }
        // If filterPeriod is "all", no date filtering is applied here.

        // Apply sorting
        if (sortColumn) {
            transactionsToFilter.sort((a, b) => {
                let valA: any
                let valB: any

                switch (sortColumn) {
                    case "date":
                        valA = new Date(a.date).getTime()
                        valB = new Date(b.date).getTime()
                        break
                    case "type":
                        // For sorting, we need a consistent value. Let's use a derived type.
                        const typeA = a.type === "transfer" ? (a.userId === userId ? "expense" : "income") : a.type
                        const typeB = b.type === "transfer" ? (b.userId === userId ? "expense" : "income") : b.type
                        valA = typeA
                        valB = typeB
                        break
                    case "subtype":
                        valA = a.subtype
                        valB = b.subtype
                        break
                    case "amount":
                        valA = a.amount
                        valB = b.amount
                        break
                    case "description":
                        valA = a.description
                        valB = b.description
                        break
                    default:
                        return 0
                }

                if (valA < valB) return sortDirection === "asc" ? -1 : 1
                if (valA > valB) return sortDirection === "asc" ? 1 : -1
                return 0
            })
        } else {
            // Default sort by date descending if no specific sort column is selected
            transactionsToFilter.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }

        return transactionsToFilter
    }, [myCashbox?.transaction, selectedMonth, selectedYear, filterPeriod, sortColumn, sortDirection, userId])

    const { totalIncome, totalExpenses, netBalance, totalMovements } = useMemo(() => {
        let incomeSum = 0 // Suma solo para movimientos de tipo 'income'
        let expenseSum = 0 // Suma solo para movimientos de tipo 'expense'
        let transferNetEffect = 0 // Efecto neto de las transferencias en el saldo

        filteredTransactions.forEach((t) => {
            if (t.type === "income") {
                incomeSum += t.amount
            } else if (t.type === "expense") {
                expenseSum += t.amount
            } else if (t.type === "transfer") {
                if (t.subtype === "Enviado") {
                    // Transferencia enviada, restar del saldo
                    transferNetEffect -= t.amount
                } else if (t.subtype === "Recibido") {
                    // Transferencia recibida, sumar al saldo
                    transferNetEffect += t.amount
                }
            }
        })

        return {
            totalIncome: incomeSum,
            totalExpenses: expenseSum,
            netBalance: incomeSum - expenseSum + transferNetEffect, // El saldo neto considera ingresos, gastos y el efecto de las transferencias
            totalMovements: filteredTransactions.length,
        }
    }, [filteredTransactions, userId])

    // Define esta nueva función para manejar la selección del usuario desde el Autocomplete
    const handleUserSelect = useCallback((selectedUserId: number | null) => {
        setNewUser(selectedUserId)
    }, [])

    const handleAddMovement = async () => {
        const amount = Number.parseFloat(newAmount)

        // Determina el userId final a usar: si newUser está seleccionado, úsalo; de lo contrario, usa session.user.id
        const isSubtypeRequired = newType !== "transfer"
        if (!newType || (isSubtypeRequired && !newSubtype) || isNaN(amount) || amount <= 0 || !newDate || !newDescription) {
            toast.error(
                "Por favor, completa todos los campos y asegúrate de que el monto sea válido y un usuario esté seleccionado.",
            )
            return
        }

        setLoading(true)

        const bodyPayload: {
            type: string
            subtype: string
            userId: any
            amount: number
            date: Date
            description: string
            userTransferId?: number
        } = {
            type: newType, // Send the actual type, including "transfer"
            subtype: newSubtype,
            userId,
            amount: amount,
            date: new Date(newDate),
            description: newDescription,
        }

        if (newType === "transfer" && newUser !== null) {
            bodyPayload.userTransferId = newUser
        }

        const response = await fetch(`${CASH_ENDPOINT}/movements`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.user?.accessToken}`,
            },
            body: JSON.stringify(bodyPayload),
        })

        const result = await response.json()

        if (result.success) {
            setNewType("") // Resetear el tipo
            setNewSubtype("")
            setNewUser(null)
            setNewAmount("")
            setNewDescription("")
            setNewDate(new Date().toISOString().substring(0, 10))
            setIsRegisterMovementModalOpen(false) // Close modal
            toast.success(result.message)
            await fetchData() // Recargar datos para obtener los movimientos actualizados
        } else {
            toast.error(`Error al registrar movimiento: ${result.message}`)
        }
        setLoading(false)
    }

    const handleExportToExcel = async () => {
        try {
            const response = await fetch(`${CASH_ENDPOINT}/user/${userId}/export`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)

            // Obtener fecha actual formateada
            const fecha = new Date()
            const mes = fecha.toLocaleString("default", { month: "long" }) // ejemplo: "junio"
            const anio = fecha.getFullYear()

            // Nombre del archivo
            const fileName = `mis_transacciones_${mes}_${anio}.xlsx`

            const a = document.createElement("a")
            a.href = url
            a.download = fileName
            a.click()
            window.URL.revokeObjectURL(url)

            toast.success("Transacciones exportadas a Excel correctamente")
        } catch (error) {
            console.error("Error al exportar a Excel:", error)
            toast.error("Error al exportar a Excel")
        }
    }

    // Opciones para el Select de Tipo de Movimiento
    const movementTypeOptions = useMemo(() => {
        return MOVEMENTS.map((m) => ({
            value: m.value,
            label: m.label,
        }))
    }, [])

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

    const filterPeriodOptions = useMemo(() => {
        return [
            { value: "currentMonth", label: "Mes Actual" },
            { value: "3months", label: "Últimos 3 Meses" },
            { value: "6months", label: "Últimos 6 Meses" },
            { value: "1year", label: "Último Año" },
            { value: "all", label: "Todas las Transacciones" },
        ]
    }, [])

    // Manejar el cambio del tipo de movimiento
    const handleMovementTypeChange = (value: string) => {
        setNewType(value)
        setNewSubtype("") // Resetear el subtipo cuando el tipo cambia
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <p className="text-lg text-gray-600">Cargando datos del usuario...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <p className="text-lg text-red-600">Error: {error}</p>
            </div>
        )
    }

    if (!myCashbox) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <p className="text-lg text-gray-600">No se encontraron datos para este usuario.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold text-gray-800">Mi Caja</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {/* Modal para Abrir Nueva Caja */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-8">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsRegisterMovementModalOpen(true)}
                                variant="outline"
                                className="w-full md:w-auto"
                            >
                                <Plus className="h-4 w-4" />
                                Registrar Movimiento
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
                            <h2 className="text-xl font-semibold mb-2">Registrar Nuevo Movimiento</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Añade un nuevo ingreso, gasto o transferencia entre usuarios.
                            </p>

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
                                    <Input id="movement-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                                </div>

                                {/* Descripción */}
                                <div className="space-y-2">
                                    <Label htmlFor="movement-description">Descripción / Detalle</Label>
                                    <textarea
                                        id="movement-description"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Detalle del movimiento..."
                                        rows={4}
                                        className="w-full p-3 rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                                    />
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setIsRegisterMovementModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleAddMovement}>Registrar Movimiento</Button>
                            </div>
                        </div>
                    </Modal>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            {filterPeriod === "currentMonth" ? "Saldo Acumulado" : "Saldo del Período"}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", netBalance >= 0 ? "text-blue-600" : "text-red-600")}>
                            {formatCurrency(netBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {filterPeriod === "currentMonth"
                                ? `Hasta ${getMonthName(selectedMonth)} ${selectedYear}`
                                : `${getMonthName(selectedMonth)} ${selectedYear}`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            {filterPeriod === "currentMonth" ? "Ingresos Acumulados" : "Ingresos del Período"}
                        </CardTitle>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
                        <p className="text-xs text-muted-foreground">
                            {filterPeriod === "currentMonth" ? "Total acumulado" : "Total del período"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            {filterPeriod === "currentMonth" ? "Gastos Acumulados" : "Gastos del Período"}
                        </CardTitle>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">
                            {filterPeriod === "currentMonth" ? "Total acumulado" : "Total del período"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Total de Movimientos</CardTitle>
                        <ListFilter className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-800">{totalMovements}</div>
                        <p className="text-xs text-muted-foreground">
                            {filterPeriod === "currentMonth" ? "Movimientos acumulados" : "Transacciones en el período"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card className="bg-white shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle>Movimientos del Usuario</CardTitle>
                    <div className="flex flex-col md:flex-row items-center gap-2">
                        <Label htmlFor="filter-period" className="sr-only">
                            Período
                        </Label>
                        <Select
                            id="filter-period"
                            className="w-full md:w-[200px]"
                            value={filterPeriod}
                            onValueChange={(value) =>
                                setFilterPeriod(value as "currentMonth" | "3months" | "6months" | "1year" | "all")
                            }
                            options={filterPeriodOptions}
                            placeholder="Selecciona Período"
                        />
                        <Label htmlFor="month-filter" className="sr-only">
                            Mes
                        </Label>
                        <Select
                            id="month-filter"
                            className="w-full md:w-[180px]"
                            value={selectedMonth}
                            onValueChange={setSelectedMonth}
                            options={monthOptions}
                            placeholder="Selecciona Mes"
                            disabled={filterPeriod !== "currentMonth"}
                        />
                        <Label htmlFor="year-filter" className="sr-only">
                            Año
                        </Label>
                        <Select
                            id="year-filter"
                            className="w-full md:w-[150px]"
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                            options={years.map((year) => ({
                                value: year,
                                label: year,
                            }))}
                            placeholder="Selecciona Año"
                        />
                        <Button
                            variant="outline"
                            className="w-full md:w-auto flex items-center gap-2 bg-transparent"
                            onClick={handleExportToExcel}
                        >
                            <FileText className="h-4 w-4" />
                            Exportar a Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        {filteredTransactions.length === 0 ? (
                            <div className="py-4 text-center text-gray-500">
                                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                    <ListFilter className="mb-4 h-10 w-10 text-gray-500" />
                                    <h3 className="mb-2 text-lg font-medium">No hay movimientos</h3>
                                    <p className="text-sm text-gray-500">No hay transacciones para el período seleccionado.</p>
                                </div>
                            </div>
                        ) : (
                            <Table className="w-full border border-gray-200">
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            <div className="flex items-center cursor-pointer select-none" onClick={() => handleSort("date")}>
                                                Fecha
                                                {sortColumn === "date" &&
                                                    (sortDirection === "asc" ? (
                                                        <ArrowUp className="inline-block h-4 w-4 ml-1" />
                                                    ) : (
                                                        <ArrowDown className="inline-block h-4 w-4 ml-1" />
                                                    ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mes</TableCell>
                                        <TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                            <div className="flex items-center cursor-pointer select-none" onClick={() => handleSort("type")}>
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
                                    {filteredTransactions.map((transaction, index) => {
                                        // Determine the effective type and color for display
                                        let displayType = transaction.type
                                        let typeColorClass = ""

                                        if (transaction.type === "transfer") {
                                            if (transaction.subtype === "Enviado") {
                                                displayType = "Gasto" // Outgoing transfer for current user
                                                typeColorClass = "border-red-500 text-red-700"
                                            } else if (transaction.subtype === "Recibido") {
                                                displayType = "Ingreso" // Incoming transfer for current user
                                                typeColorClass = "border-green-500 text-green-700"
                                            } else {
                                                // Fallback for transfers not directly involving current user (shouldn't happen if filtered correctly)
                                                displayType = "Transferencia"
                                                typeColorClass = "border-gray-500 text-gray-700"
                                            }
                                        } else {
                                            displayType = transaction.type === "income" ? "Ingreso" : "Gasto"
                                            typeColorClass =
                                                transaction.type === "income"
                                                    ? "border-green-500 text-green-700"
                                                    : "border-red-500 text-red-700"
                                        }

                                        return (
                                            <TableRow
                                                key={transaction.id}
                                                className={cn(index % 2 === 0 ? "bg-white" : "bg-gray-50", "hover:bg-gray-100")}
                                            >
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                    {new Date(transaction.date).toLocaleDateString("es-AR")}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                    {getMonthName(String(new Date(transaction.date).getMonth() + 1))}{" "}
                                                    {new Date(transaction.date).getFullYear()}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                    <Badge variant="light" className={typeColorClass}>
                                                        {displayType}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                    {getSubtypeLabel(transaction.type, transaction.subtype)}
                                                </TableCell>
                                                <TableCell
                                                    className={cn(
                                                        "px-4 py-3 text-right text-sm font-medium",
                                                        displayType === "Ingreso" ? "text-green-600" : "text-red-600",
                                                    )}
                                                >
                                                    {formatCurrency(transaction.amount)}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">{transaction.description}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
