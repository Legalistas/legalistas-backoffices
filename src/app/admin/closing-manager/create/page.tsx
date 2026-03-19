"use client";

import {
	AlertCircle,
	Briefcase,
	Check,
	ChevronDown,
	ChevronLeft,
	DollarSign,
	FileText,
	Handshake,
	Hash,
	Loader2,
	Save,
	Scale,
	Search,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CASES_ENDPOINT,
	CLOSINGS_ENDPOINT,
	CLOSINGS_FROM_NEGOTIATION_ENDPOINT,
	NEGOTIATIONS_ENDPOINT,
} from "@/constant/api-endpoints";
import {
	closingType,
	statusCapital,
	statusData,
} from "@/constant/closing-manager";
import {
	buildFilteredUrl,
	useRolePermissions,
} from "@/hooks/useRolePermissions";
import { getProcessTypeLabel } from "@/lib/functions";

type TabMode = "from-negotiation" | "direct";

interface Negotiation {
	id: number;
	title: string;
	caseId: number;
	lesion: string;
	expediente: string;
	causa: string;
	case: {
		id: number;
		title: string;
		number: string;
	};
	offers: Array<{
		id: number;
		type: string;
		amount: number;
		date: string;
		accepted: boolean;
	}>;
}

interface FilePart {
	id: number;
	name: string;
	partyType?: string;
	role?: string;
}

interface CaseFile {
	id: number;
	caseId: number;
	title: string;
	cuij: string;
	filetype: number;
	typeProcessId?: number | null;
	filesParts?: FilePart[];
}

interface CaseItem {
	id: number;
	number: string;
	title: string;
	status: string;
	customerId: number;
	customer: {
		id: number;
		name: string;
		image: string;
	};
	responsibleLawyer?: {
		id: number;
		name: string;
		image: string | null;
	};
	files: CaseFile[];
}

