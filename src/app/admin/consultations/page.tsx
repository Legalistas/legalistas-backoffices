"use client";

import {
	Ban,
	CheckCircle,
	Clock,
	Eye,
	FolderOpen,
	Mail,
	MessageSquare,
	RefreshCw,
	Terminal,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useState } from "react";
import { ConsultationFilters } from "@/components/consultation-filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/Pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	CASES_CONSULTATIONS_GET_ALL_ENDPOINT,
	CASES_CONSULTATIONS_MARK_ALL_READ_ENDPOINT,
} from "@/constant/api-endpoints";
import type { CaseConsultations } from "@/types/cases";

interface ConsultationsPageProps {
	searchParams: Promise<{
		status?: string;
		search?: string;
		page?: string;
	}>;
}

interface PaginationMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

interface ApiResponse {
	data: CaseConsultations[];
	meta: PaginationMeta;
}

export default function ConsultationsPage({
	searchParams,
}: ConsultationsPageProps) {
	const { data: session } = useSession();
	const [consultations, setConsultations] = useState<CaseConsultations[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pagination, setPagination] = useState<PaginationMeta>({
		total: 0,
		page: 1,
		limit: 10,
		totalPages: 1,
	});

	// Unwrap searchParams using React.use()
	const resolvedSearchParams = React.use(searchParams);

	const fetchConsultations = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			// Build query string from searchParams
			const url = new URL(
				CASES_CONSULTATIONS_GET_ALL_ENDPOINT,
				window.location.origin,
			);

			if (resolvedSearchParams) {
				Object.entries(resolvedSearchParams).forEach(([key, value]) => {
					if (value !== undefined && value !== "") {
						url.searchParams.append(key, value);
					}
				});
			}

			// Add default pagination if not present
			if (!url.searchParams.has("page")) {
				url.searchParams.append("page", "1");
			}
			if (!url.searchParams.has("limit")) {
				url.searchParams.append("limit", "10");
			}

			const response = await fetch(url.toString(), {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				method: "GET",
			});

			if (!response.ok) {
				throw new Error("Error fetching consultations");
			}

			const apiResponse: ApiResponse = await response.json();
			setConsultations(apiResponse.data);
			setPagination(apiResponse.meta);
		} catch (error) {
			console.error("Failed to fetch consultations:", error);
			setError(
				"No se pudieron cargar los datos de consultas. Por favor, asegúrate de que la API esté funcionando en http://localhost:5000.",
			);
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, resolvedSearchParams]);

	const handleMarkAllAsRead = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(CASES_CONSULTATIONS_MARK_ALL_READ_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error("Error marking all as read");
			}

			const result = await response.json();

			// Actualizar el estado local para reflejar que todas están leídas
			setConsultations((prev) =>
				prev.map((consultation) => ({
					...consultation,
					unreadMessages: 0,
				})),
			);

			console.log("Todas las consultas marcadas como leídas:", result.message);
		} catch (error) {
			console.error("Error marking all as read:", error);
			setError("No se pudieron marcar todas las consultas como leídas.");
		} finally {
			setLoading(false);
		}
	};

	const onPageChange = (page: number) => {
		// Update URL with new page
		const params = new URLSearchParams(window.location.search);
		params.set("page", page.toString());
		window.history.pushState({}, "", `${window.location.pathname}?${params}`);

		// Trigger re-fetch
		fetchConsultations();
	};

	useEffect(() => {
		if (session?.user?.accessToken) {
			fetchConsultations();
		}
	}, [session?.user?.accessToken, fetchConsultations]);

	const getStatusBadgeVariant = (status: CaseConsultations["status"]) => {
		switch (status) {
			case "PENDING":
				return "warning";
			case "OPEN":
				return "success";
			case "CLOSED":
				return "error";
			default:
				return "info";
		}
	};

	const getStatusText = (status: CaseConsultations["status"]) => {
		switch (status) {
			case "PENDING":
				return "pendiente";
			case "OPEN":
				return "abierta";
			case "CLOSED":
				return "cerrada";
			default:
				return "desconocida";
		}
	};

	const dateFormatOptions: Intl.DateTimeFormatOptions = {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	};

	return (
		<div>
			<div className="flex flex-col gap-6 mb-2">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold tracking-tight">
						Gestor de Consultas
					</h1>
					<div className="flex items-center gap-2">
						<Button
							onClick={fetchConsultations}
							disabled={loading}
							variant="outline"
						>
							<RefreshCw
								className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
							/>
							Actualizar
						</Button>
						<Button
							onClick={handleMarkAllAsRead}
							variant="outline"
							disabled={loading}
						>
							<CheckCircle className="h-4 w-4 mr-2" />
							Marcar todas como leídas
						</Button>
					</div>
				</div>

				{/* Filters Section */}
				<ConsultationFilters />

				{/* Loading State */}
				{loading && (
					<div className="flex items-center justify-center py-8">
						<div className="flex items-center gap-2 text-gray-600">
							<RefreshCw className="h-5 w-5 animate-spin" />
							<span>Cargando consultas...</span>
						</div>
					</div>
				)}

				{error && (
					<Alert variant="destructive" className="mb-4">
						<Terminal className="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{/* Consultations Table */}
				{!loading && !error && (
					<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
						<div className="w-full overflow-x-auto">
							<Table className="w-full min-w-[800px]">
								<TableHeader className="bg-gray-50">
									<TableRow>
										<TableCell
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Título de la Consulta
										</TableCell>
										<TableCell
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Caso Asociado
										</TableCell>
										<TableCell
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Último Mensaje
										</TableCell>
										<TableCell
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Estado
										</TableCell>
										<TableCell
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Fecha de Creación
										</TableCell>
										<TableCell
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Sin Leer
										</TableCell>
										<TableCell
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Acciones
										</TableCell>
									</TableRow>
								</TableHeader>
								<TableBody>
									{consultations.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={7}
												className="h-24 text-center text-muted-foreground"
											>
												No se encontraron consultas.
											</TableCell>
										</TableRow>
									) : (
										consultations.map((consultation) => (
											<TableRow
												key={consultation.id}
												className="hover:bg-gray-50 transition-colors "
											>
												<TableCell className="px-6 py-4 font-medium">
													<div className="flex items-center gap-2">
														<MessageSquare className="h-4 w-4 text-muted-foreground" />
														<span className="line-clamp-1">
															{consultation.title}
														</span>
													</div>
												</TableCell>
												<TableCell className="px-6 py-4">
													<div className="flex items-center gap-2">
														<FolderOpen className="h-4 w-4 text-muted-foreground" />
														<span className="line-clamp-1">
															{consultation.cases?.title || "N/A"}
														</span>
													</div>
												</TableCell>
												<TableCell className="px-6 py-4 text-muted-foreground">
													<p className="line-clamp-2">
														{consultation.lastMessagePreview ||
															"No hay mensajes"}
													</p>
												</TableCell>
												<TableCell className="px-6 py-4">
													<Badge
														variant="secondary"
														className="capitalize"
													>
														{getStatusText(consultation.status)}
													</Badge>
												</TableCell>
												<TableCell className="px-6 py-4 text-muted-foreground">
													<div className="flex items-center gap-1">
														<Clock className="h-4 w-4" />
														{new Date(
															consultation.createdAt,
														).toLocaleDateString("es-ES", dateFormatOptions)}
													</div>
												</TableCell>
												<TableCell className="px-6 py-4 text-center">
													{consultation.unreadMessages > 0 ? (
														<div className="flex items-center justify-center gap-1 text-amber-600 font-medium">
															<Mail className="h-4 w-4" />
															{consultation.unreadMessages}
														</div>
													) : (
														<span className="text-muted-foreground">0</span>
													)}
												</TableCell>
												<TableCell className="px-6 py-4 text-right">
													<Link
														href={`/admin/consultations/${consultation.id}`}
													>
														<Button
															variant="ghost"
															size="icon"
															aria-label={`Ver consulta ${consultation.title}`}
														>
															<Eye className="h-4 w-4" />
														</Button>
													</Link>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>

						{/* Pagination */}
						{pagination.totalPages > 1 && (
							<div className="px-6 py-4">
								<Pagination
									currentPage={pagination.page}
									totalPages={pagination.totalPages}
									totalItems={pagination.total}
									itemsPerPage={pagination.limit}
									onPageChange={onPageChange}
								/>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
