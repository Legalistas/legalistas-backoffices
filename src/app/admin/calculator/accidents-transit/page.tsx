"use client";

import {
	BarChart3,
	Cake,
	Calculator,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
	DollarSign,
	FileText,
	Percent,
	PercentCircle,
	Plus,
	Trash2,
	TrendingUp,
	User,
	X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface RubroItem {
	id: string;
	nombre: string;
	monto: number | null;
	esCalculado: boolean;
}

// ─── Constants ──────────────────────────────────────────────
const RUBROS_DEFAULT: RubroItem[] = [
	{ id: "incapacidad", nombre: "Incapacidad sobreviniente", monto: null, esCalculado: true },
	{ id: "dano_moral", nombre: "Daño moral", monto: null, esCalculado: false },
	{ id: "gastos_medicos", nombre: "Gastos médicos", monto: null, esCalculado: false },
	{ id: "dano_psicologico", nombre: "Daño psicológico", monto: null, esCalculado: false },
	{ id: "dano_estetico", nombre: "Daño estético", monto: null, esCalculado: false },
];

const FORMULAS = [
	{ value: "vuotto", label: "Vuotto" },
	{ value: "mendez", label: "Méndez" },
	{ value: "las_heras", label: "Las Heras - Requena" },
];

// ─── Page Component ─────────────────────────────────────────
export default function AccidentsTransitPage() {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const urlCaseId = searchParams.get("caseId");
	const urlFileId = searchParams.get("fileId");

	// Cause/file selection
	const [causes, setCauses] = useState<CalculatorCause[]>([]);
	const [selectedCause, setSelectedCause] = useState<CalculatorCause | null>(null);
	const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);

	// Parameters
	const [accidentDate, setAccidentDate] = useState("");
	const [sentenceDate, setSentenceDate] = useState("");
	const [customerAge, setCustomerAge] = useState<number | null>(null);
	const [disabilityPercentage, setDisabilityPercentage] = useState<number | null>(null);
	const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
	const [includeSAC, setIncludeSAC] = useState(true);
	const [formulaType, setFormulaType] = useState("vuotto");
	const [pureInterestRate, setPureInterestRate] = useState<number>(6);
	const [retirementAge, setRetirementAge] = useState<number>(65);
	const [activar20Porciento, setActivar20Porciento] = useState(false);
	const [tasaInteresAnual, setTasaInteresAnual] = useState<number>(8);

	// Rubros
	const [rubros, setRubros] = useState<RubroItem[]>(RUBROS_DEFAULT);

	// UI
	const [activeTab, setActiveTab] = useState("parametros");
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

	// ─── Derived Calculations ───────────────────────────────
	const hasCustomerBirthDate = !!selectedCause?.customer?.userProfile?.birthDate;

	// Ingreso ajustado por SAC
	const ingresoAnual = useMemo(() => {
		if (!monthlyIncome) return 0;
		return monthlyIncome * (includeSAC ? 13 : 12);
	}, [monthlyIncome, includeSAC]);

	const ingresoMensualAjustado = useMemo(() => ingresoAnual / 12, [ingresoAnual]);

	// Años restantes de vida útil
	const anosRestantes = useMemo(() => {
		if (!customerAge || customerAge >= retirementAge) return 0;
		return retirementAge - customerAge;
	}, [customerAge, retirementAge]);

	// Cálculo fórmula Vuotto/Méndez/Las Heras
	const capitalIncapacidad = useMemo(() => {
		if (!ingresoMensualAjustado || !disabilityPercentage || anosRestantes <= 0) return 0;

		const i = pureInterestRate / 100;
		const n = anosRestantes;
		const A = ingresoMensualAjustado;
		const incap = disabilityPercentage / 100;

		if (i <= 0) return A * n * 12 * incap;

		if (formulaType === "vuotto" || formulaType === "mendez") {
			// C = A × (1 - V^n) / i × incapacidad
			// V = 1 / (1 + i)
			const V = 1 / (1 + i);
			return A * (1 - Math.pow(V, n)) / i * incap;
		}

		if (formulaType === "las_heras") {
			// Las Heras-Requena: similar pero mensualizado
			// C = A × 12 × (1 - (1+i)^-n) / i × incapacidad
			const factor = (1 - Math.pow(1 + i, -n)) / i;
			return A * 12 * factor * incap;
		}

		return 0;
	}, [ingresoMensualAjustado, disabilityPercentage, anosRestantes, pureInterestRate, formulaType]);

	// 20% adicional
	const veintePorCiento = activar20Porciento ? capitalIncapacidad * 0.2 : 0;
	const totalIncapacidadConAdicional = capitalIncapacidad + veintePorCiento;

	// Rubros: actualizar monto calculado de incapacidad
	useEffect(() => {
		setRubros(prev => prev.map(r =>
			r.id === "incapacidad" ? { ...r, monto: totalIncapacidadConAdicional } : r
		));
	}, [totalIncapacidadConAdicional]);

	// Total rubros
	const totalRubros = useMemo(() => {
		return rubros.reduce((sum, r) => sum + (r.monto || 0), 0);
	}, [rubros]);

	// Intereses
	const calcularIntereses = useCallback(() => {
		if (!accidentDate || totalRubros <= 0) return [];

		const fechaInicio = new Date(accidentDate);
		const fechaFin = sentenceDate ? new Date(sentenceDate) : new Date();
		const añoInicio = fechaInicio.getFullYear();
		const añoFin = fechaFin.getFullYear();
		const interesesPorAño = [];

		for (let año = añoInicio; año <= añoFin; año++) {
			let diasDelAño = 0;

			if (año === añoInicio && año === añoFin) {
				diasDelAño = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
			} else if (año === añoInicio) {
				const finDelAño = new Date(año, 11, 31, 23, 59, 59);
				diasDelAño = Math.ceil((finDelAño.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
			} else if (año === añoFin) {
				const inicioDelAño = new Date(año, 0, 1);
				diasDelAño = Math.ceil((fechaFin.getTime() - inicioDelAño.getTime()) / (1000 * 60 * 60 * 24)) + 1;
			} else {
				diasDelAño = (año % 4 === 0 && (año % 100 !== 0 || año % 400 === 0)) ? 366 : 365;
			}

			const interesDiario = (totalRubros * (tasaInteresAnual / 100)) / 365;
			const interesDelAño = interesDiario * diasDelAño;

			interesesPorAño.push({ año, dias: diasDelAño, interesDiario, interesDelAño });
		}

		return interesesPorAño;
	}, [accidentDate, sentenceDate, totalRubros, tasaInteresAnual]);

	const interesesCalculados = calcularIntereses();
	const totalIntereses = interesesCalculados.reduce((sum, item) => sum + item.interesDelAño, 0);
	const totalConIntereses = totalRubros + totalIntereses;

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
			if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
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
				setSearchTerm(`${matchingCause.id} - ${matchingCause.customer?.name || "Sin nombre"}`);
				setShowSuggestions(false);

				if (urlFileId && matchingCause.files) {
					const fileIdNum = parseInt(urlFileId);
					const matchingFile = matchingCause.files.find((f) => f.id === fileIdNum);
					if (matchingFile) {
						setSelectedFile(matchingFile);
						if (matchingFile.accidentDate) {
							const date = new Date(matchingFile.accidentDate);
							setAccidentDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
						}
						if (matchingFile.disabilityPercentage) {
							setDisabilityPercentage(matchingFile.disabilityPercentage);
						}
					}
				} else if (matchingCause.files?.length === 1) {
					const file = matchingCause.files[0];
					setSelectedFile(file);
					if (file.accidentDate) {
						const date = new Date(file.accidentDate);
						setAccidentDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
					}
					if (file.disabilityPercentage) {
						setDisabilityPercentage(file.disabilityPercentage);
					}
				}

				if (matchingCause.customer?.userProfile?.birthDate) {
					const birthDate = new Date(matchingCause.customer.userProfile.birthDate);
					const today = new Date();
					let age = today.getFullYear() - birthDate.getFullYear();
					const monthDiff = today.getMonth() - birthDate.getMonth();
					if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
					setCustomerAge(age);
				}
			}
		}
	}, [urlCaseId, urlFileId, causes, selectedCause]);

	// ─── Helpers ─────────────────────────────────────────────
	const calculateAge = (birthdate: string | null) => {
		if (!birthdate) return null;
		const today = new Date();
		const birth = new Date(birthdate);
		let age = today.getFullYear() - birth.getFullYear();
		const m = today.getMonth() - birth.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
		return age;
	};

	const filteredCauses = causes.filter((cause) => {
		return (
			cause.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			cause.files.some((file) => file.cuij?.toLowerCase().includes(searchTerm.toLowerCase()))
		);
	});

	const handleSelectFile = (cause: CalculatorCause, file: CaseFile) => {
		setSelectedCause(cause);
		setSelectedFile(file);
		setSearchTerm(cause.customer.name);
		setShowSuggestions(false);
		setAccidentDate(file.accidentDate ? file.accidentDate.split("T")[0] : "");
		const calculatedAge = cause.customer.userProfile?.birthDate
			? calculateAge(cause.customer.userProfile.birthDate)
			: null;
		setCustomerAge(calculatedAge);
		setDisabilityPercentage(file.disabilityPercentage ? Number(file.disabilityPercentage) : null);
	};

	const handleRemoveSelection = () => {
		setSelectedCause(null);
		setSelectedFile(null);
		setSearchTerm("");
		setAccidentDate("");
		setCustomerAge(null);
		setDisabilityPercentage(null);
		setMonthlyIncome(null);
	};

	const handleClearCalculatorData = () => {
		setAccidentDate("");
		setSentenceDate("");
		setCustomerAge(null);
		setDisabilityPercentage(null);
		setMonthlyIncome(null);
		setIncludeSAC(true);
		setFormulaType("vuotto");
		setPureInterestRate(6);
		setRetirementAge(65);
		setActivar20Porciento(false);
		setTasaInteresAnual(8);
		setRubros(RUBROS_DEFAULT);
	};

	const handleRubroChange = (id: string, value: string) => {
		setRubros(prev => prev.map(r =>
			r.id === id && !r.esCalculado
				? { ...r, monto: value ? parseFloat(value) : null }
				: r
		));
	};

	const handleAddRubro = () => {
		const newId = `custom_${Date.now()}`;
		setRubros(prev => [...prev, { id: newId, nombre: "Nuevo rubro", monto: null, esCalculado: false }]);
	};

	const handleRemoveRubro = (id: string) => {
		setRubros(prev => prev.filter(r => r.id !== id || r.esCalculado));
	};

	const handleRubroNameChange = (id: string, nombre: string) => {
		setRubros(prev => prev.map(r => r.id === id ? { ...r, nombre } : r));
	};

	const formatCurrency = (value: number) => {
		return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	};

	// ─── PDF ─────────────────────────────────────────────────
	const handleGeneratePDF = async () => {
		setIsGeneratingPDF(true);
		try {
			const pdfData = {
				tipo: "accidente_transito",
				cliente: selectedCause?.customer.name || "Sin causa asociada",
				expediente: selectedFile?.cuij || (selectedFile ? "Expediente #" + selectedFile.id : "Sin expediente"),
				fechaAccidente: accidentDate ? new Date(accidentDate).toLocaleDateString("es-AR") : "",
				fechaSentencia: sentenceDate ? new Date(sentenceDate).toLocaleDateString("es-AR") : "Actual",
				edad: customerAge,
				incapacidad: disabilityPercentage,
				ingresoMensual: monthlyIncome,
				includeSAC,
				formula: formulaType,
				tasaPura: pureInterestRate,
				edadJubilatoria: retirementAge,
				capitalIncapacidad,
				activar20Porciento,
				veintePorCiento,
				rubros,
				totalRubros,
				interesesCalculados,
				totalIntereses,
				totalConIntereses,
				tasaInteresAnual,
			};

			const response = await fetch("/api/generate-transit-pdf", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(pdfData),
			});

			if (!response.ok) throw new Error("Error al generar PDF");

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "Liquidacion_Transito_" + (selectedCause?.customer.name || "calculadora") + "_" + new Date().toLocaleDateString("es-AR").replace(/\//g, "-") + ".pdf";
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

	// ─── Clipboard ───────────────────────────────────────────
	const handleCopyResult = () => {
		const lines = [
			"CALCULADORA ACC. DE TRÁNSITO",
			"",
			selectedCause ? "Cliente: " + selectedCause.customer.name : "",
			selectedFile?.cuij ? "CUIJ: " + selectedFile.cuij : "",
			"Fecha accidente: " + (accidentDate ? new Date(accidentDate).toLocaleDateString("es-AR") : "No def."),
			"Edad: " + (customerAge !== null ? customerAge + " años" : "No def."),
			"Incapacidad: " + (disabilityPercentage !== null ? disabilityPercentage + "%" : "No def."),
			"Ingreso mensual: " + (monthlyIncome ? formatCurrency(monthlyIncome) : "No def."),
			"Fórmula: " + (FORMULAS.find(f => f.value === formulaType)?.label || formulaType),
			"Tasa pura: " + pureInterestRate + "%",
			"Edad jubilatoria: " + retirementAge + " años",
			"",
			"─── RUBROS ───",
			...rubros.filter(r => r.monto).map(r => r.nombre + ": " + formatCurrency(r.monto!)),
			"",
			"TOTAL RUBROS: " + formatCurrency(totalRubros),
			totalIntereses > 0 ? "TOTAL INTERESES (" + tasaInteresAnual + "%): " + formatCurrency(totalIntereses) : "",
			totalIntereses > 0 ? "TOTAL CON INTERESES: " + formatCurrency(totalConIntereses) : "",
		].filter(Boolean).join("\n");

		navigator.clipboard.writeText(lines);
		toast.success("Resultado copiado al portapapeles");
	};

	// ─── Render ──────────────────────────────────────────────
	return (
		<div className="container mx-auto p-4 space-y-4 max-w-7xl">
			{/* Header */}
			<Card className="py-4">
				<CardHeader className="py-0">
					<div className="flex items-center gap-3">
						<div className="bg-blue-500/10 p-2.5 rounded-lg">
							<Calculator className="size-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div className="flex-1">
							<CardTitle className="text-xl">
								Calculadora Acc. de Tránsito
								{selectedFile ? " — " + (selectedFile.cuij || "Exp. #" + selectedFile.id) : ""}
							</CardTitle>
							<CardDescription>Indemnización por accidente de tránsito</CardDescription>
						</div>
						<Button variant="destructive" size="sm" onClick={handleClearCalculatorData}>
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
						<Label className="text-sm font-semibold">Vincular con Expediente</Label>
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
							<Badge variant="outline"><Cake className="size-3 mr-1" />{customerAge !== null ? customerAge + " años" : "Sin edad"}</Badge>
							<Badge variant="outline"><PercentCircle className="size-3 mr-1" />{disabilityPercentage !== null ? disabilityPercentage + "%" : "Sin %"}</Badge>
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

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="w-full grid grid-cols-3">
					<TabsTrigger value="parametros"><BarChart3 className="size-4 mr-1.5" />Parámetros</TabsTrigger>
					<TabsTrigger value="rubros"><DollarSign className="size-4 mr-1.5" />Rubros</TabsTrigger>
					<TabsTrigger value="resultado"><Calculator className="size-4 mr-1.5" />Resultado</TabsTrigger>
				</TabsList>

				{/* ═══ TAB 1: PARÁMETROS ═══ */}
				<TabsContent value="parametros" forceMount className="data-[state=inactive]:hidden">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Datos del actor */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Datos del Actor</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<Label className="flex items-center gap-1"><Cake className="size-3.5" /> Edad</Label>
									<Input
										type="number"
										value={customerAge !== null ? customerAge : ""}
										onChange={(e) => setCustomerAge(e.target.value ? parseInt(e.target.value) : null)}
										disabled={hasCustomerBirthDate}
										placeholder="Edad"
									/>
								</div>
								<div className="space-y-1.5">
									<Label className="flex items-center gap-1"><PercentCircle className="size-3.5" /> Incapacidad (%)</Label>
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
									<Label className="flex items-center gap-1"><DollarSign className="size-3.5" /> Ingreso Mensual</Label>
									<Input
										type="number"
										step="0.01"
										value={monthlyIncome !== null ? monthlyIncome : ""}
										onChange={(e) => setMonthlyIncome(e.target.value ? parseFloat(e.target.value) : null)}
										placeholder="$0.00"
									/>
								</div>
								<div className="flex items-end pb-1">
									<div className="flex items-center gap-2">
										<Switch checked={includeSAC} onCheckedChange={setIncludeSAC} />
										<Label className="text-sm">Incluir SAC</Label>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Fechas y fórmula */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Fechas y Fórmula</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<Label className="flex items-center gap-1"><Calendar className="size-3.5" /> Fecha Accidente</Label>
										<Input type="date" value={accidentDate} onChange={(e) => setAccidentDate(e.target.value)} />
									</div>
									<div className="space-y-1.5">
										<Label className="flex items-center gap-1"><Calendar className="size-3.5" /> Fecha Sentencia</Label>
										<Input
											type="date"
											value={sentenceDate}
											onChange={(e) => setSentenceDate(e.target.value)}
											placeholder="Dejar vacío = hoy"
										/>
									</div>
								</div>
								<Separator />
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<Label className="flex items-center gap-1"><TrendingUp className="size-3.5" /> Fórmula</Label>
										<select
											className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
											value={formulaType}
											onChange={(e) => setFormulaType(e.target.value)}
										>
											{FORMULAS.map((f) => (
												<option key={f.value} value={f.value}>{f.label}</option>
											))}
										</select>
									</div>
									<div className="space-y-1.5">
										<Label className="flex items-center gap-1"><Percent className="size-3.5" /> Tasa Pura (%)</Label>
										<Input
											type="number"
											step="0.5"
											min="0"
											value={pureInterestRate}
											onChange={(e) => setPureInterestRate(e.target.value ? parseFloat(e.target.value) : 0)}
										/>
									</div>
								</div>
								<div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
									<Label className="text-sm">Edad jubilatoria</Label>
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant={retirementAge === 65 ? "default" : "outline"}
											className="h-7 px-3 text-xs"
											onClick={() => setRetirementAge(65)}
										>
											65
										</Button>
										<Button
											size="sm"
											variant={retirementAge === 75 ? "default" : "outline"}
											className="h-7 px-3 text-xs"
											onClick={() => setRetirementAge(75)}
										>
											75
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Preview rápido */}
					{capitalIncapacidad > 0 && (
						<Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
							<CardContent className="py-3 flex items-center justify-between">
								<div className="text-sm text-blue-800 dark:text-blue-200">
									<strong>{FORMULAS.find(f => f.value === formulaType)?.label}:</strong> {formatCurrency(capitalIncapacidad)}
									{activar20Porciento && <span className="ml-2">(+20%: {formatCurrency(totalIncapacidadConAdicional)})</span>}
								</div>
								<div className="flex items-center gap-2">
									<Label className="text-xs text-blue-700 dark:text-blue-300">+20%</Label>
									<Switch checked={activar20Porciento} onCheckedChange={setActivar20Porciento} />
								</div>
							</CardContent>
						</Card>
					)}

					<div className="flex justify-end mt-4">
						<Button onClick={() => setActiveTab("rubros")}>
							Siguiente <ChevronRight className="size-4" />
						</Button>
					</div>
				</TabsContent>

				{/* ═══ TAB 2: RUBROS ═══ */}
				<TabsContent value="rubros" forceMount className="data-[state=inactive]:hidden">
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base">Rubros Indemnizatorios</CardTitle>
								<Button size="sm" variant="outline" onClick={handleAddRubro}>
									<Plus className="size-3.5" /> Agregar Rubro
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{rubros.map((rubro) => (
									<div
										key={rubro.id}
										className={`flex items-center gap-3 p-3 rounded-lg border ${
											rubro.esCalculado
												? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
												: "bg-background"
										}`}
									>
										{rubro.esCalculado ? (
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="text-sm font-medium">{rubro.nombre}</span>
													<Badge variant="secondary" className="text-[10px]">calculado</Badge>
												</div>
												<p className="text-xs text-muted-foreground mt-0.5">
													{FORMULAS.find(f => f.value === formulaType)?.label} · {disabilityPercentage || 0}% incap. · {anosRestantes} años restantes
													{activar20Porciento && " · +20%"}
												</p>
											</div>
										) : (
											<div className="flex-1">
												<Input
													className="h-7 text-sm font-medium border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
													value={rubro.nombre}
													onChange={(e) => handleRubroNameChange(rubro.id, e.target.value)}
												/>
											</div>
										)}
										<div className="flex items-center gap-2">
											{rubro.esCalculado ? (
												<span className="text-sm font-bold min-w-32 text-right">
													{rubro.monto ? formatCurrency(rubro.monto) : "$0,00"}
												</span>
											) : (
												<div className="relative">
													<span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
													<Input
														type="number"
														step="0.01"
														className="h-8 w-40 text-sm text-right pl-5"
														value={rubro.monto !== null ? rubro.monto : ""}
														onChange={(e) => handleRubroChange(rubro.id, e.target.value)}
														placeholder="0.00"
													/>
												</div>
											)}
											{!rubro.esCalculado && (
												<Button
													variant="ghost"
													size="sm"
													className="size-7 p-0 text-muted-foreground hover:text-destructive"
													onClick={() => handleRemoveRubro(rubro.id)}
												>
													<Trash2 className="size-3.5" />
												</Button>
											)}
										</div>
									</div>
								))}

								{/* Total */}
								<Separator className="my-2" />
								<div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
									<span className="text-sm font-bold text-primary">TOTAL RUBROS</span>
									<span className="text-sm font-bold text-primary">{formatCurrency(totalRubros)}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="flex justify-between mt-4">
						<Button variant="outline" onClick={() => setActiveTab("parametros")}>
							<ChevronLeft className="size-4" /> Anterior
						</Button>
						<Button onClick={() => setActiveTab("resultado")}>
							Siguiente <ChevronRight className="size-4" />
						</Button>
					</div>
				</TabsContent>

				{/* ═══ TAB 3: RESULTADO ═══ */}
				<TabsContent value="resultado" forceMount className="data-[state=inactive]:hidden">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Cálculo */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Cálculo Final</CardTitle>
							</CardHeader>
							<CardContent className="space-y-1">
								{/* Fórmula details */}
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">FÓRMULA</span>
									<span className="font-medium">{FORMULAS.find(f => f.value === formulaType)?.label}</span>
								</div>
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">INGRESO MENSUAL</span>
									<span className="font-medium">{monthlyIncome ? formatCurrency(monthlyIncome) : "$0,00"}</span>
								</div>
								{includeSAC && (
									<div className="flex justify-between py-1.5 border-b text-sm">
										<span className="text-muted-foreground">INGRESO C/ SAC</span>
										<span className="font-medium">{formatCurrency(ingresoMensualAjustado)}</span>
									</div>
								)}
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">% INCAPACIDAD</span>
									<span className="font-medium">{disabilityPercentage !== null ? disabilityPercentage + "%" : "0%"}</span>
								</div>
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">AÑOS RESTANTES</span>
									<span className="font-medium">{anosRestantes} ({retirementAge} - {customerAge || 0})</span>
								</div>
								<div className="flex justify-between py-1.5 border-b text-sm">
									<span className="text-muted-foreground">TASA PURA</span>
									<span className="font-medium">{pureInterestRate}%</span>
								</div>
								<div className="flex justify-between py-2.5 px-3 bg-blue-100 dark:bg-blue-900/30 rounded-md mt-2 text-sm font-bold text-blue-900 dark:text-blue-100">
									<span>INCAPACIDAD SOBREVINIENTE</span>
									<span>{formatCurrency(capitalIncapacidad)}</span>
								</div>

								{activar20Porciento && (
									<>
										<div className="flex justify-between py-1.5 border-b text-sm">
											<span className="text-muted-foreground">20% ADICIONAL</span>
											<span className="font-medium">{formatCurrency(veintePorCiento)}</span>
										</div>
										<div className="flex justify-between py-2.5 px-3 bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100 rounded-md text-sm font-bold">
											<span>INCAPACIDAD (+20%)</span>
											<span>{formatCurrency(totalIncapacidadConAdicional)}</span>
										</div>
									</>
								)}

								<Separator className="my-3" />

								{/* Rubros summary */}
								<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rubros</h4>
								{rubros.filter(r => r.monto && r.monto > 0).map((rubro) => (
									<div key={rubro.id} className="flex justify-between py-1 text-sm">
										<span className="text-muted-foreground">{rubro.nombre}</span>
										<span className="font-medium">{formatCurrency(rubro.monto!)}</span>
									</div>
								))}

								<div className="flex justify-between py-2.5 px-3 bg-primary/10 rounded-md mt-2 text-sm font-bold text-primary">
									<span>TOTAL RUBROS</span>
									<span>{formatCurrency(totalRubros)}</span>
								</div>

								{/* Intereses */}
								{accidentDate && totalRubros > 0 && (
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
												<span className="font-semibold text-amber-900 dark:text-amber-100">{formatCurrency(item.interesDelAño)}</span>
											</div>
										))}
										<div className="flex justify-between py-2 mt-1 bg-amber-100 dark:bg-amber-800 px-2 rounded text-sm font-bold text-amber-900 dark:text-amber-100">
											<span>TOTAL INTERESES</span>
											<span>{formatCurrency(totalIntereses)}</span>
										</div>
										<div className="flex justify-between py-2 mt-1 bg-orange-100 dark:bg-orange-900 px-2 rounded text-sm font-bold text-orange-900 dark:text-orange-100">
											<span>TOTAL CON INTERESES</span>
											<span>{formatCurrency(totalConIntereses)}</span>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Sidebar */}
						<div className="space-y-4">
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-base">Resumen</CardTitle>
								</CardHeader>
								<CardContent className="space-y-1.5 text-sm text-muted-foreground">
									<p><strong>F. Accidente:</strong> {accidentDate ? new Date(accidentDate).toLocaleDateString("es-AR") : "No def."}</p>
									<p><strong>F. Sentencia:</strong> {sentenceDate ? new Date(sentenceDate).toLocaleDateString("es-AR") : "Hoy"}</p>
									<p><strong>Edad:</strong> {customerAge !== null ? customerAge + " años" : "No def."}</p>
									<p><strong>Incapacidad:</strong> {disabilityPercentage !== null ? disabilityPercentage + "%" : "No def."}</p>
									<p><strong>Ingreso:</strong> {monthlyIncome ? formatCurrency(monthlyIncome) + (includeSAC ? " +SAC" : "") : "No def."}</p>
									<p><strong>Fórmula:</strong> {FORMULAS.find(f => f.value === formulaType)?.label}</p>
									<p><strong>Tasa pura:</strong> {pureInterestRate}%</p>
									<p><strong>Edad jub.:</strong> {retirementAge} años</p>
								</CardContent>
							</Card>

							<Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
								<CardContent className="py-3 text-xs text-blue-800 dark:text-blue-200">
									<strong>Fórmula {FORMULAS.find(f => f.value === formulaType)?.label}:</strong>
									{" "}C = A × (1 - V<sup>n</sup>) / i × incap.
									<br />
									Donde V = 1/(1+i), n = {retirementAge} - edad, i = {pureInterestRate}%
								</CardContent>
							</Card>

							<div className="space-y-2">
								<Button className="w-full" variant="destructive" onClick={handleGeneratePDF} disabled={isGeneratingPDF || totalRubros <= 0}>
									{isGeneratingPDF ? (
										<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Generando...</>
									) : (
										<><Download className="size-4" /> Descargar PDF</>
									)}
								</Button>
								<Button className="w-full" variant="outline" onClick={handleCopyResult} disabled={totalRubros <= 0}>
									<Copy className="size-4" /> Copiar Resultado
								</Button>
							</div>
						</div>
					</div>

					<div className="flex justify-start mt-4">
						<Button variant="outline" onClick={() => setActiveTab("rubros")}>
							<ChevronLeft className="size-4" /> Anterior
						</Button>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
