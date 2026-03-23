"use client";

import {
	BarChart3,
	Cake,
	Calculator,
	Calendar,
	Copy,
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	PercentCircle,
	Save,
	TrendingUp,
	User,
	X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	API_BASE_URL,
	CALCULATOR_CAUSES_LIST_ENDPOINT,
} from "@/constant/api-endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface Court {
	id: number;
	jurisdiction: {
		id: number;
		name: string;
	};
}

interface FilePart {
	id: number;
	name: string;
}

interface CaseFile {
	id: number;
	caseId: number;
	cuij: string;
	accidentDate: string | null;
	disabilityPercentage: number | null;
	typeProcessId: number;
	court: Court;
	filesParts: FilePart[];
}

interface CalculatorCause {
	id: number;
	customer: {
		id: number;
		name: string;
		userProfile: {
			birthDate: string | null;
		} | null;
	};
	files: CaseFile[];
}

export default function AccidentsWorkPage() {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const urlCaseId = searchParams.get("caseId");
	const urlFileId = searchParams.get("fileId");

	// ─── localStorage: leer una sola vez al inicializar ─────
	const STORAGE_KEY_BASE = "calculator_lrt_data";
	const getStorageKey = (fileId?: number) =>
		fileId ? `calculator_data_${fileId}` : STORAGE_KEY_BASE;

	const [_init] = useState<any>(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY_BASE);
			return stored ? JSON.parse(stored) : null;
		} catch { return null; }
	});

	const [causes, setCauses] = useState<CalculatorCause[]>([]);
	const [selectedCause, setSelectedCause] = useState<CalculatorCause | null>(null);
	const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const [accidentDate, setAccidentDate] = useState(_init?.accidentDate || "");
	const [customerAge, setCustomerAge] = useState<number | null>(_init?.customerAge ?? null);
	const [disabilityPercentage, setDisabilityPercentage] = useState<number | null>(_init?.disabilityPercentage ?? null);
	const [dateUntil, setDateUntil] = useState(_init?.dateUntil || "");
	const [riptes, setRiptes] = useState<any[]>([]);
	const [selectedRipte, setSelectedRipte] = useState<any>(_init?.selectedRipte ?? null);
	const [latestRipte, setLatestRipte] = useState<any>(null);
	const [allRiptes, setAllRiptes] = useState<any[]>([]);
	const [selectedRipteHasta, setSelectedRipteHasta] = useState<any>(_init?.selectedRipteHasta ?? null);
	const [remuneraciones, setRemuneraciones] = useState<
		{
			periodo: string;
			haberes: string;
			ripteDelMes: number | null;
			haber_ajustado: number | null;
		}[]
	>(_init?.remuneraciones ?? []);
	const [porcentajesRipte, setPorcentajesRipte] = useState<
		{
			mesPeriodo: string;
			mesCorriendo: string;
			riptePercentage: number | null;
		}[]
	>(_init?.porcentajesRipte ?? []);
	const [activar20Porciento, setActivar20Porciento] = useState(_init?.activar20Porciento ?? false);
	const [pisoMinimo, setPisoMinimo] = useState<number | null>(_init?.pisoMinimo ?? null);
	const [activarPisoMinimo, setActivarPisoMinimo] = useState(_init?.activarPisoMinimo ?? false);
	const [isSaving, setIsSaving] = useState(false);
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
	const [savedLiquidations, setSavedLiquidations] = useState<any[]>([]);
	const [showSavedLiquidations, setShowSavedLiquidations] = useState(false);
	const [isLoadingFromJSON, setIsLoadingFromJSON] = useState(false);
	const [tasaInteresAnual, setTasaInteresAnual] = useState<number>(_init?.tasaInteresAnual ?? 8);
	const searchRef = useRef<HTMLDivElement>(null);
	const [activeTab, setActiveTab] = useState("parametros");

	const saveToLocalStorage = useCallback((key: string, data: any) => {
		try {
			localStorage.setItem(key, JSON.stringify(data));
		} catch (error) {
			console.error("Error saving to localStorage:", error);
		}
	}, []);

	const currentStorageKey = getStorageKey(selectedFile?.id);

	// Persistir datos automáticamente cuando cambian
	useEffect(() => {
		const dataToSave = {
			accidentDate,
			customerAge,
			disabilityPercentage,
			dateUntil,
			selectedRipte,
			selectedRipteHasta,
			remuneraciones,
			porcentajesRipte,
			activar20Porciento,
			pisoMinimo,
			activarPisoMinimo,
			tasaInteresAnual,
			timestamp: Date.now(),
		};

		saveToLocalStorage(currentStorageKey, dataToSave);
	}, [
		currentStorageKey,
		accidentDate,
		customerAge,
		disabilityPercentage,
		dateUntil,
		selectedRipte,
		selectedRipteHasta,
		remuneraciones,
		porcentajesRipte,
		activar20Porciento,
		pisoMinimo,
		activarPisoMinimo,
		tasaInteresAnual,
		saveToLocalStorage,
	]);

	// Fetch causas
	useEffect(() => {
		const fetchCauses = async () => {
			if (!session?.user?.accessToken) return;

			setLoading(true);
			try {
				const response = await fetch(CALCULATOR_CAUSES_LIST_ENDPOINT, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});

				if (!response.ok) throw new Error("Error al cargar causas");
				const data = await response.json();
				setCauses(data.data || []);

				// Cargar el RIPTE más reciente del año actual
				const currentYear = new Date().getFullYear();
				const ripteResponse = await fetch(
					`${API_BASE_URL}/statistics/monthly?type=estadistica_general&year=${currentYear}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					},
				);

				if (ripteResponse.ok) {
					const ripteData = await ripteResponse.json();
					// Obtener el último RIPTE cargado (el de mayor mes)
					if (ripteData.data && ripteData.data.length > 0) {
						const monthOrder = [
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
						const sortedRiptes = [...ripteData.data].sort((a, b) => {
							return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
						});
						setLatestRipte(sortedRiptes[0]);
						setSelectedRipteHasta(sortedRiptes[0]);
					}
				}

				// Cargar todos los RIPTEs de todos los años para los selectores
				const allRiptesResponse = await fetch(
					`${API_BASE_URL}/statistics/monthly?type=estadistica_general&startYear=2015&endYear=${currentYear}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					},
				);

				if (allRiptesResponse.ok) {
					const allRiptesData = await allRiptesResponse.json();
					setAllRiptes(allRiptesData.data || []);
				}
			} catch (err) {
				console.error("Error fetching causes:", err);
			} finally {
				setLoading(false);
			}
		};

		if (session?.user?.accessToken) {
			fetchCauses();
		}
	}, [session]);

	// Cerrar dropdown al hacer clic fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchRef.current &&
				!searchRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// Auto-seleccionar causa cuando viene caseId desde URL
	useEffect(() => {
		if (urlCaseId && causes.length > 0 && !selectedCause) {
			const caseIdNum = parseInt(urlCaseId);
			const matchingCause = causes.find((c) => c.id === caseIdNum);

			if (matchingCause) {
				setSelectedCause(matchingCause);
				setSearchTerm(
					`${matchingCause.id} - ${matchingCause.customer?.name || "Sin nombre"}`,
				);
				setShowSuggestions(false);

				// Auto-seleccionar el archivo específico si viene fileId
				if (urlFileId && matchingCause.files) {
					const fileIdNum = parseInt(urlFileId);
					const matchingFile = matchingCause.files.find(
						(f) => f.id === fileIdNum,
					);
					if (matchingFile) {
						setSelectedFile(matchingFile);

						// Auto-completar fecha de accidente si existe
						if (matchingFile.accidentDate) {
							// Convertir fecha al formato YYYY-MM-DD
							const date = new Date(matchingFile.accidentDate);
							const year = date.getFullYear();
							const month = String(date.getMonth() + 1).padStart(2, "0");
							const day = String(date.getDate()).padStart(2, "0");
							setAccidentDate(`${year}-${month}-${day}`);
						}

						// Auto-completar porcentaje de incapacidad si existe
						if (matchingFile.disabilityPercentage) {
							setDisabilityPercentage(matchingFile.disabilityPercentage);
						}
					}
				} else if (matchingCause.files && matchingCause.files.length === 1) {
					// Si no viene fileId pero hay solo un archivo, auto-seleccionarlo
					const file = matchingCause.files[0];
					setSelectedFile(file);

					// Auto-completar fecha de accidente si existe
					if (file.accidentDate) {
						// Convertir fecha al formato YYYY-MM-DD
						const date = new Date(file.accidentDate);
						const year = date.getFullYear();
						const month = String(date.getMonth() + 1).padStart(2, "0");
						const day = String(date.getDate()).padStart(2, "0");
						setAccidentDate(`${year}-${month}-${day}`);
					}

					// Auto-completar porcentaje de incapacidad si existe
					if (file.disabilityPercentage) {
						setDisabilityPercentage(file.disabilityPercentage);
					}
				}

				// Calcular edad del cliente si tiene fecha de nacimiento
				if (matchingCause.customer?.userProfile?.birthDate) {
					const birthDate = new Date(
						matchingCause.customer.userProfile.birthDate,
					);
					const today = new Date();
					let age = today.getFullYear() - birthDate.getFullYear();
					const monthDiff = today.getMonth() - birthDate.getMonth();
					if (
						monthDiff < 0 ||
						(monthDiff === 0 && today.getDate() < birthDate.getDate())
					) {
						age--;
					}
					setCustomerAge(age);
				}
			}
		}
	}, [urlCaseId, urlFileId, causes, selectedCause]);

	// Cargar RIPTEs cuando cambia la fecha de accidente
	useEffect(() => {
		const fetchRiptes = async () => {
			if (!accidentDate || !session?.user?.accessToken) {
				console.log("No se puede cargar RIPTEs:", {
					accidentDate,
					hasToken: !!session?.user?.accessToken,
				});
				setRiptes([]);
				return;
			}

			try {
				const date = new Date(accidentDate);
				const year = date.getFullYear();
				const month = date.toLocaleString("es-ES", { month: "long" });
				const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);

				const url = `${API_BASE_URL}/statistics/monthly?type=estadistica_general&year=${year}`;
				console.log("Cargando RIPTEs desde:", url);
				console.log("Para fecha:", {
					accidentDate,
					year,
					month: monthCapitalized,
				});

				const response = await fetch(url, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});

				console.log("Response status:", response.status);

				if (!response.ok) {
					const errorText = await response.text();
					console.error("Error response:", errorText);
					throw new Error(`Error al cargar RIPTEs: ${response.status}`);
				}

				const data = await response.json();
				console.log("RIPTEs recibidos:", data);
				setRiptes(data.data || []);

				// Seleccionar automáticamente el RIPTE vigente a la fecha del accidente
				const accidentDateObj = new Date(accidentDate);
				const ripteYear = accidentDateObj.getFullYear();
				const ripteMonth = accidentDateObj.toLocaleString("es-ES", {
					month: "long",
				});
				const ripteMonthCapitalized =
					ripteMonth.charAt(0).toUpperCase() + ripteMonth.slice(1);

				const sourceRiptes = allRiptes.length > 0 ? allRiptes : (data.data || []);
				const ripteVigente = sourceRiptes.find(
					(r: any) => r.month === ripteMonthCapitalized && r.year === ripteYear,
				);
				console.log(
					"RIPTE Vigente (1 año atrás) encontrado:",
					ripteVigente,
					"Mes:",
					ripteMonthCapitalized,
					"Año:",
					ripteYear,
				);
				if (ripteVigente) {
					setSelectedRipte(ripteVigente);
				}
			} catch (err) {
				console.error("Error fetching riptes:", err);
				setRiptes([]);
			}
		};

		fetchRiptes();
	}, [accidentDate, session?.user?.accessToken]);

	// Auto-seleccionar RIPTE vigente cuando allRiptes se carga o cambia la fecha
	useEffect(() => {
		if (!accidentDate || allRiptes.length === 0) return;

		const accidentDateObj = new Date(accidentDate);
		const ripteYear = accidentDateObj.getFullYear();
		const ripteMonth = accidentDateObj.toLocaleString("es-ES", {
			month: "long",
		});
		const ripteMonthCapitalized =
			ripteMonth.charAt(0).toUpperCase() + ripteMonth.slice(1);

		const ripteVigente = allRiptes.find(
			(r: any) => r.month === ripteMonthCapitalized && r.year === ripteYear,
		);

		if (ripteVigente) {
			setSelectedRipte(ripteVigente);
		}
	}, [accidentDate, allRiptes]);

	// Función para validar si un expediente es válido
	const isValidFile = (
		file: CaseFile,
		customer: { userProfile: { birthDate: string | null } | null },
	) => {
		// Debe tener fecha de accidente
		if (!file.accidentDate) return false;

		// El cliente debe tener userProfile con fecha de nacimiento válida
		if (!customer.userProfile?.birthDate) return false;

		// Validar que la fecha de nacimiento sea válida
		const birthDate = new Date(customer.userProfile.birthDate);
		if (isNaN(birthDate.getTime())) return false;

		return true;
	};

	// Filtrar causas
	const filteredCauses = causes
		.filter((cause) => {
			// Filtro de búsqueda
			const matchesSearch =
				cause.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				cause.files.some((file) =>
					file.cuij?.toLowerCase().includes(searchTerm.toLowerCase()),
				);

			if (!matchesSearch) return false;

			// Debe tener al menos un expediente válido
			const hasValidFiles =
				cause.files &&
				cause.files.length > 0 &&
				cause.files.some((file) => isValidFile(file, cause.customer));

			return hasValidFiles;
		})
		.map((cause) => ({
			...cause,
			// Filtrar solo los expedientes válidos
			files: cause.files.filter((file) => isValidFile(file, cause.customer)),
		}));

	// Calcular edad
	const calculateAge = (birthdate: string | null) => {
		if (!birthdate) return null;
		const today = new Date();
		const birth = new Date(birthdate);
		let age = today.getFullYear() - birth.getFullYear();
		const m = today.getMonth() - birth.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
			age--;
		}
		return age;
	};

	const handleSelectFile = (cause: CalculatorCause, file: CaseFile) => {
		setSelectedCause(cause);
		setSelectedFile(file);
		setSearchTerm(cause.customer.name);
		setShowSuggestions(false);
		setAccidentDate(file.accidentDate ? file.accidentDate.split("T")[0] : "");

		// Calcular edad si hay fecha de nacimiento
		const calculatedAge = cause.customer.userProfile?.birthDate
			? calculateAge(cause.customer.userProfile.birthDate)
			: null;
		setCustomerAge(calculatedAge);

		// Establecer porcentaje de incapacidad
		setDisabilityPercentage(
			file.disabilityPercentage ? Number(file.disabilityPercentage) : null,
		);
	};

	const handleRemoveSelection = () => {
		// Limpiar localStorage del expediente actual
		try {
			localStorage.removeItem(currentStorageKey);
		} catch (error) {
			console.error("Error al limpiar localStorage:", error);
		}

		setSelectedCause(null);
		setSelectedFile(null);
		setSearchTerm("");
		setAccidentDate("");
		setCustomerAge(null);
		setDisabilityPercentage(null);
		setDateUntil("");
		setRiptes([]);
		setSelectedRipte(null);
		setRemuneraciones([]);
		setPorcentajesRipte([]);
		setActivar20Porciento(false);
		setPisoMinimo(null);
		setActivarPisoMinimo(false);
		// No reseteamos latestRipte porque es del año actual y se mantiene
	};

	// Función para limpiar solo los datos de la calculadora (sin cambiar expediente)
	const handleClearCalculatorData = () => {
		try {
			localStorage.removeItem(currentStorageKey);
		} catch (error) {
			console.error("Error al limpiar localStorage:", error);
		}

		setAccidentDate("");
		setCustomerAge(null);
		setDisabilityPercentage(null);
		setDateUntil("");
		setSelectedRipte(null);
		setSelectedRipteHasta(null);
		setRemuneraciones([]);
		setPorcentajesRipte([]);
		setActivar20Porciento(false);
		setPisoMinimo(null);
		setActivarPisoMinimo(false);

		console.log("Datos de calculadora limpiados");
	};

	const hasCustomerBirthDate =
		!!selectedCause?.customer?.userProfile?.birthDate;

	// Generar tabla de remuneraciones basándose en el RIPTE Vigente seleccionado
	useEffect(() => {
		if (!selectedRipte) {
			setRemuneraciones([]);
			return;
		}
		// allRiptes aún cargando desde API — no borrar datos existentes
		if (allRiptes.length === 0) return;

		// No regenerar durante la carga del JSON
		if (isLoadingFromJSON) {
			console.log("Cargando desde JSON, no regenerando tabla");
			return;
		}

		// Si ya hay haberes cargados, no regenerar la tabla (evitar sobrescribir datos cargados del JSON)
		const hayHaberesExistentes = remuneraciones.some(
			(row) => row.haberes && row.haberes !== "",
		);
		if (hayHaberesExistentes && remuneraciones.length > 0) {
			console.log(
				"Tabla ya tiene haberes cargados, no regenerando para preservar datos",
			);
			return;
		}

		console.log(
			"Generando tabla basada en RIPTE Vigente:",
			selectedRipte.month,
			selectedRipte.year,
		);

		const rows = [];
		const monthNames = [
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

		// Crear fecha base del RIPTE Vigente seleccionado
		const ripteVigenteMonth = monthNames.indexOf(selectedRipte.month);
		const ripteVigenteYear = selectedRipte.year;

		// Generar 12 meses: desde el mes del RIPTE del año anterior hasta el mes anterior del RIPTE actual
		// Si RIPTE es Nov 2024, generamos desde Nov 2023 hasta Oct 2024
		for (let i = 0; i < 12; i++) {
			const date = new Date(ripteVigenteYear - 1, ripteVigenteMonth + i, 1);
			const monthName = monthNames[date.getMonth()];
			const year = date.getFullYear();
			const periodo = `${monthName.toLowerCase().substring(0, 3)}-${year.toString().substring(2)}`;

			// Buscar el RIPTE correspondiente a este mes
			const ripteDelMes = allRiptes.find(
				(r) => r.month === monthName && r.year === year,
			);

			rows.push({
				periodo,
				haberes: "",
				ripteDelMes: ripteDelMes ? Number(ripteDelMes.value) : null,
				haber_ajustado: null,
			});
		}

		console.log(
			"Nueva tabla generada con",
			rows.length,
			"filas. Primera:",
			rows[0]?.periodo,
			"Última:",
			rows[rows.length - 1]?.periodo,
		);
		setRemuneraciones(rows);
	}, [selectedRipte, allRiptes]);

	// Generar tabla de porcentajes RIPTE basado en el rango DNU 669/19
	useEffect(() => {
		if (!selectedRipte || !selectedRipteHasta) {
			setPorcentajesRipte([]);
			return;
		}
		// allRiptes aún cargando desde API — no borrar datos existentes
		if (allRiptes.length === 0) return;

		// No regenerar durante la carga del JSON
		if (isLoadingFromJSON) return;

		// Si ya hay porcentajes editados manualmente, no regenerar
		if (porcentajesRipte.length > 0) return;

		console.log(
			"Generando tabla de porcentajes RIPTE desde:",
			selectedRipte.month,
			selectedRipte.year,
			"hasta:",
			selectedRipteHasta.month,
			selectedRipteHasta.year,
		);

		const rows = [];
		const monthNames = [
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
		const mesesCortos = [
			"ene",
			"feb",
			"mar",
			"abr",
			"may",
			"jun",
			"jul",
			"ago",
			"sep",
			"oct",
			"nov",
			"dic",
		];

		// Crear fechas desde y hasta basadas en las selecciones del DNU
		const fechaDesde = new Date(
			selectedRipte.year,
			monthNames.indexOf(selectedRipte.month),
			1,
		);
		const fechaHasta = new Date(
			selectedRipteHasta.year,
			monthNames.indexOf(selectedRipteHasta.month),
			1,
		);
		// Extender 1 mes: el último período usa el RIPTE "hasta" como referencia 3M atrás
		fechaHasta.setMonth(fechaHasta.getMonth() + 1);

		const tempDate = new Date(fechaDesde);

		while (tempDate <= fechaHasta) {
			const monthName = monthNames[tempDate.getMonth()];
			const year = tempDate.getFullYear();
			const periodo = `${mesesCortos[tempDate.getMonth()]}-${year.toString().substring(2)}`;

			// Buscar RIPTE del mes actual
			const ripteActual = allRiptes.find(
				(r) => r.month === monthName && r.year === year,
			);

			// Buscar RIPTE de 3 meses atrás
			const fecha3MesesAtras = new Date(tempDate);
			fecha3MesesAtras.setMonth(fecha3MesesAtras.getMonth() - 3);
			const month3MA = monthNames[fecha3MesesAtras.getMonth()];
			const year3MA = fecha3MesesAtras.getFullYear();
			const ripte3MesesAtras = allRiptes.find(
				(r) => r.month === month3MA && r.year === year3MA,
			);

			// Mostrar el porcentaje del RIPTE de 3 meses atrás (no el valor)
			let riptePercentage = null;
			if (ripte3MesesAtras && ripte3MesesAtras.percentage !== undefined) {
				riptePercentage = Number(ripte3MesesAtras.percentage);
			}

			rows.push({
				mesPeriodo: periodo,
				mesCorriendo: `${mesesCortos[fecha3MesesAtras.getMonth()]}-${year3MA.toString().substring(2)}`,
				riptePercentage: riptePercentage,
			});

			// Avanzar al siguiente mes
			tempDate.setMonth(tempDate.getMonth() + 1);
		}

		console.log(
			"Tabla de porcentajes generada con",
			rows.length,
			"filas desde",
			selectedRipte.month,
			selectedRipte.year,
			"hasta",
			selectedRipteHasta.month,
			selectedRipteHasta.year,
		);
		setPorcentajesRipte(rows);
	}, [selectedRipte, selectedRipteHasta, allRiptes]);

	// Recalcular solo los haberes ajustados cuando hay valores ingresados y cambia el RIPTE
	useEffect(() => {
		if (!selectedRipte || remuneraciones.length === 0) return;

		// Solo recalcular si hay haberes ingresados
		const hayHaberes = remuneraciones.some(
			(row) => row.haberes && row.haberes !== "",
		);
		if (!hayHaberes) return;

		// Verificar si ya están calculados con el RIPTE actual para evitar loops
		const yaCalculado = remuneraciones.some((row) => {
			if (row.haberes && row.haber_ajustado && row.ripteDelMes) {
				const expectedValue =
					(Number(selectedRipte.value) / row.ripteDelMes) *
					parseFloat(row.haberes);
				return Math.abs(row.haber_ajustado - expectedValue) < 0.01; // Tolerancia para decimales
			}
			return false;
		});

		if (yaCalculado) return; // Ya está calculado, no hacer nada

		console.log(
			"Recalculando haberes ajustados con RIPTE:",
			selectedRipte.value,
		);

		setRemuneraciones((currentRemuneraciones) =>
			currentRemuneraciones.map((row, index) => {
				if (row.haberes && row.haberes !== "") {
					const haber = parseFloat(row.haberes);
					const ripteDelMes = row.ripteDelMes;

					if (ripteDelMes && !isNaN(haber)) {
						const ripteDesde = Number(selectedRipte.value);
						const haber_ajustado = (ripteDesde / ripteDelMes) * haber;

						return {
							...row,
							haber_ajustado,
						};
					}
				}
				return {
					...row,
					haber_ajustado: null,
				};
			}),
		);
	}, [selectedRipte]); // Removido remuneraciones de las dependencias    // Calcular haberes con ajuste cuando cambian los valores

	const calcularHaberAjustado = (index: number, haberes: string) => {
		if (!selectedRipte || !haberes) return null;

		const haber = parseFloat(haberes);
		const ripteDelMes = remuneraciones[index]?.ripteDelMes;

		if (!ripteDelMes || isNaN(haber)) return null;

		const ripteDesde = Number(selectedRipte.value);
		return (ripteDesde / ripteDelMes) * haber;
	};

	const handlePorcentajeChange = (index: number, value: string) => {
		const newPorcentajes = [...porcentajesRipte];
		newPorcentajes[index] = {
			...newPorcentajes[index],
			riptePercentage: value !== "" ? parseFloat(value) : null,
		};
		setPorcentajesRipte(newPorcentajes);
	};

	const handleHaberesChange = (index: number, value: string) => {
		const newRemuneraciones = [...remuneraciones];

		// Limpiar el valor pero preservar el punto decimal
		// Remover solo espacios y separadores de miles (puntos que no sean decimales)
		let cleanValue = value.replace(/\s/g, ""); // Remover espacios

		// Si hay múltiples puntos, conservar solo el último como decimal
		const parts = cleanValue.split(".");
		if (parts.length > 2) {
			// Unir todas las partes excepto la última, luego agregar punto decimal y la última parte
			cleanValue = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
		}

		// Remover comas que no sean separadores decimales válidos
		cleanValue = cleanValue.replace(/,(?!\d{1,2}$)/g, "");

		newRemuneraciones[index].haberes = cleanValue;

		// Solo calcular si hay un valor válido
		if (cleanValue && !isNaN(parseFloat(cleanValue))) {
			newRemuneraciones[index].haber_ajustado = calcularHaberAjustado(
				index,
				cleanValue,
			);
		} else {
			newRemuneraciones[index].haber_ajustado = null;
		}

		setRemuneraciones(newRemuneraciones);
	};

	// Función para replicar el primer haber a todas las filas
	const handleReplicarHaberes = () => {
		if (remuneraciones.length === 0) return;

		const primerHaber = remuneraciones[0].haberes;
		if (!primerHaber || primerHaber === "") return;

		const newRemuneraciones = remuneraciones.map((row, index) => {
			const haberAjustado = calcularHaberAjustado(index, primerHaber);
			return {
				...row,
				haberes: primerHaber,
				haber_ajustado: haberAjustado,
			};
		});

		setRemuneraciones(newRemuneraciones);
	};

	// Verificar si hay algún valor en haberes para mostrar el botón
	const hayHaberesIngresados = remuneraciones.some(
		(row) => row.haberes && row.haberes !== "",
	);

	// Calcular totales
	const totalHaberes = remuneraciones.reduce((sum, row) => {
		const haber = parseFloat(row.haberes);
		return sum + (isNaN(haber) ? 0 : haber);
	}, 0);

	const totalHaberesAjustados = remuneraciones.reduce((sum, row) => {
		return sum + (row.haber_ajustado || 0);
	}, 0);

	const promedioHaberesAjustados =
		remuneraciones.length > 0
			? totalHaberesAjustados / remuneraciones.length
			: 0;

	// Calcular la tasa de variación desde el total de porcentajes RIPTE
	const tasaDeVariacion = porcentajesRipte.reduce((sum, row) => {
		if (row.riptePercentage !== null) {
			return sum + row.riptePercentage;
		}
		return sum;
	}, 0);

	// Calcular IBM TOTAL usando la fórmula: SUMA(promedioHaberesAjustados*tasaDeVariacion)+promedioHaberesAjustados
	const ibmTotal =
		promedioHaberesAjustados * (tasaDeVariacion / 100) +
		promedioHaberesAjustados;

	// Calcular coeficiente de edad: (65 / edad del autor)
	const coeficienteEdad =
		customerAge !== null && customerAge > 0 ? 65 / customerAge : 0;

	// Calcular TOTAL FÓRMULA: SUMA(53*IBM TOTAL*PORCENTAJE INCAPACIDAD*COEFICIENTE EDAD)/100
	const totalFormula =
		(53 * ibmTotal * (disabilityPercentage || 0) * coeficienteEdad) / 100;

	// Calcular 20% adicional del total fórmula
	const veintePorCiento = activar20Porciento ? totalFormula * 0.2 : 0;

	// Calcular TOTAL INDEMNIZACIÓN: total fórmula + 20% adicional
	const totalIndemnizacion = totalFormula + veintePorCiento;

	// Calcular piso mínimo: pisoMinimo * disabilityPercentage / 100
	const totalPisoMinimo =
		pisoMinimo && disabilityPercentage
			? (pisoMinimo * disabilityPercentage) / 100
			: 0;

	// Calcular 20% del piso mínimo
	const veintePorCientoPiso = activarPisoMinimo ? totalPisoMinimo * 0.2 : 0;

	// Total piso mínimo final: piso + 20% adicional
	const totalPisoMinimoFinal = totalPisoMinimo + veintePorCientoPiso;

	// Calcular intereses 8% anual desde fecha de accidente
	const calcularIntereses = () => {
		if (!accidentDate) return [];

		const fechaAccidente = new Date(accidentDate);
		const hoy = new Date();
		const añoAccidente = fechaAccidente.getFullYear();
		const añoActual = hoy.getFullYear();
		const interesesPorAño = [];

		for (let año = añoAccidente; año <= añoActual; año++) {
			let diasDelAño = 0;

			if (año === añoAccidente && año === añoActual) {
				// Mismo año: desde accidente hasta hoy
				diasDelAño = Math.ceil(
					(hoy.getTime() - fechaAccidente.getTime()) / (1000 * 60 * 60 * 24),
				);
			} else if (año === añoAccidente) {
				// Primer año: desde accidente hasta fin del año
				const finDelAño = new Date(año, 11, 31, 23, 59, 59);
				diasDelAño =
					Math.ceil(
						(finDelAño.getTime() - fechaAccidente.getTime()) /
						(1000 * 60 * 60 * 24),
					) + 1;
			} else if (año === añoActual) {
				// Año actual: desde inicio del año hasta hoy
				const inicioDelAño = new Date(año, 0, 1);
				diasDelAño =
					Math.ceil(
						(hoy.getTime() - inicioDelAño.getTime()) / (1000 * 60 * 60 * 24),
					) + 1;
			} else {
				// Años intermedios: año completo
				diasDelAño =
					año % 4 === 0 && (año % 100 !== 0 || año % 400 === 0) ? 366 : 365;
			}

			// Fórmula: (TOTAL INDEM. * tasa% / 365) * días del año
			const interesDiario = (totalIndemnizacion * (tasaInteresAnual / 100)) / 365;
			const interesDelAño = interesDiario * diasDelAño;

			interesesPorAño.push({
				año,
				dias: diasDelAño,
				interesDiario,
				interesDelAño,
			});
		}

		return interesesPorAño;
	};

	const interesesCalculados = calcularIntereses();
	const totalIntereses = interesesCalculados.reduce(
		(sum, item) => sum + item.interesDelAño,
		0,
	);
	const totalConIntereses = totalIndemnizacion + totalIntereses;

	// Función para generar PDF
	const handleGeneratePDF = async () => {

		setIsGeneratingPDF(true);
		try {
			// Crear datos para el PDF
			const pdfData = {
				cliente: selectedCause?.customer.name || "Sin causa asociada",
				expediente: selectedFile?.cuij || (selectedFile ? `Expediente #${selectedFile.id}` : "Sin expediente"),
				fechaAccidente: accidentDate
					? new Date(accidentDate).toLocaleDateString("es-AR")
					: "",
				edad: customerAge,
				incapacidad: disabilityPercentage,
				ibmConRipte: promedioHaberesAjustados,
				tasaVariacion: tasaDeVariacion,
				ibmTotal: ibmTotal,
				coeficienteEdad: coeficienteEdad,
				totalFormula: totalFormula,
				activar20Porciento,
				veintePorCiento: veintePorCiento,
				totalIndemnizacion: totalIndemnizacion,
				pisoMinimo: pisoMinimo,
				totalPisoMinimo: totalPisoMinimo,
				activarPisoMinimo,
				veintePorCientoPiso: veintePorCientoPiso,
				totalPisoMinimoFinal: totalPisoMinimoFinal,
				remuneraciones: remuneraciones,
				porcentajesRipte: porcentajesRipte,
				selectedRipte: selectedRipte,
				tasaInteresAnual,
				interesesCalculados,
				totalIntereses,
				totalConIntereses,
			};

			// Llamar al endpoint para generar PDF
			const response = await fetch("/api/generate-lrt-pdf", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(pdfData),
			});

			if (!response.ok) throw new Error("Error al generar PDF");

			// Descargar el PDF
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Liquidacion_LRT_${selectedCause?.customer.name || "calculadora"}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			console.log("PDF generado exitosamente");
		} catch (error) {
			console.error("Error al generar PDF:", error);
		} finally {
			setIsGeneratingPDF(false);
		}
	};

	// Función para guardar liquidación en el expediente
	const handleSaveLiquidacion = async () => {
		if (!selectedCause || !selectedFile || !session?.user?.accessToken) {
			toast.error("Por favor seleccione una causa y expediente primero");
			return;
		}

		// Verificar que hay datos para guardar
		console.log("=== VERIFICACIÓN ANTES DE GUARDAR ===");
		console.log("Remuneraciones actuales:", remuneraciones);
		console.log("Cantidad de remuneraciones:", remuneraciones.length);
		console.log(
			"Haberes ingresados:",
			remuneraciones.filter((r) => r.haberes && r.haberes !== ""),
		);

		if (remuneraciones.length === 0) {
			toast.error(
				"No hay datos de remuneraciones para guardar. Asegúrese de haber ingresado la información necesaria.",
			);
			return;
		}

		setIsSaving(true);
		try {
			const calculationData = {
				cliente: selectedCause?.customer.name || "Sin causa asociada",
				expediente: selectedFile?.cuij || (selectedFile ? `Expediente #${selectedFile.id}` : "Sin expediente"),
				fechaAccidente: accidentDate,
				edad: customerAge,
				incapacidad: disabilityPercentage,
				dateUntil: dateUntil,
				ibmConRipte: promedioHaberesAjustados,
				tasaVariacion: tasaDeVariacion,
				ibmTotal: ibmTotal,
				coeficienteEdad: coeficienteEdad,
				totalFormula: totalFormula,
				activar20Porciento,
				veintePorCiento: veintePorCiento,
				totalIndemnizacion: totalIndemnizacion,
				pisoMinimo: pisoMinimo,
				totalPisoMinimo: totalPisoMinimo,
				activarPisoMinimo,
				veintePorCientoPiso: veintePorCientoPiso,
				totalPisoMinimoFinal: totalPisoMinimoFinal,
				remuneraciones: remuneraciones,
				porcentajesRipte: porcentajesRipte,
				selectedRipte: selectedRipte,
				selectedRipteHasta: selectedRipteHasta,
				allRiptes: allRiptes,
				fechaCalculo: new Date().toISOString(),
			};

			console.log("Guardando remuneraciones:", remuneraciones);
			console.log("Estado actual de remuneraciones detallado:");
			remuneraciones.forEach((rem, index) => {
				console.log(
					`  [${index}] ${rem.periodo}: haberes="${rem.haberes}", ripte=${rem.ripteDelMes}, ajustado=${rem.haber_ajustado}`,
				);
			});
			console.log("Datos completos a guardar:", calculationData);

			const fileName = `Liquidacion_LRT_${selectedCause.customer.name}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.json`;

			const requestBody = {
				caseId: selectedFile.caseId,
				fileName: fileName,
				calculationData: calculationData,
			};

			console.log("=== DATOS ENVIADOS AL SERVIDOR ===");
			console.log("Body completo:", JSON.stringify(requestBody, null, 2));
			console.log(
				"Solo calculationData:",
				JSON.stringify(calculationData, null, 2),
			);

			const response = await fetch(`${API_BASE_URL}/lrt/save-liquidation`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) throw new Error("Error al guardar liquidación");

			const result = await response.json();
			console.log("=== RESPUESTA DEL SERVIDOR ===");
			console.log("Liquidación guardada exitosamente:", result);
			toast.success("Liquidación guardada exitosamente en el expediente");

			// Verificar inmediatamente lo que se guardó
			if (result.liquidation && result.liquidation.calculationData) {
				console.log(
					"Datos guardados en el servidor:",
					result.liquidation.calculationData,
				);
				console.log(
					"Remuneraciones en servidor:",
					result.liquidation.calculationData.remuneraciones,
				);
			}

			// Recargar las liquidaciones guardadas si hay un caso seleccionado
			if (selectedFile?.caseId) {
				fetchSavedLiquidations(selectedFile.caseId);
			}
		} catch (error) {
			console.error("Error al guardar liquidación:", error);
			toast.error("Error al guardar la liquidación");
		} finally {
			setIsSaving(false);
		}
	};

	// Función para obtener liquidaciones guardadas de un caso
	const fetchSavedLiquidations = async (caseId: number) => {
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
				setSavedLiquidations([]);
				return;
			}

			const result = await response.json();
			setSavedLiquidations(result.liquidations || []);
		} catch (error) {
			console.error("Error al cargar liquidaciones guardadas:", error);
			setSavedLiquidations([]);
		}
	};

	// Función para cargar una liquidación guardada
	const handleLoadLiquidation = async (liquidationId: number) => {
		if (!session?.user?.accessToken) return;

		setIsLoadingFromJSON(true); // Activar flag de carga
		try {
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

			console.log("Cargando liquidación:", data);
			console.log("Remuneraciones cargadas:", data.remuneraciones);

			// Limpiar localStorage antes de cargar nuevos datos para evitar conflictos
			try {
				localStorage.removeItem(currentStorageKey);
			} catch (error) {
				console.error("Error al limpiar localStorage antes de cargar:", error);
			}

			// Cargar primero las remuneraciones para evitar regeneración
			if (data.remuneraciones && Array.isArray(data.remuneraciones)) {
				console.log(
					"Estableciendo remuneraciones ANTES que selectedRipte:",
					data.remuneraciones,
				);
				setRemuneraciones(data.remuneraciones);
			}

			// Esperar un poco antes de cargar otros datos para asegurar que remuneraciones se establezca
			setTimeout(() => {
				// Cargar los demás datos
				if (data.fechaAccidente) setAccidentDate(data.fechaAccidente);
				if (data.edad !== null && data.edad !== undefined)
					setCustomerAge(data.edad);
				if (data.incapacidad !== null && data.incapacidad !== undefined)
					setDisabilityPercentage(data.incapacidad);
				if (data.dateUntil) setDateUntil(data.dateUntil);
				if (data.selectedRipte) setSelectedRipte(data.selectedRipte);
				if (data.selectedRipteHasta)
					setSelectedRipteHasta(data.selectedRipteHasta);
				if (data.porcentajesRipte && Array.isArray(data.porcentajesRipte)) {
					setPorcentajesRipte(data.porcentajesRipte);
				}
				if (data.activar20Porciento !== undefined)
					setActivar20Porciento(data.activar20Porciento);
				if (data.pisoMinimo !== null && data.pisoMinimo !== undefined)
					setPisoMinimo(data.pisoMinimo);
				if (data.activarPisoMinimo !== undefined)
					setActivarPisoMinimo(data.activarPisoMinimo);

				// Desactivar flag después de cargar todo
				setTimeout(() => {
					setIsLoadingFromJSON(false);
					console.log("Carga desde JSON completada, flag desactivado");
				}, 500);
			}, 100);

			// Guardar los datos cargados en localStorage para persistencia
			setTimeout(() => {
				const dataToSave = {
					accidentDate: data.fechaAccidente || "",
					customerAge: data.edad,
					disabilityPercentage: data.incapacidad,
					dateUntil: data.dateUntil || "",
					selectedRipte: data.selectedRipte,
					selectedRipteHasta: data.selectedRipteHasta,
					remuneraciones: data.remuneraciones || [],
					porcentajesRipte: data.porcentajesRipte || [],
					activar20Porciento: data.activar20Porciento || false,
					pisoMinimo: data.pisoMinimo,
					activarPisoMinimo: data.activarPisoMinimo || false,
					timestamp: Date.now(),
					loadedFromJSON: true,
				};
				saveToLocalStorage(currentStorageKey, dataToSave);
			}, 1500);

			setShowSavedLiquidations(false);
			toast.success("Liquidación cargada exitosamente");
		} catch (error) {
			console.error("Error al cargar liquidación:", error);
			toast.error("Error al cargar la liquidación");
		} finally {
			// Asegurar que el flag se desactive incluso si hay error
			setTimeout(() => {
				setIsLoadingFromJSON(false);
			}, 2000);
		}
	};

	// Cargar liquidaciones cuando se selecciona un expediente
	useEffect(() => {
		if (selectedFile?.caseId && session?.user?.accessToken) {
			fetchSavedLiquidations(selectedFile.caseId);
		} else {
			setSavedLiquidations([]);
		}
	}, [selectedFile, session]);

	return (
		<div className="container mx-auto p-4 space-y-4 max-w-7xl">
			{/* Header */}
			<Card className="py-4">
				<CardHeader className="py-0">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 p-2.5 rounded-lg">
							<Calculator className="size-6 text-primary" />
						</div>
						<div className="flex-1">
							<CardTitle className="text-xl">
								Calculadora LRT{selectedFile ? ` \u2014 ${selectedFile.cuij || "Exp. #" + selectedFile.id}` : ""}
							</CardTitle>
							<CardDescription>Accidentes de Trabajo</CardDescription>
						</div>
						<Button variant="destructive" size="sm" onClick={handleClearCalculatorData}>
							<X className="size-4" />
							Limpiar
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Vincular causa */}
			<Card className="py-3">
				<CardContent className="py-0">
					<div className="flex items-center gap-2 mb-2">
						<Label className="text-sm font-semibold">Vincular Causa</Label>
						<Badge variant="outline" className="text-[10px]">opcional</Badge>
					</div>
					{selectedCause && selectedFile ? (
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary"><User className="size-3 mr-1" />{selectedCause.customer.name}</Badge>
							<Badge variant="outline"><FileText className="size-3 mr-1" />{selectedFile.cuij || "Sin CUIJ"}</Badge>
							{selectedFile.accidentDate && (
								<Badge variant="outline">
									<Calendar className="size-3 mr-1" />
									{new Date(selectedFile.accidentDate).toLocaleDateString("es-AR")}
								</Badge>
							)}
							<Badge variant="outline"><Cake className="size-3 mr-1" />{customerAge !== null ? `${customerAge} años` : "Sin edad"}</Badge>
							<Badge variant="outline"><PercentCircle className="size-3 mr-1" />{disabilityPercentage !== null ? `${disabilityPercentage}%` : "Sin %"}</Badge>
							<Button variant="ghost" size="sm" className="ml-auto" onClick={handleRemoveSelection}>
								<X className="size-4" />
							</Button>
						</div>
					) : (
						<div ref={searchRef} className="relative">
							<Input
								placeholder="Buscar causa por nombre o CUIJ..."
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setShowSuggestions(true);
								}}
								onFocus={() => setShowSuggestions(true)}
							/>
							{showSuggestions && searchTerm && (
								<div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
									{loading ? (
										<p className="p-3 text-sm text-muted-foreground">Cargando...</p>
									) : filteredCauses.length === 0 ? (
										<p className="p-3 text-sm text-muted-foreground">Sin resultados</p>
									) : (
										filteredCauses.slice(0, 20).map((cause) => (
											<div key={cause.id} className="border-b last:border-0">
												<div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
													{cause.id} - {cause.customer.name}
												</div>
												{cause.files.map((file) => (
													<button
														key={file.id}
														className="w-full text-left px-4 py-2 hover:bg-muted/50 text-sm flex items-center justify-between"
														onClick={() => handleSelectFile(cause, file)}
													>
														<span className="font-mono text-xs">{file.cuij || "Sin CUIJ"}</span>
														{file.accidentDate && (
															<span className="text-xs text-muted-foreground">
																{new Date(file.accidentDate).toLocaleDateString("es-AR")}
															</span>
														)}
													</button>
												))}
											</div>
										))
									)}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Main Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="w-full grid grid-cols-3">
					<TabsTrigger value="parametros"><BarChart3 className="size-4 mr-1.5" />Parámetros</TabsTrigger>
					<TabsTrigger value="remuneraciones"><TrendingUp className="size-4 mr-1.5" />Remuneraciones</TabsTrigger>
					<TabsTrigger value="resultado"><Calculator className="size-4 mr-1.5" />Resultado</TabsTrigger>
				</TabsList>

				{/* TAB 1: PARÁMETROS */}
				<TabsContent value="parametros" forceMount className="data-[state=inactive]:hidden">
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Datos del Cálculo</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<Label><Cake className="size-3.5" /> Edad</Label>
									<Input
										type="number"
										value={customerAge !== null ? customerAge : ""}
										onChange={(e) => setCustomerAge(e.target.value ? parseInt(e.target.value) : null)}
										disabled={hasCustomerBirthDate}
										placeholder="Edad"
									/>
								</div>
								<div className="space-y-1.5">
									<Label><PercentCircle className="size-3.5" /> Incapacidad (%)</Label>
									<Input
										type="number"
										step="0.01"
										min="0"
										max="100"
										value={disabilityPercentage !== null ? disabilityPercentage : ""}
										onChange={(e) => setDisabilityPercentage(e.target.value ? parseFloat(e.target.value) : null)}
										placeholder="%"
									/>
								</div>
								<div className="space-y-1.5">
									<Label><Calendar className="size-3.5" /> Fecha Accidente</Label>
									<Input type="date" value={accidentDate} onChange={(e) => setAccidentDate(e.target.value)} />
								</div>
								<div className="space-y-1.5">
									<Label><Calendar className="size-3.5" /> Hasta</Label>
									<Input type="date" value={dateUntil || new Date().toLocaleDateString("en-CA")} onChange={(e) => setDateUntil(e.target.value)} />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">RIPTE</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<Label><TrendingUp className="size-3.5" /> Vigente al accidente</Label>
										{allRiptes.length > 0 ? (
											<select
												className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
												value={selectedRipte?.id || ""}
												onChange={(e) => {
													const ripte = allRiptes.find((r) => r.id === parseInt(e.target.value));
													setSelectedRipte(ripte || null);
												}}
											>
												<option value="">Seleccione un RIPTE</option>
												{allRiptes.map((ripte) => (
													<option key={ripte.id} value={ripte.id}>
														{ripte.month} {ripte.year} - ${Number(ripte.value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
													</option>
												))}
											</select>
										) : (
											<Input disabled value={accidentDate ? "Cargando..." : "Ingrese fecha"} />
										)}
									</div>
									<div className="space-y-1.5">
										<Label><BarChart3 className="size-3.5" /> IBM</Label>
										<select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
											<option value="mensual">Mensual</option>
											<option value="anual">Anual</option>
										</select>
									</div>
								</div>
								<Separator />
								<div className="space-y-3">
									<Label className="text-sm font-semibold">Tasa de variación de RIPTES</Label>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1.5">
											<Label className="text-muted-foreground text-xs">Desde</Label>
											<select
												className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
												value={selectedRipte?.id || ""}
												onChange={(e) => {
													const ripte = allRiptes.find((r) => r.id === parseInt(e.target.value));
													setSelectedRipte(ripte || null);
												}}
											>
												<option value="">Seleccione RIPTE Desde</option>
												{allRiptes.map((ripte) => (
													<option key={ripte.id} value={ripte.id}>
														{ripte.month} {ripte.year} - ${Number(ripte.value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
													</option>
												))}
											</select>
										</div>
										<div className="space-y-1.5">
											<Label className="text-muted-foreground text-xs">Hasta</Label>
											<select
												className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
												value={selectedRipteHasta?.id || ""}
												onChange={(e) => {
													const ripte = allRiptes.find((r) => r.id === parseInt(e.target.value));
													setSelectedRipteHasta(ripte || null);
												}}
											>
												<option value="">Seleccione RIPTE Hasta</option>
												{allRiptes.map((ripte) => (
													<option key={ripte.id} value={ripte.id}>
														{ripte.month} {ripte.year} - ${Number(ripte.value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
													</option>
												))}
											</select>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
					<div className="flex justify-end mt-4">
						<Button onClick={() => setActiveTab("remuneraciones")}>
							Siguiente <ChevronRight className="size-4" />
						</Button>
					</div>
				</TabsContent>

				{/* TAB 2: REMUNERACIONES */}
				<TabsContent value="remuneraciones" forceMount className="data-[state=inactive]:hidden">
					<div className="grid gap-4 lg:grid-cols-3">
						<Card className="lg:col-span-2">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-base">Tabla de Remuneraciones</CardTitle>
									{hayHaberesIngresados && (
										<Button size="sm" variant="outline" onClick={handleReplicarHaberes}>
											<Copy className="size-3.5" /> Replicar
										</Button>
									)}
								</div>
							</CardHeader>
							<CardContent>
								{remuneraciones.length > 0 ? (
									<div className="overflow-auto max-h-125 rounded-md border">
										<table className="w-full text-xs">
											<thead className="bg-muted/50 sticky top-0">
												<tr>
													<th className="px-2 py-2 text-left font-medium">PERÍODO</th>
													<th className="px-2 py-2 text-right font-medium">HABERES</th>
													<th className="px-2 py-2 text-right font-medium">RIPTE MES</th>
													<th className="px-2 py-2 text-right font-medium">AJUSTADO</th>
												</tr>
											</thead>
											<tbody>
												{remuneraciones.map((row, index) => (
													<tr key={index} className="border-t hover:bg-muted/30">
														<td className="px-2 py-1.5 font-mono text-muted-foreground">{row.periodo}</td>
														<td className="px-2 py-1">
															<Input
																className="h-7 text-xs text-right"
																value={row.haberes}
																onChange={(e) => handleHaberesChange(index, e.target.value)}
																placeholder="0.00"
															/>
														</td>
														<td className="px-2 py-1.5 text-right text-muted-foreground">
															{row.ripteDelMes ? `$${row.ripteDelMes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "-"}
														</td>
														<td className="px-2 py-1.5 text-right font-medium">
															{row.haber_ajustado ? `$${row.haber_ajustado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "-"}
														</td>
													</tr>
												))}
												<tr className="border-t-2 bg-muted/50 font-semibold">
													<td className="px-2 py-2">TOTAL</td>
													<td className="px-2 py-2 text-right">${totalHaberes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
													<td className="px-2 py-2"></td>
													<td className="px-2 py-2 text-right">${totalHaberesAjustados.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
												</tr>
												<tr className="bg-primary/5 font-semibold text-primary">
													<td className="px-2 py-2">PROMEDIO</td>
													<td className="px-2 py-2" colSpan={2}></td>
													<td className="px-2 py-2 text-right">${promedioHaberesAjustados.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
												</tr>
											</tbody>
										</table>
									</div>
								) : (
									<p className="text-sm text-muted-foreground text-center py-8">Seleccione un RIPTE vigente para generar la tabla</p>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">% RIPTE (DNU 669/19)</CardTitle>
							</CardHeader>
							<CardContent>
								{porcentajesRipte.length > 0 ? (
									<div className="overflow-auto max-h-125 rounded-md border">
										<table className="w-full text-xs">
											<thead className="bg-muted/50 sticky top-0">
												<tr>
													<th className="px-2 py-2 text-left font-medium">PERÍODO</th>
													<th className="px-2 py-2 text-left font-medium">3M ATRÁS</th>
													<th className="px-2 py-2 text-right font-medium">%</th>
												</tr>
											</thead>
											<tbody>
												{porcentajesRipte.map((row, index) => (
													<tr key={index} className="border-t hover:bg-muted/30">
														<td className="px-2 py-1.5 font-mono text-muted-foreground">{row.mesPeriodo}</td>
														<td className="px-2 py-1.5 font-mono text-muted-foreground">{row.mesCorriendo}</td>
														<td className="px-2 py-1">
															<Input
																className="h-7 text-xs text-right"
																value={row.riptePercentage !== null ? row.riptePercentage : ""}
																onChange={(e) => handlePorcentajeChange(index, e.target.value)}
																placeholder="0.00"
															/>
														</td>
													</tr>
												))}
												<tr className="border-t-2 bg-muted/50 font-semibold">
													<td className="px-2 py-2" colSpan={2}>TOTAL</td>
													<td className="px-2 py-2 text-right">
														{porcentajesRipte.reduce((sum, r) => sum + (r.riptePercentage || 0), 0).toFixed(2)}
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								) : (
									<p className="text-sm text-muted-foreground text-center py-8">Seleccione rango de RIPTE</p>
								)}
							</CardContent>
						</Card>
					</div>
					<div className="flex justify-between mt-4">
						<Button variant="outline" onClick={() => setActiveTab("parametros")}>
							<ChevronLeft className="size-4" /> Anterior
						</Button>
						<Button onClick={() => setActiveTab("resultado")}>
							Siguiente <ChevronRight className="size-4" />
						</Button>
					</div>
				</TabsContent>

				{/* TAB 3: RESULTADO */}
				<TabsContent value="resultado" forceMount className="data-[state=inactive]:hidden">
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Cálculo Final</CardTitle>
							</CardHeader>
							<CardContent className="space-y-1">
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">IBM CON RIPTE</span>
									<span className="font-medium">${promedioHaberesAjustados.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
								</div>
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">TASA VARIACIÓN</span>
									<span className="font-medium">{tasaDeVariacion.toFixed(2)}%</span>
								</div>
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">IBM TOTAL</span>
									<span className="font-medium">${ibmTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
								</div>
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">% INCAPACIDAD</span>
									<span className="font-medium">{disabilityPercentage !== null ? `${disabilityPercentage}%` : "0%"}</span>
								</div>
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">COEF. EDAD</span>
									<span className="font-medium">{customerAge !== null ? coeficienteEdad.toFixed(2) : "0"}</span>
								</div>
								<div className="flex justify-between py-2.5 px-3 bg-primary/10 rounded-md mt-2 text-sm font-bold text-primary">
									<span>TOTAL FÓRMULA</span>
									<span>${totalFormula.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
								</div>
								<div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md mt-2">
									<Label className="text-sm">Activar 20%</Label>
									<Switch checked={activar20Porciento} onCheckedChange={setActivar20Porciento} />
								</div>
								{activar20Porciento && (
									<div className="flex justify-between py-1.5 border-b text-sm">
										<span className="text-muted-foreground">20% TOTAL</span>
										<span className="font-medium">${veintePorCiento.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
									</div>
								)}
								<div className={`flex justify-between py-2.5 px-3 rounded-md mt-1 text-sm font-bold ${activar20Porciento ? "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100" : "bg-primary/10 text-primary"}`}>
									<span>TOTAL INDEM. {activar20Porciento ? "(+20%)" : ""}</span>
									<span>${totalIndemnizacion.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
								</div>
								{accidentDate && totalIndemnizacion > 0 && (
									<div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 space-y-1">
										<div className="flex items-center justify-between mb-2">
											<h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">INTERÉS TASA ANUAL</h4>
											<div className="flex items-center gap-1.5">
												<Input
													type="number"
													step="0.1"
													min="0"
													className="h-7 w-20 text-xs text-right bg-white dark:bg-amber-950"
													value={tasaInteresAnual}
													onChange={(e) => setTasaInteresAnual(e.target.value ? parseFloat(e.target.value) : 0)}
												/>
												<span className="text-xs font-semibold text-amber-900 dark:text-amber-100">%</span>
											</div>
										</div>
										{interesesCalculados.map((item, idx) => (
											<div key={idx} className="flex justify-between text-xs border-b border-amber-200 dark:border-amber-600 py-1">
												<span className="text-amber-800 dark:text-amber-200">{item.año} — {item.dias} días</span>
												<span className="font-semibold text-amber-900 dark:text-amber-100">${item.interesDelAño.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
											</div>
										))}
										<div className="flex justify-between py-2 mt-1 bg-amber-100 dark:bg-amber-800 px-2 rounded text-sm font-bold text-amber-900 dark:text-amber-100">
											<span>TOTAL INTERESES</span>
											<span>${totalIntereses.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div className="flex justify-between py-2 mt-1 bg-orange-100 dark:bg-orange-900 px-2 rounded text-sm font-bold text-orange-900 dark:text-orange-100">
											<span>TOTAL CON INTERESES</span>
											<span>${totalConIntereses.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
									</div>
								)}
								<Separator className="my-3" />
								<div className="flex items-center gap-2 py-1.5 px-3 bg-muted rounded-md">
									<Label className="text-sm min-w-15">Piso Mín:</Label>
									<Input
										type="number"
										step="0.01"
										className="h-7 text-xs flex-1"
										value={pisoMinimo !== null ? pisoMinimo : ""}
										onChange={(e) => setPisoMinimo(e.target.value ? parseFloat(e.target.value) : null)}
										placeholder="Ingrese piso"
									/>
									<span className="text-sm font-semibold min-w-20 text-right">${totalPisoMinimo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
								</div>
								<div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
									<Label className="text-sm">Activar Piso 20%</Label>
									<Switch checked={activarPisoMinimo} onCheckedChange={setActivarPisoMinimo} />
								</div>
								{activarPisoMinimo && (
									<>
										<div className="flex justify-between py-1.5 border-b text-sm">
											<span className="text-muted-foreground">20% PISO</span>
											<span className="font-medium">${veintePorCientoPiso.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div className="flex justify-between py-2.5 px-3 bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-100 rounded-md text-sm font-bold">
											<span>TOTAL PISO (+20%)</span>
											<span>${totalPisoMinimoFinal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
									</>
								)}
							</CardContent>
						</Card>

						<div className="space-y-4">
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-base">Resumen</CardTitle>
								</CardHeader>
								<CardContent className="space-y-1.5 text-sm text-muted-foreground">
									<p><strong>F. Accidente:</strong> {accidentDate ? new Date(accidentDate).toLocaleDateString("es-AR") : "No def."}</p>
									<p><strong>Edad:</strong> {customerAge !== null ? `${customerAge} años` : "No def."}</p>
									<p><strong>Incapacidad:</strong> {disabilityPercentage !== null ? `${disabilityPercentage}%` : "No def."}</p>
									<p><strong>RIPTE:</strong> {selectedRipte ? `${selectedRipte.month} ${selectedRipte.year} - $${Number(selectedRipte.value).toLocaleString("es-AR")}` : "No sel."}</p>
									<p><strong>IBM Prom.:</strong> ${promedioHaberesAjustados.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
								</CardContent>
							</Card>
							<Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
								<CardContent className="py-3 text-xs text-amber-800 dark:text-amber-200">
									<strong>Nota:</strong> Cálculos según LRT. Verificar coef. de edad.
								</CardContent>
							</Card>
							<div className="space-y-2">
								<Button className="w-full" variant="destructive" onClick={handleGeneratePDF} disabled={isGeneratingPDF || !totalFormula}>
									{isGeneratingPDF ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Generando...</>) : (<><Download className="size-4" /> Descargar PDF</>)}
								</Button>
								<Button className="w-full" onClick={handleSaveLiquidacion} disabled={isSaving || !totalFormula || !selectedFile}>
									{isSaving ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</>) : (<><Save className="size-4" /> Guardar en Causa</>)}
								</Button>
								<Button className="w-full" variant="outline" onClick={() => setShowSavedLiquidations(true)} disabled={!selectedFile}>
									<FileText className="size-4" /> Ver Guardadas ({savedLiquidations.length})
								</Button>
							</div>
						</div>
					</div>
					<div className="flex justify-start mt-4">
						<Button variant="outline" onClick={() => setActiveTab("remuneraciones")}>
							<ChevronLeft className="size-4" /> Anterior
						</Button>
					</div>
				</TabsContent>
			</Tabs>

			{/* Dialog: Liquidaciones Guardadas */}
			<Dialog open={showSavedLiquidations} onOpenChange={setShowSavedLiquidations}>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
					<DialogHeader>
						<DialogTitle>Liquidaciones Guardadas</DialogTitle>
						<DialogDescription>Seleccione una liquidación para cargarla</DialogDescription>
					</DialogHeader>
					<div className="overflow-y-auto max-h-[60vh] space-y-3">
						{savedLiquidations.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">No hay liquidaciones guardadas</p>
						) : (
							savedLiquidations.map((liq: any) => (
								<div key={liq.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<h4 className="font-semibold">{liq.fileName}</h4>
											<p className="text-sm text-muted-foreground mt-1">{liq.description}</p>
											<div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
												<span>{new Date(liq.uploadedAt).toLocaleDateString("es-AR")}</span>
												{liq.uploadedBy && <span>{liq.uploadedBy.name}</span>}
											</div>
										</div>
										<Button size="sm" onClick={() => handleLoadLiquidation(liq.id)}>
											<Download className="size-3.5" /> Cargar
										</Button>
									</div>
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
