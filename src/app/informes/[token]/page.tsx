"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BASE_URL } from "@/constant/api-endpoints";

interface InformeData {
	fileName: string;
	fileType: string;
	fileSize: number;
	description: string | null;
	caseNumber: string | null;
	customerName: string | null;
	uploadedAt: string;
}

export default function InformePublicPage() {
	const { token } = useParams<{ token: string }>();
	const [informe, setInforme] = useState<InformeData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const downloadUrl = `${BASE_URL}/public/descargas/${token}`;

	useEffect(() => {
		const fetchInforme = async () => {
			try {
				const res = await fetch(`${BASE_URL}/public/informes/${token}`);
				if (!res.ok) throw new Error("Not found");
				const json = await res.json();
				setInforme(json.data);
			} catch {
				setError(true);
			} finally {
				setLoading(false);
			}
		};
		if (token) fetchInforme();
	}, [token]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="h-8 w-8 animate-spin text-[#09a4b5]" />
			</div>
		);
	}

	if (error || !informe) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center max-w-md px-6">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
						<FileText className="h-8 w-8 text-red-500" />
					</div>
					<h1 className="text-xl font-bold text-gray-800 mb-2">
						Informe no encontrado
					</h1>
					<p className="text-gray-500 text-sm">
						El enlace puede haber expirado o el informe ya no está disponible.
						Contacte a su abogado para más información.
					</p>
				</div>
			</div>
		);
	}

	const fileSizeFormatted = informe.fileSize
		? `${(informe.fileSize / 1024).toFixed(0)} KB`
		: "";

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-6">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="/images/logo/logo-print.png"
						alt="Legalistas"
						className="h-10 mx-auto mb-4"
					/>
				</div>

				{/* Card */}
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="bg-gradient-to-br from-[#09a4b5] to-[#0bbfcf] px-6 py-5 text-center text-white">
						<FileText className="h-10 w-10 mx-auto mb-2 opacity-90" />
						<h1 className="text-lg font-bold">Informe Trimestral</h1>
						<p className="text-sm text-white/80 mt-1">
							Estado de su reclamo
						</p>
					</div>

					<div className="p-6 space-y-4">
						{informe.customerName && (
							<p className="text-sm text-gray-700 text-center font-medium">
								{informe.customerName}
								{informe.caseNumber && (
									<span className="text-gray-400 font-normal">
										{" "}&middot; Caso #{informe.caseNumber}
									</span>
								)}
							</p>
						)}

						<p className="text-sm text-gray-600 text-center">
							Su informe trimestral está listo para descargar.
						</p>

						{fileSizeFormatted && (
							<p className="text-xs text-gray-400 text-center">
								PDF &middot; {fileSizeFormatted}
							</p>
						)}

						<a
							href={downloadUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center gap-2 w-full bg-[#09a4b5] hover:bg-[#078a99] text-white font-medium py-3 px-4 rounded-xl transition-colors"
						>
							<Download className="h-5 w-5" />
							Descargar Informe PDF
						</a>
					</div>
				</div>

				{/* Footer */}
				<p className="text-center text-xs text-gray-400 mt-6">
					Legalistas &middot; Gestión legal inteligente
				</p>
			</div>
		</div>
	);
}