export default function CreateClosingPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const permissions = useRolePermissions();
	const [activeTab, setActiveTab] = useState<TabMode>("from-negotiation");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// ── Common form fields ──
	const [type, setType] = useState("SRT");
	const [capitalState, setCapitalState] = useState("AGREEMENT_IN_MANAGEMENT");
	const [feeStatus, setFeeStatus] = useState("EARRINGS");
	const [hpAgreedPercentage, setHpAgreedPercentage] = useState("20");
	const [hpTotal, setHpTotal] = useState("");
	const [withRepresentante, setWithRepresentante] = useState(true);
	const [pclAgreed, setPclAgreed] = useState("20");
	const [pclTotal, setPclTotal] = useState("");
	const [pclStatus, setPclStatus] = useState("EARRINGS");
	const [contributionsAmount, setContributionsAmount] = useState("0");
	const [applyContributions, setApplyContributions] = useState(true);
	const [detail, setDetail] = useState("");

	// ── Tab 1: From Negotiation ──
	const [finalizedNegotiations, setFinalizedNegotiations] = useState<
		Negotiation[]
	>([]);
	const [selectedNegotiationId, setSelectedNegotiationId] = useState("");
	const [selectedNegotiation, setSelectedNegotiation] =
		useState<Negotiation | null>(null);
	const [loadingNegotiations, setLoadingNegotiations] = useState(false);
	const [negSearchTerm, setNegSearchTerm] = useState("");
	const [showNegSuggestions, setShowNegSuggestions] = useState(false);

	// ── Tab 2: Direct ──
	const [cases, setCases] = useState<CaseItem[]>([]);
	const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
	const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
	const [caseSearchTerm, setCaseSearchTerm] = useState("");
	const [isCaseDropdownOpen, setIsCaseDropdownOpen] = useState(false);
	const [loadingCases, setLoadingCases] = useState(false);
	const [capitalAmount, setCapitalAmount] = useState("");
	const [loadingFiles, setLoadingFiles] = useState(false);
	const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
	const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
	const [fileSearch, setFileSearch] = useState("");

	const negSelectRef = useRef<HTMLDivElement>(null);
	const caseSelectRef = useRef<HTMLDivElement>(null);
	const caseSearchRef = useRef<HTMLInputElement>(null);
	const fileDropdownRef = useRef<HTMLDivElement>(null);
	const fileSearchRef = useRef<HTMLInputElement>(null);

	// Reset form on tab change
	const handleTabChange = (tab: TabMode) => {
		setActiveTab(tab);
		setError(null);
		setSuccessMessage(null);
		resetForm();
	};

	const resetForm = () => {
		setType("SRT");
		setCapitalState("AGREEMENT_IN_MANAGEMENT");
		setFeeStatus("EARRINGS");
		setHpAgreedPercentage("20");
		setHpTotal("");
		setWithRepresentante(true);
		setPclAgreed("20");
		setPclTotal("");
		setPclStatus("EARRINGS");
		setContributionsAmount("0");
		setApplyContributions(true);
		setDetail("");
		setSelectedNegotiationId("");
		setSelectedNegotiation(null);
		setNegSearchTerm("");
		setShowNegSuggestions(false);
		setSelectedCase(null);
		setSelectedFile(null);
		setCaseSearchTerm("");
		setCapitalAmount("");
	};

	// ── Fetch finalized negotiations ──
	useEffect(() => {
		if (activeTab !== "from-negotiation" || !session?.user?.accessToken) return;

		const fetchNegotiations = async () => {
			setLoadingNegotiations(true);
			try {
				const url = buildFilteredUrl(NEGOTIATIONS_ENDPOINT, permissions, {
					status: "FINALIZADAS",
					limit: "1000",
				});
				const response = await fetch(url, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					console.error("Negotiations API error:", response.status, errorData);
					throw new Error(errorData.message || `Error ${response.status}`);
				}
				const data = await response.json();
				setFinalizedNegotiations(data.data || []);
			} catch (err: any) {
				console.error("Error fetching negotiations:", err);
				setError(err.message || "Error al cargar las negociaciones finalizadas");
			} finally {
				setLoadingNegotiations(false);
			}
		};
		fetchNegotiations();
	}, [activeTab, session, permissions]);

	// ── Fetch cases for direct closing ──
	useEffect(() => {
		if (activeTab !== "direct" || !session?.user?.accessToken) return;

		const fetchCases = async () => {
			setLoadingCases(true);
			try {
				const url = buildFilteredUrl(CASES_ENDPOINT, permissions, {
					limit: "5000",
				});
				const response = await fetch(url, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});
				if (!response.ok) throw new Error("Error al cargar causas");
				const data = await response.json();
				setCases(data.data || []);
			} catch (err) {
				console.error(err);
				setError("Error al cargar las causas");
			} finally {
				setLoadingCases(false);
			}
		};
		fetchCases();
	}, [activeTab, session, permissions]);

	// Update selected negotiation
	useEffect(() => {
		if (selectedNegotiationId) {
			const neg = finalizedNegotiations.find(
				(n) => n.id.toString() === selectedNegotiationId,
			);
			setSelectedNegotiation(neg || null);
		} else {
			setSelectedNegotiation(null);
		}
	}, [selectedNegotiationId, finalizedNegotiations]);

	// Click outside handler for search dropdowns
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				caseSelectRef.current &&
				!caseSelectRef.current.contains(event.target as Node)
			) {
				setIsCaseDropdownOpen(false);
			}
			if (
				negSelectRef.current &&
				!negSelectRef.current.contains(event.target as Node)
			) {
				setShowNegSuggestions(false);
			}
			if (
				fileDropdownRef.current &&
				!fileDropdownRef.current.contains(event.target as Node)
			) {
				setIsFileDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Auto-focus case search input when dropdown opens
	useEffect(() => {
		if (isCaseDropdownOpen) setTimeout(() => caseSearchRef.current?.focus(), 0);
	}, [isCaseDropdownOpen]);

	const getAcceptedOffer = () => {
		if (!selectedNegotiation) return null;
		return selectedNegotiation.offers.find((offer) => offer.accepted);
	};

	// ── Negotiation search ──
	const filteredNegotiations = finalizedNegotiations.filter(
		(neg) =>
			neg.title?.toLowerCase().includes(negSearchTerm.toLowerCase()) ||
			neg.case?.title?.toLowerCase().includes(negSearchTerm.toLowerCase()) ||
			neg.case?.number?.toLowerCase().includes(negSearchTerm.toLowerCase()) ||
			neg.expediente?.toLowerCase().includes(negSearchTerm.toLowerCase()) ||
			neg.causa?.toLowerCase().includes(negSearchTerm.toLowerCase()),
	);

	const handleSelectNegotiation = (neg: Negotiation) => {
		setSelectedNegotiationId(neg.id.toString());
		setSelectedNegotiation(neg);
		setNegSearchTerm(neg.title);
		setShowNegSuggestions(false);
	};

	const handleRemoveNegotiation = () => {
		setSelectedNegotiationId("");
		setSelectedNegotiation(null);
		setNegSearchTerm("");
	};

	const handleSelectCase = async (caseItem: CaseItem) => {
		setSelectedCase(caseItem);
		setSelectedFile(null);
		setCaseSearchTerm("");
		setCaseFiles([]);

		// Fetch files for this case
		setLoadingFiles(true);
		try {
			const response = await fetch(`${CASES_ENDPOINT}/${caseItem.id}`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (response.ok) {
				const data = await response.json();
				const caseData = data.data || data;
				setCaseFiles(caseData.files || []);
			}
		} catch (err) {
			console.error("Error fetching case files:", err);
		} finally {
			setLoadingFiles(false);
		}
	};

	const handleSelectFile = (file: CaseFile) => {
		setSelectedFile(file);
	};

	const handleRemoveCase = () => {
		setSelectedCase(null);
		setSelectedFile(null);
		setCaseSearchTerm("");
		setCaseFiles([]);
	};

	// ── Submit ──
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);
		setSuccessMessage(null);

		try {
			if (activeTab === "from-negotiation") {
				if (!selectedNegotiationId)
					throw new Error("Seleccione una negociación");
				const acceptedOffer = getAcceptedOffer();
				if (!acceptedOffer)
					throw new Error("No hay oferta aceptada en esta negociación");

				const response = await fetch(
					CLOSINGS_FROM_NEGOTIATION_ENDPOINT(Number(selectedNegotiationId)),
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
						body: JSON.stringify({
							type,
							capitalState,
							feeStatus,
							hpAgreed: parseFloat(hpAgreedPercentage) || 20,
							hpTotal: parseFloat(hpTotal) || 0,
							hpDistribution: withRepresentante,
							pclAgreed: parseFloat(pclAgreed) || 20,
							pclTotal: parseFloat(pclTotal) || 0,
							pclDistribution: withRepresentante,
							pclStatus,
							contributionsAmount: parseFloat(contributionsAmount) || 0,
							applyContributions,
							detail: detail || null,
						}),
					},
				);
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || "Error al crear el cierre");
				}
			} else {
				// Direct closing
				if (!selectedCase) throw new Error("Seleccione una causa");
				if (!capitalAmount) throw new Error("Ingrese el monto capital");

				const response = await fetch(CLOSINGS_ENDPOINT, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({
						caseId: selectedCase.id,
						type,
						capitalAmount: parseFloat(capitalAmount),
						capitalState,
						feeStatus,
						hpAgreed: parseFloat(hpAgreedPercentage) || 20,
						hpTotal: parseFloat(hpTotal) || 0,
						hpDistribution: withRepresentante,
						pclAgreed: parseFloat(pclAgreed) || 20,
						pclTotal: parseFloat(pclTotal) || 0,
						pclDistribution: withRepresentante,
						pclStatus,
						contributionsAmount: parseFloat(contributionsAmount) || 0,
						applyContributions,
						detail: detail || null,
					}),
				});
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || "Error al crear el cierre");
				}
			}

			router.push("/admin/closing-manager");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setIsSubmitting(false);
		}
	};

	const acceptedOffer = getAcceptedOffer();

	// ── Auto-calculate HP Total and PCL Total ──
	useEffect(() => {
		const capital =
			activeTab === "from-negotiation"
				? acceptedOffer?.amount || 0
				: parseFloat(capitalAmount) || 0;
		const hpPercent = parseFloat(hpAgreedPercentage) || 0;
		setHpTotal(((capital * hpPercent) / 100).toFixed(2));
	}, [activeTab, acceptedOffer?.amount, capitalAmount, hpAgreedPercentage]);

	useEffect(() => {
		const capital =
			activeTab === "from-negotiation"
				? acceptedOffer?.amount || 0
				: parseFloat(capitalAmount) || 0;
		const pclPercent = parseFloat(pclAgreed) || 0;
		setPclTotal(((capital * pclPercent) / 100).toFixed(2));
	}, [activeTab, acceptedOffer?.amount, capitalAmount, pclAgreed]);

	// Format expediente label: "CLIENTE c/ DEMANDADA s/ TIPO PROCESO"
	const formatFileLabel = (file: CaseFile, customerName?: string) => {
		const client =
			customerName?.toUpperCase() || file.title?.toUpperCase() || "";
		const demandada = file.filesParts?.[0]?.name;
		const processType = getProcessTypeLabel(file.typeProcessId ?? null);

		let label = client;
		if (demandada) {
			label += ` C/ ${demandada.toUpperCase()}`;
		}
		label += ` S/ ${processType.toUpperCase()}`;
		return label;
	};

	const selectedFileLabel = (() => {
		if (!selectedFile) return "Seleccionar expediente";
		return `Exp. #${selectedFile.id} — ${formatFileLabel(selectedFile, selectedCase?.customer?.name)}`;
	})();

	const searchedFiles = (() => {
		if (!fileSearch) return caseFiles;
		const q = fileSearch.toLowerCase();
		return caseFiles.filter(
			(f) =>
				f.title?.toLowerCase().includes(q) ||
				f.cuij?.toLowerCase().includes(q) ||
				f.id.toString().includes(q) ||
				getProcessTypeLabel(f.typeProcessId ?? null)
					.toLowerCase()
					.includes(q),
		);
	})();

	const selectedCaseLabel = (() => {
		if (!selectedCase) return "Seleccionar causa";
		return `${selectedCase.title} — ${selectedCase.customer?.name || ""}`;
	})();

	const searchedCases = (() => {
		if (!caseSearchTerm) return cases;
		const q = caseSearchTerm.toLowerCase();
		return cases.filter(
			(c) =>
				c.title.toLowerCase().includes(q) ||
				c.customer?.name?.toLowerCase().includes(q) ||
				c.number?.includes(caseSearchTerm),
		);
	})();

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link href="/admin/closing-manager">
					<Button
						variant="outline"
						className="flex items-center gap-2"
					>
						<ChevronLeft className="h-4 w-4" />
						Volver
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Crear Nuevo Cierre
					</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Seleccione el tipo de cierre que desea crear
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
				<div className="flex border-b border-gray-200 dark:border-gray-800 rounded-t-xl overflow-hidden">
					<button
						type="button"
						onClick={() => handleTabChange("from-negotiation")}
						className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
							activeTab === "from-negotiation"
								? "text-primary border-b-2 border-primary bg-primary/5"
								: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
						}`}
					>
						<Handshake className="h-5 w-5" />
						<span>Desde Negociacion</span>
					</button>
					<button
						type="button"
						onClick={() => handleTabChange("direct")}
						className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
							activeTab === "direct"
								? "text-primary border-b-2 border-primary bg-primary/5"
								: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
						}`}
					>
						<FileText className="h-5 w-5" />
						<span>Cierre Directo</span>
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Error / Success */}
					{error && (
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
							<span className="font-medium">Error:</span> {error}
						</div>
					)}
					{successMessage && (
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
							{successMessage}
						</div>
					)}

					{/* ═══════════ TAB 1: FROM NEGOTIATION ═══════════ */}
					{activeTab === "from-negotiation" && (
						<div className="space-y-6">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Buscar Negociacion Finalizada{" "}
									<span className="text-red-500">*</span>
								</label>
								{loadingNegotiations ? (
									<div className="flex items-center gap-2 text-sm text-gray-500 py-3">
										<Loader2 className="h-4 w-4 animate-spin" />
										Cargando negociaciones...
									</div>
								) : (
									<div className="relative w-full" ref={negSelectRef}>
										<div className="relative w-full min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
											<div className="flex flex-wrap items-center gap-1.5 p-2">
												{selectedNegotiation && (
													<div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
														<Handshake className="w-3 h-3" />
														<span className="max-w-[300px] truncate">
															{selectedNegotiation.title} - Exp:{" "}
															{selectedNegotiation.expediente ||
																selectedNegotiation.case?.number ||
																"-"}
														</span>
														<button
															type="button"
															onClick={handleRemoveNegotiation}
															className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
														>
															<X className="w-3 h-3" />
														</button>
													</div>
												)}
												<div className="flex-1 min-w-[150px] relative">
													<input
														type="text"
														className="w-full border-0 bg-transparent pl-2 pr-8 py-1 text-sm placeholder-gray-400 dark:placeholder-gray-500 dark:text-gray-200 focus:outline-none focus:ring-0"
														placeholder={
															selectedNegotiation
																? ""
																: "Buscar por causa, expediente o titulo..."
														}
														value={negSearchTerm}
														onChange={(e) => {
															setNegSearchTerm(e.target.value);
															setShowNegSuggestions(true);
														}}
														onFocus={() => setShowNegSuggestions(true)}
													/>
													<div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
														<Search className="w-4 h-4 text-gray-400" />
													</div>
												</div>
											</div>
										</div>

										{/* Negotiation suggestions dropdown */}
										{showNegSuggestions &&
											!selectedNegotiation &&
											filteredNegotiations.length > 0 && (
												<div className="absolute z-[100] mt-2 w-full max-h-80 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
													{filteredNegotiations.map((neg) => {
														const accepted = neg.offers?.find(
															(o) => o.accepted,
														);
														return (
															<div
																key={neg.id}
																className="cursor-pointer px-4 py-3 text-sm transition-all hover:bg-primary/5 dark:hover:bg-primary/10 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
																onClick={() => handleSelectNegotiation(neg)}
															>
																<div className="font-semibold text-gray-900 dark:text-white">
																	{neg.title}
																</div>
																<div className="flex flex-wrap items-center gap-2 mt-1.5">
																	<span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
																		Causa: {neg.causa || neg.case?.title || "-"}
																	</span>
																	<span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
																		Exp:{" "}
																		{neg.expediente || neg.case?.number || "-"}
																	</span>
																	{neg.lesion && (
																		<span className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
																			Lesion: {neg.lesion}
																		</span>
																	)}
																	{accepted && (
																		<span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
																			Oferta:{" "}
																			{new Intl.NumberFormat("es-AR", {
																				style: "currency",
																				currency: "ARS",
																			}).format(accepted.amount)}
																		</span>
																	)}
																</div>
															</div>
														);
													})}
												</div>
											)}
										{showNegSuggestions &&
											!selectedNegotiation &&
											filteredNegotiations.length === 0 &&
											negSearchTerm && (
												<div className="absolute z-[100] mt-2 w-full rounded-xl border border-border bg-background shadow-xl p-4 text-sm text-muted-foreground text-center">
													No se encontraron negociaciones finalizadas
												</div>
											)}
									</div>
								)}
							</div>

							{/* Negotiation info card */}
							{selectedNegotiation && (
								<div className="bg-gradient-to-r from-[#09A4B5]/5 to-[#09A4B5]/10 border border-primary/20 rounded-xl p-5">
									<h4 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
										<Handshake className="h-4 w-4" />
										Informacion de la Negociacion
									</h4>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
										<div className="bg-white/60 dark:bg-white/5 rounded-lg p-3">
											<span className="text-muted-foreground text-xs block mb-1">
												Causa
											</span>
											<span className="font-medium text-foreground">
												{selectedNegotiation.case.title}
											</span>
										</div>
										<div className="bg-white/60 dark:bg-white/5 rounded-lg p-3">
											<span className="text-muted-foreground text-xs block mb-1">
												Expediente
											</span>
											<span className="font-medium text-foreground">
												{selectedNegotiation.case.number || "-"}
											</span>
										</div>
										<div className="bg-white/60 dark:bg-white/5 rounded-lg p-3">
											<span className="text-muted-foreground text-xs block mb-1">
												Lesion
											</span>
											<span className="font-medium text-foreground">
												{selectedNegotiation.lesion}
											</span>
										</div>
										{acceptedOffer && (
											<>
												<div className="bg-white/60 dark:bg-white/5 rounded-lg p-3">
													<span className="text-muted-foreground text-xs block mb-1">
														Oferta Aceptada
													</span>
													<span className="font-semibold text-green-600">
														{new Intl.NumberFormat("es-AR", {
															style: "currency",
															currency: "ARS",
														}).format(acceptedOffer.amount)}
													</span>
												</div>
												<div className="bg-white/60 dark:bg-white/5 rounded-lg p-3">
													<span className="text-muted-foreground text-xs block mb-1">
														Tipo
													</span>
													<span className="font-medium text-foreground">
														{acceptedOffer.type === "ASEGURADORA"
															? "ART"
															: "LEGALISTAS"}
													</span>
												</div>
												<div className="bg-white/60 dark:bg-white/5 rounded-lg p-3">
													<span className="text-muted-foreground text-xs block mb-1">
														Fecha
													</span>
													<span className="font-medium text-foreground">
														{new Date(acceptedOffer.date).toLocaleDateString(
															"es-AR",
														)}
													</span>
												</div>
											</>
										)}
									</div>
									{acceptedOffer && (
										<p className="text-xs text-primary mt-3 bg-white/40 dark:bg-white/10 rounded-md px-3 py-2">
											Este monto sera usado como Capital y HP Acordados
											automaticamente
										</p>
									)}
								</div>
							)}
						</div>
					)}

					{/* ═══════════ TAB 2: DIRECT CLOSING ═══════════ */}
					{activeTab === "direct" && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{/* Case search */}
							<div className="space-y-1.5">
								<label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
									<FileText className="h-3.5 w-3.5" />
									Causa <span className="text-red-500">*</span>
								</label>
								{loadingCases ? (
									<div className="flex items-center gap-2 text-sm text-gray-500 py-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Cargando causas...
									</div>
								) : (
									<div className="relative" ref={caseSelectRef}>
										<button
											type="button"
											onClick={() => {
												setIsCaseDropdownOpen(!isCaseDropdownOpen);
												setCaseSearchTerm("");
											}}
											className="w-full flex items-center justify-between text-sm text-left bg-muted border border-border rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]/20 focus:border-primary transition-colors"
										>
											<span
												className={`truncate ${!selectedCase ? "text-muted-foreground" : "text-foreground"}`}
											>
												{selectedCaseLabel}
											</span>
											<ChevronDown
												className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isCaseDropdownOpen ? "rotate-180" : ""}`}
											/>
										</button>

										{isCaseDropdownOpen && (
											<div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
												<div className="p-2 border-b border-border">
													<div className="relative">
														<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
														<input
															ref={caseSearchRef}
															type="text"
															value={caseSearchTerm}
															onChange={(e) =>
																setCaseSearchTerm(e.target.value)
															}
															placeholder="Buscar causa..."
															className="w-full text-xs bg-muted border border-border rounded-md pl-8 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-[#09A4B5] focus:border-primary"
														/>
													</div>
												</div>
												<div className="max-h-44 overflow-y-auto">
													{searchedCases.slice(0, 50).map((caseItem) => (
														<button
															key={caseItem.id}
															type="button"
															onClick={() => {
																handleSelectCase(caseItem);
																setIsCaseDropdownOpen(false);
															}}
															className={`w-full flex flex-col px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0 ${selectedCase?.id === caseItem.id ? "bg-primary/5" : ""}`}
														>
															<span className="text-xs font-medium text-foreground">
																{caseItem.title}
															</span>
															<span className="text-[11px] text-muted-foreground truncate">
																{caseItem.customer?.name || ""}
																{caseItem.number
																	? ` — N° ${caseItem.number}`
																	: ""}
															</span>
														</button>
													))}
													{searchedCases.length === 0 && (
														<p className="px-3 py-4 text-xs text-muted-foreground text-center">
															Sin resultados
														</p>
													)}
												</div>
											</div>
										)}
									</div>
								)}
							</div>

							{/* Expediente */}
							{selectedCase && (
								<div className="space-y-1.5">
										<label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
											<FileText className="h-3.5 w-3.5" />
											Expediente <span className="text-red-500">*</span>
										</label>
										{loadingFiles ? (
											<div className="flex items-center gap-2 text-sm text-gray-500 py-2">
												<Loader2 className="h-4 w-4 animate-spin" />
												Cargando expedientes...
											</div>
										) : caseFiles.length === 0 ? (
											<p className="text-sm text-gray-500 py-2">
												No hay expedientes disponibles para esta causa
											</p>
										) : (
											<div className="relative" ref={fileDropdownRef}>
												<button
													type="button"
													onClick={() => {
														setIsFileDropdownOpen(!isFileDropdownOpen);
														setFileSearch("");
													}}
													className="w-full flex items-center justify-between text-sm text-left bg-muted border border-border rounded-lg px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
												>
													<span
														className={`truncate ${!selectedFile ? "text-muted-foreground" : "text-foreground"}`}
													>
														{selectedFileLabel}
													</span>
													<ChevronDown
														className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isFileDropdownOpen ? "rotate-180" : ""}`}
													/>
												</button>

												{isFileDropdownOpen && (
													<div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
														<div className="p-2 border-b border-border">
															<div className="relative">
																<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
																<input
																	ref={fileSearchRef}
																	type="text"
																	value={fileSearch}
																	onChange={(e) =>
																		setFileSearch(e.target.value)
																	}
																	placeholder="Buscar expediente..."
																	className="w-full text-xs bg-muted border border-border rounded-md pl-8 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
																/>
															</div>
														</div>
														<div className="max-h-44 overflow-y-auto">
															{searchedFiles.map((file) => (
																<button
																	key={file.id}
																	type="button"
																	onClick={() => {
																		handleSelectFile(file);
																		setIsFileDropdownOpen(false);
																	}}
																	className={`w-full flex flex-col px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0 ${selectedFile?.id === file.id ? "bg-primary/5" : ""}`}
																>
																	<span className="text-xs font-medium text-foreground">
																		Exp. #{file.id}
																	</span>
																	<span className="text-[11px] text-muted-foreground truncate">
																		{formatFileLabel(
																			file,
																			selectedCase?.customer?.name,
																		)}
																	</span>
																</button>
															))}
															{searchedFiles.length === 0 && (
																<p className="px-3 py-4 text-xs text-muted-foreground text-center">
																	Sin resultados
																</p>
															)}
														</div>
													</div>
												)}
											</div>
										)}
									</div>
							)}

							{/* Capital Amount */}
							{selectedCase && (
							<div className="space-y-1.5">
								<label className="text-sm font-medium text-muted-foreground">
									Monto Capital <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
										$
									</span>
									<input
										type="number"
										step="0.01"
										min="0"
										value={capitalAmount}
										onChange={(e) => setCapitalAmount(e.target.value)}
										className="w-full h-11 pl-8 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
										placeholder="0.00"
										required
									/>
								</div>
							</div>
							)}
							</div>{/* close grid-cols-3 */}
						</div>
					)}

					{/* ═══════════ COMMON FORM FIELDS v2 — GRID LAYOUT ═══════════ */}
					{((activeTab === "from-negotiation" && selectedNegotiation) ||
						(activeTab === "direct" && selectedCase)) && (
						<>
							<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 border-t border-border pt-6">

								{/* ── LEFT SIDEBAR: Resumen ── */}
								<div className="space-y-4">
									{/* Resumen de causa */}
									<div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3 sticky top-4">
										<h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
										<Scale className="h-3.5 w-3.5" />
										Datos del Caso
									</h4>
										{activeTab === "direct" && selectedCase && (
											<div className="space-y-1.5">
												<div className="bg-background rounded-lg p-2.5 border border-border flex items-center gap-2">
													<FileText className="h-3.5 w-3.5 text-primary shrink-0" />
													<div>
														<span className="text-muted-foreground text-[10px] uppercase tracking-wider block">Causa</span>
														<span className="font-medium text-foreground text-xs">{selectedCase.title}</span>
													</div>
												</div>
												<div className="bg-background rounded-lg p-2.5 border border-border flex items-center gap-2">
													<User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
													<div>
														<span className="text-muted-foreground text-[10px] uppercase tracking-wider block">Cliente</span>
														<span className="font-medium text-foreground text-xs">{selectedCase.customer?.name || "-"}</span>
													</div>
												</div>
												{selectedCase.responsibleLawyer && (
													<div className="bg-background rounded-lg p-2.5 border border-border flex items-center gap-2">
														<Briefcase className="h-3.5 w-3.5 text-violet-500 shrink-0" />
														<div>
															<span className="text-muted-foreground text-[10px] uppercase tracking-wider block">Abogado</span>
															<span className="font-medium text-foreground text-xs">{selectedCase.responsibleLawyer.name}</span>
														</div>
													</div>
												)}
												{selectedFile && (
													<div className="bg-background rounded-lg p-2.5 border border-border flex items-center gap-2">
														<Hash className="h-3.5 w-3.5 text-amber-500 shrink-0" />
														<div>
															<span className="text-muted-foreground text-[10px] uppercase tracking-wider block">Expediente</span>
															<span className="font-medium text-foreground text-xs">#{selectedFile.id}</span>
														</div>
													</div>
												)}
											</div>
										)}
										{activeTab === "from-negotiation" && selectedNegotiation && (
											<div className="space-y-1.5">
												<div className="bg-background rounded-lg p-2.5 border border-border flex items-center gap-2">
													<FileText className="h-3.5 w-3.5 text-primary shrink-0" />
													<div>
														<span className="text-muted-foreground text-[10px] uppercase tracking-wider block">Causa</span>
														<span className="font-medium text-foreground text-xs">{selectedNegotiation.case.title}</span>
													</div>
												</div>
												<div className="bg-background rounded-lg p-2.5 border border-border flex items-center gap-2">
													<Hash className="h-3.5 w-3.5 text-amber-500 shrink-0" />
													<div>
														<span className="text-muted-foreground text-[10px] uppercase tracking-wider block">Expediente</span>
														<span className="font-medium text-foreground text-xs">{selectedNegotiation.case.number || selectedNegotiation.expediente || "-"}</span>
													</div>
												</div>
												{selectedNegotiation.lesion && (
													<div className="bg-background rounded-lg p-2.5 border border-border flex items-center gap-2">
														<AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
														<div>
															<span className="text-muted-foreground text-[10px] uppercase tracking-wider block">Lesión</span>
															<span className="font-medium text-foreground text-xs">{selectedNegotiation.lesion}</span>
														</div>
													</div>
												)}
												{(() => {
													const offer = selectedNegotiation.offers?.find((o) => o.accepted);
													return offer ? (
														<div className="bg-primary/10 rounded-lg p-2.5 border border-primary/20 flex items-center gap-2">
															<DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
															<div>
																<span className="text-primary text-[10px] uppercase tracking-wider block">Oferta Aceptada</span>
																<span className="font-bold text-primary text-sm">
																	{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(offer.amount)}
																</span>
															</div>
														</div>
													) : null;
												})()}
											</div>
										)}

										{/* Monto a Transferir - Preview en sidebar */}
										{(() => {
											const hp = Number(hpTotal) || 0;
											const pcl = Number(pclTotal) || 0;
											const aportes = applyContributions ? Number(contributionsAmount) || 0 : 0;
											const hpLeg = hp - (withRepresentante ? hp * 0.25 : 0);
											const pclLeg = pcl - (withRepresentante ? pcl * 0.25 : 0);
											const aportesLeg = aportes * (withRepresentante ? 0.75 : 1);
											const monto = hpLeg + pclLeg - aportesLeg;
											return (
												<div className={`rounded-lg p-3 border ${monto < 0 ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : "border-primary/30 bg-primary/5"}`}>
													<span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">A Transferir</span>
													<span className={`text-lg font-bold ${monto < 0 ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
														{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto)}
													</span>
												</div>
											);
										})()}
									</div>
								</div>

								{/* ── RIGHT: Datos del cierre ── */}
								<div className="space-y-5">
								{/* Estados y tipo */}
								<div>
									<h3 className="text-sm font-semibold text-foreground mb-4">
										Datos del Cierre
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
										<div className="space-y-1.5">
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Tipo de Cierre <span className="text-red-500">*</span>
											</label>
											<Select value={type} onValueChange={setType}>
												<SelectTrigger className="h-11 w-full">
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													{Object.entries(closingType)
														.filter(([k]) => k === k.toUpperCase())
														.map(([k, v]) => (
															<SelectItem key={k} value={k}>
																{v as string}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1.5">
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Estado Capital <span className="text-red-500">*</span>
											</label>
											<Select
												value={capitalState}
												onValueChange={setCapitalState}
											>
												<SelectTrigger className="h-11 w-full">
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													{Object.entries(statusCapital)
														.filter(([k]) => k === k.toUpperCase())
														.map(([k, v]) => (
															<SelectItem key={k} value={k}>
																{v as string}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1.5">
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Estado Honorarios{" "}
												<span className="text-red-500">*</span>
											</label>
											<Select value={feeStatus} onValueChange={setFeeStatus}>
												<SelectTrigger className="h-11 w-full">
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													{Object.entries(statusData)
														.filter(([k]) => k === k.toUpperCase())
														.map(([k, v]) => (
															<SelectItem key={k} value={k}>
																{v as string}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1.5">
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Estado PCL
											</label>
											<Select value={pclStatus} onValueChange={setPclStatus}>
												<SelectTrigger className="h-11 w-full">
													<SelectValue placeholder="Seleccione" />
												</SelectTrigger>
												<SelectContent>
													{Object.entries(statusData)
														.filter(([k]) => k === k.toUpperCase())
														.map(([k, v]) => (
															<SelectItem key={k} value={k}>
																{v as string}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
									</div>
								</div>

								{/* Distribución con representante */}
								<div className="flex items-center justify-between rounded-xl border border-border px-5 py-3.5">
									<div>
										<p className="text-sm font-medium text-foreground">Distribución con representante (25%)</p>
										<p className="text-xs text-muted-foreground mt-0.5">Aplica tanto a HP como a PCL</p>
									</div>
									<Switch
										checked={withRepresentante}
										onCheckedChange={setWithRepresentante}
									/>
								</div>

								{/* HP */}
								<div className="border border-border rounded-xl p-5 space-y-4">
									<h4 className="font-semibold text-sm text-foreground">Honorarios Pactados (HP)</h4>
									<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												HP Convenido (%)
											</label>
											<div className="relative">
												<input
													type="number"
													step="0.01"
													min="0"
													max="100"
													value={hpAgreedPercentage}
													onChange={(e) =>
														setHpAgreedPercentage(e.target.value)
													}
													className="w-full h-11 px-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
													placeholder="20"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
													%
												</span>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												HP Total ($)
											</label>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
													$
												</span>
												<input
													type="number"
													step="0.01"
													min="0"
													value={hpTotal}
													readOnly
													className="w-full h-11 pl-7 pr-3 rounded-lg border border-border bg-muted text-sm text-foreground outline-none cursor-default"
													placeholder="0.00"
												/>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												HP Representante ($)
											</label>
											<div
												className={`h-11 flex items-center px-3 rounded-lg bg-muted border border-border text-sm text-foreground ${!withRepresentante ? "text-gray-400" : "font-medium"}`}
											>
												{new Intl.NumberFormat("es-AR", {
													style: "currency",
													currency: "ARS",
												}).format(
													withRepresentante ? (Number(hpTotal) || 0) * 0.25 : 0,
												)}
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												HP Legalistas ($)
											</label>
											<div className="h-11 flex items-center px-3 rounded-lg bg-muted border border-border text-sm text-foreground font-semibold text-gray-900 dark:text-white">
												{new Intl.NumberFormat("es-AR", {
													style: "currency",
													currency: "ARS",
												}).format(
													(Number(hpTotal) || 0) -
														(withRepresentante
															? (Number(hpTotal) || 0) * 0.25
															: 0),
												)}
											</div>
										</div>
									</div>
								</div>

								{/* PCL */}
								<div className="border border-border rounded-xl p-5 space-y-4">
									<h4 className="font-semibold text-sm text-foreground">Pacto de Cuota Litis (PCL)</h4>
									<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												PCL Convenido (%)
											</label>
											<div className="relative">
												<input
													type="number"
													step="0.01"
													min="0"
													max="100"
													value={pclAgreed}
													onChange={(e) => setPclAgreed(e.target.value)}
													className="w-full h-11 px-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
													placeholder="20"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
													%
												</span>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												PCL Total ($)
											</label>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
													$
												</span>
												<input
													type="number"
													step="0.01"
													min="0"
													value={pclTotal}
													readOnly
													className="w-full h-11 pl-7 pr-3 rounded-lg border border-border bg-muted text-sm text-foreground outline-none cursor-default"
													placeholder="0.00"
												/>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												PCL Representante ($)
											</label>
											<div
												className={`h-11 flex items-center px-3 rounded-lg bg-muted border border-border text-sm text-foreground ${!withRepresentante ? "text-gray-400" : "font-medium"}`}
											>
												{new Intl.NumberFormat("es-AR", {
													style: "currency",
													currency: "ARS",
												}).format(
													withRepresentante ? (Number(pclTotal) || 0) * 0.25 : 0,
												)}
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												PCL Legalistas ($)
											</label>
											<div className="h-11 flex items-center px-3 rounded-lg bg-muted border border-border text-sm text-foreground font-semibold text-gray-900 dark:text-white">
												{new Intl.NumberFormat("es-AR", {
													style: "currency",
													currency: "ARS",
												}).format(
													(Number(pclTotal) || 0) -
														(withRepresentante
															? (Number(pclTotal) || 0) * 0.25
															: 0),
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Aportes */}
								<div className="border border-border rounded-xl p-5 space-y-4">
									<div className="flex items-center justify-between">
										<h4 className="font-semibold text-sm text-foreground">Aportes</h4>
										<div className="flex items-center gap-2">
											<span className="text-sm text-muted-foreground">Aplicar aportes</span>
											<Switch checked={applyContributions} onCheckedChange={setApplyContributions} />
										</div>
									</div>
									<div className="grid grid-cols-3 gap-4">
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												Aportes Totales ($)
											</label>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
													$
												</span>
												<input
													type="number"
													step="0.01"
													min="0"
													value={contributionsAmount}
													onChange={(e) =>
														setContributionsAmount(e.target.value)
													}
													disabled={!applyContributions}
													className="w-full h-11 pl-7 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100 disabled:text-gray-400"
													placeholder="0.00"
												/>
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												Aportes Representante ($)
											</label>
											<div
												className={`h-11 flex items-center px-3 rounded-lg bg-muted border border-border text-sm text-foreground ${!applyContributions || !withRepresentante ? "text-gray-400" : ""}`}
											>
												{new Intl.NumberFormat("es-AR", {
													style: "currency",
													currency: "ARS",
												}).format(
													applyContributions && withRepresentante
														? (Number(contributionsAmount) || 0) * 0.25
														: 0,
												)}
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground">
												Aportes Legalistas ($)
											</label>
											<div
												className={`h-11 flex items-center px-3 rounded-lg bg-muted border border-border text-sm text-foreground ${!applyContributions ? "text-gray-400" : ""}`}
											>
												{new Intl.NumberFormat("es-AR", {
													style: "currency",
													currency: "ARS",
												}).format(
													applyContributions
														? (Number(contributionsAmount) || 0) * (withRepresentante ? 0.75 : 1)
														: 0,
												)}
											</div>
										</div>
									</div>
									<p className="text-xs text-gray-400">
										Monto manual ingresado por la contadora.
										{withRepresentante ? "Distribución: 75% Legalistas / 25% Representante." : "Distribución: 100% Legalistas."}
									</p>
								</div>

								{/* Detalle */}
								<div className="space-y-1.5">
									<label className="text-sm font-medium text-muted-foreground">
										Detalle
									</label>
									<textarea
										value={detail}
										onChange={(e) => setDetail(e.target.value)}
										rows={3}
										className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
										placeholder="Descripción de la situación del cierre..."
									/>
								</div>
								</div>{/* close right col */}
							</div>{/* close grid */}

							{/* Actions */}
							<div className="flex justify-end gap-3 pt-6 border-t border-border">
								<Link href="/admin/closing-manager">
									<Button type="button" variant="outline" className="px-6">
										Cancelar
									</Button>
								</Link>
								<Button
									type="submit"
									disabled={
										isSubmitting ||
										(activeTab === "from-negotiation" &&
											!selectedNegotiationId) ||
										(activeTab === "direct" && !selectedCase)
									}
									className={`px-6 bg-primary text-white hover:bg-primary/85 ${
										isSubmitting ||
										(activeTab === "from-negotiation" &&
											!selectedNegotiationId) ||
										(activeTab === "direct" && !selectedCase)
											? "opacity-60 cursor-not-allowed"
											: ""
									}`}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Creando...
										</>
									) : (
										<>
											<Save className="h-4 w-4 mr-2" />
											Crear Cierre
										</>
									)}
								</Button>
							</div>
						</>
					)}
				</form>
			</div>
		</div>
	);
}
