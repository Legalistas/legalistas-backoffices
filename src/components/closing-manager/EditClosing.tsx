"use client"

import { useState, useEffect, useMemo } from "react"
import { X, AlertCircle, Loader2, Save } from "lucide-react"
import Button from "@/components/ui/button/Button"
import { useSession } from "next-auth/react"
import { CLOSING_BY_ID_ENDPOINT } from "@/constant/api-endpoints"
import type { ClosingManagerEntry } from "@/types/closing-manager"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"
import { closingType, statusCapital, statusData } from "@/constant/closing-manager"

interface EditClosingProps {
  closing: ClosingManagerEntry
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const inputClass = "w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"

const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)

export default function EditClosing({ closing, isOpen, onClose, onSuccess }: EditClosingProps) {
  const { data: session } = useSession()

  // Form state
  const [type, setType] = useState("SRT")
  const [capitalAmount, setCapitalAmount] = useState("")
  const [capitalState, setCapitalState] = useState("AGREEMENT_IN_MANAGEMENT")
  const [feeStatus, setFeeStatus] = useState("EARRINGS")
  const [hpAgreed, setHpAgreed] = useState("20")
  const [hpTotal, setHpTotal] = useState("0")
  const [hpDistribution, setHpDistribution] = useState(true)
  const [pclAgreed, setPclAgreed] = useState("20")
  const [pclTotal, setPclTotal] = useState("0")
  const [pclDistribution, setPclDistribution] = useState(true)
  const [pclStatus, setPclStatus] = useState("EARRINGS")
  const [contributionsAmount, setContributionsAmount] = useState("0")
  const [applyContributions, setApplyContributions] = useState(true)
  const [detail, setDetail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize from closing data
  useEffect(() => {
    if (closing) {
      setType(closing.type || "SRT")
      setCapitalAmount(String(closing.capitalAmount || 0))
      setCapitalState(closing.capitalState || "AGREEMENT_IN_MANAGEMENT")
      setFeeStatus(closing.feeStatus || "EARRINGS")
      setHpAgreed(String(closing.hpAgreed ?? 20))
      setHpTotal(String(closing.hpTotal ?? 0))
      setHpDistribution(closing.hpDistribution ?? true)
      setPclAgreed(String(closing.pclAgreed ?? 20))
      setPclTotal(String(closing.pclTotal ?? 0))
      setPclDistribution(closing.pclDistribution ?? true)
      setPclStatus(closing.pclStatus || "EARRINGS")
      setContributionsAmount(String(closing.contributionsAmount ?? 0))
      setApplyContributions(closing.applyContributions ?? true)
      setDetail(closing.detail || "")
    }
  }, [closing])

  // Calculated fields in real-time
  const calc = useMemo(() => {
    const hp = Number(hpTotal) || 0
    const pcl = Number(pclTotal) || 0
    const aportes = applyContributions ? (Number(contributionsAmount) || 0) : 0

    const hpRep = hpDistribution ? hp * 0.25 : 0
    const hpLeg = hp - hpRep
    const pclRep = pclDistribution ? pcl * 0.25 : 0
    const pclLeg = pcl - pclRep
    const aportesRep = aportes * 0.25
    const aportesLeg = aportes * 0.75
    const montoTransferir = hpLeg + pclLeg - aportesLeg

    return { hpRep, hpLeg, pclRep, pclLeg, aportesRep, aportesLeg, montoTransferir }
  }, [hpTotal, hpDistribution, pclTotal, pclDistribution, contributionsAmount, applyContributions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch(CLOSING_BY_ID_ENDPOINT(closing.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
        body: JSON.stringify({
          type,
          capitalAmount: parseFloat(capitalAmount) || 0,
          capitalState,
          feeStatus,
          hpAgreed: parseFloat(hpAgreed) || 20,
          hpTotal: parseFloat(hpTotal) || 0,
          hpDistribution,
          pclAgreed: parseFloat(pclAgreed) || 0,
          pclTotal: parseFloat(pclTotal) || 0,
          pclDistribution,
          pclStatus,
          contributionsAmount: parseFloat(contributionsAmount) || 0,
          applyContributions,
          detail: detail || null,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Error al actualizar")
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const formatDate = (d: string) => {
    const date = new Date(d)
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Editar Cierre</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Info del cierre (solo lectura) */}
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-brand-500 mb-3">Datos del Case ID</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-500">Causa:</span> <span className="font-medium">{closing.case?.title}</span></div>
              <div><span className="text-gray-500">Expediente:</span> <span className="font-medium">{closing.case?.number || "-"}</span></div>
              <div><span className="text-gray-500">Representante:</span> <span className="font-medium">{closing.case?.responsibleLawyer?.name || "-"}</span></div>
              <div><span className="text-gray-500">Abogado Interno:</span> <span className="font-medium">{closing.case?.internalLawyer?.name || "-"}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(closing.date)}</span></div>
            </div>
          </div>

          {/* Campos principales */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Cierre <span className="text-red-500">*</span></label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(closingType).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Capital ($)</label>
              <input type="number" step="0.01" min="0" value={capitalAmount} onChange={(e) => setCapitalAmount(e.target.value)} className={inputClass} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado Capital <span className="text-red-500">*</span></label>
              <Select value={capitalState} onValueChange={setCapitalState}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusCapital).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado Honorarios <span className="text-red-500">*</span></label>
              <Select value={feeStatus} onValueChange={setFeeStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusData).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado PCL</label>
              <Select value={pclStatus} onValueChange={setPclStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusData).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* HP */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Honorarios Pactados (HP)</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={hpDistribution} onChange={(e) => setHpDistribution(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                Distribución HP con representante (25%)
              </label>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Convenido (%)</label>
                <input type="number" step="0.01" min="0" max="100" value={hpAgreed} onChange={(e) => setHpAgreed(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Total ($)</label>
                <input type="number" step="0.01" min="0" value={hpTotal} onChange={(e) => setHpTotal(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Representante ($)</label>
                <div className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!hpDistribution ? "text-gray-400" : ""}`}>
                  {formatARS(calc.hpRep)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Legalistas ($)</label>
                <div className="h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm font-medium">
                  {formatARS(calc.hpLeg)}
                </div>
              </div>
            </div>
          </div>

          {/* PCL */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Pacto de Cuota Litis (PCL)</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={pclDistribution} onChange={(e) => setPclDistribution(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                Distribución PCL con representante (25%)
              </label>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Convenido (%)</label>
                <input type="number" step="0.01" min="0" max="100" value={pclAgreed} onChange={(e) => setPclAgreed(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Total ($)</label>
                <input type="number" step="0.01" min="0" value={pclTotal} onChange={(e) => setPclTotal(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Representante ($)</label>
                <div className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!pclDistribution ? "text-gray-400" : ""}`}>
                  {formatARS(calc.pclRep)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Legalistas ($)</label>
                <div className="h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm font-medium">
                  {formatARS(calc.pclLeg)}
                </div>
              </div>
            </div>
          </div>

          {/* Aportes */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Aportes</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={applyContributions} onChange={(e) => setApplyContributions(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                Aplicar aportes
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Aportes Totales ($)</label>
                <input type="number" step="0.01" min="0" value={contributionsAmount} onChange={(e) => setContributionsAmount(e.target.value)} className={inputClass} disabled={!applyContributions} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Aportes Representante ($)</label>
                <div className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!applyContributions ? "text-gray-400" : ""}`}>
                  {formatARS(calc.aportesRep)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Aportes Legalistas ($)</label>
                <div className={`h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm ${!applyContributions ? "text-gray-400" : ""}`}>
                  {formatARS(calc.aportesLeg)}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">Monto manual ingresado por la contadora. Distribución: 75% Legalistas / 25% Representante.</p>
          </div>

          {/* Monto a Transferir — CAMPO CRÍTICO */}
          <div className={`rounded-lg p-4 border-2 ${calc.montoTransferir < 0 ? "border-red-300 bg-red-50" : "border-brand-300 bg-brand-50"}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Monto a Transferir a Legalistas</h4>
              <span className={`text-2xl font-bold ${calc.montoTransferir < 0 ? "text-red-700" : "text-brand-700"}`}>
                {formatARS(calc.montoTransferir)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">HP Legalistas + PCL Legalistas - Aportes Legalistas</p>
          </div>

          {/* Detalle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Detalle</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-y"
              placeholder="Descripción de la situación del cierre..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button type="button" onClick={onClose} variant="outline" disabled={isSubmitting} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-500 hover:bg-brand-500/85 text-white">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Guardar Cambios</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
