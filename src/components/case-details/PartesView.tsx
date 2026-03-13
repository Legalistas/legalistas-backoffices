"use client"

import { User, Building2, Plus, Users, Pencil, Trash2, MapPin, Phone, Mail } from "lucide-react"

const MOCK_PARTES = [
    {
        id: 1,
        nombre: "Juan Carlos Pérez",
        rol: "Actor",
        tipo: "persona" as const,
        domicilio: "Av. Rivadavia 4500, CABA",
        telefono: "+54 9 11 5555-1234",
        email: "jcperez@email.com",
    },
    {
        id: 2,
        nombre: "Industrias Metalúrgicas S.A.",
        rol: "Demandado (Empleador)",
        tipo: "empresa" as const,
        domicilio: "Parque Industrial Km 32, Pilar, Buenos Aires",
        telefono: "+54 11 4444-5678",
        email: "legal@indmetalurgicas.com.ar",
    },
    {
        id: 3,
        nombre: "Prevención ART S.A.",
        rol: "Aseguradora (ART)",
        tipo: "empresa" as const,
        domicilio: "Av. Leandro N. Alem 855, CABA",
        telefono: "0800-333-0000",
        email: "siniestros@prevencionart.com.ar",
    },
    {
        id: 4,
        nombre: "Dr. Roberto Martínez",
        rol: "Abogado contraparte",
        tipo: "persona" as const,
        domicilio: "Talcahuano 550, Piso 4, CABA",
        telefono: "+54 9 11 6666-7890",
        email: "rmartinez@estudio.com.ar",
    },
]

const rolColors: Record<string, string> = {
    Actor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    "Demandado (Empleador)": "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    "Aseguradora (ART)": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    "Abogado contraparte": "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
}

export const PartesView = () => {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Partes del Caso</h3>
                    <span className="text-xs text-gray-400">({MOCK_PARTES.length})</span>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                    Agregar parte
                </button>
            </div>

            {/* Content */}
            {MOCK_PARTES.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-14">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                        <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No hay partes registradas</p>
                    <p className="text-xs text-gray-400 mb-3">Agregá las partes involucradas en el caso.</p>
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-500/85 transition-colors">
                        <Plus className="h-4 w-4" />
                        Agregar parte
                    </button>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {MOCK_PARTES.map((parte) => (
                        <div key={parte.id} className="rounded-lg border p-5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${parte.tipo === "persona" ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600"}`}>
                                        {parte.tipo === "persona" ? (
                                            <User className="h-5 w-5 text-blue-500" />
                                        ) : (
                                            <Building2 className="h-5 w-5 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {parte.nombre}
                                            </h4>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${rolColors[parte.rol] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                                {parte.rol}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span>{parte.domicilio}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span>{parte.telefono}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span>{parte.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        title="Editar parte"
                                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        title="Eliminar parte"
                                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
