'use client';

import { Calculator } from "lucide-react";

export default function AccidentsWorkPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Calculator size={32} />
          Calculadora de Accidentes de Trabajo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Cálculo de indemnizaciones según la Ley de Riesgos del Trabajo (LRT)
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-12">
          <Calculator size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Calculadora en Desarrollo
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Esta funcionalidad estará disponible próximamente
          </p>
        </div>
      </div>
    </div>
  );
}
