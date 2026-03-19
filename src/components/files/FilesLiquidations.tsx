"use client";

import { Calculator, Clock, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/constant/api-endpoints";

interface Liquidation {
	id: number;
	fileName: string;
	uploadedAt: string;
	description: string;
	uploadedBy: {
		id: number;
		name: string;
	};
}

interface FilesLiquidationsProps {
	caseId: number;
	fileId: number;
}

export default function FilesLiquidations({
	caseId,
	fileId,
}: FilesLiquidationsProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
	const [loading, setLoading] = useState(true);
	const [generatingPDF, setGeneratingPDF] = useState<number | null>(null);

	useEffect(() => {
		fetchLiquidations();

		// Escuchar cuando la página vuelve a estar visible (cuando el usuario regresa)
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				fetchLiquidations();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [caseId, session]);

	const fetchLiquidations = async () => {
		if (!session?.user?.accessToken) return;

		try {
			const response = await fetch(
				`${API_BASE_URL}/lrt/liquidations/${caseId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				setLiquidations([]);
				return;
			}

			const result = await response.json();
			setLiquidations(result.liquidations || []);
		} catch (error) {
			console.error("Error al cargar liquidaciones:", error);
			setLiquidations([]);
		} finally {
			setLoading(false);
		}
	};

	const handleGeneratePDF = async (liquidationId: number) => {
		if (!session?.user?.accessToken) return;

		setGeneratingPDF(liquidationId);
		try {
			// Obtener los datos de la liquidación
			const response = await fetch(
				`${API_BASE_URL}/lrt/liquidation/${liquidationId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			if (!response.ok) throw new Error("Error al cargar liquidación");

			const result = await response.json();
			const data = result.liquidation.calculationData;

			// Llamar al endpoint de generación de PDF
			const pdfResponse = await fetch("/api/generate-lrt-pdf", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!pdfResponse.ok) throw new Error("Error al generar PDF");

			// Descargar el PDF
			const blob = await pdfResponse.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Liquidacion_LRT_${data.cliente}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Error al generar PDF:", error);
			toast.error("Error al generar el PDF");
		} finally {
			setGeneratingPDF(null);
		}
	};

	const handleCalculate = () => {
		router.push(
			`/admin/calculator/accidents-work?caseId=${caseId}&fileId=${fileId}`,
		);
	};

	if (loading) {
		return (
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<FileText className="text-blue-600" size={20} />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Liquidaciones LRT
					</h3>
				</div>
				<button
					onClick={handleCalculate}
					className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
				>
					<Calculator size={16} />
					{liquidations.length > 0 ? "Volver a Calcular" : "Calcular"}
				</button>
			</div>

			{liquidations.length === 0 ? (
				<div className="text-center py-8">
					<FileText className="mx-auto text-gray-400 mb-3" size={48} />
					<p className="text-gray-500 dark:text-gray-400 mb-4">
						No hay liquidaciones guardadas para este expediente
					</p>
					<button
						onClick={handleCalculate}
						className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
					>
						<Calculator size={16} />
						Calcular Liquidación LRT
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{liquidations.map((liq) => {
						const data = liq.description.match(/Cliente: (.+)$/);
						const clientName = data ? data[1] : "Cliente";

						return (
							<div
								key={liq.id}
								className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<h4 className="font-medium text-gray-900 dark:text-white">
											{liq.description}
										</h4>
										<div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
											<span className="flex items-center gap-1">
												<Clock size={14} />
												{new Date(liq.uploadedAt).toLocaleDateString("es-AR", {
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
											{liq.uploadedBy && (
												<span>Por: {liq.uploadedBy.name}</span>
											)}
										</div>
									</div>
									<button
										onClick={() => handleGeneratePDF(liq.id)}
										disabled={generatingPDF === liq.id}
										className="ml-4 flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
									>
										{generatingPDF === liq.id ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
												Generando...
											</>
										) : (
											<>
												<Download size={16} />
												PDF
											</>
										)}
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
