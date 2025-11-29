/**
 * Componente de comparación de estadísticas por año
 * Muestra una tabla comparativa con totales y promedios
 */

'use client';

import { useYearsSummary } from '@/hooks/useStatistics';

export default function YearlyComparison() {
  const { data, loading, error } = useYearsSummary('estadistica_general');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Comparación Anual</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((yearData) => (
          <div
            key={yearData.year}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{yearData.year}</h3>
              <span className="text-sm text-gray-500">{yearData.months.length} meses</span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total del Año</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${yearData.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Promedio Mensual</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${(yearData.total / yearData.months.length).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">% Promedio</p>
                <div className="flex items-center gap-2">
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${yearData.avgPercentage > 5 ? 'bg-green-100 text-green-800' : 
                      yearData.avgPercentage > 2 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {yearData.avgPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Mini vista de meses */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Último mes registrado:</p>
              <div className="text-sm">
                <span className="font-medium">{yearData.months[yearData.months.length - 1]?.month}</span>
                <span className="text-gray-500 ml-2">
                  ${parseFloat(yearData.months[yearData.months.length - 1]?.value || '0').toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla detallada */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Resumen Detallado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Año
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promedio Mensual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Promedio
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meses
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((yearData) => (
                <tr key={yearData.year} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {yearData.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
                    ${yearData.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ${(yearData.total / yearData.months.length).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${yearData.avgPercentage > 5 ? 'bg-green-100 text-green-800' : 
                        yearData.avgPercentage > 2 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {yearData.avgPercentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {yearData.months.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
