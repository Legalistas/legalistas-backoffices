"use client";

import {
	BarChart3,
	Briefcase,
	Cake,
	Calculator,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Copy,
	DollarSign,
	Download,
	FileText,
	Percent,
	PercentCircle,
	Shield,
	User,
	X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CALCULATOR_CAUSES_LIST_ENDPOINT } from "@/constant/api-endpoints";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── Interfaces ─────────────────────────────────────────────
interface Court {
	id: number;
	jurisdiction: { id: number; name: string };
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
		userProfile: { birthDate: string | null } | null;
	};
	files: CaseFile[];
}

// ─── Constants ──────────────────────────────────────────────
const TIPO_DESPIDO_OPTIONS = [
	{ value: "sin_causa", label: "Despido sin causa" },
	{ value: "indirecto", label: "Despido indirecto" },
	{ value: "con_causa", label: "Despido con causa" },
	{ value: "renuncia", label: "Renuncia" },
];

// ─── Page Component ─────────────────────────────────────────
export default function DismissalCalculatorPage() {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const urlCaseId = searchParams.get("caseId");
	const urlFileId = searchParams.get("fileId");

	// Cause/file selection
	const [causes, setCauses] = useState<CalculatorCause[]>([]);
	const [selectedCause, setSelectedCause] =
		useState<CalculatorCause | null>(null);
	const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);

	// ─── localStorage persistence ────────────────────────────
	const STORAGE_KEY = "calculator_dismissal_data";

	const [_init] = useState<any>(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			return stored ? JSON.parse(stored) : null;
		} catch { return null; }
	});

	// Parameters (inicializados desde localStorage)
	const [fechaIngreso, setFechaIngreso] = useState(_init?.fechaIngreso || "");
	const [fechaEgreso, setFechaEgreso] = useState(_init?.fechaEgreso || "");
	const [mejorRemuneracion, setMejorRemuneracion] = useState<number | null>(
		_init?.mejorRemuneracion ?? null,
	);
	const [topeCCT, setTopeCCT] = useState<number | null>(_init?.topeCCT ?? null);
	const [tipoDespido, setTipoDespido] = useState(_init?.tipoDespido || "sin_causa");

	// Multas switches
	const [activarArt2_25323, setActivarArt2_25323] = useState(_init?.activarArt2_25323 ?? false);
	const [activarArt1_25323, setActivarArt1_25323] = useState(_init?.activarArt1_25323 ?? false);
	const [activarArt80, setActivarArt80] = useState(_init?.activarArt80 ?? false);
	const [activarDobleIndem, setActivarDobleIndem] = useState(_init?.activarDobleIndem ?? false);

	// Interest
	const [tasaInteresAnual, setTasaInteresAnual] = useState<number>(_init?.tasaInteresAnual ?? 8);

	// UI
	const [activeTab, setActiveTab] = useState("parametros");
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

	// Guardar datos automáticamente cuando cambian
	useEffect(() => {
		const dataToSave = {
			fechaIngreso, fechaEgreso, mejorRemuneracion, topeCCT,
			tipoDespido, activarArt2_25323, activarArt1_25323,
			activarArt80, activarDobleIndem, tasaInteresAnual,
		};
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
		} catch (e) { /* ignore */ }
	}, [
		fechaIngreso, fechaEgreso, mejorRemuneracion, topeCCT,
		tipoDespido, activarArt2_25323, activarArt1_25323,
		activarArt80, activarDobleIndem, tasaInteresAnual,
	]);

	// ─── Derived: Antigüedad ────────────────────────────────
	const antiguedad = useMemo(() => {
		if (!fechaIngreso || !fechaEgreso)
			return { years: 0, months: 0, days: 0, totalMonths: 0, yearsForCalc: 0 };

		const start = new Date(fechaIngreso);
		const end = new Date(fechaEgreso);

		if (end <= start)
			return { years: 0, months: 0, days: 0, totalMonths: 0, yearsForCalc: 0 };

		let years = end.getFullYear() - start.getFullYear();
		let months = end.getMonth() - start.getMonth();
		let days = end.getDate() - start.getDate();

		if (days < 0) {
			months--;
			const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
			days += prevMonth.getDate();
		}
		if (months < 0) {
			years--;
			months += 12;
		}

		const totalMonths = years * 12 + months;

		// Art. 245: cada año o fracción mayor a 3 meses, mínimo 1
		let yearsForCalc = years;
		if (months > 3 || (months === 3 && days > 0)) yearsForCalc++;
		if (yearsForCalc < 1 && totalMonths >= 0) yearsForCalc = 1;

		return { years, months, days, totalMonths, yearsForCalc };
	}, [fechaIngreso, fechaEgreso]);

	const hasCustomerBirthDate =
		!!selectedCause?.customer?.userProfile?.birthDate;

	// Whether indemnification rubros apply
	const esIndemnizable =
		tipoDespido === "sin_causa" || tipoDespido === "indirecto";

	// ─── Derived: Calculations ──────────────────────────────
	const salarioDiario = (mejorRemuneracion || 0) / 30;

	// Días trabajados en el mes de egreso
	const diasTrabajadosMes = useMemo(() => {
		if (!fechaEgreso) return 0;
		const egreso = new Date(fechaEgreso);
		return egreso.getDate();
	}, [fechaEgreso]);
	const montoDiasTrabajados = salarioDiario * diasTrabajadosMes;

	// SAC proporcional
	const sacProporcional = useMemo(() => {
		if (!fechaEgreso || !mejorRemuneracion) return 0;
		const egreso = new Date(fechaEgreso);
		const month = egreso.getMonth();
		// Semestre: Ene-Jun o Jul-Dic
		const semesterStart =
			month < 6
				? new Date(egreso.getFullYear(), 0, 1)
				: new Date(egreso.getFullYear(), 6, 1);
		const daysInSemester = Math.ceil(
			(egreso.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24),
		);
		const totalSemesterDays = month < 6 ? 181 : 184;
		return (mejorRemuneracion / 2) * (daysInSemester / totalSemesterDays);
	}, [fechaEgreso, mejorRemuneracion]);

	// Vacaciones proporcionales
	const vacaciones = useMemo(() => {
		if (!fechaEgreso || !fechaIngreso || !mejorRemuneracion) return 0;
		const egreso = new Date(fechaEgreso);

		// Días de vacaciones según antigüedad
		const totalYears = antiguedad.years;
		let diasVacaciones = 14;
		if (totalYears > 20) diasVacaciones = 35;
		else if (totalYears > 10) diasVacaciones = 28;
		else if (totalYears > 5) diasVacaciones = 21;

		// Proporcional al tiempo trabajado en el año
		const startOfYear = new Date(egreso.getFullYear(), 0, 1);
		const daysInYear = Math.ceil(
			(egreso.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
		);
		const propDays = (diasVacaciones * daysInYear) / 365;

		// Art. 155: salario / 25 por día de vacación
		return (propDays * mejorRemuneracion) / 25;
	}, [fechaEgreso, fechaIngreso, mejorRemuneracion, antiguedad.years]);

	// SAC sobre vacaciones
	const sacSobreVacaciones = vacaciones / 12;

	// Preaviso
	const preaviso = useMemo(() => {
		if (!esIndemnizable || !mejorRemuneracion) return 0;
		if (antiguedad.totalMonths < 3) {
			// Período de prueba: 15 días
			return salarioDiario * 15;
		}
		if (antiguedad.totalMonths < 60) {
			// < 5 años: 1 mes
			return mejorRemuneracion;
		}
		// >= 5 años: 2 meses
		return mejorRemuneracion * 2;
	}, [
		esIndemnizable,
		mejorRemuneracion,
		antiguedad.totalMonths,
		salarioDiario,
	]);

	// SAC sobre preaviso
	const sacSobrePreaviso = preaviso / 12;

	// Integración mes de despido
	const integracion = useMemo(() => {
		if (!esIndemnizable || !fechaEgreso || !mejorRemuneracion) return 0;
		const egreso = new Date(fechaEgreso);
		const lastDay = new Date(
			egreso.getFullYear(),
			egreso.getMonth() + 1,
			0,
		).getDate();
		if (egreso.getDate() === lastDay) return 0; // último día del mes
		const daysRemaining = lastDay - egreso.getDate();
		return salarioDiario * daysRemaining;
	}, [esIndemnizable, fechaEgreso, mejorRemuneracion, salarioDiario]);

	// SAC sobre integración
	const sacSobreIntegracion = integracion / 12;

	// Indemnización por antigüedad (Art. 245)
	const art245 = useMemo(() => {
		if (!esIndemnizable || !mejorRemuneracion) return 0;
		const salary = topeCCT
			? Math.min(mejorRemuneracion, topeCCT)
			: mejorRemuneracion;
		return salary * antiguedad.yearsForCalc;
	}, [esIndemnizable, mejorRemuneracion, topeCCT, antiguedad.yearsForCalc]);

	// ─── Multas ─────────────────────────────────────────────
	// Art. 2 Ley 25.323: 50% de (preaviso + integración + art245)
	const multaArt2_25323 = activarArt2_25323
		? (preaviso + integracion + art245) * 0.5
		: 0;

	// Art. 1 Ley 25.323: duplica Art. 245
	const multaArt1_25323 = activarArt1_25323 ? art245 : 0;

	// Art. 80 LCT: 3 × MRMNH
	const multaArt80 = activarArt80 ? (mejorRemuneracion || 0) * 3 : 0;

	// Doble indemnización: duplica Art. 245
	const dobleIndem = activarDobleIndem ? art245 : 0;

	// ─── Totales ────────────────────────────────────────────
	const totalLiquidacionFinal =
		montoDiasTrabajados + sacProporcional + vacaciones + sacSobreVacaciones;

	const totalIndemnizacion =
		preaviso +
		sacSobrePreaviso +
		integracion +
		sacSobreIntegracion +
		art245;

	const totalMultas =
		multaArt2_25323 + multaArt1_25323 + multaArt80 + dobleIndem;

	const totalGeneral = totalLiquidacionFinal + totalIndemnizacion + totalMultas;

	// ─── Intereses ──────────────────────────────────────────
	const calcularIntereses = useCallback(() => {
		if (!fechaEgreso || totalGeneral <= 0) return [];

		const fechaInicio = new Date(fechaEgreso);
		const hoy = new Date();
		const añoInicio = fechaInicio.getFullYear();
		const añoFin = hoy.getFullYear();
		const interesesPorAño = [];

		for (let año = añoInicio; año <= añoFin; año++) {
			let diasDelAño = 0;

			if (año === añoInicio && año === añoFin) {
				diasDelAño = Math.ceil(
					(hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24),
				);
			} else if (año === añoInicio) {
				const finDelAño = new Date(año, 11, 31, 23, 59, 59);
				diasDelAño =
					Math.ceil(
						(finDelAño.getTime() - fechaInicio.getTime()) /
							(1000 * 60 * 60 * 24),
					) + 1;
			} else if (año === añoFin) {
				const inicioDelAño = new Date(año, 0, 1);
				diasDelAño =
					Math.ceil(
						(hoy.getTime() - inicioDelAño.getTime()) /
							(1000 * 60 * 60 * 24),
					) + 1;
			} else {
				diasDelAño =
					año % 4 === 0 && (año % 100 !== 0 || año % 400 === 0) ? 366 : 365;
			}

			const interesDiario =
				(totalGeneral * (tasaInteresAnual / 100)) / 365;
			const interesDelAño = interesDiario * diasDelAño;

			interesesPorAño.push({
				año,
				dias: diasDelAño,
				interesDiario,
				interesDelAño,
			});
		}

		return interesesPorAño;
	}, [fechaEgreso, totalGeneral, tasaInteresAnual]);

	const interesesCalculados = calcularIntereses();
	const totalIntereses = interesesCalculados.reduce(
		(sum, item) => sum + item.interesDelAño,
		0,
	);
	const totalConIntereses = totalGeneral + totalIntereses;

	// ─── Data Fetching ──────────────────────────────────────
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
			} catch (err) {
				console.error("Error fetching causes:", err);
			} finally {
				setLoading(false);
			}
		};

		if (session?.user?.accessToken) fetchCauses();
	}, [session]);

	// Close dropdown on outside click
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
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Auto-select from URL
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

				if (urlFileId && matchingCause.files) {
					const fileIdNum = parseInt(urlFileId);
					const matchingFile = matchingCause.files.find(
						(f) => f.id === fileIdNum,
					);
					if (matchingFile) setSelectedFile(matchingFile);
				} else if (matchingCause.files?.length === 1) {
					setSelectedFile(matchingCause.files[0]);
				}
			}
		}
	}, [urlCaseId, urlFileId, causes, selectedCause]);

	// ─── Helpers ─────────────────────────────────────────────
	const filteredCauses = causes.filter((cause) => {
		return (
			cause.customer.name
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			cause.files.some((file) =>
				file.cuij?.toLowerCase().includes(searchTerm.toLowerCase()),
			)
		);
	});

	const handleSelectFile = (cause: CalculatorCause, file: CaseFile) => {
		setSelectedCause(cause);
		setSelectedFile(file);
		setSearchTerm(cause.customer.name);
		setShowSuggestions(false);
	};

	const handleRemoveSelection = () => {
		setSelectedCause(null);
		setSelectedFile(null);
		setSearchTerm("");
	};

	const handleClearCalculatorData = () => {
		setFechaIngreso("");
		setFechaEgreso("");
		setMejorRemuneracion(null);
		setTopeCCT(null);
		setTipoDespido("sin_causa");
		setActivarArt2_25323(false);
		setActivarArt1_25323(false);
		setActivarArt80(false);
		setActivarDobleIndem(false);
		setTasaInteresAnual(8);
		try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
	};

	const formatCurrency = (value: number) => {
		return (
			"$" +
			value.toLocaleString("es-AR", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		);
	};

	const formatAntiguedad = () => {
		const parts = [];
		if (antiguedad.years > 0)
			parts.push(
				`${antiguedad.years} año${antiguedad.years > 1 ? "s" : ""}`,
			);
		if (antiguedad.months > 0)
			parts.push(
				`${antiguedad.months} mes${antiguedad.months > 1 ? "es" : ""}`,
			);
		if (antiguedad.days > 0)
			parts.push(
				`${antiguedad.days} día${antiguedad.days > 1 ? "s" : ""}`,
			);
		return parts.length > 0 ? parts.join(", ") : "—";
	};

	// ─── Clipboard ───────────────────────────────────────────
	const handleCopyResult = () => {
		const lines = [
			"CALCULADORA DE DESPIDOS",
			"",
			selectedCause ? "Cliente: " + selectedCause.customer.name : "",
			selectedFile?.cuij ? "CUIJ: " + selectedFile.cuij : "",
			"Fecha ingreso: " +
				(fechaIngreso
					? new Date(fechaIngreso).toLocaleDateString("es-AR")
					: "No def."),
			"Fecha egreso: " +
				(fechaEgreso
					? new Date(fechaEgreso).toLocaleDateString("es-AR")
					: "No def."),
			"Antigüedad: " + formatAntiguedad(),
			"Mejor remuneración: " +
				(mejorRemuneracion ? formatCurrency(mejorRemuneracion) : "No def."),
			"Tipo: " +
				(TIPO_DESPIDO_OPTIONS.find((t) => t.value === tipoDespido)?.label ||
					tipoDespido),
			"",
			"─── LIQUIDACIÓN FINAL ───",
			"Días trabajados: " + formatCurrency(montoDiasTrabajados),
			"SAC proporcional: " + formatCurrency(sacProporcional),
			"Vacaciones proporcionales: " + formatCurrency(vacaciones),
			"SAC s/vacaciones: " + formatCurrency(sacSobreVacaciones),
			"Subtotal: " + formatCurrency(totalLiquidacionFinal),
		];

		if (esIndemnizable) {
			lines.push(
				"",
				"─── INDEMNIZACIÓN ───",
				"Preaviso: " + formatCurrency(preaviso),
				"SAC s/preaviso: " + formatCurrency(sacSobrePreaviso),
				"Integración: " + formatCurrency(integracion),
				"SAC s/integración: " + formatCurrency(sacSobreIntegracion),
				"Art. 245 (Antigüedad): " + formatCurrency(art245),
				"Subtotal: " + formatCurrency(totalIndemnizacion),
			);
		}

		if (totalMultas > 0) {
			lines.push("", "─── MULTAS ───");
			if (multaArt2_25323 > 0)
				lines.push(
					"Art. 2 Ley 25.323: " + formatCurrency(multaArt2_25323),
				);
			if (multaArt1_25323 > 0)
				lines.push(
					"Art. 1 Ley 25.323: " + formatCurrency(multaArt1_25323),
				);
			if (multaArt80 > 0)
				lines.push("Art. 80 LCT: " + formatCurrency(multaArt80));
			if (dobleIndem > 0)
				lines.push("Doble indemnización: " + formatCurrency(dobleIndem));
			lines.push("Subtotal: " + formatCurrency(totalMultas));
		}

		lines.push(
			"",
			"TOTAL: " + formatCurrency(totalGeneral),
			totalIntereses > 0
				? "TOTAL INTERESES (" +
						tasaInteresAnual +
						"%): " +
						formatCurrency(totalIntereses)
				: "",
			totalIntereses > 0
				? "TOTAL CON INTERESES: " + formatCurrency(totalConIntereses)
				: "",
		);

		navigator.clipboard.writeText(lines.filter(Boolean).join("\n"));
		toast.success("Resultado copiado al portapapeles");
	};

	// ─── PDF ─────────────────────────────────────────────────
	const handleGeneratePDF = async () => {
		setIsGeneratingPDF(true);
		try {
			const pdfData = {
				tipo: "despido",
				cliente:
					selectedCause?.customer.name || "Sin causa asociada",
				expediente:
					selectedFile?.cuij ||
					(selectedFile
						? "Expediente #" + selectedFile.id
						: "Sin expediente"),
				fechaIngreso: fechaIngreso
					? new Date(fechaIngreso).toLocaleDateString("es-AR")
					: "",
				fechaEgreso: fechaEgreso
					? new Date(fechaEgreso).toLocaleDateString("es-AR")
					: "",
				antiguedad: formatAntiguedad(),
				mejorRemuneracion,
				topeCCT,
				tipoDespido,
				montoDiasTrabajados,
				sacProporcional,
				vacaciones,
				sacSobreVacaciones,
				totalLiquidacionFinal,
				preaviso,
				sacSobrePreaviso,
				integracion,
				sacSobreIntegracion,
				art245,
				totalIndemnizacion,
				multaArt2_25323,
				multaArt1_25323,
				multaArt80,
				dobleIndem,
				totalMultas,
				totalGeneral,
				interesesCalculados,
				totalIntereses,
				totalConIntereses,
				tasaInteresAnual,
			};

			const response = await fetch("/api/generate-dismissal-pdf", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(pdfData),
			});

			if (!response.ok) throw new Error("Error al generar PDF");

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download =
				"Liquidacion_Despido_" +
				(selectedCause?.customer.name || "calculadora") +
				"_" +
				new Date().toLocaleDateString("es-AR").replace(/\//g, "-") +
				".pdf";
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Error al generar PDF:", error);
			toast.error("Error al generar el PDF");
		} finally {
			setIsGeneratingPDF(false);
		}
	};

	// ─── Rubro Row helper ────────────────────────────────────
	const RubroRow = ({
		label,
		value,
		highlight,
		sub,
	}: {
		label: string;
		value: number;
		highlight?: boolean;
		sub?: boolean;
	}) => (
		<div
			className={`flex justify-between py-1.5 text-sm ${
				highlight
					? "py-2.5 px-3 rounded-md font-bold"
					: sub
						? "pl-4 text-muted-foreground text-xs"
						: "border-b"
			} ${
				highlight
					? "bg-primary/10 text-primary"
					: ""
			}`}
		>
			<span className={highlight ? "" : "text-muted-foreground"}>
				{label}
			</span>
			<span className={highlight ? "" : "font-medium"}>
				{formatCurrency(value)}
			</span>
		</div>
	);

	// ─── Render ──────────────────────────────────────────────
	return (
		<div className="container mx-auto p-4 space-y-4 max-w-7xl">
			{/* Header */}
			<Card className="py-4">
				<CardHeader className="py-0">
					<div className="flex items-center gap-3">
						<div className="bg-red-500/10 p-2.5 rounded-lg">
							<Briefcase className="size-6 text-red-600 dark:text-red-400" />
						</div>
						<div className="flex-1">
							<CardTitle className="text-xl">
								Calculadora de Despidos
								{selectedFile
									? " — " +
										(selectedFile.cuij ||
											"Exp. #" + selectedFile.id)
									: ""}
							</CardTitle>
							<CardDescription>
								Liquidación final e indemnización por despido
							</CardDescription>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleClearCalculatorData}
						>
							<X className="size-4" />
							Limpiar
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Vincular causa (opcional) */}
			<Card className="py-3">
				<CardContent className="py-0">
					<div className="flex items-center gap-2 mb-2">
						<Label className="text-sm font-semibold">
							Vincular Causa
						</Label>
						<Badge variant="outline" className="text-[10px]">
							opcional
						</Badge>
					</div>
					{selectedCause && selectedFile ? (
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">
								<User className="size-3 mr-1" />
								{selectedCause.customer.name}
							</Badge>
							<Badge variant="outline">
								<FileText className="size-3 mr-1" />
								{selectedFile.cuij || "Sin CUIJ"}
							</Badge>
							<Button
								variant="ghost"
								size="sm"
								className="ml-auto"
								onClick={handleRemoveSelection}
							>
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
										<p className="p-3 text-sm text-muted-foreground">
											Cargando...
										</p>
									) : filteredCauses.length === 0 ? (
										<p className="p-3 text-sm text-muted-foreground">
											Sin resultados
										</p>
									) : (
										filteredCauses
											.slice(0, 20)
											.map((cause) => (
												<div
													key={cause.id}
													className="border-b last:border-0"
												>
													<div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
														{cause.id} -{" "}
														{cause.customer.name}
													</div>
													{cause.files.map(
														(file) => (
															<button
																key={file.id}
																className="w-full text-left px-4 py-2 hover:bg-muted/50 text-sm flex items-center justify-between"
																onClick={() =>
																	handleSelectFile(
																		cause,
																		file,
																	)
																}
															>
																<span className="font-mono text-xs">
																	{file.cuij ||
																		"Sin CUIJ"}
																</span>
															</button>
														),
													)}
												</div>
											))
									)}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="w-full grid grid-cols-3">
					<TabsTrigger value="parametros">
						<BarChart3 className="size-4 mr-1.5" />
						Parámetros
					</TabsTrigger>
					<TabsTrigger value="rubros">
						<DollarSign className="size-4 mr-1.5" />
						Rubros
					</TabsTrigger>
					<TabsTrigger value="resultado">
						<Calculator className="size-4 mr-1.5" />
						Resultado
					</TabsTrigger>
				</TabsList>

				{/* ═══ TAB 1: PARÁMETROS ═══ */}
				<TabsContent
					value="parametros"
					forceMount
					className="data-[state=inactive]:hidden"
				>
					<div className="grid gap-4 md:grid-cols-2">
						{/* Datos laborales */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									Datos Laborales
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<Label className="flex items-center gap-1">
											<Calendar className="size-3.5" />{" "}
											Fecha Ingreso
										</Label>
										<Input
											type="date"
											value={fechaIngreso}
											onChange={(e) =>
												setFechaIngreso(e.target.value)
											}
										/>
									</div>
									<div className="space-y-1.5">
										<Label className="flex items-center gap-1">
											<Calendar className="size-3.5" />{" "}
											Fecha Egreso
										</Label>
										<Input
											type="date"
											value={fechaEgreso}
											onChange={(e) =>
												setFechaEgreso(e.target.value)
											}
										/>
									</div>
								</div>

								{/* Antigüedad display */}
								{fechaIngreso && fechaEgreso && (
									<div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
										<Label className="text-sm">
											Antigüedad
										</Label>
										<div className="text-right">
											<span className="text-sm font-semibold">
												{formatAntiguedad()}
											</span>
											<span className="text-xs text-muted-foreground ml-2">
												({antiguedad.yearsForCalc}{" "}
												período
												{antiguedad.yearsForCalc > 1
													? "s"
													: ""}{" "}
												Art. 245)
											</span>
										</div>
									</div>
								)}

								<Separator />

								<div className="space-y-1.5">
									<Label className="flex items-center gap-1">
										<Briefcase className="size-3.5" /> Tipo
										de Despido
									</Label>
									<select
										className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
										value={tipoDespido}
										onChange={(e) =>
											setTipoDespido(e.target.value)
										}
									>
										{TIPO_DESPIDO_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</option>
										))}
									</select>
								</div>

								{!esIndemnizable && (
									<div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
										{tipoDespido === "con_causa"
											? "Despido con causa: solo se liquidan conceptos de liquidación final."
											: "Renuncia: solo se liquidan conceptos de liquidación final."}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Remuneración */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									Remuneración
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-1.5">
									<Label className="flex items-center gap-1">
										<DollarSign className="size-3.5" />{" "}
										Mejor Remuneración Mensual
									</Label>
									<Input
										type="number"
										step="0.01"
										value={
											mejorRemuneracion !== null
												? mejorRemuneracion
												: ""
										}
										onChange={(e) =>
											setMejorRemuneracion(
												e.target.value
													? parseFloat(
															e.target.value,
														)
													: null,
											)
										}
										placeholder="$0.00"
									/>
									<p className="text-[10px] text-muted-foreground">
										MRMNH — Mejor Remuneración Mensual,
										Normal y Habitual
									</p>
								</div>

								{esIndemnizable && (
									<div className="space-y-1.5">
										<Label className="flex items-center gap-1">
											<Shield className="size-3.5" />{" "}
											Tope CCT (Art. 245)
										</Label>
										<Input
											type="number"
											step="0.01"
											value={
												topeCCT !== null ? topeCCT : ""
											}
											onChange={(e) =>
												setTopeCCT(
													e.target.value
														? parseFloat(
																e.target.value,
															)
														: null,
												)
											}
											placeholder="Dejar vacío = sin tope"
										/>
										<p className="text-[10px] text-muted-foreground">
											3 veces el promedio del CCT
											aplicable. Dejar vacío si no
											corresponde.
										</p>
									</div>
								)}

								{mejorRemuneracion && (
									<>
										<Separator />
										<div className="space-y-1 text-sm text-muted-foreground">
											<div className="flex justify-between">
												<span>Salario diario</span>
												<span className="font-medium text-foreground">
													{formatCurrency(
														salarioDiario,
													)}
												</span>
											</div>
											{topeCCT && esIndemnizable && (
												<div className="flex justify-between">
													<span>
														Base Art. 245 (con tope)
													</span>
													<span className="font-medium text-foreground">
														{formatCurrency(
															Math.min(
																mejorRemuneracion,
																topeCCT,
															),
														)}
													</span>
												</div>
											)}
										</div>
									</>
								)}
							</CardContent>
						</Card>
					</div>

					<div className="flex justify-end mt-4">
						<Button onClick={() => setActiveTab("rubros")}>
							Siguiente <ChevronRight className="size-4" />
						</Button>
					</div>
				</TabsContent>

				{/* ═══ TAB 2: RUBROS ═══ */}
				<TabsContent
					value="rubros"
					forceMount
					className="data-[state=inactive]:hidden"
				>
					<div className="space-y-4">
						{/* Liquidación Final */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									Liquidación Final
								</CardTitle>
								<CardDescription>
									Conceptos que corresponden en todos los
									casos
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-1">
								<RubroRow
									label={`Días trabajados (${diasTrabajadosMes} días)`}
									value={montoDiasTrabajados}
								/>
								<RubroRow
									label="SAC proporcional"
									value={sacProporcional}
								/>
								<RubroRow
									label="Vacaciones proporcionales"
									value={vacaciones}
								/>
								<RubroRow
									label="SAC s/vacaciones"
									value={sacSobreVacaciones}
									sub
								/>
								<RubroRow
									label="SUBTOTAL LIQ. FINAL"
									value={totalLiquidacionFinal}
									highlight
								/>
							</CardContent>
						</Card>

						{/* Indemnización */}
						{esIndemnizable && (
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-base">
										Indemnización por Despido
									</CardTitle>
									<CardDescription>
										Conceptos indemnizatorios (Art. 232,
										233, 245 LCT)
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-1">
									<RubroRow
										label={`Preaviso (${antiguedad.totalMonths < 3 ? "15 días" : antiguedad.totalMonths < 60 ? "1 mes" : "2 meses"})`}
										value={preaviso}
									/>
									<RubroRow
										label="SAC s/preaviso"
										value={sacSobrePreaviso}
										sub
									/>
									<RubroRow
										label={`Integración mes de despido (${fechaEgreso ? new Date(fechaEgreso).getDate() === new Date(new Date(fechaEgreso).getFullYear(), new Date(fechaEgreso).getMonth() + 1, 0).getDate() ? "último día" : (new Date(new Date(fechaEgreso).getFullYear(), new Date(fechaEgreso).getMonth() + 1, 0).getDate() - new Date(fechaEgreso).getDate()) + " días" : "—"})`}
										value={integracion}
									/>
									<RubroRow
										label="SAC s/integración"
										value={sacSobreIntegracion}
										sub
									/>
									<RubroRow
										label={`Art. 245 — Antigüedad (${antiguedad.yearsForCalc} período${antiguedad.yearsForCalc > 1 ? "s" : ""}${topeCCT ? " c/tope" : ""})`}
										value={art245}
									/>
									<RubroRow
										label="SUBTOTAL INDEMNIZACIÓN"
										value={totalIndemnizacion}
										highlight
									/>
								</CardContent>
							</Card>
						)}

						{/* Multas */}
						{esIndemnizable && (
							<Card>
								<CardHeader className="pb-2">
									<div className="flex items-center gap-2">
										<Shield className="size-4 text-red-500" />
										<CardTitle className="text-base">
											Multas
										</CardTitle>
									</div>
									<CardDescription>
										Active las multas que correspondan al
										caso
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center justify-between p-3 rounded-lg border">
										<div className="flex-1">
											<p className="text-sm font-medium">
												Art. 2 Ley 25.323
											</p>
											<p className="text-[10px] text-muted-foreground">
												50% de (preaviso + integración +
												Art. 245) por falta de pago en
												plazo
											</p>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-sm font-semibold min-w-28 text-right">
												{formatCurrency(
													activarArt2_25323
														? (preaviso +
																integracion +
																art245) *
																0.5
														: 0,
												)}
											</span>
											<Switch
												checked={activarArt2_25323}
												onCheckedChange={
													setActivarArt2_25323
												}
											/>
										</div>
									</div>

									<div className="flex items-center justify-between p-3 rounded-lg border">
										<div className="flex-1">
											<p className="text-sm font-medium">
												Art. 1 Ley 25.323
											</p>
											<p className="text-[10px] text-muted-foreground">
												Duplica Art. 245 si el
												trabajador no estaba registrado
											</p>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-sm font-semibold min-w-28 text-right">
												{formatCurrency(
													activarArt1_25323
														? art245
														: 0,
												)}
											</span>
											<Switch
												checked={activarArt1_25323}
												onCheckedChange={
													setActivarArt1_25323
												}
											/>
										</div>
									</div>

									<div className="flex items-center justify-between p-3 rounded-lg border">
										<div className="flex-1">
											<p className="text-sm font-medium">
												Art. 80 LCT
											</p>
											<p className="text-[10px] text-muted-foreground">
												3 × MRMNH por falta de entrega
												de certificados
											</p>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-sm font-semibold min-w-28 text-right">
												{formatCurrency(
													activarArt80
														? (mejorRemuneracion ||
																0) * 3
														: 0,
												)}
											</span>
											<Switch
												checked={activarArt80}
												onCheckedChange={
													setActivarArt80
												}
											/>
										</div>
									</div>

									<div className="flex items-center justify-between p-3 rounded-lg border">
										<div className="flex-1">
											<p className="text-sm font-medium">
												Doble Indemnización
											</p>
											<p className="text-[10px] text-muted-foreground">
												Duplica Art. 245 (decreto
												vigente)
											</p>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-sm font-semibold min-w-28 text-right">
												{formatCurrency(
													activarDobleIndem
														? art245
														: 0,
												)}
											</span>
											<Switch
												checked={activarDobleIndem}
												onCheckedChange={
													setActivarDobleIndem
												}
											/>
										</div>
									</div>

									{totalMultas > 0 && (
										<RubroRow
											label="SUBTOTAL MULTAS"
											value={totalMultas}
											highlight
										/>
									)}
								</CardContent>
							</Card>
						)}

						{/* Total general preview */}
						<div className="flex justify-between py-3 px-4 bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100 rounded-lg text-base font-bold">
							<span>TOTAL GENERAL</span>
							<span>{formatCurrency(totalGeneral)}</span>
						</div>
					</div>

					<div className="flex justify-between mt-4">
						<Button
							variant="outline"
							onClick={() => setActiveTab("parametros")}
						>
							<ChevronLeft className="size-4" /> Anterior
						</Button>
						<Button onClick={() => setActiveTab("resultado")}>
							Siguiente <ChevronRight className="size-4" />
						</Button>
					</div>
				</TabsContent>

				{/* ═══ TAB 3: RESULTADO ═══ */}
				<TabsContent
					value="resultado"
					forceMount
					className="data-[state=inactive]:hidden"
				>
					<div className="grid gap-4 md:grid-cols-2">
						{/* Cálculo */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									Cálculo Final
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-1">
								{/* Liquidación Final */}
								<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
									Liquidación Final
								</h4>
								<RubroRow
									label={`Días trabajados (${diasTrabajadosMes}d)`}
									value={montoDiasTrabajados}
								/>
								<RubroRow
									label="SAC proporcional"
									value={sacProporcional}
								/>
								<RubroRow
									label="Vacaciones prop."
									value={vacaciones}
								/>
								<RubroRow
									label="SAC s/vacaciones"
									value={sacSobreVacaciones}
									sub
								/>
								<RubroRow
									label="SUBTOTAL LIQ. FINAL"
									value={totalLiquidacionFinal}
									highlight
								/>

								{esIndemnizable && (
									<>
										<Separator className="my-2" />
										<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
											Indemnización
										</h4>
										<RubroRow
											label="Preaviso"
											value={preaviso}
										/>
										<RubroRow
											label="SAC s/preaviso"
											value={sacSobrePreaviso}
											sub
										/>
										<RubroRow
											label="Integración"
											value={integracion}
										/>
										<RubroRow
											label="SAC s/integración"
											value={sacSobreIntegracion}
											sub
										/>
										<RubroRow
											label="Art. 245"
											value={art245}
										/>
										<RubroRow
											label="SUBTOTAL INDEM."
											value={totalIndemnizacion}
											highlight
										/>
									</>
								)}

								{totalMultas > 0 && (
									<>
										<Separator className="my-2" />
										<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
											Multas
										</h4>
										{multaArt2_25323 > 0 && (
											<RubroRow
												label="Art. 2 Ley 25.323"
												value={multaArt2_25323}
											/>
										)}
										{multaArt1_25323 > 0 && (
											<RubroRow
												label="Art. 1 Ley 25.323"
												value={multaArt1_25323}
											/>
										)}
										{multaArt80 > 0 && (
											<RubroRow
												label="Art. 80 LCT"
												value={multaArt80}
											/>
										)}
										{dobleIndem > 0 && (
											<RubroRow
												label="Doble indem."
												value={dobleIndem}
											/>
										)}
										<RubroRow
											label="SUBTOTAL MULTAS"
											value={totalMultas}
											highlight
										/>
									</>
								)}

								<Separator className="my-2" />
								<div className="flex justify-between py-3 px-3 bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100 rounded-md text-sm font-bold">
									<span>TOTAL GENERAL</span>
									<span>
										{formatCurrency(totalGeneral)}
									</span>
								</div>

								{/* Intereses */}
								{fechaEgreso && totalGeneral > 0 && (
									<div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 space-y-1">
										<div className="flex items-center justify-between mb-2">
											<h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">
												INTERÉS TASA ANUAL
											</h4>
											<div className="flex items-center gap-1.5">
												<Input
													type="number"
													step="0.1"
													min="0"
													className="h-7 w-20 text-xs text-right bg-white dark:bg-amber-950"
													value={tasaInteresAnual}
													onChange={(e) =>
														setTasaInteresAnual(
															e.target.value
																? parseFloat(
																		e.target
																			.value,
																	)
																: 0,
														)
													}
												/>
												<span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
													%
												</span>
											</div>
										</div>
										{interesesCalculados.map(
											(item, idx) => (
												<div
													key={idx}
													className="flex justify-between text-xs border-b border-amber-200 dark:border-amber-600 py-1"
												>
													<span className="text-amber-800 dark:text-amber-200">
														{item.año} —{" "}
														{item.dias} días
													</span>
													<span className="font-semibold text-amber-900 dark:text-amber-100">
														{formatCurrency(
															item.interesDelAño,
														)}
													</span>
												</div>
											),
										)}
										<div className="flex justify-between py-2 mt-1 bg-amber-100 dark:bg-amber-800 px-2 rounded text-sm font-bold text-amber-900 dark:text-amber-100">
											<span>TOTAL INTERESES</span>
											<span>
												{formatCurrency(
													totalIntereses,
												)}
											</span>
										</div>
										<div className="flex justify-between py-2 mt-1 bg-orange-100 dark:bg-orange-900 px-2 rounded text-sm font-bold text-orange-900 dark:text-orange-100">
											<span>TOTAL CON INTERESES</span>
											<span>
												{formatCurrency(
													totalConIntereses,
												)}
											</span>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Sidebar */}
						<div className="space-y-4">
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-base">
										Resumen
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-1.5 text-sm text-muted-foreground">
									<p>
										<strong>Tipo:</strong>{" "}
										{TIPO_DESPIDO_OPTIONS.find(
											(t) => t.value === tipoDespido,
										)?.label || tipoDespido}
									</p>
									<p>
										<strong>F. Ingreso:</strong>{" "}
										{fechaIngreso
											? new Date(
													fechaIngreso,
												).toLocaleDateString("es-AR")
											: "No def."}
									</p>
									<p>
										<strong>F. Egreso:</strong>{" "}
										{fechaEgreso
											? new Date(
													fechaEgreso,
												).toLocaleDateString("es-AR")
											: "No def."}
									</p>
									<p>
										<strong>Antigüedad:</strong>{" "}
										{formatAntiguedad()}
									</p>
									<p>
										<strong>MRMNH:</strong>{" "}
										{mejorRemuneracion
											? formatCurrency(mejorRemuneracion)
											: "No def."}
									</p>
									{topeCCT && (
										<p>
											<strong>Tope CCT:</strong>{" "}
											{formatCurrency(topeCCT)}
										</p>
									)}
								</CardContent>
							</Card>

							<Card className="bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
								<CardContent className="py-3 text-xs text-red-800 dark:text-red-200">
									<strong>Nota:</strong> Los cálculos son
									orientativos y se basan en la LCT. Verificar
									tope CCT aplicable y normas vigentes al
									momento del despido.
								</CardContent>
							</Card>

							<div className="space-y-2">
								<Button
									className="w-full"
									variant="destructive"
									onClick={handleGeneratePDF}
									disabled={
										isGeneratingPDF || totalGeneral <= 0
									}
								>
									{isGeneratingPDF ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{" "}
											Generando...
										</>
									) : (
										<>
											<Download className="size-4" />{" "}
											Descargar PDF
										</>
									)}
								</Button>
								<Button
									className="w-full"
									variant="outline"
									onClick={handleCopyResult}
									disabled={totalGeneral <= 0}
								>
									<Copy className="size-4" /> Copiar
									Resultado
								</Button>
							</div>
						</div>
					</div>

					<div className="flex justify-start mt-4">
						<Button
							variant="outline"
							onClick={() => setActiveTab("rubros")}
						>
							<ChevronLeft className="size-4" /> Anterior
						</Button>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
