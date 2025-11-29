"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import type { User } from "@/types/users" // Assuming Transaction type is now in types/users
import { CASH_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import Label from "@/components/ui/label/Label"
import Badge from "@/components/ui/badge/Badge"
import { cn } from "@/lib/utils"
import { DollarSign, ArrowUp, ArrowDown, ListFilter, CalendarDays, FileText, ArrowLeft } from "lucide-react" // Added FileText
import Button from "@/components/ui/button/Button" // Ensure Button is imported
import Image from "next/image"
import { MOVEMENTS } from "@/constant/cash" // Importar MOVEMENTS y su tipo
import { toast } from "sonner"

export default function CashBoxUserDetail({ userId }: { userId: number }) {
  const { data: session } = useSession()
  // El userId que se pasa como prop es el ID del usuario cuya caja se está visualizando
  const currentViewUserId = userId
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0")
  const currentYear = String(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [selectedYear, setSelectedYear] = useState<string>(currentYear)

  // State for sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

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

  const fetchUser = async () => {
    try {
      setLoading(true)
      // Usar currentViewUserId para la llamada a la API
      const response = await fetch(`${CASH_ENDPOINT}/user/${currentViewUserId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      })
      const result = await response.json()
      console.log("🚀 ~ fetchUser ~ result:", result)
      if (!response.ok) {
        setError(result.error || "Error al obtener los datos del usuario.")
        setUser(null)
      } else {
        setUser(result.data)
        setError(null)
      }
      setLoading(false)
    } catch (error) {
      console.error("Error al obtener los datos del usuario:", error)
      setError("Error al obtener los datos del usuario.")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentViewUserId && session?.user?.accessToken) {
      fetchUser()
    }
  }, [currentViewUserId, session?.user?.accessToken]) // Añadir currentViewUserId a las dependencias

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
      const subMovement = movement.subMovements.find((sm) => sm.value === subtypeValue)
      return subMovement ? subMovement.label : subtypeValue
    }
    return subtypeValue
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
    if (!user?.transaction) return []

    // Get all transactions from the beginning through the selected month/year
    const transactionsToFilter = user.transaction.filter((t) => {
      const transactionDate = new Date(t.date)
      const transactionYear = transactionDate.getUTCFullYear()
      const transactionMonth = transactionDate.getUTCMonth() + 1
      const selectedYearNum = Number(selectedYear)
      const selectedMonthNum = Number(selectedMonth)

      // Include all transactions up to and including the selected month/year
      return (
        transactionYear < selectedYearNum ||
        (transactionYear === selectedYearNum && transactionMonth <= selectedMonthNum)
      )
    })

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
            // Para ordenar, usamos el tipo efectivo para el usuario actual
            const typeA = a.type === "transfer" ? (a.userId === currentViewUserId ? "expense" : "income") : a.type
            const typeB = b.type === "transfer" ? (b.userId === currentViewUserId ? "expense" : "income") : b.type
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
  }, [user?.transaction, selectedMonth, selectedYear, sortColumn, sortDirection, currentViewUserId])

  const { totalIncome, totalExpenses, netBalance, totalMovements, currentMonthMovements } = useMemo(() => {
    let incomeSum = 0
    let expenseSum = 0
    let transferNetEffect = 0
    let currentMonthCount = 0

    filteredTransactions.forEach((t) => {
      const transactionDate = new Date(t.date)
      const isCurrentMonth =
        transactionDate.getUTCMonth() + 1 === Number(selectedMonth) &&
        transactionDate.getUTCFullYear() === Number(selectedYear)

      if (isCurrentMonth) {
        currentMonthCount++
      }

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
      netBalance: incomeSum - expenseSum + transferNetEffect,
      totalMovements: filteredTransactions.length,
      currentMonthMovements: currentMonthCount,
    }
  }, [filteredTransactions, currentViewUserId, selectedMonth, selectedYear])

  const handleExportToExcel = async () => {
    try {
      // Usar currentViewUserId para la exportación
      const response = await fetch(`${CASH_ENDPOINT}/user/${currentViewUserId}/export`, {
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
      const fileName = `transacciones_usuario_${currentViewUserId}_${mes}_${anio}.xlsx`
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-lg text-gray-600">No se encontraron datos para este usuario.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* User Header */}
      <div className="mb-8 flex flex-col items-center gap-4 rounded-lg bg-white p-6 shadow-sm md:flex-row md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-blue-500 flex items-center justify-center bg-gray-100">
            <Image
              src={
                user.image
                  ? user.image.startsWith("http")
                    ? user.image
                    : `${process.env.NEXT_PUBLIC_BACKEND_URL}${user.image}`
                  : "/placeholder.svg"
              }
              alt={user.name || "Avatar de usuario"}
              className="object-cover h-full w-full"
              width={80}
              height={80}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-2 px-3"
            variant="custom"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              Miembro desde: {new Date(user.createdAt).toLocaleDateString("es-AR")}
            </span>
          </div>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Saldo Acumulado</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", netBalance >= 0 ? "text-blue-600" : "text-red-600")}>
              {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Hasta {getMonthName(selectedMonth)} {selectedYear}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ingresos Acumulados</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Gastos Acumulados</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Movimientos</CardTitle>
            <ListFilter className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{currentMonthMovements}</div>
            <p className="text-xs text-muted-foreground">
              En {getMonthName(selectedMonth)} ({totalMovements} total)
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Transactions Table */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Movimientos Acumulados del Usuario</CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-2">
            <Label htmlFor="month-filter" className="sr-only">
              Mes
            </Label>
            <select
              id="month-filter"
              className="w-full md:w-[180px] border rounded px-3 py-2"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Selecciona Mes</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Label htmlFor="year-filter" className="sr-only">
              Año
            </Label>
            <select
              id="year-filter"
              className="w-full md:w-[150px] border rounded px-3 py-2"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">Selecciona Año</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
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
                    <div className="flex items-center cursor-pointer select-none" onClick={() => handleSort("subtype")}>
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
                    <div className="flex items-center cursor-pointer select-none" onClick={() => handleSort("amount")}>
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
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
                        <ListFilter className="mb-4 h-10 w-10 text-gray-500" />
                        <h3 className="mb-2 text-lg font-medium">No hay movimientos</h3>
                        <p className="text-sm text-gray-500">No hay transacciones para el mes seleccionado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction, index) => {
                    let displayType = ""
                    let typeColorClass = ""
                    let amountColorClass = ""
                    let displaySubtype = "" // Nueva variable para el subtipo a mostrar

                    // Asegurarse de que los IDs sean números para la comparación
                    const txUserId = Number(transaction.userId)
                    const txUserTransferId = Number(transaction.userTransferId)
                    const currentUserIdNum = Number(currentViewUserId)

                    if (transaction.type === "transfer") {
                      displayType = "Transferencia" // El tipo siempre es "Transferencia" para transfers
                      typeColorClass = "border-gray-500 text-gray-700" // Badge gris para transferencias

                      if (txUserId === currentUserIdNum) {
                        // El usuario actual es el remitente (gasto)
                        displaySubtype = `Envío a Usuario ${txUserTransferId}`
                        amountColorClass = "text-red-600"
                      } else if (txUserTransferId === currentUserIdNum) {
                        // El usuario actual es el receptor (ingreso)
                        displaySubtype = `Recibido de Usuario ${txUserId}`
                        amountColorClass = "text-green-600"
                      } else {
                        // Caso de fallback, aunque no debería ocurrir si los datos están bien filtrados
                        displaySubtype = "Transferencia (no involucra a este usuario)"
                        amountColorClass = "text-gray-600"
                      }
                    } else {
                      // Lógica para ingresos y gastos normales
                      displayType = transaction.type === "income" ? "Ingreso" : "Gasto"
                      typeColorClass =
                        transaction.type === "income"
                          ? "border-green-500 text-green-700"
                          : "border-red-500 text-red-700"
                      amountColorClass = transaction.type === "income" ? "text-green-600" : "text-red-600"
                      displaySubtype = getSubtypeLabel(transaction.type, transaction.subtype)
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
                          {displaySubtype} {/* Usar la nueva variable displaySubtype */}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-4 py-3 text-right text-sm font-medium",
                            amountColorClass, // Usar la nueva variable amountColorClass aquí
                          )}
                        >
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700">{transaction.description}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
