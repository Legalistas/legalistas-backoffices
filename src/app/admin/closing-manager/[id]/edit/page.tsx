"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ChevronLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import Button from "@/components/ui/button/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"
import { CLOSING_BY_ID_ENDPOINT } from "@/constant/api-endpoints"
import { closingType, statusCapital, statusData } from "@/constant/closing-manager"
import type { ClosingManagerEntry } from "@/types/closing-manager"

const inputClass = "w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"

const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)

const formatDate = (d: string) => {
  const date = new Date(d)
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
}

export default function EditClosingPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState<ClosingManagerEntry | null>(null)

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

  // Calculated fields
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

  // Fetch closing
  useEffect(() => {
    const fetchClosing = async () => {
      if (!session?.user?.accessToken) { setIsLoading(false); return }
      try {
        const response = await fetch(CLOSING_BY_ID_ENDPOINT(Number(params.id)), {
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        })
        if (!response.ok) throw new Error("Error al cargar el cierre")
        const result = await response.json()
        const data = result.data || result
        setClosing(data)

        setType(data.type || "SRT")
        setCapitalAmount(String(data.capitalAmount ?? 0))
        setCapitalState(data.capitalState || "AGREEMENT_IN_MANAGEMENT")
        setFeeStatus(data.feeStatus || "EARRINGS")
        setHpAgreed(String(data.hpAgreed ?? 20))
        setHpTotal(String(data.hpTotal ?? 0))
        setHpDistribution(data.hpDistribution ?? true)
        setPclAgreed(String(data.pclAgreed ?? 20))
        setPclTotal(String(data.pclTotal ?? 0))
        setPclDistribution(data.pclDistribution ?? true)
        setPclStatus(data.pclStatus || "EARRINGS")
        setContributionsAmount(String(data.contributionsAmount ?? 0))
        setApplyContributions(data.applyContributions ?? true)
        setDetail(data.detail || "")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setIsLoading(false)
      }
    }
    fetchClosing()
  }, [params.id, session?.user?.accessToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch(CLOSING_BY_ID_ENDPOINT(Number(params.id)), {
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
      router.push("/admin/closing-manager")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!closing) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">No se pudo cargar el cierre</p>
        <Link href="/admin/closing-manager">
          <Button variant="outline" className="mt-4">Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/closing-manager">
          <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-2" />Volver</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Editar Cierre</h1>
          <p className="text-sm text-gray-500 mt-0.5">Modifica los datos del cierre</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Info del case (solo lectura) */}
        <div className="bg-gradient-to-r from-brand-500/5 to-brand-500/10 border-b border-gray-200 rounded-t-xl p-5">
          <h4 className="font-semibold text-sm text-brand-500 mb-3">Datos del Case ID</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/60 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Causa</span>
              <span className="font-medium text-gray-900">{closing.case?.title || "-"}</span>
            </div>
            <div className="bg-white/60 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Expediente</span>
              <span className="font-medium text-gray-900">{closing.case?.number || "-"}</span>
            </div>
            <div className="bg-white/60 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Representante</span>
              <span className="font-medium text-gray-900">{closing.case?.responsibleLawyer?.name || "-"}</span>
            </div>
            <div className="bg-white/60 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Abogado Interno</span>
              <span className="font-medium text-gray-900">{closing.case?.internalLawyer?.name || "-"}</span>
            </div>
            <div className="bg-white/60 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Fecha</span>
              <span className="font-medium text-gray-900">{formatDate(closing.date)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Estados y tipo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tipo de Cierre <span className="text-red-500">*</span></label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(closingType).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Capital ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" step="0.01" min="0" value={capitalAmount} onChange={(e) => setCapitalAmount(e.target.value)} className={`${inputClass} pl-7`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Estado Capital <span className="text-red-500">*</span></label>
              <Select value={capitalState} onValueChange={setCapitalState}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusCapital).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Estado Honorarios <span className="text-red-500">*</span></label>
              <Select value={feeStatus} onValueChange={setFeeStatus}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusData).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* HP */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-800">Honorarios Pactados (HP)</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={hpDistribution} onChange={(e) => setHpDistribution(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-gray-600">Distribución HP con representante (25%)</span>
              </label>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Convenido (%)</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" max="100" value={hpAgreed} onChange={(e) => setHpAgreed(e.target.value)} className={`${inputClass} pr-8`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Total ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" step="0.01" min="0" value={hpTotal} onChange={(e) => setHpTotal(e.target.value)} className={`${inputClass} pl-7`} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Representante ($)</label>
                <div className={`h-11 flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm ${!hpDistribution ? "text-gray-400" : "font-medium"}`}>
                  {formatARS(calc.hpRep)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">HP Legalistas ($)</label>
                <div className="h-11 flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-900">
                  {formatARS(calc.hpLeg)}
                </div>
              </div>
            </div>
          </div>

          {/* PCL */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-800">Pacto de Cuota Litis (PCL)</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={pclDistribution} onChange={(e) => setPclDistribution(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-gray-600">Distribución PCL con representante (25%)</span>
              </label>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Convenido (%)</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" max="100" value={pclAgreed} onChange={(e) => setPclAgreed(e.target.value)} className={`${inputClass} pr-8`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Total ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" step="0.01" min="0" value={pclTotal} onChange={(e) => setPclTotal(e.target.value)} className={`${inputClass} pl-7`} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Representante ($)</label>
                <div className={`h-11 flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm ${!pclDistribution ? "text-gray-400" : "font-medium"}`}>
                  {formatARS(calc.pclRep)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PCL Legalistas ($)</label>
                <div className="h-11 flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-900">
                  {formatARS(calc.pclLeg)}
                </div>
              </div>
            </div>
          </div>

          {/* Aportes */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-800">Aportes</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={applyContributions} onChange={(e) => setApplyContributions(e.target.checked)} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-gray-600">Aplicar aportes</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Aportes Totales ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" step="0.01" min="0" value={contributionsAmount} onChange={(e) => setContributionsAmount(e.target.value)} disabled={!applyContributions}
                    className={`${inputClass} pl-7 disabled:bg-gray-100 disabled:text-gray-400`} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Aportes Representante ($)</label>
                <div className={`h-11 flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm ${!applyContributions ? "text-gray-400" : ""}`}>
                  {formatARS(calc.aportesRep)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Aportes Legalistas ($)</label>
                <div className={`h-11 flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm ${!applyContributions ? "text-gray-400" : ""}`}>
                  {formatARS(calc.aportesLeg)}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">Monto manual ingresado por la contadora. Distribución: 75% Legalistas / 25% Representante.</p>
          </div>

          {/* Monto a Transferir + Gastos de la Causa */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={`rounded-xl p-5 border-2 lg:col-span-2 ${calc.montoTransferir < 0 ? "border-red-300 bg-red-50" : "border-brand-300 bg-brand-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">Monto a Transferir a Legalistas</h4>
                  <p className="text-xs text-gray-500 mt-0.5">HP Legalistas + PCL Legalistas - Aportes Legalistas</p>
                </div>
                <span className={`text-3xl font-bold ${calc.montoTransferir < 0 ? "text-red-700" : "text-brand-700"}`}>
                  {formatARS(calc.montoTransferir)}
                </span>
              </div>
            </div>
            <div className="rounded-xl p-5 border-2 border-amber-200 bg-amber-50">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <h4 className="font-semibold text-sm text-gray-800">Gastos de la Causa</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Total acumulado (solo lectura)</p>
                </div>
                <span className="text-2xl font-bold text-amber-700 mt-2">
                  {formatARS(closing.totalCaseExpenses || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Estado PCL */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Estado PCL</label>
              <Select value={pclStatus} onValueChange={setPclStatus}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusData).filter(([k]) => k === k.toUpperCase()).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Detalle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Detalle</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none resize-y"
              placeholder="Descripción de la situación del cierre..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Link href="/admin/closing-manager">
              <Button type="button" variant="outline" className="px-6">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting} className="px-6 bg-brand-500 text-white hover:bg-brand-500/85">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Guardar Cambios</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
