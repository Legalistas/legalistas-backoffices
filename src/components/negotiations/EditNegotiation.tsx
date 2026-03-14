"use client";
import React, { useState, useEffect } from "react";
import { X, AlertCircle, Loader2, Save } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useSession } from "next-auth/react";
import { NEGOTIATION_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import type { Negotiation, NegotiationStatus } from "@/types/negotiations";

interface EditNegotiationProps {
    negotiation: Negotiation;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const STATUS_OPTIONS: { value: NegotiationStatus; label: string }[] = [
    { value: "INICIAR", label: "Iniciar" },
    { value: "CURSO", label: "En Curso" },
    { value: "SUSPENSO", label: "Suspenso" },
    { value: "FINALIZADAS", label: "Finalizadas" },
    { value: "PERDIDAS", label: "Perdidas" },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
    INICIAR: ["CURSO", "PERDIDAS"],
    CURSO: ["SUSPENSO", "FINALIZADAS", "PERDIDAS"],
    SUSPENSO: ["CURSO", "PERDIDAS"],
    FINALIZADAS: [],
    PERDIDAS: [],
};

export default function EditNegotiation({ negotiation, isOpen, onClose, onSuccess }: EditNegotiationProps) {
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        contraparteLawyer: "",
        incLegalistas: "",
        deArt: "",
        liquidacion100: "",
        liquidacion80: "",
        notes: "",
        injury: "", // transitorio para causas legacy
        status: "" as NegotiationStatus | "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form
    useEffect(() => {
        if (negotiation) {
            setFormData({
                contraparteLawyer: negotiation.contraparteLawyer || "",
                incLegalistas: negotiation.incLegalistas?.toString() || "",
                deArt: negotiation.deArt?.toString() || "",
                liquidacion100: negotiation.liquidacion100?.toString() || "",
                liquidacion80: negotiation.liquidacion80?.toString() || "",
                notes: negotiation.notes || "",
                injury: negotiation.case.injury || "",
                status: "",
            });
        }
    }, [negotiation]);

    // Auto-calculate liquidacion80
    useEffect(() => {
        if (formData.liquidacion100) {
            const liq100 = parseFloat(formData.liquidacion100);
            if (!isNaN(liq100)) {
                setFormData(prev => ({ ...prev, liquidacion80: (liq100 * 0.8).toFixed(2) }));
            }
        }
    }, [formData.liquidacion100]);

    const allowedTransitions = VALID_TRANSITIONS[negotiation.status] || [];
    const canEditInjury = !negotiation.case.injury; // Solo editable si la causa no tiene lesión

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const body: any = {
                contraparteLawyer: formData.contraparteLawyer || null,
                incLegalistas: formData.incLegalistas ? parseFloat(formData.incLegalistas) : null,
                deArt: formData.deArt ? parseFloat(formData.deArt) : null,
                liquidacion100: formData.liquidacion100 ? parseFloat(formData.liquidacion100) : null,
                liquidacion80: formData.liquidacion80 ? parseFloat(formData.liquidacion80) : null,
                notes: formData.notes || null,
            };

            // Cambio de estado
            if (formData.status) {
                body.status = formData.status;
            }

            // Lesión transitoria (actualiza case.injury)
            if (canEditInjury && formData.injury) {
                body.injury = formData.injury;
            }

            const response = await fetch(NEGOTIATION_BY_ID_ENDPOINT(negotiation.id), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al actualizar la negociación");
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error updating negotiation:", err);
            setError(err instanceof Error ? err.message : "Error al actualizar la negociación");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Editar Negociación</h2>
                        <p className="mt-1 text-sm text-gray-500">{negotiation.case.title || `Causa #${negotiation.caseId}`}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
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
                    <div className="px-6 py-4 space-y-4">
                        {/* Info de la causa (read-only) */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700">Datos de la Causa</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Causa:</span>
                                    <p className="font-medium text-gray-900">{negotiation.case.title}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Abogado Representante:</span>
                                    <p className="font-medium text-gray-900">{negotiation.case.responsibleLawyer?.name || "-"}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Abogado Interno:</span>
                                    <p className="font-medium text-gray-900">{negotiation.case.internalLawyer?.name || "-"}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Estado actual:</span>
                                    <p className="font-medium text-gray-900">{negotiation.status}</p>
                                </div>
                            </div>
                        </div>

                        {/* Cambio de estado */}
                        {allowedTransitions.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Cambiar Estado
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as NegotiationStatus })}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                >
                                    <option value="">Sin cambio</option>
                                    {STATUS_OPTIONS
                                        .filter(opt => allowedTransitions.includes(opt.value))
                                        .map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))
                                    }
                                </select>
                                {formData.status === "FINALIZADAS" && (
                                    <p className="mt-1 text-xs text-amber-600 font-medium">
                                        Esto generará un cierre automático en el Gestor de Cierres
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Campos editables */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Abogado Contraparte</label>
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
                                    Lesión {canEditInjury && <span className="text-xs text-amber-500">(editable — causa sin lesión)</span>}
                                </label>
                                <input
                                    type="text"
                                    value={formData.injury}
                                    onChange={(e) => setFormData({ ...formData, injury: e.target.value })}
                                    disabled={!canEditInjury}
                                    placeholder={canEditInjury ? "Ej: hernia lumbar" : ""}
                                    className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${canEditInjury
                                        ? "bg-white focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                        : "bg-gray-50 text-gray-700 cursor-not-allowed"
                                    }`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">% Legalistas</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.incLegalistas}
                                        onChange={(e) => setFormData({ ...formData, incLegalistas: e.target.value })}
                                        placeholder="0" min="0" max="100" step="0.01"
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">% PMO</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.deArt}
                                        onChange={(e) => setFormData({ ...formData, deArt: e.target.value })}
                                        placeholder="0" min="0" max="100" step="0.01"
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Liquidación 100%</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={formData.liquidacion100}
                                        onChange={(e) => setFormData({ ...formData, liquidacion100: e.target.value })}
                                        placeholder="0.00" min="0" step="0.01"
                                        className="w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Liquidación 80%</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Notas adicionales"
                                    rows={3}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            variant="custom"
                            className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 px-4 py-2"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" />Guardar Cambios</>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
