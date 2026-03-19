"use client";

import {
	BarChart3,
	Cake,
	Calculator,
	Calendar,
	Copy,
	Download,
	File,
	FileText,
	PercentCircle,
	Save,
	Search,
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
import { getProcessTypeLabel } from "@/lib/functions";

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
	const [causes, setCauses] = useState<CalculatorCause[]>([]);
	const [selectedCause, setSelectedCause] = useState<CalculatorCause | null>(
		null,
	);
	const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const [accidentDate, setAccidentDate] = useState("");
	const [customerAge, setCustomerAge] = useState<number | null>(null);
	const [disabilityPercentage, setDisabilityPercentage] = useState<
		number | null
	>(null);
	const [dateUntil, setDateUntil] = useState("");
	const [riptes, setRiptes] = useState<any[]>([]);
	const [selectedRipte, setSelectedRipte] = useState<any>(null);
	const [latestRipte, setLatestRipte] = useState<any>(null);
	const [allRiptes, setAllRiptes] = useState<any[]>([]);
	const [selectedRipteHasta, setSelectedRipteHasta] = useState<any>(null);
	const [remuneraciones, setRemuneraciones] = useState<
		{
			periodo: string;
			haberes: string;
			ripteDelMes: number | null;
			haber_ajustado: number | null;
		}[]
	>([]);
	const [porcentajesRipte, setPorcentajesRipte] = useState<
		{
			mesPeriodo: string;
			mesCorriendo: string;
			riptePercentage: number | null;
		}[]
	>([]);
	const [activar20Porciento, setActivar20Porciento] = useState(false);
	const [pisoMinimo, setPisoMinimo] = useState<number | null>(null);
	const [activarPisoMinimo, setActivarPisoMinimo] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
	const [savedLiquidations, setSavedLiquidations] = useState<any[]>([]);
	const [showSavedLiquidations, setShowSavedLiquidations] = useState(false);
	const [isLoadingFromJSON, setIsLoadingFromJSON] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);

	// Clave única para localStorage basada en el expediente
	const getStorageKey = (fileId: number) => `calculator_data_${fileId}`;

	// Guardar datos en localStorage
	const saveToLocalStorage = useCallback((fileId: number, data: any) => {
		try {
			localStorage.setItem(getStorageKey(fileId), JSON.stringify(data));
		} catch (error) {
			console.error("Error saving to localStorage:", error);
		}
	}, []);

	// Cargar datos desde localStorage
	const loadFromLocalStorage = useCallback((fileId: number) => {
		try {
			const stored = localStorage.getItem(getStorageKey(fileId));
			return stored ? JSON.parse(stored) : null;
		} catch (error) {
			console.error("Error loading from localStorage:", error);
			return null;
		}
	}, []);

	// Persistir datos automáticamente cuando cambian
	useEffect(() => {
		if (!selectedFile?.id) return;

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
			timestamp: Date.now(),
		};

		saveToLocalStorage(selectedFile.id, dataToSave);
	}, [
		selectedFile?.id,
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
		saveToLocalStorage,
	]);

	// Cargar datos cuando se selecciona un expediente
	useEffect(() => {
		if (!selectedFile?.id) return;

		const savedData = loadFromLocalStorage(selectedFile.id);
		if (savedData) {
			console.log("Cargando datos guardados desde localStorage:", savedData);

			if (savedData.accidentDate) setAccidentDate(savedData.accidentDate);
			if (savedData.customerAge !== null) setCustomerAge(savedData.customerAge);
			if (savedData.disabilityPercentage !== null)
				setDisabilityPercentage(savedData.disabilityPercentage);
			if (savedData.dateUntil) setDateUntil(savedData.dateUntil);
			if (savedData.selectedRipte) setSelectedRipte(savedData.selectedRipte);
			if (savedData.selectedRipteHasta)
				setSelectedRipteHasta(savedData.selectedRipteHasta);
			if (savedData.remuneraciones) {
				console.log("Restaurando remuneraciones:", savedData.remuneraciones);
				setRemuneraciones(savedData.remuneraciones);
			}
			if (savedData.porcentajesRipte)
				setPorcentajesRipte(savedData.porcentajesRipte);
			if (savedData.activar20Porciento !== undefined)
				setActivar20Porciento(savedData.activar20Porciento);
			if (savedData.pisoMinimo !== null) setPisoMinimo(savedData.pisoMinimo);
			if (savedData.activarPisoMinimo !== undefined)
				setActivarPisoMinimo(savedData.activarPisoMinimo);
		}
	}, [selectedFile?.id, loadFromLocalStorage]);

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

				// Seleccionar automáticamente el RIPTE de 1 año atrás a la fecha del accidente
				const accidentDateObj = new Date(accidentDate);
				const ripteYear = accidentDateObj.getFullYear() - 1; // 1 año atrás
				const ripteMonth = accidentDateObj.toLocaleString("es-ES", {
					month: "long",
				});
				const ripteMonthCapitalized =
					ripteMonth.charAt(0).toUpperCase() + ripteMonth.slice(1);

				const ripteVigente = data.data?.find(
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
		if (selectedFile?.id) {
			try {
				localStorage.removeItem(getStorageKey(selectedFile.id));
				console.log(
					"Datos limpiados del localStorage para expediente:",
					selectedFile.id,
				);
			} catch (error) {
				console.error("Error al limpiar localStorage:", error);
			}
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
		if (selectedFile?.id) {
			try {
				localStorage.removeItem(getStorageKey(selectedFile.id));
			} catch (error) {
				console.error("Error al limpiar localStorage:", error);
			}
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
		if (!selectedRipte || allRiptes.length === 0) {
			setRemuneraciones([]);
			return;
		}

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
		if (!selectedRipte || !selectedRipteHasta || allRiptes.length === 0) {
			setPorcentajesRipte([]);
			return;
		}

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

			// Fórmula: (TOTAL INDEM. * 8% / 365) * días del año
			const interesDiario = (totalIndemnizacion * 0.08) / 365;
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
		if (!selectedCause || !selectedFile) return;

		setIsGeneratingPDF(true);
		try {
			// Crear datos para el PDF
			const pdfData = {
				cliente: selectedCause.customer.name,
				expediente: selectedFile.cuij || `Expediente #${selectedFile.id}`,
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
			a.download = `Liquidacion_LRT_${selectedCause.customer.name}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.pdf`;
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
				cliente: selectedCause.customer.name,
				expediente: selectedFile.cuij || `Expediente #${selectedFile.id}`,
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
			if (selectedFile?.id) {
				try {
					localStorage.removeItem(getStorageKey(selectedFile.id));
				} catch (error) {
					console.error(
						"Error al limpiar localStorage antes de cargar:",
						error,
					);
				}
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
				if (selectedFile?.id) {
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
					saveToLocalStorage(selectedFile.id, dataToSave);
					console.log("Datos del JSON guardados en localStorage:", dataToSave);
				}
			}, 1500); // Esperar más tiempo para asegurar que todo esté cargado

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
		<div className="container mx-auto p-4">
			{/* Header Principal */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
				<div className="flex items-center gap-3">
					<div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
						<Calculator
							size={24}
							className="text-blue-600 dark:text-blue-400"
						/>
					</div>
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							Calculadora LRT - Accidentes de Trabajo
						</h1>
						<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
							Cálculo de indemnizaciones según la Ley de Riesgos del Trabajo
						</p>
					</div>
				</div>
			</div>

			{/* Buscador de Causas/Expedientes */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
				<div className="flex items-center gap-2 mb-4">
					<Search className="text-gray-600 dark:text-gray-400" size={20} />
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
						Buscar Expediente
					</h2>
				</div>

				<div className="relative" ref={searchRef}>
					<div className="relative">
						<Search
							className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setShowSuggestions(true);
							}}
							onFocus={() => setShowSuggestions(true)}
							placeholder="Buscar por nombre, CUIJ o expediente..."
							className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
						/>
						{searchTerm && (
							<button
								onClick={handleRemoveSelection}
								className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
							>
								<X size={16} />
							</button>
						)}
					</div>

					{/* Suggestions Dropdown */}
					{showSuggestions && filteredCauses.length > 0 && (
						<div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
							{filteredCauses.map((cause) => (
								<div
									key={cause.id}
									className="border-b border-gray-100 dark:border-gray-700 last:border-0"
								>
									<div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
										<div className="flex items-center gap-2 mb-2">
											<User
												className="text-blue-600 dark:text-blue-400"
												size={16}
											/>
											<div>
												<div className="font-semibold text-gray-900 dark:text-white">
													{cause.customer.name}
												</div>
												<div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-3">
													<span className="flex items-center gap-1">
														<User size={12} /> {cause.customer.name}
													</span>
													{cause.customer.userProfile?.birthDate && (
														<span className="flex items-center gap-1">
															<Cake size={12} />{" "}
															{calculateAge(
																cause.customer.userProfile.birthDate,
															)}{" "}
															años
														</span>
													)}
													{cause.files.length > 0 &&
														cause.files[0].disabilityPercentage !== null && (
															<span className="flex items-center gap-1">
																<PercentCircle size={12} />{" "}
																{cause.files[0].disabilityPercentage}%
															</span>
														)}
												</div>
											</div>
										</div>

										{/* Lista de expedientes */}
										<div className="space-y-1.5 ml-6">
											{cause.files.map((file) => (
												<button
													key={file.id}
													onClick={() => handleSelectFile(cause, file)}
													className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg text-sm transition-colors border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
												>
													<div className="flex justify-between items-center">
														<span className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
															<File className="w-3 h-3 text-green-600 dark:text-green-400" />
															{file.cuij || `Expediente #${file.id}`} -{" "}
															{cause.customer.name}{" "}
															{file.filesParts && file.filesParts[0]?.name
																? `C/${file.filesParts[0].name}`
																: ""}{" "}
															S/ {getProcessTypeLabel(file.typeProcessId)}.
														</span>
														<span className="text-[16px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">
															📅{" "}
															{new Date(file.accidentDate!).toLocaleDateString(
																"es-AR",
															)}
														</span>
													</div>
												</button>
											))}
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{showSuggestions &&
						searchTerm &&
						filteredCauses.length === 0 &&
						!loading && (
							<div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6 text-center">
								<Search className="text-gray-400 mx-auto mb-2" size={24} />
								<p className="text-sm text-gray-600 dark:text-gray-400">
									No se encontraron resultados para{" "}
									<span className="font-medium">{searchTerm}</span>
								</p>
							</div>
						)}
				</div>
			</div>

			{/* Layout con Sidebar */}
			{selectedCause && selectedFile && (
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
					{/* Sidebar - Información del Cliente y Expediente */}
					<div className="lg:col-span-1 space-y-4">
						{/* Card Info del Cliente */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sticky top-4">
							<div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
								<User className="text-blue-600 dark:text-blue-400" size={16} />
								<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
									Expediente Seleccionado
								</h3>
							</div>

							<div className="space-y-2.5">
								<div>
									<div className="flex items-center gap-1 mb-0.5">
										<User
											className="text-gray-500 dark:text-gray-400"
											size={12}
										/>
										<label className="text-[16px] font-medium text-gray-600 dark:text-gray-400">
											Cliente
										</label>
									</div>
									<p className="text-sm font-semibold text-gray-900 dark:text-white ml-3.5">
										{selectedCause.customer.name}
									</p>
								</div>

								<div>
									<div className="flex items-center gap-1 mb-0.5">
										<FileText
											className="text-gray-500 dark:text-gray-400"
											size={12}
										/>
										<label className="text-[16px] font-medium text-gray-600 dark:text-gray-400">
											Expediente
										</label>
									</div>
									<p className="text-sm font-semibold text-gray-900 dark:text-white ml-3.5">
										{selectedFile.cuij || "Sin CUIJ"}
									</p>
								</div>

								<div>
									<div className="flex items-center gap-1 mb-0.5">
										<Calendar
											className="text-gray-500 dark:text-gray-400"
											size={12}
										/>
										<label className="text-[16px] font-medium text-gray-600 dark:text-gray-400">
											Fecha Accidente
										</label>
									</div>
									<p className="text-sm font-semibold text-gray-900 dark:text-white ml-3.5">
										{selectedFile.accidentDate
											? new Date(selectedFile.accidentDate).toLocaleDateString(
													"es-AR",
												)
											: "No registrada"}
									</p>
								</div>

								<div>
									<div className="flex items-center gap-1 mb-0.5">
										<Cake
											className="text-gray-500 dark:text-gray-400"
											size={12}
										/>
										<label className="text-[16px] font-medium text-gray-600 dark:text-gray-400">
											Edad
										</label>
									</div>
									<p className="text-sm font-semibold text-gray-900 dark:text-white ml-3.5">
										{customerAge !== null
											? `${customerAge} años`
											: "No registrada"}
									</p>
								</div>

								<div>
									<div className="flex items-center gap-1 mb-0.5">
										<PercentCircle
											className="text-gray-500 dark:text-gray-400"
											size={12}
										/>
										<label className="text-[16px] font-medium text-gray-600 dark:text-gray-400">
											Incapacidad
										</label>
									</div>
									<p className="text-sm font-semibold text-gray-900 dark:text-white ml-3.5">
										{selectedFile.disabilityPercentage !== null
											? `${selectedFile.disabilityPercentage}%`
											: "No registrado"}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Contenido Principal */}
					<div className="lg:col-span-3">
						{/* Calculadora */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
							<div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
								<div className="flex items-center gap-2">
									<Calculator
										className="text-blue-600 dark:text-blue-400"
										size={16}
									/>
									<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
										Cálculo LRT -{" "}
										{selectedFile.cuij || `Exp. #${selectedFile.id}`}
									</h2>
								</div>
								<button
									onClick={handleClearCalculatorData}
									className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors"
									title="Limpiar todos los datos de la calculadora"
								>
									<X size={12} />
									Limpiar
								</button>
							</div>

							{/* Sección de Parámetros */}
							<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
								<div className="flex items-center gap-1.5 mb-2">
									<BarChart3
										className="text-gray-600 dark:text-gray-400"
										size={14}
									/>
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
										Parámetros de Cálculo
									</h3>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<div className="flex items-center gap-1 mb-1">
											<Cake
												className="text-gray-500 dark:text-gray-400"
												size={12}
											/>
											<label className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
												Edad
											</label>
										</div>
										<input
											type="number"
											className={`w-full px-2 py-1.5 text-sm border rounded-md text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all ${
												hasCustomerBirthDate
													? "border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
													: "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
											}`}
											value={customerAge !== null ? customerAge : ""}
											onChange={(e) =>
												setCustomerAge(
													e.target.value ? parseInt(e.target.value) : null,
												)
											}
											disabled={hasCustomerBirthDate}
											placeholder="Edad"
										/>
									</div>
									<div>
										<div className="flex items-center gap-1 mb-1">
											<PercentCircle
												className="text-gray-500 dark:text-gray-400"
												size={12}
											/>
											<label className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
												Incapacidad (%)
											</label>
										</div>
										<input
											type="number"
											step="0.01"
											min="0"
											max="100"
											className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
											value={
												disabilityPercentage !== null
													? disabilityPercentage
													: ""
											}
											onChange={(e) =>
												setDisabilityPercentage(
													e.target.value ? parseFloat(e.target.value) : null,
												)
											}
											placeholder="%"
										/>
									</div>
									<div>
										<div className="flex items-center gap-1 mb-1">
											<Calendar
												className="text-gray-500 dark:text-gray-400"
												size={12}
											/>
											<label className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
												Fecha Accidente
											</label>
										</div>
										<input
											type="date"
											className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
											value={accidentDate}
											onChange={(e) => setAccidentDate(e.target.value)}
										/>
									</div>
									<div>
										<div className="flex items-center gap-1 mb-1">
											<Calendar
												className="text-gray-500 dark:text-gray-400"
												size={12}
											/>
											<label className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
												Hasta
											</label>
										</div>
										<input
											type="date"
											className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
											value={
												dateUntil || new Date().toLocaleDateString("en-CA")
											}
											onChange={(e) => setDateUntil(e.target.value)}
										/>
									</div>
								</div>
							</div>

							{/* Selector de RIPTE */}
							<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
								<div className="grid grid-cols-2 gap-2">
									<div>
										<div className="flex items-center gap-1 mb-1">
											<TrendingUp
												className="text-gray-500 dark:text-gray-400"
												size={12}
											/>
											<label className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
												RIPTE Vigente al accidente
											</label>
										</div>
										{riptes.length > 0 ? (
											<select
												className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
												value={selectedRipte?.id || ""}
												onChange={(e) => {
													const ripte = riptes.find(
														(r) => r.id === parseInt(e.target.value),
													);
													console.log("Cambiando RIPTE Vigente a:", ripte);
													setSelectedRipte(ripte || null);
												}}
											>
												<option value="">Seleccione un RIPTE</option>
												{riptes.map((ripte) => (
													<option key={ripte.id} value={ripte.id}>
														{ripte.month} {ripte.year} - $
														{Number(ripte.value).toLocaleString("es-AR", {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</option>
												))}
											</select>
										) : (
											<input
												type="text"
												className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white"
												value={accidentDate ? "Cargando..." : "Ingrese fecha"}
												disabled
											/>
										)}
									</div>
									<div>
										<div className="flex items-center gap-1 mb-1">
											<BarChart3
												className="text-gray-500 dark:text-gray-400"
												size={12}
											/>
											<label className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
												IBM
											</label>
										</div>
										<select className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all">
											<option value="mensual">Mensual</option>
											<option value="anual">Anual</option>
										</select>
									</div>
								</div>
							</div>

							{/* RIPTE Fecha Desde y Fecha Hasta */}
							<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
								<div className="flex items-center gap-1.5 mb-2">
									<Calendar
										className="text-gray-600 dark:text-gray-400"
										size={14}
									/>
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
										Tasa de variación de riptes
									</h3>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<div className="flex items-center gap-1.5 mb-1.5">
											<Calendar
												className="text-red-500 dark:text-red-400"
												size={14}
											/>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Desde
											</label>
										</div>
										<select
											className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
											value={selectedRipte?.id || ""}
											onChange={(e) => {
												const ripte = allRiptes.find(
													(r) => r.id === parseInt(e.target.value),
												);
												setSelectedRipte(ripte || null);
											}}
										>
											<option value="">Seleccione RIPTE Fecha Desde</option>
											{allRiptes.map((ripte) => (
												<option key={ripte.id} value={ripte.id}>
													{ripte.month} {ripte.year} - $
													{Number(ripte.value).toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</option>
											))}
										</select>
									</div>
									<div>
										<div className="flex items-center gap-1.5 mb-1.5">
											<Calendar
												className="text-green-500 dark:text-green-400"
												size={14}
											/>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Hasta
											</label>
										</div>
										<select
											className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
											value={selectedRipteHasta?.id || ""}
											onChange={(e) => {
												const ripte = allRiptes.find(
													(r) => r.id === parseInt(e.target.value),
												);
												setSelectedRipteHasta(ripte || null);
											}}
										>
											<option value="">Seleccione RIPTE Fecha Hasta</option>
											{allRiptes.map((ripte) => (
												<option key={ripte.id} value={ripte.id}>
													{ripte.month} {ripte.year} - $
													{Number(ripte.value).toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</option>
											))}
										</select>
									</div>
								</div>
							</div>

							{/* Tabla de Remuneraciones */}
							{remuneraciones.length > 0 && (
								<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3">
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-1.5">
											<BarChart3
												className="text-gray-600 dark:text-gray-400"
												size={14}
											/>
											<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
												Tabla de Remuneraciones
											</h3>
										</div>

										{/* Botón Replicar Haberes */}
										{hayHaberesIngresados && (
											<button
												onClick={handleReplicarHaberes}
												className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-md text-[16px] flex items-center gap-1 transition-colors shadow-sm"
											>
												<Copy size={12} />
												Replicar
											</button>
										)}
									</div>

									{/* Botón adicional arriba de la tabla */}
									{hayHaberesIngresados && (
										<div className="mb-2">
											<button
												onClick={handleReplicarHaberes}
												className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all shadow-sm"
											>
												<Copy size={14} />
												<span className="text-sm">
													Replicar Primer Haber a Todas las Filas
												</span>
											</button>
										</div>
									)}
									<div className="grid grid-cols-1 lg:grid-cols-11 gap-4">
										{/* Tabla Principal - 8 columnas */}
										<div className="lg:col-span-8">
											<div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
												<table className="min-w-full">
													<thead className="bg-linear-to-r from-blue-600 to-blue-800 text-white">
														<tr>
															<th className="px-2 py-2 text-center font-bold text-[16px] uppercase tracking-wide">
																PERIODO
															</th>
															<th className="px-2 py-2 text-center font-bold text-[16px] uppercase tracking-wide">
																HABERES
															</th>
															<th className="px-2 py-2 text-center font-bold text-[16px] uppercase tracking-wide">
																RIPTE MES
															</th>
															<th className="px-2 py-2 text-center font-bold text-[16px] uppercase tracking-wide">
																AJUSTADO
															</th>
														</tr>
													</thead>
													<tbody className="bg-white dark:bg-gray-700">
														{remuneraciones.map((row, index) => (
															<tr key={index}>
																<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-[16px] text-gray-900 dark:text-white">
																	{row.periodo}
																</td>
																<td className="border border-gray-300 dark:border-gray-600 px-1 py-1">
																	<input
																		type="text"
																		className="w-full px-1 py-0.5 text-[16px] border-0 bg-transparent text-right text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
																		value={row.haberes || ""}
																		onChange={(e) =>
																			handleHaberesChange(index, e.target.value)
																		}
																		placeholder="0"
																	/>
																</td>
																<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-right text-[16px] text-gray-900 dark:text-white">
																	{row.ripteDelMes
																		? row.ripteDelMes.toFixed(2)
																		: "-"}
																</td>
																<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-right text-[16px] text-gray-900 dark:text-white">
																	{row.haber_ajustado
																		? `$ ${row.haber_ajustado.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
																		: "-"}
																</td>
															</tr>
														))}
														<tr className="bg-gray-100 dark:bg-gray-600 font-semibold">
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-[16px] text-gray-900 dark:text-white">
																TOTAL
															</td>
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-right text-[16px] text-gray-900 dark:text-white">
																${" "}
																{totalHaberes.toLocaleString("es-AR", {
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																})}
															</td>
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1"></td>
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-right text-[16px] text-gray-900 dark:text-white">
																${" "}
																{totalHaberesAjustados.toLocaleString("es-AR", {
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																})}
															</td>
														</tr>
														<tr className="bg-gray-100 dark:bg-gray-600 font-semibold">
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-[16px] text-gray-900 dark:text-white">
																PROMEDIO
															</td>
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1"></td>
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1"></td>
															<td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-right text-[16px] text-gray-900 dark:text-white">
																${" "}
																{promedioHaberesAjustados.toLocaleString(
																	"es-AR",
																	{
																		minimumFractionDigits: 2,
																		maximumFractionDigits: 2,
																	},
																)}
															</td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>

										{/* Tabla de Porcentajes RIPTE - 3 columnas */}
										<div className="lg:col-span-3">
											<div className="overflow-x-auto max-h-150 overflow-y-auto">
												<table className="min-w-full border border-gray-300 dark:border-gray-600">
													<thead className="bg-teal-500 text-white sticky top-0">
														<tr>
															<th className="border border-gray-300 dark:border-gray-600 px-1 py-1.5 text-center text-[9px] uppercase">
																PERÍODO
															</th>
															<th className="border border-gray-300 dark:border-gray-600 px-1 py-1.5 text-center text-[9px] uppercase">
																3M ATRÁS
															</th>
															<th className="border border-gray-300 dark:border-gray-600 px-1 py-1.5 text-center text-[9px] uppercase">
																%
															</th>
														</tr>
													</thead>
													<tbody className="bg-white dark:bg-gray-700">
														{porcentajesRipte.map((row, index) => (
															<tr key={index}>
																<td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center text-[16px] text-gray-900 dark:text-white">
																	{row.mesPeriodo}
																</td>
																<td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center text-[16px] text-gray-900 dark:text-white">
																	{row.mesCorriendo}
																</td>
																<td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[16px] text-gray-900 dark:text-white">
																	{row.riptePercentage !== null
																		? `${row.riptePercentage.toFixed(2)}`
																		: "-"}
																</td>
															</tr>
														))}
														<tr className="bg-teal-100 dark:bg-teal-900 font-semibold">
															<td
																className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center text-[16px] text-gray-900 dark:text-white"
																colSpan={2}
															>
																TOTAL
															</td>
															<td className="border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[16px] text-gray-900 dark:text-white">
																{(() => {
																	const totalPercentage =
																		porcentajesRipte.reduce((sum, row) => {
																			if (row.riptePercentage !== null) {
																				return sum + row.riptePercentage;
																			}
																			return sum;
																		}, 0);
																	return `${totalPercentage.toFixed(2)}`;
																})()}
															</td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* Sección de Cálculo Final */}
							{selectedCause && selectedFile && (
								<div className="bg-linear-to-br from-slate-50 to-zinc-100 dark:from-slate-900 dark:to-zinc-900 rounded-xl shadow-2xl p-8 border-2 border-slate-200 dark:border-slate-700">
									<div className="flex items-center gap-4 mb-8">
										<div className="bg-linear-to-r from-green-500 to-emerald-600 p-4 rounded-xl text-white">
											<Calculator size={32} />
										</div>
										<div>
											<h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
												Cálculo Final de LRT
											</h3>
											<p className="text-slate-600 dark:text-slate-400 text-lg mt-1">
												Resultados automáticos según normativa vigente
											</p>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* Columna Izquierda - Cálculos */}
										<div className="space-y-2">
											<div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
													IBM CON RIPTE:
												</span>
												<span className="text-[16px] font-semibold text-gray-900 dark:text-white">
													${" "}
													{promedioHaberesAjustados.toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</span>
											</div>
											<div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
													TASA VARIACIÓN:
												</span>
												<span className="text-[16px] font-semibold text-gray-900 dark:text-white">
													{tasaDeVariacion.toFixed(2)}%
												</span>
											</div>
											<div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
													IBM TOTAL:
												</span>
												<span className="text-[16px] font-semibold text-gray-900 dark:text-white">
													${" "}
													{ibmTotal.toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</span>
											</div>
											<div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
													% INCAPACIDAD
												</span>
												<span className="text-[16px] font-semibold text-gray-900 dark:text-white">
													{disabilityPercentage !== null
														? `${disabilityPercentage}%`
														: "0%"}
												</span>
											</div>
											<div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
													COEF. EDAD
												</span>
												<span className="text-[16px] font-semibold text-gray-900 dark:text-white">
													{customerAge !== null
														? coeficienteEdad.toFixed(2)
														: "0"}
												</span>
											</div>
											<div className="flex justify-between items-center py-2 bg-blue-50 dark:bg-blue-900/30 px-2 rounded-md border border-blue-200 dark:border-blue-700">
												<span className="text-sm font-bold text-blue-900 dark:text-blue-100">
													TOTAL FÓRMULA
												</span>
												<span className="text-sm font-bold text-blue-900 dark:text-blue-100">
													${" "}
													{totalFormula.toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</span>
											</div>{" "}
											{/* Switch para activar 20% adicional */}
											<div className="flex items-center justify-between py-1.5 bg-gray-100 dark:bg-gray-800 px-2 rounded-md border border-gray-300 dark:border-gray-600">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
													Activar 20%
												</span>
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														className="sr-only peer"
														checked={activar20Porciento}
														onChange={(e) =>
															setActivar20Porciento(e.target.checked)
														}
													/>
													<div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
												</label>
											</div>
											{/* Mostrar 20% adicional cuando esté activado */}
											{activar20Porciento && (
												<div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
													<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
														20% TOTAL:
													</span>
													<span className="text-[16px] font-semibold text-gray-900 dark:text-white">
														${" "}
														{veintePorCiento.toLocaleString("es-AR", {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</span>
												</div>
											)}
											{/* Total Indemnización */}
											<div
												className={`flex justify-between items-center py-2 px-2 rounded-md border ${
													activar20Porciento
														? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700"
														: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700"
												}`}
											>
												<span
													className={`font-bold text-sm ${
														activar20Porciento
															? "text-green-900 dark:text-green-100"
															: "text-blue-900 dark:text-blue-100"
													}`}
												>
													TOTAL INDEM. {activar20Porciento ? "(+20%)" : ""}
												</span>
												<span
													className={`font-bold text-sm ${
														activar20Porciento
															? "text-green-900 dark:text-green-100"
															: "text-blue-900 dark:text-blue-100"
													}`}
												>
													${" "}
													{totalIndemnizacion.toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</span>
											</div>
											{/* Sección de Intereses 8% Anual */}
											{accidentDate && totalIndemnizacion > 0 && (
												<div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
													<h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
														<span>📈</span>
														INTERÉS TASA 8% ANUAL
													</h4>

													<div className="space-y-1">
														{interesesCalculados.map((item, index) => (
															<div
																key={index}
																className="flex justify-between items-center py-1 border-b border-yellow-200 dark:border-yellow-600"
															>
																<div className="flex items-center gap-4">
																	<span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 min-w-12.5">
																		{item.año}
																	</span>
																	<span className="text-sm text-yellow-800 dark:text-yellow-200">
																		Cantidad de días: {item.dias}
																	</span>
																</div>
																<span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
																	${" "}
																	{item.interesDelAño.toLocaleString("es-AR", {
																		minimumFractionDigits: 2,
																		maximumFractionDigits: 2,
																	})}
																</span>
															</div>
														))}

														<div className="flex justify-between items-center py-2 mt-2 bg-yellow-100 dark:bg-yellow-800 px-2 rounded border border-yellow-300 dark:border-yellow-600">
															<span className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
																TOTAL INTERESES
															</span>
															<span className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
																${" "}
																{totalIntereses.toLocaleString("es-AR", {
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																})}
															</span>
														</div>

														<div className="flex justify-between items-center py-2 mt-1 bg-orange-100 dark:bg-orange-900 px-2 rounded border border-orange-300 dark:border-orange-600">
															<span className="text-sm font-bold text-orange-900 dark:text-orange-100">
																TOTAL CON INTERESES
															</span>
															<span className="text-sm font-bold text-orange-900 dark:text-orange-100">
																${" "}
																{totalConIntereses.toLocaleString("es-AR", {
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																})}
															</span>
														</div>
													</div>
												</div>
											)}
											{/* Input para Piso Mínimo */}
											<div className="flex items-center gap-2 py-1.5 bg-gray-100 dark:bg-gray-800 px-2 rounded-md border border-gray-300 dark:border-gray-600">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300 min-w-17.5">
													Piso Mín:
												</span>
												<input
													type="number"
													step="0.01"
													className="flex-1 px-2 py-1 text-[16px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
													value={pisoMinimo !== null ? pisoMinimo : ""}
													onChange={(e) =>
														setPisoMinimo(
															e.target.value
																? parseFloat(e.target.value)
																: null,
														)
													}
													placeholder="Ingrese piso mínimo"
												/>
												<span className="text-[16px] font-semibold text-gray-900 dark:text-white min-w-25 text-right">
													${" "}
													{totalPisoMinimo.toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</span>
											</div>
											{/* Switch para activar 20% del piso mínimo */}
											<div className="flex items-center justify-between py-1.5 bg-gray-100 dark:bg-gray-800 px-2 rounded-md border border-gray-300 dark:border-gray-600">
												<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
													Activar Piso
												</span>
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														className="sr-only peer"
														checked={activarPisoMinimo}
														onChange={(e) =>
															setActivarPisoMinimo(e.target.checked)
														}
													/>
													<div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
												</label>
											</div>
											{/* Mostrar 20% del piso mínimo cuando esté activado */}
											{activarPisoMinimo && totalPisoMinimo > 0 && (
												<div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
													<span className="text-[16px] font-medium text-gray-700 dark:text-gray-300">
														20% PISO:
													</span>
													<span className="text-[16px] font-semibold text-gray-900 dark:text-white">
														${" "}
														{veintePorCientoPiso.toLocaleString("es-AR", {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</span>
												</div>
											)}
											{/* Total Piso Mínimo Final */}
											{totalPisoMinimo > 0 && (
												<div
													className={`flex justify-between items-center py-2 px-2 rounded-md border ${
														activarPisoMinimo
															? "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700"
															: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
													}`}
												>
													<span
														className={`font-bold text-sm ${
															activarPisoMinimo
																? "text-purple-900 dark:text-purple-100"
																: "text-gray-900 dark:text-gray-100"
														}`}
													>
														TOTAL PISO {activarPisoMinimo ? "(+20%)" : ""}
													</span>
													<span
														className={`font-bold text-sm ${
															activarPisoMinimo
																? "text-purple-900 dark:text-purple-100"
																: "text-gray-900 dark:text-gray-100"
														}`}
													>
														${" "}
														{totalPisoMinimoFinal.toLocaleString("es-AR", {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</span>
												</div>
											)}
										</div>

										{/* Columna Derecha - Información adicional */}
										<div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
											<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
												Detalles del Cálculo
											</h4>
											<div className="space-y-1 text-[16px] text-gray-600 dark:text-gray-400">
												<p>
													<strong>F. Accidente:</strong>{" "}
													{accidentDate
														? new Date(accidentDate).toLocaleDateString("es-AR")
														: "No def."}
												</p>
												<p>
													<strong>Edad:</strong>{" "}
													{customerAge !== null
														? `${customerAge} años`
														: "No def."}
												</p>
												<p>
													<strong>Incapacidad:</strong>{" "}
													{disabilityPercentage !== null
														? `${disabilityPercentage}%`
														: "No def."}
												</p>
												<p>
													<strong>RIPTE:</strong>{" "}
													{selectedRipte
														? `${selectedRipte.month} ${selectedRipte.year} - $${Number(selectedRipte.value).toLocaleString("es-AR")}`
														: "No sel."}
												</p>
												<p>
													<strong>IBM Prom.:</strong> $
													{promedioHaberesAjustados.toLocaleString("es-AR", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</p>
											</div>

											<div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700">
												<p className="text-[16px] text-yellow-800 dark:text-yellow-200">
													<strong>Nota:</strong> Cálculos según LRT. Verificar
													coef. de edad.
												</p>
											</div>

											{/* Botones de Acción */}
											<div className="mt-3 space-y-2">
												<button
													onClick={handleGeneratePDF}
													disabled={isGeneratingPDF || !totalFormula}
													className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors text-sm"
												>
													{isGeneratingPDF ? (
														<>
															<div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
															Generando...
														</>
													) : (
														<>
															<Download size={14} />
															PDF
														</>
													)}
												</button>

												<button
													onClick={handleSaveLiquidacion}
													disabled={isSaving || !totalFormula}
													className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors text-sm"
												>
													{isSaving ? (
														<>
															<div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
															Guardando...
														</>
													) : (
														<>
															<Save size={14} />
															Guardar
														</>
													)}
												</button>

												<button
													onClick={() =>
														setShowSavedLiquidations(!showSavedLiquidations)
													}
													disabled={!selectedFile}
													className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors text-sm"
												>
													<FileText size={14} />
													Ver Guardadas ({savedLiquidations.length})
												</button>
											</div>

											{/* Modal de liquidaciones guardadas */}
											{showSavedLiquidations && (
												<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
													<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
														<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
															<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
																Liquidaciones Guardadas
															</h3>
															<button
																onClick={() => setShowSavedLiquidations(false)}
																className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
															>
																<X size={20} />
															</button>
														</div>
														<div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
															{savedLiquidations.length === 0 ? (
																<p className="text-center text-gray-500 dark:text-gray-400 py-8">
																	No hay liquidaciones guardadas para este
																	expediente
																</p>
															) : (
																<div className="space-y-3">
																	{savedLiquidations.map((liq: any) => (
																		<div
																			key={liq.id}
																			className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
																		>
																			<div className="flex items-start justify-between">
																				<div className="flex-1">
																					<h4 className="font-semibold text-gray-900 dark:text-white">
																						{liq.fileName}
																					</h4>
																					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
																						{liq.description}
																					</p>
																					<div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
																						<span>
																							📅{" "}
																							{new Date(
																								liq.uploadedAt,
																							).toLocaleDateString("es-AR")}
																						</span>
																						{liq.uploadedBy && (
																							<span>
																								👤 {liq.uploadedBy.name}
																							</span>
																						)}
																					</div>
																				</div>
																				<button
																					onClick={() =>
																						handleLoadLiquidation(liq.id)
																					}
																					className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
																				>
																					<Download size={14} />
																					Cargar
																				</button>
																			</div>
																		</div>
																	))}
																</div>
															)}
														</div>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
