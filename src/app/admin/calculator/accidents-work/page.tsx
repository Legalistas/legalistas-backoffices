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
import { apiErrorMessage } from "@/lib/api-error";
import {
	ajustarHaber,
	buscarRipte,
	edadALaFecha,
	type FilaVariacion,
	fechaISO,
	filasVariacion,
	formatFecha,
	hoyISO,
	interesesPorAnio,
	mesDeRipte,
	parseFecha,
	periodosIBM,
	variacionAcumulada,
} from "@/lib/lrt/calculo";
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

	// Desde un caso se arranca con lo guardado para ESE expediente, nunca con
	// el último cálculo de otro caso (dejaba haberes y meses de otra fecha).
	const [_init] = useState<any>(() => {
		try {
			const stored = localStorage.getItem(getStorageKey(urlFileId ? Number(urlFileId) : undefined));
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
	const [porcentajesRipte, setPorcentajesRipte] = useState<FilaVariacion[]>(
		_init?.porcentajesRipte ?? [],
	);
	const [activar20Porciento, setActivar20Porciento] = useState(_init?.activar20Porciento ?? false);
	const [pisoMinimo, setPisoMinimo] = useState<number | null>(_init?.pisoMinimo ?? null);
	const [activarPisoMinimo, setActivarPisoMinimo] = useState(_init?.activarPisoMinimo ?? false);
	const [isSaving, setIsSaving] = useState(false);
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
	const [savedLiquidations, setSavedLiquidations] = useState<any[]>([]);
	const [showSavedLiquidations, setShowSavedLiquidations] = useState(false);
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

				// El expediente que viene en la URL; sin fileId, el único que haya.
				const matchingFile = urlFileId
					? matchingCause.files?.find((f) => f.id === parseInt(urlFileId))
					: matchingCause.files?.length === 1
						? matchingCause.files[0]
						: undefined;
				if (matchingFile) {
					setSelectedFile(matchingFile);
					// Fecha literal del expediente (con `new Date` se corría un día
					// y el 1° de enero pasaba al año anterior).
					if (matchingFile.accidentDate) setAccidentDate(fechaISO(matchingFile.accidentDate));
					if (matchingFile.disabilityPercentage) {
						setDisabilityPercentage(Number(matchingFile.disabilityPercentage));
					}
				}
				// La edad sale de la fecha de nacimiento y la del accidente (efecto de abajo).
			}
		}
	}, [urlCaseId, urlFileId, causes, selectedCause]);

	// RIPTE vigente: el del mes y año del accidente, leídos de la fecha literal.
	// Antes pasaba por `new Date(fecha)` en hora local: un accidente el día 1
	// tomaba el RIPTE del mes anterior (el 1° de enero, del año anterior) y
	// corría toda la tabla de 12 meses.
	useEffect(() => {
		const fecha = parseFecha(accidentDate);
		if (!fecha || allRiptes.length === 0) return;
		const ripteVigente = buscarRipte(allRiptes, fecha.anio, fecha.mes);
		if (ripteVigente) setSelectedRipte(ripteVigente);
	}, [accidentDate, allRiptes]);

	// Edad a la fecha del accidente (art. 14: 65 / edad a la primera
	// manifestación invalidante), no a hoy.
	const birthDate = selectedCause?.customer?.userProfile?.birthDate ?? null;
	useEffect(() => {
		if (birthDate) setCustomerAge(edadALaFecha(birthDate, accidentDate));
	}, [birthDate, accidentDate]);

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

	const handleSelectFile = (cause: CalculatorCause, file: CaseFile) => {
		// Cada expediente con sus propios datos: lo guardado para él o en
		// blanco, nunca los haberes del expediente anterior.
		let guardado: any = null;
		try {
			const raw = localStorage.getItem(getStorageKey(file.id));
			guardado = raw ? JSON.parse(raw) : null;
		} catch {
			guardado = null;
		}
		setRemuneraciones(guardado?.remuneraciones ?? []);
		setPorcentajesRipte(guardado?.porcentajesRipte ?? []);
		setDateUntil(guardado?.dateUntil ?? "");
		setActivar20Porciento(guardado?.activar20Porciento ?? false);
		setPisoMinimo(guardado?.pisoMinimo ?? null);
		setActivarPisoMinimo(guardado?.activarPisoMinimo ?? false);
		if (guardado?.tasaInteresAnual != null) setTasaInteresAnual(guardado.tasaInteresAnual);

		setSelectedCause(cause);
		setSelectedFile(file);
		setSearchTerm(cause.customer.name);
		setShowSuggestions(false);
		setAccidentDate(fechaISO(file.accidentDate));
		setDisabilityPercentage(
			file.disabilityPercentage ? Number(file.disabilityPercentage) : null,
		);
		// Con fecha de nacimiento la edad la calcula el efecto; sin ella se carga a mano.
		if (!cause.customer.userProfile?.birthDate) setCustomerAge(null);
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

	// Tabla de remuneraciones: los 12 meses anteriores al del RIPTE vigente (el
	// del accidente). Se rearma siempre que cambia el mes o el expediente, así
	// nunca queda con los meses de otra fecha; los haberes ya cargados se
	// conservan en el mes que corresponde.
	useEffect(() => {
		if (!selectedRipte) {
			setRemuneraciones([]);
			return;
		}
		// allRiptes aún cargando desde la API: no tocar lo que hay.
		if (allRiptes.length === 0) return;

		const { anio, mes } = mesDeRipte(selectedRipte);
		const vigente = Number(selectedRipte.value);
		setRemuneraciones((prev) => {
			const haberes = new Map(prev.map((r) => [r.periodo, r.haberes]));
			return periodosIBM(anio, mes).map((p) => {
				const ripte = buscarRipte(allRiptes, p.anio, p.mes);
				const ripteDelMes = ripte ? Number(ripte.value) : null;
				const haber = haberes.get(p.periodo) ?? "";
				return {
					periodo: p.periodo,
					haberes: haber,
					ripteDelMes,
					haber_ajustado: ajustarHaber(haber, vigente, ripteDelMes),
				};
			});
		});
	}, [selectedRipte, allRiptes, selectedFile?.id]);

	// Tabla de variación del RIPTE (DNU 669/19): de "Desde" a "Hasta". Se rearma
	// con el rango; solo se conservan los porcentajes cargados a mano.
	useEffect(() => {
		if (!selectedRipte || !selectedRipteHasta) {
			setPorcentajesRipte([]);
			return;
		}
		if (allRiptes.length === 0) return;

		const filas = filasVariacion(allRiptes, mesDeRipte(selectedRipte), mesDeRipte(selectedRipteHasta));
		setPorcentajesRipte((prev) => {
			const editados = new Map(
				prev.filter((r) => r.editado).map((r) => [r.mesPeriodo, r.riptePercentage]),
			);
			return filas.map((f) =>
				editados.has(f.mesPeriodo)
					? { ...f, riptePercentage: editados.get(f.mesPeriodo) ?? null, editado: true }
					: f,
			);
		});
	}, [selectedRipte, selectedRipteHasta, allRiptes, selectedFile?.id]);

	const calcularHaberAjustado = (index: number, haberes: string) =>
		selectedRipte
			? ajustarHaber(haberes, Number(selectedRipte.value), remuneraciones[index]?.ripteDelMes ?? null)
			: null;

	const handlePorcentajeChange = (index: number, value: string) => {
		const newPorcentajes = [...porcentajesRipte];
		newPorcentajes[index] = {
			...newPorcentajes[index],
			riptePercentage: value !== "" ? parseFloat(value) : null,
			editado: true,
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

	// Tasa de variación del RIPTE en el período: acumulada (∏(1 + p) − 1), no
	// la suma de los porcentajes mensuales.
	const tasaDeVariacion = variacionAcumulada(porcentajesRipte.map((row) => row.riptePercentage));

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

	// Interés simple anual sobre el total de la indemnización, desde la fecha
	// del accidente hasta "Hasta" (vacío = hoy). Los días suman exacto: antes
	// se ignoraba "Hasta" y se contaban días de más al partir por año.
	const fechaHasta = dateUntil || hoyISO();
	const interesesCalculados = interesesPorAnio(totalIndemnizacion, tasaInteresAnual, accidentDate, fechaHasta);
	const totalIntereses = interesesCalculados.reduce(
		(sum, item) => sum + item.interesDelAño,
		0,
	);
	const totalConIntereses = totalIndemnizacion + totalIntereses;

	// Lo que va al PDF y lo que se guarda en la causa para poder volver a
	// abrirla: el mismo objeto, con las fechas literales "YYYY-MM-DD".
	const datosLiquidacion = {
		cliente: selectedCause?.customer.name || "Sin causa asociada",
		expediente:
			selectedFile?.cuij || (selectedFile ? `Expediente #${selectedFile.id}` : "Sin expediente"),
		fechaAccidente: accidentDate,
		fechaHasta,
		dateUntil,
		edad: customerAge,
		incapacidad: disabilityPercentage,
		ibmConRipte: promedioHaberesAjustados,
		tasaVariacion: tasaDeVariacion,
		ibmTotal,
		coeficienteEdad,
		totalFormula,
		activar20Porciento,
		veintePorCiento,
		totalIndemnizacion,
		pisoMinimo,
		totalPisoMinimo,
		activarPisoMinimo,
		veintePorCientoPiso,
		totalPisoMinimoFinal,
		remuneraciones,
		porcentajesRipte,
		selectedRipte,
		selectedRipteHasta,
		tasaInteresAnual,
		interesesCalculados,
		totalIntereses,
		totalConIntereses,
	};

	// Descargar el PDF sin guardarlo en la causa.
	const handleGeneratePDF = async () => {
		setIsGeneratingPDF(true);
		try {
			const response = await fetch(`${API_BASE_URL}/lrt/generate-pdf`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(datosLiquidacion),
			});
			if (!response.ok) {
				throw new Error(await apiErrorMessage(response, "Error al generar el PDF"));
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Liquidacion_LRT_${selectedCause?.customer.name || "calculadora"}_${formatFecha(hoyISO()).replace(/\//g, "-")}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Error al generar PDF:", error);
			toast.error(error instanceof Error ? error.message : "Error al generar el PDF");
		} finally {
			setIsGeneratingPDF(false);
		}
	};

	// Guardar en la causa: el backend arma el PDF y lo deja en la carpeta
	// 5_LIQUIDACIONES del caso como archivo nuevo (cada recálculo es otra
	// versión, no se pisa ninguna) y guarda los datos para volver a abrirla.
	const handleSaveLiquidacion = async () => {
		if (!selectedCause || !selectedFile || !session?.user?.accessToken) {
			toast.error("Seleccioná la causa y el expediente primero");
			return;
		}
		if (!hayHaberesIngresados) {
			toast.error("Cargá los haberes antes de guardar la liquidación");
			return;
		}

		setIsSaving(true);
		try {
			const response = await fetch(`${API_BASE_URL}/lrt/save-liquidation`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
				body: JSON.stringify({
					caseId: selectedFile.caseId,
					fileId: selectedFile.id,
					fileName: `Liquidacion_LRT_${selectedCause.customer.name}_${formatFecha(hoyISO()).replace(/\//g, "-")}.json`,
					calculationData: { ...datosLiquidacion, fechaCalculo: new Date().toISOString() },
				}),
			});
			if (!response.ok) {
				throw new Error(await apiErrorMessage(response, "Error al guardar la liquidación"));
			}
			const result = await response.json();
			toast.success(result.message ?? "Liquidación guardada en la causa");
			fetchSavedLiquidations(selectedFile.caseId);
		} catch (error) {
			console.error("Error al guardar liquidación:", error);
			toast.error(error instanceof Error ? error.message : "Error al guardar la liquidación");
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

	// Abre una liquidación guardada tal como se guardó (los porcentajes quedan
	// como cargados a mano para no pisarlos con los del RIPTE actual).
	const handleLoadLiquidation = async (liquidationId: number) => {
		if (!session?.user?.accessToken) return;

		try {
			const response = await fetch(`${API_BASE_URL}/lrt/liquidation/${liquidationId}`, {
				headers: { Authorization: `Bearer ${session.user.accessToken}` },
			});
			if (!response.ok) {
				throw new Error(await apiErrorMessage(response, "Error al cargar la liquidación"));
			}
			const result = await response.json();
			const data = result.liquidation.calculationData;

			setRemuneraciones(Array.isArray(data.remuneraciones) ? data.remuneraciones : []);
			setPorcentajesRipte(
				Array.isArray(data.porcentajesRipte)
					? data.porcentajesRipte.map((r: FilaVariacion) => ({ ...r, editado: true }))
					: [],
			);
			if (data.fechaAccidente) setAccidentDate(fechaISO(data.fechaAccidente));
			if (data.incapacidad != null) setDisabilityPercentage(Number(data.incapacidad));
			// Sin fecha de nacimiento, la edad es la guardada; con ella, la recalcula el efecto.
			if (data.edad != null && !hasCustomerBirthDate) setCustomerAge(data.edad);
			setDateUntil(data.dateUntil ?? "");
			if (data.selectedRipte) setSelectedRipte(data.selectedRipte);
			if (data.selectedRipteHasta) setSelectedRipteHasta(data.selectedRipteHasta);
			setActivar20Porciento(Boolean(data.activar20Porciento));
			setPisoMinimo(data.pisoMinimo ?? null);
			setActivarPisoMinimo(Boolean(data.activarPisoMinimo));
			if (data.tasaInteresAnual != null) setTasaInteresAnual(Number(data.tasaInteresAnual));

			setShowSavedLiquidations(false);
			toast.success("Liquidación cargada");
		} catch (error) {
			console.error("Error al cargar liquidación:", error);
			toast.error(error instanceof Error ? error.message : "Error al cargar la liquidación");
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
									{formatFecha(selectedFile.accidentDate)}
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
																{formatFecha(file.accidentDate)}
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
									<Input type="date" value={fechaHasta} onChange={(e) => setDateUntil(e.target.value)} />
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
									<span className="text-muted-foreground">TASA VARIACIÓN (acumulada)</span>
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
											<h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">INTERÉS TASA ANUAL <span className="font-normal">hasta el {formatFecha(fechaHasta)}</span></h4>
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
									<p><strong>F. Accidente:</strong> {accidentDate ? formatFecha(accidentDate) : "No def."}</p>
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
