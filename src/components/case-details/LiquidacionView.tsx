"use client"

import { Calculator, Info } from "lucide-react"

const MOCK_LIQUIDACION = {
    baseLRT: 2850000,
    porcentajeIncapacidad: 22.5,
    edad: 42,
    salario: 450000,
    antiguedad: 8,
    items: [
        { concepto: "Indemnización Art. 14 inc. 2a) LRT", monto: 2850000 },
        { concepto: "Adicional Art. 3 Ley 26.773", monto: 570000 },
        { concepto: "Intereses (tasa activa BNA)", monto: 1425000 },
    ],
    total: 4845000,
    nota: "Cálculo estimativo sujeto a variación según jurisdicción y criterio del juzgado interviniente.",
}

export const LiquidacionView = () => {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-gray-400" />
                    <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Liquidación</h3>
                    <span className="text-xs text-gray-400">Cálculo LRT</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Datos base */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "% Incapacidad", value: `${MOCK_LIQUIDACION.porcentajeIncapacidad}%` },
                        { label: "Edad", value: `${MOCK_LIQUIDACION.edad} años` },
                        { label: "Salario", value: `$${MOCK_LIQUIDACION.salario.toLocaleString("es-AR")}` },
                        { label: "Antigüedad", value: `${MOCK_LIQUIDACION.antiguedad} años` },
                    ].map((item) => (
                        <div key={item.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{item.label}</span>
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.value}</span>
                        </div>
                    ))}
                </div>

                {/* Desglose - como tarjetas individuales */}
                <div className="space-y-3">
                    {MOCK_LIQUIDACION.items.map((item, i) => (
                        <div key={i} className="rounded-lg border p-5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{item.concepto}</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    ${item.monto.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Total */}
                    <div className="rounded-lg border-2 p-5 bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-brand-800 dark:text-brand-300">Total estimado</span>
                            <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
                                ${MOCK_LIQUIDACION.total.toLocaleString("es-AR")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Nota */}
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                    <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">{MOCK_LIQUIDACION.nota}</p>
                </div>
            </div>
        </div>
    )
}
