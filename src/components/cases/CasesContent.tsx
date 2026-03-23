"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
	CASES_ENDPOINT,
	CASES_NOTES_CREATE_ENDPOINT,
	LAWYERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { getServiceName, getStatusName } from "@/lib/functions";
import { Role } from "@/constant/user";
import type { Cases } from "@/types/cases";
import { DataNotFound } from "../common/DataNotFound";
import { Pagination } from "@/components/shared/Pagination";
import { CasesFilters } from "./CasesFilters";
import { CasesHeader } from "./CasesHeader";
import { CasesKanbanView } from "./CasesKanbanView";
import { CasesListView } from "./CasesListView";

interface LawyerOption {
	id: string;
	value: string;
	label: string;
}

interface ApiResponse {
	data: Cases[];
	meta: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export default function CasesContent() {
	const { data: session } = useSession();
	const [cases, setCases] = useState<Cases[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 10,
		total: 0,
		totalPages: 0,
	});
	const [hasSearched, setHasSearched] = useState(false);
	const [selectedService, setSelectedService] = useState<number | undefined>(
		undefined,
	);
	const [selectedStage, setSelectedStage] = useState<number | undefined>(
		undefined,
	);
	const [selectedRepresentativeLawyer, setSelectedRepresentativeLawyer] =
		useState<string[]>([]);
	const [selectedInternalLawyer, setSelectedInternalLawyer] = useState<
		string[]
	>([]);
	const [dateFrom, setDateFrom] = useState<string>("");
	const [dateTo, setDateTo] = useState<string>("");
	const [showArchivedOnly, setShowArchivedOnly] = useState(false); // Renamed state
	const [showAll, setShowAll] = useState(false); // Mostrar todos los casos sin filtro de etapa

	// Lawyer states
	const [responsibleLawyerTypes, setResponsibleLawyerTypes] = useState<
		LawyerOption[]
	>([]);
	const [lawyerInternalTypes, setLawyerInternalTypes] = useState<
		LawyerOption[]
	>([]);

	// Use refs to track if this is the initial render
	const isInitialRender = useRef(true);
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const hasLoadedFromStorage = useRef(false); // Nuevo ref para tracking

	const router = useRouter();
	const searchParams = useSearchParams();

	// Nuevas funciones para persistencia en localStorage
	const saveFiltersToStorage = useCallback(
		(filters: {
			searchTerm: string;
			selectedService?: number;
			selectedStage?: number;
			selectedRepresentativeLawyer: string[];
			selectedInternalLawyer: string[];
			dateFrom: string;
			dateTo: string;
			showArchivedOnly: boolean;
			showAll: boolean;
			currentPage: number;
		}) => {
			try {
				const filtersToSave = {
					...filters,
					showAll: filters.showAll ?? false,
					timestamp: Date.now(), // Agregar timestamp para validación
				};
				localStorage.setItem("casesFilters", JSON.stringify(filtersToSave));
			} catch (error) {
				console.warn(
					"No se pudieron guardar los filtros en localStorage:",
					error,
				);
			}
		},
		[],
	);

	const loadFiltersFromStorage = useCallback(() => {
		try {
			const stored = localStorage.getItem("casesFilters");
			if (stored) {
				const parsed = JSON.parse(stored);
				// Verificar que los datos no sean muy antiguos (ej: más de 24 horas)
				const isRecent =
					parsed.timestamp &&
					Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
				if (isRecent) {
					return parsed;
				}
			}
		} catch (error) {
			console.warn(
				"No se pudieron cargar los filtros desde localStorage:",
				error,
			);
		}
		return null;
	}, []);

	// Función para aplicar filtros desde storage o URL
	const applyFiltersFromSource = useCallback(
		(source: "storage" | "url") => {
			let filters = null;

			if (source === "storage") {
				filters = loadFiltersFromStorage();
			}

			if (!filters) {
				// Cargar desde URL como respaldo
				filters = {
					searchTerm: searchParams.get("search") || "",
					selectedService: searchParams.get("service")
						? Number.parseInt(searchParams.get("service")!)
						: undefined,
					selectedStage: searchParams.get("stage")
						? Number.parseInt(searchParams.get("stage")!)
						: undefined,
					currentPage: searchParams.get("page")
						? Number.parseInt(searchParams.get("page")!)
						: 1,
					selectedRepresentativeLawyer: searchParams.get("repLawyers")
						? searchParams.get("repLawyers")!.split(",").filter(Boolean)
						: [],
					selectedInternalLawyer: searchParams.get("intLawyers")
						? searchParams.get("intLawyers")!.split(",").filter(Boolean)
						: [],
					dateFrom: searchParams.get("dateFrom") || "",
					dateTo: searchParams.get("dateTo") || "",
					showArchivedOnly: searchParams.get("showArchivedOnly") === "true",
					showAll: searchParams.get("showAll") === "true",
				};
			}

			if (filters) {
				// Validar que los IDs de abogados existan
				const validRepLawyers =
					filters.selectedRepresentativeLawyer?.filter((id: string) =>
						responsibleLawyerTypes.some((lawyer) => lawyer.value === id),
					) || [];
				const validIntLawyers =
					filters.selectedInternalLawyer?.filter((id: string) =>
						lawyerInternalTypes.some((lawyer) => lawyer.value === id),
					) || [];

				// Aplicar filtros al estado
				setSearchTerm(filters.searchTerm || "");
				setSelectedService(filters.selectedService);
				setSelectedStage(filters.selectedStage);
				setCurrentPage(filters.currentPage || 1);
				setSelectedRepresentativeLawyer(validRepLawyers);
				setSelectedInternalLawyer(validIntLawyers);
				setDateFrom(filters.dateFrom || "");
				setDateTo(filters.dateTo || "");
				setShowArchivedOnly(filters.showArchivedOnly || false);
				setShowAll(filters.showAll || false);

				return filters;
			}
			return null;
		},
		[
			searchParams,
			responsibleLawyerTypes,
			lawyerInternalTypes,
			loadFiltersFromStorage,
		],
	);

