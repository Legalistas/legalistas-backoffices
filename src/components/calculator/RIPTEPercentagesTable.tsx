"use client";

import { useState } from "react";
import { useMonthlyStatistics } from "@/hooks/useStatistics";

const MONTHS = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
];

export default function RIPTEPercentagesTable() {
	const { data: statistics, loading, error } = useMonthlyStatistics();
	const [selectedYear, setSelectedYear] = useState<number | null>(null);

	if (loading) {
		return (
			<div className="flex justify-center items-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-red-600 dark:text-red-400 text-center py-4">
				Error al cargar los datos: {error.message}
			</div>
		);
	}

	// Agrupar por año
	const groupedByYear = statistics.reduce((acc: any, stat) => {
		if (!acc[stat.year]) {
			acc[stat.year] = {};
		}
		acc[stat.year][stat.month] = stat.percentage;
		return acc;
	}, {});

	const years = Object.keys(groupedByYear)
		.map(Number)
		.sort((a, b) => b - a);
	const filteredData = selectedYear
		? { [selectedYear]: groupedByYear[selectedYear] }
		: groupedByYear;

	// Detectar meses faltantes
	const getMissingMonths = (year: number) => {
		const yearData = groupedByYear[year] || {};
		return MONTHS.filter((month) => !Object.hasOwn(yearData, month));
	};

	return (
		<div>
			{/* Filtro de año */}
			<div className="mb-4 flex items-center justify-between">
				<select
					value={selectedYear || ""}
					onChange={(e) =>
						setSelectedYear(e.target.value ? Number(e.target.value) : null)
					}
					className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
				>
					<option value="">Todos los años</option>
					{years.map((year) => (
						<option key={year} value={year}>
							{year}
						</option>
					))}
				</select>

				{/* Indicador de meses faltantes */}
				{selectedYear && getMissingMonths(selectedYear).length > 0 && (
					<div className="text-sm text-orange-600 dark:text-orange-400">
						⚠️ Faltan {getMissingMonths(selectedYear).length} meses:{" "}
						{getMissingMonths(selectedYear).join(", ")}
					</div>
				)}
			</div>

			{/* Tabla */}
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead className="bg-gray-50 dark:bg-gray-900">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Año
							</th>
							{MONTHS.map((month) => (
								<th
									key={month}
									className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
								>
									{month.substring(0, 3)}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
						{Object.keys(filteredData)
							.map(Number)
							.sort((a, b) => b - a)
							.map((year) => (
								<tr
									key={year}
									className="hover:bg-gray-50 dark:hover:bg-gray-700"
								>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
										{year}
									</td>
									{MONTHS.map((month) => {
										const percentage = filteredData[year][month];
										const percentageNum =
											percentage !== null && percentage !== undefined
												? Number(percentage)
												: null;
										const isMissing = !Object.hasOwn(filteredData[year], month);

										return (
											<td
												key={month}
												className={`px-3 py-4 whitespace-nowrap text-sm text-center ${
													isMissing
														? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
														: ""
												}`}
											>
												{percentageNum !== null ? (
													<span
														className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
															percentageNum > 5
																? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
																: percentageNum > 2
																	? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
																	: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
														}`}
													>
														{percentageNum.toFixed(2)}%
													</span>
												) : (
													<span className="text-orange-600 dark:text-orange-400 font-semibold">
														Faltante
													</span>
												)}
											</td>
										);
									})}
								</tr>
							))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
