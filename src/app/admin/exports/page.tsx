"use client";

import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { SETTINGS_JURISDICTIONS_EXPORT_EXCEL_ENDPOINT } from "@/constant/api-endpoints";

export default function ExportsPage() {
	const { data: session } = useSession();
	const [isDownloading, setIsDownloading] = useState(false);

	const handleDownloadJurisdictions = async () => {
		if (!session?.user?.accessToken) {
			toast.error("No hay sesión activa");
			return;
		}

		setIsDownloading(true);

		try {
			const response = await fetch(
				SETTINGS_JURISDICTIONS_EXPORT_EXCEL_ENDPOINT,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Error al descargar el archivo");
			}

			// Obtener el blob del archivo
			const blob = await response.blob();

			// Crear un enlace temporal para descargar el archivo
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;

			// Obtener el nombre del archivo del header o usar uno por defecto
			const contentDisposition = response.headers.get("Content-Disposition");
			const filename = contentDisposition
				? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
				: `jurisdicciones_${new Date().toISOString().split("T")[0]}.xlsx`;

			link.download = filename;
			document.body.appendChild(link);
			link.click();

			// Limpiar
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error al descargar jurisdicciones:", error);
			toast.error("Error al descargar el archivo. Por favor intente nuevamente.");
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<div className="container mx-auto p-6 max-w-5xl">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
					Exportaciones
				</h1>
				<p className="text-gray-600 dark:text-gray-400 mt-2">
					Descargue reportes y datos del sistema en formato Excel
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Card de Jurisdicciones */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<div className="flex items-start gap-4">
						<div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
							<FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
						</div>
						<div className="flex-1">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Jurisdicciones y Oficinas Judiciales
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
								Descargue un archivo Excel con todas las jurisdicciones y sus
								oficinas judiciales asociadas incluyendo fueros, juzgados,
								secretarías y datos completos.
							</p>
							<button
								onClick={handleDownloadJurisdictions}
								disabled={isDownloading}
								className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
							>
								{isDownloading ? (
									<>
										<Loader2 size={18} className="animate-spin" />
										Descargando...
									</>
								) : (
									<>
										<Download size={18} />
										Descargar Excel
									</>
								)}
							</button>
						</div>
					</div>
				</div>

				{/* Placeholder para futuras exportaciones */}
				<div className="bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 flex items-center justify-center">
					<div className="text-center">
						<FileSpreadsheet
							className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3"
							strokeWidth={1.5}
						/>
						<p className="text-gray-500 dark:text-gray-500 text-sm">
							Más exportaciones próximamente
						</p>
					</div>
				</div>
			</div>

			{/* Información adicional */}
			<div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
				<h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
					Información sobre las exportaciones
				</h4>
				<ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
					<li>Los archivos se descargan en formato Excel (.xlsx)</li>
					<li>Los datos son extraídos en tiempo real de la base de datos</li>
					<li>
						Las exportaciones incluyen todos los registros sin límite de
						paginación
					</li>
					<li>
						El nombre del archivo incluye la fecha de generación para fácil
						identificación
					</li>
				</ul>
			</div>
		</div>
	);
}
