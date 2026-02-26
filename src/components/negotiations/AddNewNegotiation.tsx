"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, X, AlertCircle, Check, Loader2, Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Role } from "@/constant/user";
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions";
import { NEGOTIATIONS_NEGOTIABLE_CAUSES_ENDPOINT, NEGOTIATIONS_ENDPOINT } from "@/constant/api-endpoints";

interface CaseFile {
    id: number;
    caseId: number;
    title: string;
    cuij: string;
    filetype: number;
    accidentDate: string;
    filesParts: Array<{
        id: number;
        name: string;
        partyType: string;
        role: string;
    }>;
}

interface Lawyer {
    id: number;
    name: string;
    image: string;
}

interface NegotiableCause {
    id: number;
    number: string;
    customerId: number;
    title: string;
    status: string;
    internalLawyerId?: number;
    responsibleLawyerId?: number;
    internalLawyer?: Lawyer;
    responsibleLawyer?: Lawyer;
    customer: {
        id: number;
        name: string;
        image: string;
    };
    files: CaseFile[];
}

export default function AddNewNegotiation() {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = useRolePermissions();
    const [formData, setFormData] = useState({
        caseId: "",
        caseFileId: "",
        lawyerId: "",
        lawyerType: "interno", // "interno" o "responsable"
        artName: "",
        contraparteLawyer: "",
        incLegalistas: "",
        liquidacionLegalistas: "",
        lesion: "",
        title: "", // Título generado automáticamente
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // States for cause selection
    const [causes, setCauses] = useState<NegotiableCause[]>([]);
    const [selectedCause, setSelectedCause] = useState<NegotiableCause | null>(null);
    const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
    const [causeSearchTerm, setCauseSearchTerm] = useState("");
    const [showCauseSuggestions, setShowCauseSuggestions] = useState(false);
    const [isLoadingCauses, setIsLoadingCauses] = useState(false);

    const causeSelectRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch negotiable causes
    useEffect(() => {
        const fetchCauses = async () => {
            if (!session?.user?.accessToken) return;

            setIsLoadingCauses(true);
            try {
                // Usar el hook para construir URL con filtros
                const url = buildFilteredUrl(
                    NEGOTIATIONS_NEGOTIABLE_CAUSES_ENDPOINT,
                    permissions,
                    { limit: "5000" }
                );

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                });

                if (!response.ok) throw new Error("Error al cargar causas");
                const data = await response.json();
                
                let causesData = data.data || [];

                // Filtro adicional del lado del cliente si es necesario
                if (permissions.isLawyer) {
                    const userId = permissions.getUserId();
                    if (userId) {
                        causesData = causesData.filter((cause: NegotiableCause) => 
                            cause.internalLawyerId === userId || 
                            cause.responsibleLawyerId === userId
                        );
                    }
                }

                setCauses(causesData);
            } catch (err) {
                console.error("Error fetching causes:", err);
                setError("No se pudieron cargar las causas disponibles");
            } finally {
                setIsLoadingCauses(false);
            }
        };

        if (session?.user?.accessToken) {
            fetchCauses();
        }
    }, [session, permissions]);

    // Filter causes based on search
    const filteredCauses = causes.filter((cause) =>
        cause.title.toLowerCase().includes(causeSearchTerm.toLowerCase()) ||
        cause.customer.name.toLowerCase().includes(causeSearchTerm.toLowerCase()) ||
        cause.number.includes(causeSearchTerm)
    );

    // Handle cause search change
    const handleCauseSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCauseSearchTerm(e.target.value);
        setShowCauseSuggestions(true);
    };

    // Handle select cause
    const handleSelectCause = (cause: NegotiableCause) => {
        setSelectedCause(cause);
        setSelectedFile(null);
        setCauseSearchTerm(cause.title);
        setShowCauseSuggestions(false);
        setFormData(prev => ({ ...prev, caseId: String(cause.id), caseFileId: "" }));
    };

    // Handle select file (expediente)
    const handleSelectFile = (cause: NegotiableCause, file: CaseFile) => {
        setSelectedCause(cause);
        setSelectedFile(file);
        setCauseSearchTerm(cause.title);
        setShowCauseSuggestions(false);

        // Auto-llenar la ART/Aseguradora si existe en filesParts
        const artName = file.filesParts?.find((part) => part.role === "ASEGURADORA")?.name || "";

        // Auto-llenar el abogado contraparte si existe en filesParts
        const contraparteLawyer = file.filesParts?.find((part) => part.role === "abogado_contraparte")?.name || "";

        // Generar título automático: "CLIENTE C/ASEGURADORA"
        const customerName = cause.customer.name.toUpperCase();
        const title = artName
            ? `${customerName} C/${artName.toUpperCase()}`
            : `${customerName} C/`;

        // Determinar qué abogado seleccionar por defecto
        let defaultLawyerId = "";
        let defaultLawyerType = "interno";

        if (cause.internalLawyerId) {
            defaultLawyerId = String(cause.internalLawyerId);
            defaultLawyerType = "interno";
        } else if (cause.responsibleLawyerId) {
            defaultLawyerId = String(cause.responsibleLawyerId);
            defaultLawyerType = "responsable";
        }

        setFormData(prev => ({
            ...prev,
            caseId: String(cause.id),
            caseFileId: String(file.id),
            lawyerId: defaultLawyerId,
            lawyerType: defaultLawyerType,
            artName: artName,
            contraparteLawyer: contraparteLawyer,
            title: title
        }));
    };

    // Handle remove selection
    const handleRemoveCause = () => {
        setSelectedCause(null);
        setSelectedFile(null);
        setCauseSearchTerm("");
        setFormData(prev => ({ ...prev, caseId: "", caseFileId: "" }));
    };

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (causeSelectRef.current && !causeSelectRef.current.contains(event.target as Node)) {
                setShowCauseSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Actualizar título cuando cambia la ART manualmente
    useEffect(() => {
        if (selectedCause && formData.artName) {
            const customerName = selectedCause.customer.name.toUpperCase();
            const newTitle = `${customerName} C/${formData.artName.toUpperCase()}`;
            if (formData.title !== newTitle) {
                setFormData(prev => ({ ...prev, title: newTitle }));
            }
        }
    }, [formData.artName, selectedCause]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.caseId || !formData.caseFileId || !formData.lawyerId || !formData.title) {
            setError("Por favor complete todos los campos requeridos");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(NEGOTIATIONS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    caseId: Number.parseInt(formData.caseId),
                    caseFileId: Number.parseInt(formData.caseFileId),
                    title: formData.title,
                    lawyerId: Number.parseInt(formData.lawyerId),
                    lawyerType: formData.lawyerType,
                    contraparteLawyer: formData.contraparteLawyer || null,
                    lesion: formData.lesion || null,
                    incLegalistas: formData.incLegalistas ? parseFloat(formData.incLegalistas) : null,
                    artName: formData.artName || null,
                    deArt: null, // Por ahora no tenemos este dato, se puede agregar después
                    liquidacion100: formData.liquidacionLegalistas ? parseFloat(formData.liquidacionLegalistas) : null,
                    liquidacion80: formData.liquidacionLegalistas ? parseFloat(formData.liquidacionLegalistas) * 0.8 : null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al crear la negociación");
            }

            const data = await response.json();
            console.log("Negotiation created:", data);

            // Redirect to negotiations list or show success message
            router.push("/admin/negotiation");
        } catch (err) {
            console.error("Error creating negotiation:", err);
            setError(err instanceof Error ? err.message : "Error al crear la negociación");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-gray-200 bg-white shadow">
                <div className="border-b border-gray-200 bg-white px-6 py-4">
                    <h2 className="text-xl font-semibold text-gray-900">Crear Nueva Negociación</h2>
                    <p className="mt-1 text-sm text-gray-500">Complete la información para crear una nueva negociación</p>
                </div>
                {error && (
                    <div className="mx-6 mt-4 rounded-md bg-error-50 p-4">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-error-400 flex-shrink-0" />
                            <p className="ml-3 text-sm text-error-700">{error}</p>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 px-6 py-4">
                        <div className="space-y-2">
                            <label htmlFor="cause-search" className="block text-sm font-medium text-gray-700">
                                Seleccionar Causa y Expediente
                            </label>
                            <div className="relative w-full" ref={causeSelectRef}>
                                <div className="relative w-full min-h-[42px] rounded-md border border-gray-300 bg-white shadow-sm focus-within:border-[#09A4B5] focus-within:ring-1 focus-within:ring-[#09A4B5]">
                                    <div className="flex flex-wrap items-center gap-1 p-2">
                                        {selectedCause && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 text-[#09A4B5] text-xs rounded-full">
                                                <span className="max-w-[200px] truncate">
                                                    {selectedCause.title}
                                                    {selectedFile && ` - ${selectedFile.cuij}`}
                                                </span>
                                                <button type="button" onClick={handleRemoveCause} className="hover:bg-brand-100 rounded-full p-0.5">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-[120px] relative">
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                id="cause-search"
                                                className="w-full border-0 bg-transparent pl-2 pr-8 py-1 text-sm placeholder-gray-400 focus:outline-none focus:ring-0"
                                                placeholder={selectedCause ? "" : "Buscar causa..."}
                                                value={causeSearchTerm}
                                                onChange={handleCauseSearchChange}
                                                onFocus={() => setShowCauseSuggestions(true)}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                                {isLoadingCauses ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <Search className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {showCauseSuggestions && filteredCauses.length > 0 && (
                                    <div className="absolute z-[100] mt-2 w-full max-h-96 overflow-auto rounded-lg border-2 border-gray-300 bg-white shadow-2xl ring-4 ring-black/5">
                                        {filteredCauses.map((cause) => (
                                            <div key={cause.id} className="border-b border-gray-100 last:border-b-0">
                                                <div
                                                    className={`cursor-pointer px-4 py-3 text-sm transition-all duration-150 hover:bg-gradient-to-r hover:from-brand-50 hover:to-brand-100 hover:shadow-md ${selectedCause?.id === cause.id ? "bg-brand-50 border-l-4 border-[#09A4B5]" : "border-l-4 border-transparent"}`}
                                                    onClick={() => handleSelectCause(cause)}
                                                >
                                                    <div className="font-semibold text-gray-900 text-base">{cause.title}</div>
                                                    <div className="text-xs text-gray-600 mt-1 font-medium">{cause.customer.name}</div>
                                                    {cause.files.length > 0 && (
                                                        <div className="inline-flex items-center gap-1 text-xs text-[#09A4B5] bg-brand-50 px-2 py-1 rounded-full mt-2 font-semibold">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                                            </svg>
                                                            {cause.files.length} expediente{cause.files.length > 1 ? "s" : ""} disponible{cause.files.length > 1 ? "s" : ""}
                                                        </div>
                                                    )}
                                                </div>
                                                {cause.files.length > 0 && (
                                                    <div className="ml-6 border-l-4 border-gray-300 bg-gray-50">
                                                        {cause.files.map((file) => {
                                                            const aseguradora = file.filesParts?.find((part) => part.role === "ASEGURADORA");
                                                            return (
                                                                <div
                                                                    key={file.id}
                                                                    className={`cursor-pointer px-4 py-3 text-sm transition-all duration-150 hover:bg-brand-100 hover:shadow-inner border-l-4 ${selectedFile?.id === file.id ? "bg-brand-100 border-[#09A4B5] shadow-inner" : "border-transparent hover:border-brand-300"}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSelectFile(cause, file);
                                                                    }}
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="flex-1">
                                                                            <div className="text-gray-900 font-semibold text-sm">Expediente: {file.cuij}</div>
                                                                            <div className="text-gray-700 text-xs mt-1">{file.title}</div>
                                                                            {aseguradora && <div className="text-gray-600 text-xs mt-1 font-medium">ART: {aseguradora.name}</div>}
                                                                        </div>
                                                                        {selectedFile?.id === file.id && (
                                                                            <div className="flex-shrink-0 bg-[#09A4B5] rounded-full p-1">
                                                                                <Check className="w-4 h-4 text-white" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Inputs bloqueados con los datos seleccionados */}
                            {selectedCause && (
                                <div className="mt-6 pt-6 border-t-2 border-gray-300">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Información de la Causa Seleccionada</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Causa</label>
                                            <input
                                                type="text"
                                                value={selectedCause.title}
                                                disabled
                                                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                                            />
                                        </div>
                                        {selectedFile && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Cliente</label>
                                                    <input
                                                        type="text"
                                                        value={selectedCause.customer.name}
                                                        disabled
                                                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Expediente (CUIJ)</label>
                                                    <input
                                                        type="text"
                                                        value={selectedFile.cuij || ''}
                                                        disabled
                                                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">ART/Aseguradora</label>
                                                    {selectedFile.filesParts?.find((part) => part.role === "ASEGURADORA") ? (
                                                        <input
                                                            type="text"
                                                            value={selectedFile.filesParts.find((part) => part.role === "ASEGURADORA")?.name || ""}
                                                            disabled
                                                            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={formData.artName}
                                                            onChange={(e) => setFormData({ ...formData, artName: e.target.value })}
                                                            placeholder="Ingrese nombre de la ART/Aseguradora..."
                                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                                        />
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Título generado automáticamente */}
                                    {selectedCause && selectedFile && formData.title && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                                                Título de la Negociación
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                disabled
                                                className="w-full rounded-md border-2 border-brand-300 bg-brand-50 px-4 py-2.5 text-base font-semibold text-gray-900 cursor-not-allowed"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">
                                                Este título se genera automáticamente: CLIENTE C/ASEGURADORA
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Campos adicionales de negociación */}
                        {selectedCause && selectedFile && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3 pt-6 border-t-2 border-gray-300">Datos de la Negociación</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="lawyer" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Abogado Responsable <span className="text-error-500">*</span>
                                        </label>
                                        <select
                                            id="lawyer"
                                            value={formData.lawyerType}
                                            onChange={(e) => {
                                                const type = e.target.value as "interno" | "responsable";
                                                setFormData({
                                                    ...formData,
                                                    lawyerType: type,
                                                    lawyerId: type === "interno"
                                                        ? String(selectedCause?.internalLawyerId || "")
                                                        : String(selectedCause?.responsibleLawyerId || "")
                                                });
                                            }}
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                            required
                                        >
                                            {selectedCause?.internalLawyer && (
                                                <option value="interno">
                                                    {selectedCause.internalLawyer.name} (Interno)
                                                </option>
                                            )}
                                            {selectedCause?.responsibleLawyer && (
                                                <option value="responsable">
                                                    {selectedCause.responsibleLawyer.name} (Responsable)
                                                </option>
                                            )}
                                            {!selectedCause?.internalLawyer && !selectedCause?.responsibleLawyer && (
                                                <option value="">No hay abogados disponibles</option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="contraparteLawyer" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Abogado Contraparte <span className="text-error-500">*</span>
                                        </label>
                                        {selectedFile?.filesParts?.find((part) => part.role === "abogado_contraparte") ? (
                                            <input
                                                type="text"
                                                id="contraparteLawyer"
                                                value={selectedFile.filesParts.find((part) => part.role === "abogado_contraparte")?.name || ""}
                                                disabled
                                                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                id="contraparteLawyer"
                                                value={formData.contraparteLawyer}
                                                onChange={(e) => setFormData({ ...formData, contraparteLawyer: e.target.value })}
                                                placeholder="Ingrese nombre del abogado contraparte..."
                                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                                required
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="lesion" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Lesión <span className="text-error-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="lesion"
                                            value={formData.lesion}
                                            onChange={(e) => setFormData({ ...formData, lesion: e.target.value })}
                                            placeholder="Ej: Fractura de tibia y peroné"
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="incLegalistas" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            % INC. LEGALISTAS <span className="text-error-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                id="incLegalistas"
                                                value={formData.incLegalistas}
                                                onChange={(e) => setFormData({ ...formData, incLegalistas: e.target.value })}
                                                placeholder="0"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                                required
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="liquidacionLegalistas" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            LIQUIDACIÓN LEGALISTAS - 100% <span className="text-error-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                            <input
                                                type="number"
                                                id="liquidacionLegalistas"
                                                value={formData.liquidacionLegalistas}
                                                onChange={(e) => setFormData({ ...formData, liquidacionLegalistas: e.target.value })}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 bg-gray-50 px-6 py-3">
                        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                !selectedCause ||
                                !selectedFile ||
                                !formData.lawyerId ||
                                !formData.lesion ||
                                !formData.incLegalistas ||
                                !formData.liquidacionLegalistas ||
                                (!selectedFile?.filesParts?.find((part) => part.role === "abogado_contraparte") && !formData.contraparteLawyer)
                            }
                            variant="custom"
                            className={`bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 px-4 py-2 ${isSubmitting ||
                                !selectedCause ||
                                !selectedFile ||
                                !formData.lawyerId ||
                                !formData.lesion ||
                                !formData.incLegalistas ||
                                !formData.liquidacionLegalistas ||
                                (!selectedFile?.filesParts?.find((part) => part.role === "abogado_contraparte") && !formData.contraparteLawyer)
                                ? "opacity-70 cursor-not-allowed"
                                : ""
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Negociación
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