	// Fetch lawyers data
	useEffect(() => {
		const fetchLawyers = async () => {
			try {
				const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Error: ${response.status} ${response.statusText}`);
				}

				const { data } = await response.json();

				const responsibleLawyerRoles = [
					Role.DIRECTOR_GENERAL_CEO,
					Role.GERENTE_GENERAL_COO,
					Role.DIRECTORA_AREA_LEGAL,
					Role.COORDINADOR_LEGAL,
					Role.ABOGADO_REPRESENTANTE,
				];

				// Responsible Lawyers
				const filteredResponsibleLawyers = data.filter((user: any) =>
					user.roleUser.some((ru: any) =>
						responsibleLawyerRoles.includes(ru.role.name),
					),
				);

				const responsibleLawyers = filteredResponsibleLawyers.map(
					(user: any) => ({
						id: user.id.toString(),
						value: user.id.toString(),
						label: user.name,
					}),
				);

				// Filter and map in separate steps to avoid TypeScript errors
				// Internal Lawyers
				const filteredInternalLawyers = data.filter((user: any) =>
					user.roleUser.some(
						(ru: any) =>
							ru.role.name === Role.ASISTENTE_LEGAL ||
							ru.role.name === Role.GERENTE_GENERAL_COO,
					),
				);

				const internalLawyers = filteredInternalLawyers.map((user: any) => ({
					id: user.id.toString(),
					value: user.id.toString(),
					label: user.name,
				}));

				setLawyerInternalTypes(internalLawyers);
				setResponsibleLawyerTypes(responsibleLawyers);
			} catch (error) {
				console.error("Error fetching lawyers:", error);
				setLawyerInternalTypes([]);
				setResponsibleLawyerTypes([]);
			}
		};

		if (session?.user?.accessToken) {
			fetchLawyers();
		}
	}, [session?.user?.accessToken]);

	// Format date for API
	const formatDateForApi = useCallback((dateString: string) => {
		if (!dateString) return undefined;
		const date = new Date(dateString);
		return date.toISOString().split("T")[0];
	}, []);

	// Memoize the fetch function to prevent unnecessary recreations
	const fetchCases = useCallback(
		async (
			page: number,
			search: string,
			serviceId?: number,
			stageId?: number,
			fromDate?: string,
			toDate?: string,
			representativeLawyerIds?: string[],
			internalLawyerIds?: string[],
			showArchivedCasesOnly?: boolean, // Updated parameter name
			showAllCases?: boolean,
			isKanbanMode?: boolean,
		) => {
			try {
				setIsLoading(true);
				const url = new URL(`${CASES_ENDPOINT}`, window.location.origin);
				url.searchParams.append("page", isKanbanMode ? "1" : page.toString());
				url.searchParams.append("limit", isKanbanMode ? "1000" : "10");

				if (search) {
					url.searchParams.append("search", search);
					setHasSearched(true);
				} else {
					setHasSearched(false);
				}

				if (serviceId !== undefined) {
					url.searchParams.append("servicesId", serviceId.toString());
				}

				if (stageId !== undefined) {
					// Etapa específica del dropdown siempre tiene prioridad
					url.searchParams.append("stageId", stageId.toString());
				} else if (showArchivedCasesOnly) {
					// Archivados: solo stageId 7
					url.searchParams.append("stageId", "7");
				} else if (showAllCases) {
					// Mostrar todos: sin filtro de etapa
				} else {
					// Por defecto: excluir archivados (stageId 7)
					url.searchParams.append("excludeStageId", "7");
				}

				// Debug logs
				console.log(
					"Frontend - Representative Lawyer IDs:",
					representativeLawyerIds,
				);
				console.log("Frontend - Internal Lawyer IDs:", internalLawyerIds);

				// Fix: Handle both arrays and ensure they exist and have values
				if (representativeLawyerIds && representativeLawyerIds.length > 0) {
					// Ensure it's an array
					const repIds = Array.isArray(representativeLawyerIds)
						? representativeLawyerIds
						: [representativeLawyerIds];
					repIds.forEach((id) => {
						if (id) {
							url.searchParams.append("representativeLawyerId", id.toString());
							console.log("Adding representativeLawyerId:", id);
						}
					});
				}

				if (internalLawyerIds && internalLawyerIds.length > 0) {
					// Ensure it's an array
					const intIds = Array.isArray(internalLawyerIds)
						? internalLawyerIds
						: [internalLawyerIds];
					intIds.forEach((id) => {
						if (id) {
							url.searchParams.append("internalLawyerId", id.toString());
							console.log("Adding internalLawyerId:", id);
						}
					});
				}

				// Add date range parameters if they exist
				if (fromDate) {
					url.searchParams.append("fromDate", fromDate);
				}

				if (toDate) {
					url.searchParams.append("toDate", toDate);
				}

				// Si el usuario es ABOGADO_REPRESENTANTE, siempre filtrar por su propio ID
				if (
					session?.user?.role === Role.ABOGADO_REPRESENTANTE &&
					session?.user?.id
				) {
					url.searchParams.delete("representativeLawyerId");
					url.searchParams.append(
						"representativeLawyerId",
						session.user.id.toString(),
					);
				}

				// "Mis Casos": cuando showAll está OFF, filtrar por el usuario logueado
				if (!showAllCases && session?.user?.id) {
					const userId = session.user.id.toString();
					if (session.user.role === Role.ASISTENTE_LEGAL) {
						url.searchParams.delete("internalLawyerId");
						url.searchParams.append("internalLawyerId", userId);
					} else if (session.user.role !== Role.ABOGADO_REPRESENTANTE) {
						// Admin, Director, Coordinador, etc: filtrar como responsable o interno
						url.searchParams.delete("lawyerId");
						url.searchParams.append("lawyerId", userId);
					}
				}

				console.log("Final URL:", url.toString());

				const response = await fetch(url.toString(), {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});

				if (!response.ok) {
					const errorData = await response.json();
					console.error("Error response:", errorData);
					throw new Error(errorData.message || "Failed to fetch cases");
				}

				const result: ApiResponse = await response.json();
				setCases(result.data);

				// 🔧 SOLUCIÓN TEMPORAL: Corregir metadatos incorrectos del backend
				const correctedPagination = {
					page: result.meta.page || page,
					limit: result.meta.limit || 10,
					total: result.meta.total,
					totalPages: result.meta.totalPages,
				};

				// Si los metadatos están mal (total = 0 pero hay datos), hacer una estimación
				if (correctedPagination.total === 0 && result.data.length > 0) {
					console.warn(
						"⚠️ Backend devolvió metadatos incorrectos. Usando estimación temporal.",
					);

					// Si tenemos datos completos en la página actual, probablemente hay más páginas
					if (result.data.length === correctedPagination.limit) {
						// Estimación conservadora: al menos hay una página más
						correctedPagination.total = page * correctedPagination.limit + 1;
						correctedPagination.totalPages = page + 1;
					} else {
						// Esta es probablemente la última página
						correctedPagination.total =
							(page - 1) * correctedPagination.limit + result.data.length;
						correctedPagination.totalPages = page;
					}
				}

				setPagination(correctedPagination);

				console.log("📊 Pagination state:", correctedPagination);
			} catch (error) {
				console.error("Error al cargar los casos:", error);
				toast.error(`Error al cargar los casos: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[session?.user?.accessToken, session?.user?.role, session?.user?.id],
	);

	// ──────────────────────────────────────────────────────────
	// Exportar a Excel
	// ──────────────────────────────────────────────────────────
	const handleExportExcel = useCallback(async () => {
		try {
			toast.info("Preparando exportación...");
			const url = new URL(`${CASES_ENDPOINT}`, window.location.origin);
			url.searchParams.append("page", "1");
			url.searchParams.append("limit", "9999");

			if (searchTerm) url.searchParams.append("search", searchTerm);
			if (selectedService !== undefined)
				url.searchParams.append("servicesId", selectedService.toString());

			if (selectedStage !== undefined) {
				url.searchParams.append("stageId", selectedStage.toString());
			} else if (showArchivedOnly) {
				url.searchParams.append("stageId", "7");
			} else if (showAll) {
				// Sin filtro de etapa
			} else {
				url.searchParams.append("excludeStageId", "7");
			}

			selectedRepresentativeLawyer.forEach((id) =>
				url.searchParams.append("representativeLawyerId", id),
			);
			selectedInternalLawyer.forEach((id) =>
				url.searchParams.append("internalLawyerId", id),
			);

			const fromDateApi = formatDateForApi(dateFrom);
			const toDateApi = formatDateForApi(dateTo);
			if (fromDateApi) url.searchParams.append("fromDate", fromDateApi);
			if (toDateApi) url.searchParams.append("toDate", toDateApi);

			if (
				session?.user?.role === Role.ABOGADO_REPRESENTANTE &&
				session?.user?.id
			) {
				url.searchParams.delete("representativeLawyerId");
				url.searchParams.append(
					"representativeLawyerId",
					session.user.id.toString(),
				);
			}

			if (
				session?.user?.role === Role.ASISTENTE_LEGAL &&
				session?.user?.id &&
				!showAll
			) {
				url.searchParams.delete("internalLawyerId");
				url.searchParams.append("internalLawyerId", session.user.id.toString());
			}

			const response = await fetch(url.toString(), {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) throw new Error("Error al obtener datos para exportar");

			const result: ApiResponse = await response.json();
			const data = result.data;

			if (!data || data.length === 0) {
				toast.warning("No hay casos para exportar con los filtros actuales");
				return;
			}

			// Helper para obtener la última nota
			const getLastNote = (c: Cases) => {
				if (!c.notes || c.notes.length === 0) return "";
				const sorted = [...c.notes].sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
				const raw = sorted[0].note || "";
				return raw.replace(/<[^>]*>/g, "").trim();
			};

			// Crear workbook con ExcelJS
			const workbook = new ExcelJS.Workbook();
			workbook.creator = "Legalistas";
			workbook.created = new Date();
			const worksheet = workbook.addWorksheet("Casos", {
				properties: { defaultRowHeight: 22 },
			});

			// Cargar logo
			let logoId: number | null = null;
			try {
				const logoResponse = await fetch("/images/logo/logo-print.png");
				const logoBlob = await logoResponse.blob();
				const logoBuffer = await logoBlob.arrayBuffer();
				logoId = workbook.addImage({
					buffer: logoBuffer,
					extension: "png",
				});
			} catch {
				console.warn("No se pudo cargar el logo para el Excel");
			}

			// Encabezado con logo
			worksheet.mergeCells("A1:J1");
			worksheet.mergeCells("A2:J2");
			worksheet.mergeCells("A3:J3");

			const titleCell = worksheet.getCell("A1");
			titleCell.value = "LEGALISTAS - Gestor de Casos";
			titleCell.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF1A365D" } };
			titleCell.alignment = { horizontal: "center", vertical: "middle" };
			worksheet.getRow(1).height = 40;

			const subtitleCell = worksheet.getCell("A2");
			subtitleCell.value = `Reporte generado el ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}`;
			subtitleCell.font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF718096" } };
			subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
			worksheet.getRow(2).height = 22;

			const countCell = worksheet.getCell("A3");
			countCell.value = `Total de casos: ${data.length}`;
			countCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF2D3748" } };
			countCell.alignment = { horizontal: "center", vertical: "middle" };
			worksheet.getRow(3).height = 22;

			if (logoId !== null) {
				worksheet.addImage(logoId, {
					tl: { col: 0, row: 0 },
					ext: { width: 120, height: 35 },
				});
				titleCell.alignment = { horizontal: "center", vertical: "middle" };
			}

			// Fila vacía de separación
			worksheet.getRow(4).height = 10;

			// Columnas
			const columns = [
				{ header: "N° Caso", key: "number", width: 12 },
				{ header: "Título", key: "title", width: 30 },
				{ header: "Servicio", key: "service", width: 20 },
				{ header: "Etapa", key: "stage", width: 16 },
				{ header: "Nota", key: "note", width: 35 },
				{ header: "Abog. Responsable", key: "responsibleLawyer", width: 22 },
				{ header: "Abog. Interno", key: "internalLawyer", width: 22 },
				{ header: "Teléfono", key: "phone", width: 18 },
				{ header: "Email", key: "email", width: 28 },
				{ header: "Fecha de Creación", key: "createdAt", width: 18 },
			];

			// Fila de encabezados (fila 5)
			const headerRow = worksheet.getRow(5);
			columns.forEach((col, i) => {
				const cell = headerRow.getCell(i + 1);
				cell.value = col.header;
				cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FF09A4B5" },
				};
				cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
				cell.border = {
					top: { style: "thin", color: { argb: "FF1A365D" } },
					bottom: { style: "thin", color: { argb: "FF1A365D" } },
					left: { style: "thin", color: { argb: "FFE2E8F0" } },
					right: { style: "thin", color: { argb: "FFE2E8F0" } },
				};
			});
			headerRow.height = 28;

			// Establecer anchos de columna
			columns.forEach((col, i) => {
				worksheet.getColumn(i + 1).width = col.width;
			});

			// Filas de datos
			data.forEach((c, rowIndex) => {
				const row = worksheet.getRow(6 + rowIndex);
				const values = [
					c.number ?? "",
					c.title ?? "",
					c.servicesId !== undefined ? getServiceName(Number(c.servicesId)) : "",
					c.stageId !== undefined ? getStatusName(Number(c.stageId)) : "",
					getLastNote(c),
					c.responsibleLawyer?.name ?? "Sin asignar",
					c.internalLawyer?.name ?? "Sin asignar",
					c.customer?.userProfile?.phone ?? "",
					c.customer?.email ?? "",
					c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-AR") : "",
				];

				values.forEach((val, i) => {
					const cell = row.getCell(i + 1);
					cell.value = val;
					cell.font = { name: "Calibri", size: 10, color: { argb: "FF2D3748" } };
					cell.alignment = { vertical: "middle", wrapText: true };
					cell.border = {
						bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
						left: { style: "thin", color: { argb: "FFE2E8F0" } },
						right: { style: "thin", color: { argb: "FFE2E8F0" } },
					};
				});

				// Alternar colores de fila
				const bgColor = rowIndex % 2 === 0 ? "FFF7FAFC" : "FFFFFFFF";
				row.eachCell({ includeEmpty: true }, (cell) => {
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: bgColor },
					};
				});

				row.height = 22;
			});

			// Generar y descargar archivo
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			saveAs(blob, `casos_${new Date().toISOString().split("T")[0]}.xlsx`);
			toast.success(`Exportación completada: ${data.length} casos`);
		} catch (error) {
			console.error("Error al exportar:", error);
			toast.error("Error al exportar los casos");
		}
	}, [
		session?.user?.accessToken,
		session?.user?.role,
		session?.user?.id,
		searchTerm,
		selectedService,
		selectedStage,
		selectedRepresentativeLawyer,
		selectedInternalLawyer,
		dateFrom,
		dateTo,
		showArchivedOnly,
		showAll,
		formatDateForApi,
	]);

	// Load view mode preference once on component mount
	useEffect(() => {
		const savedViewMode = localStorage.getItem("casosViewMode");
		if (savedViewMode === "list" || savedViewMode === "kanban") {
			setViewMode(savedViewMode as "list" | "kanban");
		}
	}, []);

	// Save view mode preference
	const handleViewModeChange = useCallback((mode: "list" | "kanban") => {
		setViewMode(mode);
		localStorage.setItem("casosViewMode", mode);
	}, []);

	// Wrapper for setShowAll that always triggers a fresh fetch.
	// Needed because when showAll is already false (Mis Casos) and stage changes,
	// clicking "Mis Casos" again wouldn't change state → no re-fetch via useEffect.
	// Refetch when viewMode changes
	useEffect(() => {
		if (!isInitialRender.current && hasLoadedFromStorage.current) {
			fetchCases(
				viewMode === "kanban" ? 1 : currentPage,
				searchTerm,
				selectedService,
				selectedStage,
				formatDateForApi(dateFrom),
				formatDateForApi(dateTo),
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				showArchivedOnly,
				showAll,
				viewMode === "kanban",
			);
		}
	}, [viewMode]);

	// Function to update URL with current filters
	const updateURL = useCallback(
		(filters: {
			search?: string;
			service?: number;
			stage?: number;
			page?: number;
			repLawyers?: string[];
			intLawyers?: string[];
			dateFrom?: string;
			dateTo?: string;
			showArchivedOnly?: boolean;
			showAll?: boolean;
		}) => {
			const params = new URLSearchParams();

			if (filters.search) params.set("search", filters.search);
			if (filters.service !== undefined)
				params.set("service", filters.service.toString());
			if (filters.stage !== undefined)
				params.set("stage", filters.stage.toString());
			if (filters.page !== undefined && filters.page > 1)
				params.set("page", filters.page.toString());

			if (
				filters.repLawyers &&
				Array.isArray(filters.repLawyers) &&
				filters.repLawyers.length > 0
			) {
				params.set("repLawyers", filters.repLawyers.join(","));
			}

			if (
				filters.intLawyers &&
				Array.isArray(filters.intLawyers) &&
				filters.intLawyers.length > 0
			) {
				params.set("intLawyers", filters.intLawyers.join(","));
			}

			if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
			if (filters.dateTo) params.set("dateTo", filters.dateTo);
			if (filters.showArchivedOnly) params.set("showArchivedOnly", "true");
			if (filters.showAll) params.set("showAll", "true");

			const newURL = params.toString()
				? `?${params.toString()}`
				: window.location.pathname;
			router.replace(newURL, { scroll: false });

			// Guardar también en localStorage
			saveFiltersToStorage({
				searchTerm: filters.search || "",
				selectedService: filters.service,
				selectedStage: filters.stage,
				selectedRepresentativeLawyer: filters.repLawyers || [],
				selectedInternalLawyer: filters.intLawyers || [],
				dateFrom: filters.dateFrom || "",
				dateTo: filters.dateTo || "",
				showArchivedOnly: filters.showArchivedOnly || false,
				showAll: filters.showAll || false,
				currentPage: filters.page || 1,
			});
		},
		[router, saveFiltersToStorage],
	);

	const handleSetShowAll = useCallback(
		(value: boolean) => {
			setShowAll(value);
			// Cancel any pending debounced fetch and fire immediately
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
			fetchCases(
				1,
				searchTerm,
				selectedService,
				selectedStage,
				formatDateForApi(dateFrom),
				formatDateForApi(dateTo),
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				showArchivedOnly,
				value,
				viewMode === "kanban",
			);
			setCurrentPage(1);
			updateURL({
				search: searchTerm,
				service: selectedService,
				stage: selectedStage,
				page: 1,
				repLawyers: selectedRepresentativeLawyer,
				intLawyers: selectedInternalLawyer,
				dateFrom,
				dateTo,
				showArchivedOnly,
				showAll: value,
			});
		},
		[
			fetchCases,
			searchTerm,
			selectedService,
			selectedStage,
			dateFrom,
			dateTo,
			selectedRepresentativeLawyer,
			selectedInternalLawyer,
			showArchivedOnly,
			viewMode,
			formatDateForApi,
			updateURL,
		],
	);


	// Load filters from storage or URL when lawyers data is available
	useEffect(() => {
		// Solo cargar si tenemos datos de abogados y no hemos cargado desde storage
		if (
			(responsibleLawyerTypes.length > 0 || lawyerInternalTypes.length > 0) &&
			!hasLoadedFromStorage.current
		) {
			// Intentar cargar desde localStorage primero, luego desde URL
			const appliedFilters = applyFiltersFromSource("storage");
			hasLoadedFromStorage.current = true;

			// Si cargamos filtros, actualizar la URL para mantener sincronización
			if (appliedFilters) {
				updateURL({
					search: appliedFilters.searchTerm,
					service: appliedFilters.selectedService,
					stage: appliedFilters.selectedStage,
					page: appliedFilters.currentPage,
					repLawyers: appliedFilters.selectedRepresentativeLawyer,
					intLawyers: appliedFilters.selectedInternalLawyer,
					dateFrom: appliedFilters.dateFrom,
					dateTo: appliedFilters.dateTo,
					showArchivedOnly: appliedFilters.showArchivedOnly,
				});
			}
		}
	}, [
		responsibleLawyerTypes,
		lawyerInternalTypes,
		applyFiltersFromSource,
		updateURL,
	]);

	// Initial fetch after lawyers are loaded and filters are set
	useEffect(() => {
		if (
			isInitialRender.current &&
			responsibleLawyerTypes.length > 0 &&
			lawyerInternalTypes.length > 0 &&
			hasLoadedFromStorage.current
		) {
			fetchCases(
				currentPage,
				searchTerm,
				selectedService,
				selectedStage,
				formatDateForApi(dateFrom),
				formatDateForApi(dateTo),
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				showArchivedOnly,
				showAll,
				viewMode === "kanban",
			);
			isInitialRender.current = false;
		}
	}, [
		responsibleLawyerTypes,
		lawyerInternalTypes,
		hasLoadedFromStorage,
		currentPage,
		searchTerm,
		selectedService,
		selectedStage,
		dateFrom,
		dateTo,
		selectedRepresentativeLawyer,
		selectedInternalLawyer,
		showArchivedOnly,
		fetchCases,
		formatDateForApi,
		viewMode,
	]);

	// Handle search term changes with debouncing - MEJORADO
	useEffect(() => {
		// Solo ejecutar si no es el renderizado inicial y ya hemos cargado desde storage
		if (isInitialRender.current || !hasLoadedFromStorage.current) return;

		// Clear any existing timeout
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		// Set a new timeout
		searchTimeoutRef.current = setTimeout(() => {
			// Update URL with current filters
			updateURL({
				search: searchTerm,
				service: selectedService,
				stage: selectedStage,
				page: 1, // Reset to page 1 when filters change
				repLawyers: selectedRepresentativeLawyer,
				intLawyers: selectedInternalLawyer,
				dateFrom: dateFrom,
				dateTo: dateTo,
				showArchivedOnly: showArchivedOnly,
				showAll: showAll,
			});

			fetchCases(
				1,
				searchTerm,
				selectedService,
				selectedStage,
				formatDateForApi(dateFrom),
				formatDateForApi(dateTo),
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				showArchivedOnly,
				showAll,
				viewMode === "kanban",
			);
			setCurrentPage(1); // Reset to first page when search term changes
		}, 500); // 500ms debounce

		// Cleanup function
		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, [
		searchTerm,
		selectedService,
		selectedStage,
		selectedRepresentativeLawyer,
		selectedInternalLawyer,
		dateFrom,
		dateTo,
		showArchivedOnly,
		showAll,
		updateURL,
		fetchCases,
		formatDateForApi,
	]);

	const handleClearSearch = useCallback(() => {
		setSearchTerm("");
		setSelectedService(undefined);
		setSelectedStage(undefined);
		setSelectedRepresentativeLawyer([]);
		setSelectedInternalLawyer([]);
		setHasSearched(false);
		setDateFrom("");
		setDateTo("");
		setShowArchivedOnly(false); // Reset the switch
		setShowAll(false); // Reset the show all switch
		setCurrentPage(1); // Also reset current page

		// Limpiar localStorage también
		try {
			localStorage.removeItem("casesFilters");
		} catch (error) {
			console.warn("No se pudo limpiar localStorage:", error);
		}

		// Clear URL params
		router.replace(window.location.pathname, { scroll: false });
	}, [router]);

	const handleDelete = useCallback(
		async (id: number) => {
			try {
				const response = await fetch(`${CASES_ENDPOINT}/${id}`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error("Failed to delete case");
				}

				toast.success("Caso eliminado correctamente");
				fetchCases(
					currentPage,
					searchTerm,
					selectedService,
					selectedStage,
					formatDateForApi(dateFrom),
					formatDateForApi(dateTo),
					selectedRepresentativeLawyer,
					selectedInternalLawyer,
					showArchivedOnly,
					showAll,
					viewMode === "kanban",
				);
			} catch (error) {
				console.error("Error al eliminar el caso:", error);
				toast.error("Error al eliminar el caso");
			}
		},
		[
			session?.user?.accessToken,
			currentPage,
			searchTerm,
			selectedService,
			selectedStage,
			selectedRepresentativeLawyer,
			selectedInternalLawyer,
			formatDateForApi,
			dateFrom,
			dateTo,
			showArchivedOnly,
			showAll,
			fetchCases,
			viewMode,
		],
	);

	const handleStageChange = useCallback(
		async (caseId: number, newStageId: number) => {
			try {
				const response = await fetch(`${CASES_ENDPOINT}/${caseId}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({ stageId: newStageId }),
				});

				if (!response.ok) {
					throw new Error("Failed to update stage");
				}

				toast.success("Etapa actualizada correctamente");
				fetchCases(
					currentPage,
					searchTerm,
					selectedService,
					selectedStage,
					formatDateForApi(dateFrom),
					formatDateForApi(dateTo),
					selectedRepresentativeLawyer,
					selectedInternalLawyer,
					showArchivedOnly,
					showAll,
					viewMode === "kanban",
				);
			} catch (error) {
				console.error("Error al actualizar la etapa:", error);
				toast.error("Error al actualizar la etapa");
			}
		},
		[
			session?.user?.accessToken,
			currentPage,
			searchTerm,
			selectedService,
			selectedStage,
			selectedRepresentativeLawyer,
			selectedInternalLawyer,
			formatDateForApi,
			dateFrom,
			dateTo,
			showArchivedOnly,
			showAll,
			fetchCases,
			viewMode,
		],
	);

	const handleResultChange = useCallback(
		async (caseId: number, newResult: string) => {
			try {
				const response = await fetch(`${CASES_ENDPOINT}/${caseId}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({ status: newResult }),
				});

				if (!response.ok) {
					throw new Error("Failed to update result");
				}

				toast.success("Estado actualizado correctamente");
				fetchCases(
					currentPage,
					searchTerm,
					selectedService,
					selectedStage,
					formatDateForApi(dateFrom),
					formatDateForApi(dateTo),
					selectedRepresentativeLawyer,
					selectedInternalLawyer,
					showArchivedOnly,
					showAll,
					viewMode === "kanban",
				);
			} catch (error) {
				console.error("Error al actualizar el estado:", error);
				toast.error("Error al actualizar el estado");
			}
		},
		[
			session?.user?.accessToken,
			currentPage,
			searchTerm,
			selectedService,
			selectedStage,
			selectedRepresentativeLawyer,
			selectedInternalLawyer,
			formatDateForApi,
			dateFrom,
			dateTo,
			showArchivedOnly,
			showAll,
			fetchCases,
			viewMode,
		],
	);

	const handleNoteCreate = useCallback(
		async (caseId: number, note: string) => {
			try {
				const response = await fetch(CASES_NOTES_CREATE_ENDPOINT(caseId), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({ title: "Observación", note }),
				});

				if (!response.ok) {
					throw new Error("Failed to create note");
				}

				toast.success("Observación guardada correctamente");
				fetchCases(
					currentPage,
					searchTerm,
					selectedService,
					selectedStage,
					formatDateForApi(dateFrom),
					formatDateForApi(dateTo),
					selectedRepresentativeLawyer,
					selectedInternalLawyer,
					showArchivedOnly,
					showAll,
					viewMode === "kanban",
				);
			} catch (error) {
				console.error("Error al guardar la observación:", error);
				toast.error("Error al guardar la observación");
			}
		},
		[
			session?.user?.accessToken,
			currentPage,
			searchTerm,
			selectedService,
			selectedStage,
			selectedRepresentativeLawyer,
			selectedInternalLawyer,
			formatDateForApi,
			dateFrom,
			dateTo,
			showArchivedOnly,
			showAll,
			fetchCases,
			viewMode,
		],
	);

