"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, X, AlertCircle, Loader2, Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions";
import { NEGOTIATIONS_NEGOTIABLE_CAUSES_ENDPOINT, NEGOTIATIONS_ENDPOINT } from "@/constant/api-endpoints";

interface NegotiableCause {
    id: number;
    number: string;
    title: string;
    injury: string | null;
    internalLawyerId?: number;
    responsibleLawyerId?: number;
    internalLawyer?: { id: number; name: string; image: string };
    responsibleLawyer?: { id: number; name: string; image: string };
    customer: { id: number; name: string; image?: string };
    parts: { id: number; name: string; partyType: string }[];
}

export default function AddNewNegotiation() {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = useRolePermissions();

    const [formData, setFormData] = useState({
        contraparteLawyer: "",
        incLegalistas: "",
        deArt: "",
        liquidacion100: "",
        liquidacion80: "",
        notes: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cause selection
    const [causes, setCauses] = useState<NegotiableCause[]>([]);
    const [selectedCause, setSelectedCause] = useState<NegotiableCause | null>(null);
    const [causeSearchTerm, setCauseSearchTerm] = useState("");
    const [showCauseSuggestions, setShowCauseSuggestions] = useState(false);
    const [isLoadingCauses, setIsLoadingCauses] = useState(false);

    const causeSelectRef = useRef<HTMLDivElement>(null);

    // Fetch negotiable causes
    useEffect(() => {
        const fetchCauses = async () => {
            if (!session?.user?.accessToken) return;
            setIsLoadingCauses(true);
            try {
                const url = buildFilteredUrl(
                    NEGOTIATIONS_NEGOTIABLE_CAUSES_ENDPOINT,
                    permissions,
                    { limit: "5000" }
                );

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                });

                if (!response.ok) throw new Error("Error al cargar causas");
                const data = await response.json();

                let causesData = data.data || [];

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
    }, [session?.user?.accessToken, permissions]);

    // Filter causes
    const filteredCauses = causes.filter((cause) =>
        (cause.title || "").toLowerCase().includes(causeSearchTerm.toLowerCase()) ||
        (cause.customer?.name || "").toLowerCase().includes(causeSearchTerm.toLowerCase()) ||
        (cause.number || "").includes(causeSearchTerm)
    );

    const handleSelectCause = (cause: NegotiableCause) => {
        setSelectedCause(cause);
        setCauseSearchTerm(cause.title || `Causa #${cause.id}`);
        setShowCauseSuggestions(false);
    };

    const handleRemoveCause = () => {
        setSelectedCause(null);
        setCauseSearchTerm("");
    };

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (causeSelectRef.current && !causeSelectRef.current.contains(event.target as Node)) {
                setShowCauseSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-calc liquidacion80
    useEffect(() => {
        if (formData.liquidacion100) {
            const liq100 = parseFloat(formData.liquidacion100);
            if (!isNaN(liq100)) {
                setFormData(prev => ({ ...prev, liquidacion80: (liq100 * 0.8).toFixed(2) }));
            }
        }
    }, [formData.liquidacion100]);

    // Get parts helpers
    const getActor = () => selectedCause?.parts?.find(p => p.partyType === "actor")?.name || "-";
    const getDemandado = () => selectedCause?.parts?.find(p => p.partyType === "demandado")?.name || "-";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCause) {
            setError("Por favor seleccione una causa");
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
                    caseId: selectedCause.id,
                    contraparteLawyer: formData.contraparteLawyer || null,
                    incLegalistas: formData.incLegalistas ? parseFloat(formData.incLegalistas) : null,
                    deArt: formData.deArt ? parseFloat(formData.deArt) : null,
                    liquidacion100: formData.liquidacion100 ? parseFloat(formData.liquidacion100) : null,
                    liquidacion80: formData.liquidacion80 ? parseFloat(formData.liquidacion80) : null,
                    notes: formData.notes || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al crear la negociación");
            }

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
                    <h2 className="text-xl font-semibold text-gray-900">Nueva Negociación</h2>
                    <p className="mt-1 text-sm text-gray-500">Seleccioná una causa para iniciar la negociación</p>
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
                        {/* Selector de causa */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Seleccionar Causa <span className="text-error-500">*</span>
                            </label>
                            <div className="relative w-full" ref={causeSelectRef}>
                                <div className="relative w-full min-h-[42px] rounded-md border border-gray-300 bg-white shadow-sm focus-within:border-[#09A4B5] focus-within:ring-1 focus-within:ring-[#09A4B5]">
                                    <div className="flex flex-wrap items-center gap-1 p-2">
                                        {selectedCause && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 text-[#09A4B5] text-xs rounded-full">
                                                <span className="max-w-[250px] truncate">
                                                    {selectedCause.title || `Causa #${selectedCause.id}`}
                                                </span>
                                                <button type="button" onClick={handleRemoveCause} className="hover:bg-brand-100 rounded-full p-0.5">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-[120px] relative">
                                            <input
                                                type="text"
                                                className="w-full border-0 bg-transparent pl-2 pr-8 py-1 text-sm placeholder-gray-400 focus:outline-none focus:ring-0"
                                                placeholder={selectedCause ? "" : "Buscar causa por título, cliente o número..."}
                                                value={causeSearchTerm}
                                                onChange={(e) => { setCauseSearchTerm(e.target.value); setShowCauseSuggestions(true); }}
                                                onFocus={() => setShowCauseSuggestions(true)}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                                {isLoadingCauses ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <Search className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {showCauseSuggestions && filteredCauses.length > 0 && (
                                    <div className="absolute z-[100] mt-2 w-full max-h-80 overflow-auto rounded-lg border-2 border-gray-300 bg-white shadow-2xl">
                                        {filteredCauses.map((cause) => (
                                            <div
                                                key={cause.id}
                                                className={`cursor-pointer px-4 py-3 text-sm transition-all hover:bg-brand-50 border-b border-gray-100 last:border-b-0 ${selectedCause?.id === cause.id ? "bg-brand-50 border-l-4 border-[#09A4B5]" : "border-l-4 border-transparent"}`}
                                                onClick={() => handleSelectCause(cause)}
                                            >
                                                <div className="font-semibold text-gray-900">{cause.title || `Causa #${cause.id}`}</div>
                                                <div className="text-xs text-gray-600 mt-1">{cause.customer?.name}</div>
                                                {cause.responsibleLawyer && (
                                                    <div className="text-xs text-gray-500 mt-0.5">Ab. Representante: {cause.responsibleLawyer.name}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Datos auto-completados desde la causa */}
                        {selectedCause && (
                            <>
                                <div className="mt-4 pt-4 border-t-2 border-gray-300">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Datos de la Causa (lectura)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Actor</label>
                                            <input type="text" value={getActor()} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Demandado</label>
                                            <input type="text" value={getDemandado()} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Abogado Representante</label>
                                            <input type="text" value={selectedCause.responsibleLawyer?.name || "-"} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Abogado Interno</label>
                                            <input type="text" value={selectedCause.internalLawyer?.name || "-"} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Lesión</label>
                                            <input type="text" value={selectedCause.injury || "Sin registrar"} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed" />
                                        </div>
                                    </div>
                                </div>

                                {/* Datos de la negociación */}
                                <div className="space-y-4 pt-4 border-t-2 border-gray-300">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Datos de la Negociación</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Abogado Contraparte
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.contraparteLawyer}
                                                onChange={(e) => setFormData({ ...formData, contraparteLawyer: e.target.value })}
                                                placeholder="Nombre del abogado contraparte"
                                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                % Legalistas
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={formData.incLegalistas}
                                                    onChange={(e) => setFormData({ ...formData, incLegalistas: e.target.value })}
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                % PMO
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={formData.deArt}
                                                    onChange={(e) => setFormData({ ...formData, deArt: e.target.value })}
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Liquidación 100%
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={formData.liquidacion100}
                                                    onChange={(e) => setFormData({ ...formData, liquidacion100: e.target.value })}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Liquidación 80%
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={formData.liquidacion80}
                                                    disabled
                                                    className="w-full rounded-md border border-gray-300 bg-gray-50 pl-8 pr-3 py-2 text-sm text-gray-700 cursor-not-allowed"
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Se calcula automáticamente (80%)</p>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Notas
                                            </label>
                                            <textarea
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                placeholder="Notas adicionales (opcional)"
                                                rows={3}
                                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-200 bg-gray-50 px-6 py-3">
                        <Button variant="outline" onClick={() => router.back()} type="button">Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !selectedCause}
                            variant="custom"
                            className={`bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 px-4 py-2 ${isSubmitting || !selectedCause ? "opacity-70 cursor-not-allowed" : ""}`}
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
