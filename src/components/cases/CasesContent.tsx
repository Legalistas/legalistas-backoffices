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
import { moveCaseFolderOnStageChange } from "@/lib/storage-move";
import { Role } from "@/constant/user";
import type { Cases } from "@/types/cases";
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

const ARCHIVED_STAGE_ID = 7;

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
	const [selectedStage, setSelectedStage] = useState<number[]>([]);
	const [selectedRepresentativeLawyer, setSelectedRepresentativeLawyer] =
		useState<string[]>([]);
	const [selectedInternalLawyer, setSelectedInternalLawyer] = useState<
		string[]
	>([]);
	const [dateFrom, setDateFrom] = useState<string>("");
	const [dateTo, setDateTo] = useState<string>("");
	const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

	const [responsibleLawyerTypes, setResponsibleLawyerTypes] = useState<
		LawyerOption[]
	>([]);
	const [lawyerInternalTypes, setLawyerInternalTypes] = useState<
		LawyerOption[]
	>([]);

	const isInitialRender = useRef(true);
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const hasLoadedFromStorage = useRef(false);
	// Evita que el debounce dispare un reset a página 1 cuando los filtros
	// cambian por rehidratación desde storage/URL (al volver del detalle).
	const skipNextDebounce = useRef(false);

	const router = useRouter();
	const searchParams = useSearchParams();

	const saveFiltersToStorage = useCallback(
		(filters: {
			searchTerm: string;
			selectedService?: number;
			selectedStage: number[];
			selectedRepresentativeLawyer: string[];
			selectedInternalLawyer: string[];
			dateFrom: string;
			dateTo: string;
			currentPage: number;
		}) => {
			try {
				const filtersToSave = {
					...filters,
					timestamp: Date.now(),
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

	const applyFiltersFromSource = useCallback(
		(source: "storage" | "url") => {
			let filters = null;

			if (source === "storage") {
				filters = loadFiltersFromStorage();
			}

			if (!filters) {
				filters = {
					searchTerm: searchParams.get("search") || "",
					selectedService: searchParams.get("service")
						? Number.parseInt(searchParams.get("service")!)
						: undefined,
					selectedStage: searchParams.get("stages")
						? searchParams.get("stages")!.split(",").map(Number).filter(Boolean)
						: [],
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
				};
			}

			if (filters) {
				const validRepLawyers =
					filters.selectedRepresentativeLawyer?.filter((id: string) =>
						responsibleLawyerTypes.some((lawyer) => lawyer.value === id),
					) || [];
				const validIntLawyers =
					filters.selectedInternalLawyer?.filter((id: string) =>
						lawyerInternalTypes.some((lawyer) => lawyer.value === id),
					) || [];

				setSearchTerm(filters.searchTerm || "");
				setSelectedService(filters.selectedService);
				setSelectedStage(
					Array.isArray(filters.selectedStage)
						? filters.selectedStage
						: filters.selectedStage
							? [filters.selectedStage]
							: [],
				);
				setCurrentPage(filters.currentPage || 1);
				setSelectedRepresentativeLawyer(validRepLawyers);
				setSelectedInternalLawyer(validIntLawyers);
				setDateFrom(filters.dateFrom || "");
				setDateTo(filters.dateTo || "");

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

				const filteredInternalLawyers = data.filter((user: any) =>
					user.roleUser.some(
						(ru: any) =>
							ru.role.name === Role.ASISTENTE_LEGAL ||
							ru.role.name === Role.GERENTE_GENERAL_COO ||
							ru.role.name === Role.DIRECTORA_AREA_LEGAL,
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

	const formatDateForApi = useCallback((dateString: string) => {
		if (!dateString) return undefined;
		const date = new Date(dateString);
		return date.toISOString().split("T")[0];
	}, []);

	const fetchCases = useCallback(
		async (
			page: number,
			search: string,
			serviceId?: number,
			stageIds?: number[],
			fromDate?: string,
			toDate?: string,
			representativeLawyerIds?: string[],
			internalLawyerIds?: string[],
			isKanbanMode?: boolean,
			tab: "active" | "archived" = "active",
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

				if (tab === "archived") {
					// Pestaña Archivados → fija stage 7. Se ignoran los stages del filtro
					// avanzado (los archivados no se subdividen por etapa).
					url.searchParams.append("stageId", ARCHIVED_STAGE_ID.toString());
				} else if (stageIds && stageIds.length > 0) {
					stageIds.forEach((id) =>
						url.searchParams.append("stageId", id.toString()),
					);
				} else {
					url.searchParams.append(
						"excludeStageId",
						ARCHIVED_STAGE_ID.toString(),
					);
				}

				if (representativeLawyerIds && representativeLawyerIds.length > 0) {
					representativeLawyerIds.forEach((id) => {
						if (id) {
							url.searchParams.append("representativeLawyerId", id.toString());
						}
					});
				}

				if (internalLawyerIds && internalLawyerIds.length > 0) {
					internalLawyerIds.forEach((id) => {
						if (id) {
							url.searchParams.append("internalLawyerId", id.toString());
						}
					});
				}

				if (fromDate) {
					url.searchParams.append("fromDate", fromDate);
				}

				if (toDate) {
					url.searchParams.append("toDate", toDate);
				}

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

				const correctedPagination = {
					page: result.meta.page || page,
					limit: result.meta.limit || 10,
					total: result.meta.total,
					totalPages: result.meta.totalPages,
				};

				if (correctedPagination.total === 0 && result.data.length > 0) {
					if (result.data.length === correctedPagination.limit) {
						correctedPagination.total = page * correctedPagination.limit + 1;
						correctedPagination.totalPages = page + 1;
					} else {
						correctedPagination.total =
							(page - 1) * correctedPagination.limit + result.data.length;
						correctedPagination.totalPages = page;
					}
				}

				setPagination(correctedPagination);
			} catch (error) {
				console.error("Error al cargar los casos:", error);
				toast.error(`Error al cargar los casos: ${(error as Error).message}`);
			} finally {
				setIsLoading(false);
			}
		},
		[session?.user?.accessToken],
	);

	const handleExportExcel = useCallback(async () => {
		try {
			toast.info("Preparando exportación...");
			const url = new URL(`${CASES_ENDPOINT}`, window.location.origin);
			url.searchParams.append("page", "1");
			url.searchParams.append("limit", "9999");

			if (searchTerm) url.searchParams.append("search", searchTerm);
			if (selectedService !== undefined)
				url.searchParams.append("servicesId", selectedService.toString());

			if (selectedStage.length > 0) {
				selectedStage.forEach((id) =>
					url.searchParams.append("stageId", id.toString()),
				);
			} else {
				url.searchParams.append(
					"excludeStageId",
					ARCHIVED_STAGE_ID.toString(),
				);
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

			const getLastNote = (c: Cases) => {
				if (!c.notes || c.notes.length === 0) return "";
				const sorted = [...c.notes].sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
				const raw = sorted[0].note || "";
				return raw.replace(/<[^>]*>/g, "").trim();
			};

			const workbook = new ExcelJS.Workbook();
			workbook.creator = "Legalistas";
			workbook.created = new Date();
			const worksheet = workbook.addWorksheet("Casos", {
				properties: { defaultRowHeight: 22 },
			});

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

			worksheet.mergeCells("A1:J1");
			worksheet.mergeCells("A2:J2");
			worksheet.mergeCells("A3:J3");

			const titleCell = worksheet.getCell("A1");
			titleCell.value = "LEGALISTAS - Gestor de Casos";
			titleCell.font = {
				name: "Calibri",
				size: 18,
				bold: true,
				color: { argb: "FF1A365D" },
			};
			titleCell.alignment = { horizontal: "center", vertical: "middle" };
			worksheet.getRow(1).height = 40;

			const subtitleCell = worksheet.getCell("A2");
			subtitleCell.value = `Reporte generado el ${new Date().toLocaleDateString(
				"es-AR",
				{ day: "2-digit", month: "long", year: "numeric" },
			)}`;
			subtitleCell.font = {
				name: "Calibri",
				size: 11,
				italic: true,
				color: { argb: "FF718096" },
			};
			subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
			worksheet.getRow(2).height = 22;

			const countCell = worksheet.getCell("A3");
			countCell.value = `Total de casos: ${data.length}`;
			countCell.font = {
				name: "Calibri",
				size: 11,
				bold: true,
				color: { argb: "FF2D3748" },
			};
			countCell.alignment = { horizontal: "center", vertical: "middle" };
			worksheet.getRow(3).height = 22;

			if (logoId !== null) {
				worksheet.addImage(logoId, {
					tl: { col: 0, row: 0 },
					ext: { width: 120, height: 35 },
				});
				titleCell.alignment = { horizontal: "center", vertical: "middle" };
			}

			worksheet.getRow(4).height = 10;

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

			const headerRow = worksheet.getRow(5);
			columns.forEach((col, i) => {
				const cell = headerRow.getCell(i + 1);
				cell.value = col.header;
				cell.font = {
					name: "Calibri",
					size: 11,
					bold: true,
					color: { argb: "FF000000" },
				};
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FF09A4B5" },
				};
				cell.alignment = {
					horizontal: "center",
					vertical: "middle",
					wrapText: true,
				};
				cell.border = {
					top: { style: "thin", color: { argb: "FF1A365D" } },
					bottom: { style: "thin", color: { argb: "FF1A365D" } },
					left: { style: "thin", color: { argb: "FFE2E8F0" } },
					right: { style: "thin", color: { argb: "FFE2E8F0" } },
				};
			});
			headerRow.height = 28;

			columns.forEach((col, i) => {
				worksheet.getColumn(i + 1).width = col.width;
			});

			data.forEach((c, rowIndex) => {
				const row = worksheet.getRow(6 + rowIndex);
				const values = [
					c.number ?? "",
					c.title ?? "",
					c.servicesId !== undefined
						? getServiceName(Number(c.servicesId))
						: "",
					c.stageId !== undefined ? getStatusName(Number(c.stageId)) : "",
					getLastNote(c),
					c.responsibleLawyer?.name ?? "Sin asignar",
					c.internalLawyer?.name ?? "Sin asignar",
					c.customer?.userProfile?.phone ?? "",
					c.customer?.email ?? "",
					c.createdAt
						? new Date(c.createdAt).toLocaleDateString("es-AR")
						: "",
				];

				values.forEach((val, i) => {
					const cell = row.getCell(i + 1);
					cell.value = val;
					cell.font = {
						name: "Calibri",
						size: 10,
						color: { argb: "FF2D3748" },
					};
					cell.alignment = { vertical: "middle", wrapText: true };
					cell.border = {
						bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
						left: { style: "thin", color: { argb: "FFE2E8F0" } },
						right: { style: "thin", color: { argb: "FFE2E8F0" } },
					};
				});

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
		searchTerm,
		selectedService,
		selectedStage,
		selectedRepresentativeLawyer,
		selectedInternalLawyer,
		dateFrom,
		dateTo,
		formatDateForApi,
	]);

	useEffect(() => {
		const savedViewMode = localStorage.getItem("casosViewMode");
		if (savedViewMode === "list" || savedViewMode === "kanban") {
			setViewMode(savedViewMode as "list" | "kanban");
		}
	}, []);

	const handleViewModeChange = useCallback((mode: "list" | "kanban") => {
		setViewMode(mode);
		localStorage.setItem("casosViewMode", mode);
	}, []);

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
				viewMode === "kanban",
				activeTab,
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [viewMode]);

	// Refetch inmediato cuando cambia la pestaña (sin debounce).
	useEffect(() => {
		if (!isInitialRender.current && hasLoadedFromStorage.current) {
			setCurrentPage(1);
			fetchCases(
				1,
				searchTerm,
				selectedService,
				selectedStage,
				formatDateForApi(dateFrom),
				formatDateForApi(dateTo),
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				viewMode === "kanban",
				activeTab,
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab]);

	const updateURL = useCallback(
		(filters: {
			search?: string;
			service?: number;
			stages?: number[];
			page?: number;
			repLawyers?: string[];
			intLawyers?: string[];
			dateFrom?: string;
			dateTo?: string;
		}) => {
			const params = new URLSearchParams();

			if (filters.search) params.set("search", filters.search);
			if (filters.service !== undefined)
				params.set("service", filters.service.toString());
			if (filters.stages && filters.stages.length > 0)
				params.set("stages", filters.stages.join(","));
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

			const newURL = params.toString()
				? `?${params.toString()}`
				: window.location.pathname;
			router.replace(newURL, { scroll: false });

			saveFiltersToStorage({
				searchTerm: filters.search || "",
				selectedService: filters.service,
				selectedStage: filters.stages || [],
				selectedRepresentativeLawyer: filters.repLawyers || [],
				selectedInternalLawyer: filters.intLawyers || [],
				dateFrom: filters.dateFrom || "",
				dateTo: filters.dateTo || "",
				currentPage: filters.page || 1,
			});
		},
		[router, saveFiltersToStorage],
	);

	// Rehidratar filtros desde storage + disparar el fetch inicial en una sola
	// pasada. Se requiere AMBOS arrays de abogados cargados para que la
	// validación de IDs en `applyFiltersFromSource` sea correcta.
	// NOTA: el fetch se hace con los valores RETORNADOS por
	// applyFiltersFromSource — no con el state de React, que aún no comiteó
	// los setters disparados desde acá. Esto es lo que preservaba erróneamente
	// la página 1 al volver del detalle.
	useEffect(() => {
		if (
			responsibleLawyerTypes.length > 0 &&
			lawyerInternalTypes.length > 0 &&
			!hasLoadedFromStorage.current
		) {
			const appliedFilters = applyFiltersFromSource("storage");
			hasLoadedFromStorage.current = true;
			// Los setters disparan el debounce useEffect; lo saltamos para no
			// resetear paginación recién rehidratada.
			skipNextDebounce.current = true;

			if (appliedFilters) {
				const stages = Array.isArray(appliedFilters.selectedStage)
					? appliedFilters.selectedStage
					: appliedFilters.selectedStage
						? [appliedFilters.selectedStage]
						: [];
				const validRepLawyers =
					(appliedFilters.selectedRepresentativeLawyer ?? []).filter(
						(id: string) =>
							responsibleLawyerTypes.some((lawyer) => lawyer.value === id),
					);
				const validIntLawyers =
					(appliedFilters.selectedInternalLawyer ?? []).filter((id: string) =>
						lawyerInternalTypes.some((lawyer) => lawyer.value === id),
					);
				const initialPage = appliedFilters.currentPage || 1;

				updateURL({
					search: appliedFilters.searchTerm,
					service: appliedFilters.selectedService,
					stages,
					page: initialPage,
					repLawyers: validRepLawyers,
					intLawyers: validIntLawyers,
					dateFrom: appliedFilters.dateFrom,
					dateTo: appliedFilters.dateTo,
				});

				fetchCases(
					initialPage,
					appliedFilters.searchTerm || "",
					appliedFilters.selectedService,
					stages,
					formatDateForApi(appliedFilters.dateFrom || ""),
					formatDateForApi(appliedFilters.dateTo || ""),
					validRepLawyers,
					validIntLawyers,
					viewMode === "kanban",
					activeTab,
				);
			}

			isInitialRender.current = false;
		}
	}, [
		responsibleLawyerTypes,
		lawyerInternalTypes,
		applyFiltersFromSource,
		updateURL,
		fetchCases,
		formatDateForApi,
		viewMode,
		activeTab,
	]);

	useEffect(() => {
		if (isInitialRender.current || !hasLoadedFromStorage.current) return;

		// Si los filtros cambiaron por rehidratación (volver de detalle),
		// no resetear paginación ni refetchar: el effect inicial ya lo hace.
		if (skipNextDebounce.current) {
			skipNextDebounce.current = false;
			return;
		}

		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		searchTimeoutRef.current = setTimeout(() => {
			updateURL({
				search: searchTerm,
				service: selectedService,
				stages: selectedStage,
				page: 1,
				repLawyers: selectedRepresentativeLawyer,
				intLawyers: selectedInternalLawyer,
				dateFrom: dateFrom,
				dateTo: dateTo,
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
				viewMode === "kanban",
				activeTab,
			);
			setCurrentPage(1);
		}, 500);

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
		updateURL,
		fetchCases,
		formatDateForApi,
		viewMode,
	]);

	const handleClearSearch = useCallback(() => {
		setSearchTerm("");
		setSelectedService(undefined);
		setSelectedStage([]);
		setSelectedRepresentativeLawyer([]);
		setSelectedInternalLawyer([]);
		setHasSearched(false);
		setDateFrom("");
		setDateTo("");
		setCurrentPage(1);

		try {
			localStorage.removeItem("casesFilters");
		} catch (error) {
			console.warn("No se pudo limpiar localStorage:", error);
		}

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
					viewMode === "kanban",
					activeTab,
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
			fetchCases,
			viewMode,
			activeTab,
		],
	);

	const handleStageChange = useCallback(
		async (caseId: number, newStageId: number) => {
			try {
				const currentCase = cases.find((c) => c.id === caseId);

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

				moveCaseFolderOnStageChange({
					folderName: currentCase?.folderName,
					fromStageId: currentCase?.stageId,
					toStageId: newStageId,
				});

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
					viewMode === "kanban",
					activeTab,
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
			fetchCases,
			viewMode,
			cases,
			activeTab,
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
					viewMode === "kanban",
					activeTab,
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
			fetchCases,
			viewMode,
			activeTab,
		],
	);

	const handleGoogleReviewToggle = useCallback(
		async (caseId: number, value: boolean) => {
			try {
				const response = await fetch(`${CASES_ENDPOINT}/${caseId}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({ googleReviewLeft: value }),
				});
				if (!response.ok) throw new Error("Failed to update review flag");
				// Optimistic update local — no refetch para evitar reset de paginación.
				setCases((prev) =>
					prev.map((c) =>
						c.id === caseId ? { ...c, googleReviewLeft: value } : c,
					),
				);
			} catch (error) {
				console.error("Error al actualizar reseña:", error);
				toast.error("No se pudo actualizar el estado de la reseña");
			}
		},
		[session?.user?.accessToken],
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
					body: JSON.stringify({
						note,
						userId: session?.user?.id,
						mentionedUserIds: [],
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to create note");
				}

				toast.success("Observación guardada correctamente");
				await fetchCases(
					currentPage,
					searchTerm,
					selectedService,
					selectedStage,
					formatDateForApi(dateFrom),
					formatDateForApi(dateTo),
					selectedRepresentativeLawyer,
					selectedInternalLawyer,
					viewMode === "kanban",
					activeTab,
				);
			} catch (error) {
				console.error("Error al guardar la observación:", error);
				toast.error("Error al guardar la observación");
			}
		},
		[
			session?.user?.accessToken,
			session?.user?.id,
			currentPage,
			searchTerm,
			selectedService,
			selectedStage,
			selectedRepresentativeLawyer,
			selectedInternalLawyer,
			formatDateForApi,
			dateFrom,
			dateTo,
			fetchCases,
			viewMode,
			activeTab,
		],
	);

	const handlePageChange = useCallback(
		(page: number) => {
			// Cancela cualquier debounce pendiente de cambios de filtro previos
			// para evitar que dispare setCurrentPage(1) tras este cambio.
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
				searchTimeoutRef.current = null;
			}
			setCurrentPage(page);
			updateURL({
				search: searchTerm,
				service: selectedService,
				stages: selectedStage,
				page: page,
				repLawyers: selectedRepresentativeLawyer,
				intLawyers: selectedInternalLawyer,
				dateFrom: dateFrom,
				dateTo: dateTo,
			});
			fetchCases(
				page,
				searchTerm,
				selectedService,
				selectedStage,
				formatDateForApi(dateFrom),
				formatDateForApi(dateTo),
				selectedRepresentativeLawyer,
				selectedInternalLawyer,
				viewMode === "kanban",
				activeTab,
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
			updateURL,
			fetchCases,
			formatDateForApi,
			viewMode,
			activeTab,
		],
	);

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
		currentPage,
		saveFiltersToStorage,
	]);

	const hasActiveFilters = Boolean(
		searchTerm ||
			selectedService !== undefined ||
			selectedStage.length > 0 ||
			(selectedRepresentativeLawyer &&
				selectedRepresentativeLawyer.length > 0) ||
			(selectedInternalLawyer && selectedInternalLawyer.length > 0) ||
			dateFrom ||
			dateTo,
	);

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
						<div
							key={i}
							className="flex items-center gap-3 px-3 py-3 border-t border-gray-100 dark:border-gray-800"
						>
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

				{/* Tabs: Activos / Archivados */}
				<div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
					<button
						type="button"
						onClick={() => setActiveTab("active")}
						className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
							activeTab === "active"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Activos
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("archived")}
						className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
							activeTab === "archived"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Archivados
					</button>
				</div>

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
					onExportExcel={handleExportExcel}
				/>
			</div>

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
					isArchivedView={activeTab === "archived"}
					onGoogleReviewToggle={handleGoogleReviewToggle}
				/>
			)}

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