	const handlePageChange = useCallback(
		(page: number) => {
			setCurrentPage(page);
			// Update URL with new page number
			updateURL({
				search: searchTerm,
				service: selectedService,
				stage: selectedStage,
				page: page,
				repLawyers: selectedRepresentativeLawyer,
				intLawyers: selectedInternalLawyer,
				dateFrom: dateFrom,
				dateTo: dateTo,
				showArchivedOnly: showArchivedOnly,
				showAll: showAll,
			});
			// Llamar fetchCases directamente para que el cambio de página haga la petición
			fetchCases(
				page,
				searchTerm,
				selectedService,
				selectedStage,
				formatDateForApi(dateFrom),
				formatDateForApi(dateTo),
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				showArchivedOnly,
				showAll,
				viewMode === "kanban",
			);
		},
		[
			searchTerm,
			selectedService,
			selectedStage,
			selectedRepresentativeLawyer,
			selectedInternalLawyer,
			dateFrom,
			dateTo,
			showArchivedOnly,
			showAll,
			updateURL,
			fetchCases,
			formatDateForApi,
			viewMode,
		],
	);

	// Agregar efecto para guardar filtros cuando cambien
	useEffect(() => {
		if (!isInitialRender.current && hasLoadedFromStorage.current) {
			saveFiltersToStorage({
				searchTerm,
				selectedService,
				selectedStage,
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				dateFrom,
				dateTo,
				showArchivedOnly,
				showAll,
				currentPage,
			});
		}
	}, [
		searchTerm,
		selectedService,
		selectedStage,
		selectedRepresentativeLawyer,
		selectedInternalLawyer,
		dateFrom,
		dateTo,
		showArchivedOnly,
		showAll,
		currentPage,
		saveFiltersToStorage,
	]);

