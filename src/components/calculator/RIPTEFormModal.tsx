'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateStatistic, useMonthlyStatistics } from '@/hooks/useStatistics';
import { X } from 'lucide-react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface RIPTEFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RIPTEFormModal({ isOpen, onClose, onSuccess }: RIPTEFormModalProps) {
  const { data: statistics } = useMonthlyStatistics();
  const [formData, setFormData] = useState({
    month: 'Enero',
    year: new Date().getFullYear(),
    value: '',
    percentage: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingMonths, setMissingMonths] = useState<string[]>([]);

  // Detectar meses faltantes cuando cambia el año
  useEffect(() => {
    if (statistics.length > 0) {
      const yearData = statistics.filter(s => s.year === formData.year);
      const existingMonths = yearData.map(s => s.month);
      const missing = MONTHS.filter(m => !existingMonths.includes(m));
      setMissingMonths(missing);
      
      // Auto-seleccionar el primer mes faltante
      if (missing.length > 0 && !existingMonths.includes(formData.month)) {
        setFormData(prev => ({ ...prev, month: missing[0] }));
      }
    }
  }, [formData.year, statistics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createOrUpdateStatistic({
        month: formData.month,
        year: formData.year,
        value: parseFloat(formData.value),
        percentage: formData.percentage ? parseFloat(formData.percentage) : undefined,
        type: 'estadistica_general'
      });

      setFormData({
        month: 'Enero',
        year: new Date().getFullYear(),
        value: '',
        percentage: ''
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar RIPTE');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agregar/Editar RIPTE
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Indicador de meses faltantes */}
          {missingMonths.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded text-sm">
              <strong>ℹ️ Meses faltantes para {formData.year}:</strong>
              <div className="mt-1 flex flex-wrap gap-1">
                {missingMonths.map(month => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => setFormData({ ...formData, month })}
                    className={`px-2 py-1 rounded text-xs ${
                      formData.month === month
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mes *
            </label>
            <select
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            >
              {MONTHS.map(month => {
                const isMissing = missingMonths.includes(month);
                return (
                  <option 
                    key={month} 
                    value={month}
                    className={isMissing ? 'font-semibold' : ''}
                  >
                    {month} {isMissing ? '⚠️ Faltante' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Año */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Año *
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              min="2000"
              max="2100"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor (ARS) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Ej: 167811.87"
            />
          </div>

          {/* Porcentaje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Variación % (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 2.80"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ingrese solo el número (sin el símbolo %)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
