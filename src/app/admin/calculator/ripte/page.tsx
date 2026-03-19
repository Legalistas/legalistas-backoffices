"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import RIPTEFormModal from "@/components/calculator/RIPTEFormModal";
import RIPTEPercentagesTable from "@/components/calculator/RIPTEPercentagesTable";
import RIPTEVariationsTable from "@/components/calculator/RIPTEVariationsTable";

export default function RIPTEPage() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	const handleSuccess = () => {
		setRefreshKey((prev) => prev + 1);
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						RIPTE
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Remuneración Imponible Promedio de los Trabajadores Estables
					</p>
				</div>
				<button
					onClick={() => setIsModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					<Plus size={20} />
					Agregar RIPTE
				</button>
			</div>

			<div className="space-y-6" key={refreshKey}>
				{/* Tabla de Valores */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						Valores Mensuales
					</h2>
					<RIPTEVariationsTable />
				</div>

				{/* Tabla de Porcentajes */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						Variaciones Porcentuales
					</h2>
					<RIPTEPercentagesTable />
				</div>
			</div>

			{/* Modal */}
			<RIPTEFormModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={handleSuccess}
			/>
		</div>
	);
}