	// Check if any filters are active
	const hasActiveFilters = Boolean(
		searchTerm ||
		selectedService !== undefined ||
		selectedStage !== undefined ||
		(selectedRepresentativeLawyer &&
			selectedRepresentativeLawyer.length > 0) ||
		(selectedInternalLawyer && selectedInternalLawyer.length > 0) ||
		dateFrom ||
		dateTo ||
		showArchivedOnly ||
		showAll,
	);

	// Loading state - skeleton
	if (isLoading && cases.length === 0 && !hasSearched) {
		return (
			<div>
				<div className="flex flex-col gap-6 mb-2">
					<div className="flex items-center justify-between">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-10 w-32 rounded-lg" />
					</div>
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
						<Skeleton className="h-10 w-28 rounded-lg" />
						<Skeleton className="h-10 w-10 rounded-lg" />
						<Skeleton className="h-10 w-10 rounded-lg" />
						<Skeleton className="h-10 w-36 rounded-lg" />
					</div>
				</div>
				<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
					<div className="bg-gray-50 dark:bg-white/5 px-3 py-2 flex gap-3">
						{[1, 8, 5, 5, 7, 6, 6, 4].map((w, i) => (
							<Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
						))}
					</div>
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="flex items-center gap-3 px-3 py-3 border-t border-gray-100 dark:border-gray-800">
							<Skeleton className="h-4 w-[4%]" />
							<Skeleton className="h-4 w-[16%]" />
							<Skeleton className="h-6 w-[8%] rounded-full" />
							<Skeleton className="h-7 w-[10%] rounded-lg" />
							<Skeleton className="h-4 w-[14%]" />
							<div className="flex items-center gap-1.5 w-[12%]">
								<Skeleton className="h-5 w-5 rounded-full" />
								<Skeleton className="h-4 flex-1" />
							</div>
							<div className="flex items-center gap-1.5 w-[12%]">
								<Skeleton className="h-5 w-5 rounded-full" />
								<Skeleton className="h-4 flex-1" />
							</div>
							<div className="flex gap-1 ml-auto">
								<Skeleton className="h-7 w-7 rounded-md" />
								<Skeleton className="h-7 w-7 rounded-md" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="flex flex-col gap-6 mb-2">
				<CasesHeader title="Gestor de casos" />

				<CasesFilters
					searchTerm={searchTerm}
					setSearchTerm={setSearchTerm}
					selectedService={selectedService}
					setSelectedService={setSelectedService}
					selectedStage={selectedStage}
					setSelectedStage={setSelectedStage}
					selectedRepresentativeLawyer={selectedRepresentativeLawyer}
					setSelectedRepresentativeLawyer={setSelectedRepresentativeLawyer}
					selectedInternalLawyer={selectedInternalLawyer}
					setSelectedInternalLawyer={setSelectedInternalLawyer}
					dateFrom={dateFrom}
					setDateFrom={setDateFrom}
					dateTo={dateTo}
					setDateTo={setDateTo}
					hasActiveFilters={hasActiveFilters}
					handleClearSearch={handleClearSearch}
					viewMode={viewMode}
					handleViewModeChange={handleViewModeChange}
					responsibleLawyerTypes={responsibleLawyerTypes}
					lawyerInternalTypes={lawyerInternalTypes}
					showArchivedOnly={showArchivedOnly} // Pass the updated prop
					setShowArchivedOnly={setShowArchivedOnly} // Pass the updated setter
					showAll={showAll}
					setShowAll={handleSetShowAll}
					onExportExcel={handleExportExcel}
				/>
			</div>

			{/* Loading overlay when refreshing */}
			{isLoading && cases.length > 0 && (
				<div className="absolute inset-0 bg-background/60 z-10 rounded-xl backdrop-blur-[1px]" />
			)}

			{viewMode === "kanban" ? (
				<CasesKanbanView
					cases={cases}
					onStageChange={handleStageChange}
					onResultChange={handleResultChange}
				/>
			) : (
				<CasesListView
					cases={cases}
					hasActiveFilters={hasActiveFilters}
					handleClearSearch={handleClearSearch}
					handleDelete={handleDelete}
					onStageChange={handleStageChange}
					onResultChange={handleResultChange}
					onNoteCreate={handleNoteCreate}
				/>
			)}

			{/* 🔧 Mostrar paginación mejorada - solo en vista lista */}
			{viewMode === "list" && pagination.totalPages > 1 && (
				<div className="mt-6">
					<Pagination
						currentPage={pagination.page}
						totalPages={pagination.totalPages}
						totalItems={pagination.total}
						itemsPerPage={pagination.limit}
						onPageChange={handlePageChange}
					/>
				</div>
			)}
		</div>
	);
}
