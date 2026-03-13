"use client"

import { DollarSign, Plus, TrendingUp } from "lucide-react"

const MOCK_GASTOS = [
    {
        id: 1,
        fecha: "2026-01-15",
        concepto: "Tasa de justicia",
        monto: 45000,
        responsable: "Estudio",
        expediente: "Exp. Judicial #2345",
    },
    {
        id: 2,
        fecha: "2026-02-03",
        concepto: "Honorarios perito médico",
        monto: 120000,
        responsable: "Estudio",
        expediente: "Exp. Judicial #2345",
    },
    {
        id: 3,
        fecha: "2026-02-20",
        concepto: "Cédulas de notificación (x3)",
        monto: 15000,
        responsable: "Estudio",
        expediente: "Exp. Judicial #2345",
    },
    {
        id: 4,
        fecha: "2026-03-01",
        concepto: "Copias certificadas expediente",
        monto: 8500,
        responsable: "Estudio",
        expediente: "Exp. Administrativo #1200",
    },
    {
        id: 5,
        fecha: "2026-03-10",
        concepto: "Bono Ley 8480",
        monto: 25000,
        responsable: "Estudio",
        expediente: "Exp. Judicial #2345",
    },
]

const totalGastos = MOCK_GASTOS.reduce((acc, g) => acc + g.monto, 0)

export const GastosView = () => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Gastos</h3>
                    {MOCK_GASTOS.length > 0 && (
                        <span className="text-xs text-gray-400">
                            ({MOCK_GASTOS.length} gastos)
                        </span>
                    )}
                    {MOCK_GASTOS.length > 0 && (
                        <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                            <TrendingUp className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                                Total: ${totalGastos.toLocaleString("es-AR")}
                            </span>
                        </div>
                    )}
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo gasto
                </button>
            </div>

            {/* Content */}
            {MOCK_GASTOS.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-14">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                        <DollarSign className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No hay gastos registrados</p>
                    <p className="text-xs text-gray-400 mb-3">Registrá los gastos asociados al caso.</p>
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-500/85 transition-colors">
                        <Plus className="h-4 w-4" />
                        Nuevo gasto
                    </button>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {MOCK_GASTOS.map((gasto) => (
                        <div key={gasto.id} className="rounded-lg border p-5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 shrink-0">
                                        <DollarSign className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {gasto.concepto}
                                        </h4>
                                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                                            <span>{formatDate(gasto.fecha)}</span>
                                            <span>•</span>
                                            <span>{gasto.expediente}</span>
                                            <span>•</span>
                                            <span>{gasto.responsable}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 shrink-0">
                                    ${gasto.monto.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Total card */}
                    <div className="rounded-lg border-2 p-5 bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-brand-800 dark:text-brand-300">Total acumulado</span>
                            <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
                                ${totalGastos.toLocaleString("es-AR")}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
