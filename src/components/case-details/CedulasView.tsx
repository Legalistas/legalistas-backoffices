"use client"

import { FileText, Plus, CheckCircle2, Clock, XCircle, Pencil, Trash2, Send, User } from "lucide-react"

const MOCK_CEDULAS = [
    {
        id: 1,
        tipo: "Cédula de notificación",
        caratula: "Medida cautelar - Aseguramiento de prueba",
        destinatario: "Industrias Metalúrgicas S.A.",
        expediente: "Exp. Judicial #2345",
        fechaEmision: "2026-02-10",
        estado: "diligenciada" as const,
    },
    {
        id: 2,
        tipo: "Cédula de notificación",
        caratula: "Ordinario - Accidente de trabajo",
        destinatario: "Prevención ART S.A.",
        expediente: "Exp. Judicial #2345",
        fechaEmision: "2026-02-10",
        estado: "diligenciada" as const,
    },
    {
        id: 3,
        tipo: "Cédula de notificación",
        caratula: "Ordinario - Accidente de trabajo",
        destinatario: "Industrias Metalúrgicas S.A.",
        expediente: "Exp. Judicial #2345",
        fechaEmision: "2026-03-05",
        estado: "pendiente" as const,
    },
    {
        id: 4,
        tipo: "Cédula Ley 22.172",
        caratula: "Administrativo - Reclamo ante SRT",
        destinatario: "SRT - Superintendencia de Riesgos del Trabajo",
        expediente: "Exp. Administrativo #1200",
        fechaEmision: "2026-01-20",
        estado: "devuelta" as const,
    },
]

const estadoConfig = {
    diligenciada: { label: "Diligenciada", color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800", icon: CheckCircle2 },
    pendiente: { label: "Pendiente", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800", icon: Clock },
    devuelta: { label: "Devuelta", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800", icon: XCircle },
}

export const CedulasView = () => {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const pendientes = MOCK_CEDULAS.filter(c => c.estado === "pendiente").length
    const diligenciadas = MOCK_CEDULAS.filter(c => c.estado === "diligenciada").length

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-gray-400" />
                    <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Cédulas</h3>
                    {MOCK_CEDULAS.length > 0 && (
                        <span className="text-xs text-gray-400">
                            ({pendientes} pendientes, {diligenciadas} diligenciadas)
                        </span>
                    )}
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                    Generar cédula
                </button>
            </div>

            {/* Content */}
            {MOCK_CEDULAS.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-14">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                        <Send className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No hay cédulas registradas</p>
                    <p className="text-xs text-gray-400 mb-3">Las cédulas se generan en base a las partes cargadas.</p>
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-500/85 transition-colors">
                        <Plus className="h-4 w-4" />
                        Generar cédula
                    </button>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {MOCK_CEDULAS.map((cedula) => {
                        const config = estadoConfig[cedula.estado]
                        const Icon = config.icon
                        const cardClass = cedula.estado === "diligenciada"
                            ? "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 opacity-80"
                            : cedula.estado === "devuelta"
                                ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"

                        return (
                            <div key={cedula.id} className={`rounded-lg border p-5 ${cardClass}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shrink-0">
                                            <FileText className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {cedula.tipo}
                                                </h4>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.color}`}>
                                                    <Icon className="h-3 w-3" />
                                                    {config.label}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                                                {cedula.caratula}
                                            </p>
                                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5 shrink-0" />
                                                    <span>{cedula.destinatario}</span>
                                                </div>
                                                <span>•</span>
                                                <span>{cedula.expediente}</span>
                                                <span>•</span>
                                                <span>{formatDate(cedula.fechaEmision)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            title="Editar cédula"
                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            title="Eliminar cédula"
                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
