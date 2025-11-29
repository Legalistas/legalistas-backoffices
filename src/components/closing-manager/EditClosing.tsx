"use client";
import React, { useState, useEffect } from "react";
import { X, AlertCircle, Loader2, Save } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useSession } from "next-auth/react";
import { CLOSING_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import type { ClosingManagerEntry } from "@/types/closing-manager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed";

interface EditClosingProps {
    closing: ClosingManagerEntry;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditClosing({
    closing,
    isOpen,
    onClose,
    onSuccess,
}: EditClosingProps) {
    const { data: session } = useSession();
    const [type, setType] = useState<string>("SRT");
    const [capitalState, setCapitalState] = useState<string>("AGREEMENT_IN_MANAGEMENT");
    const [feeStatus, setFeeStatus] = useState<string>("EARRINGS");
    const [hpAgreedPercentage, setHpAgreedPercentage] = useState<string>("");
    const [pclAgreed, setPclAgreed] = useState<string>("");
    const [pclStatus, setPclStatus] = useState<string>("EARRINGS");
    const [litigation, setLitigation] = useState<string>("");
    const [contributions, setContributions] = useState<string>("0");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form with closing data
    useEffect(() => {
        if (closing) {
            setType(closing.tipo || closing.type || "SRT");
            setCapitalState(closing.estadoCapital || closing.capitalState || "AGREEMENT_IN_MANAGEMENT");
            setFeeStatus(closing.estadoHonorarios || closing.feeStatus || "EARRINGS");
            setHpAgreedPercentage((closing.hpAcordado || closing.hpAgreed)?.toString() || "");
            setPclAgreed(closing.pclAgreed?.toString() || "");
            setPclStatus(closing.estadoPcl || closing.pclStatus || "EARRINGS");
            setLitigation(closing.litigio || closing.litigation || "");
            setContributions(closing.contributions || "0");
        }
    }, [closing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(CLOSING_BY_ID_ENDPOINT(closing.id), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    type,
                    capitalState,
                    feeStatus,
                    hpAgreed: hpAgreedPercentage ? parseFloat(hpAgreedPercentage) : null,
                    pclAgreed: pclAgreed || null,
                    pclStatus: pclStatus || null,
                    litigation: litigation || null,
                    contributions: contributions,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al actualizar el cierre");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Editar Cierre
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Closing Info Display */}
                    <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-sm text-brand-500 mb-3">
                            Información del Cierre
                        </h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Causa:</span>{" "}
                                <span className="font-medium">{closing.nombreCausa}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Expediente:</span>{" "}
                                <span className="font-medium">{closing.expediente}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Abogado:</span>{" "}
                                <span className="font-medium">{closing.abogadoInterno}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Fecha:</span>{" "}
                                <span className="font-medium">
                                    {new Date(closing.fechaCierre).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Grid de 2 columnas para los campos */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        {/* Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Tipo <span className="text-red-500">*</span>
                            </label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <span className="truncate">
                                        {type === "SRT" ? "SRT" : "CIVIL"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SRT">SRT</SelectItem>
                                    <SelectItem value="CIVIL">CIVIL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Capital State */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Estado Capital <span className="text-red-500">*</span>
                            </label>
                            <Select value={capitalState} onValueChange={setCapitalState}>
                                <SelectTrigger>
                                    <span className="truncate">
                                        {capitalState === "AGREEMENT_IN_MANAGEMENT"
                                            ? "Acuerdo en Gestión"
                                            : capitalState === "DEPOSITED"
                                                ? "Depositado"
                                                : "En Ejecución"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AGREEMENT_IN_MANAGEMENT">
                                        Acuerdo en Gestión
                                    </SelectItem>
                                    <SelectItem value="DEPOSITED">Depositado</SelectItem>
                                    <SelectItem value="IN_EXECUTION">En Ejecución</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Fee Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Estado Honorarios <span className="text-red-500">*</span>
                            </label>
                            <Select value={feeStatus} onValueChange={setFeeStatus}>
                                <SelectTrigger>
                                    <span className="truncate">
                                        {feeStatus === "EARRINGS"
                                            ? "Pendientes"
                                            : feeStatus === "COLLECTED"
                                                ? "Cobrados"
                                                : "En Ejecución"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EARRINGS">Pendientes</SelectItem>
                                    <SelectItem value="COLLECTED">Cobrados</SelectItem>
                                    <SelectItem value="IN_EXECUTION">En Ejecución</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* HP Agreed Percentage */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">HP Acordado (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={hpAgreedPercentage}
                                onChange={(e) => setHpAgreedPercentage(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                                placeholder="Ej: 15.50"
                            />
                        </div>

                        {/* PCL Agreed */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">PCL Acordado</label>
                            <input
                                type="text"
                                value={pclAgreed}
                                onChange={(e) => setPclAgreed(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                                placeholder="Información sobre PCL acordado"
                            />
                        </div>

                        {/* PCL Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Estado PCL <span className="text-red-500">*</span>
                            </label>
                            <Select value={pclStatus} onValueChange={setPclStatus}>
                                <SelectTrigger>
                                    <span className="truncate">
                                        {pclStatus === "EARRINGS"
                                            ? "Pendientes"
                                            : pclStatus === "COLLECTED"
                                                ? "Cobrados"
                                                : "En Ejecución"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EARRINGS">Pendientes</SelectItem>
                                    <SelectItem value="COLLECTED">Cobrados</SelectItem>
                                    <SelectItem value="IN_EXECUTION">En Ejecución</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Aportes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Aportes <span className="text-red-500">*</span>
                            </label>
                            <Select value={contributions} onValueChange={setContributions}>
                                <SelectTrigger>
                                    <span className="block truncate">
                                        {contributions === "0" ? "0%" :
                                         contributions === "10" ? "10%" :
                                         contributions === "10_IVA" ? "10% + IVA" :
                                         contributions === "25" ? "25%" :
                                         contributions === "25_IVA" ? "25% + IVA" :
                                         contributions === "50" ? "50%" :
                                         contributions === "50_IVA" ? "50% + IVA" : "Seleccione aportes"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="10">10%</SelectItem>
                                    <SelectItem value="10_IVA">10% + IVA</SelectItem>
                                    <SelectItem value="25">25%</SelectItem>
                                    <SelectItem value="25_IVA">25% + IVA</SelectItem>
                                    <SelectItem value="50">50%</SelectItem>
                                    <SelectItem value="50_IVA">50% + IVA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Litigation */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Litigio</label>
                            <input
                                type="text"
                                value={litigation}
                                onChange={(e) => setLitigation(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                                placeholder="Información sobre el litigio"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-brand-500 hover:bg-brand-500/85 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
