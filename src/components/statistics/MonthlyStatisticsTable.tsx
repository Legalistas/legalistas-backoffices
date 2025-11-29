/**
 * Componente de ejemplo para mostrar estadísticas mensuales en una tabla
 */

'use client';

import { useState } from 'react';
import { useMonthlyStatistics, useAvailableYears } from '@/hooks/useStatistics';

export default function MonthlyStatisticsTable() {
  const { years } = useAvailableYears();
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  
  const { data, loading, error } = useMonthlyStatistics({
    year: selectedYear,
    type: 'estadistica_general'
  });

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
    <div className="space-y-4">
      {/* Selector de año */}
      <div className="flex items-center gap-4">
        <label htmlFor="year-select" className="font-medium">
          Filtrar por año:
        </label>
        <select
          id="year-select"
          value={selectedYear || ''}
          onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los años</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de estadísticas */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Año
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Porcentaje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((stat) => (
              <tr key={stat.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {stat.month}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stat.year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  ${parseFloat(stat.value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {stat.percentage ? (
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${parseFloat(stat.percentage) > 5 ? 'bg-green-100 text-green-800' : 
                        parseFloat(stat.percentage) > 2 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {parseFloat(stat.percentage).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay datos disponibles para mostrar
        </div>
      )}
    </div>
  );
}
