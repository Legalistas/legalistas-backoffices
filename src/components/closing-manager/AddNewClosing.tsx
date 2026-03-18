"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"
import Button from "@/components/ui/button/Button"
import { closingType, statusCapital, statusData } from "@/constant/closing-manager"
import { NEGOTIATIONS_ENDPOINT, CLOSINGS_FROM_NEGOTIATION_ENDPOINT } from "@/constant/api-endpoints"
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions"

interface Negotiation {
  id: number
  title: string
  caseId: number
  lesion: string
  case: { id: number; title: string; number: string }
  offers: Array<{ id: number; type: string; amount: number; date: string; accepted: boolean }>
}

interface AddNewClosingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const inputClass = "w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"

const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)

export default function AddNewClosing({ open, onOpenChange, onSuccess }: AddNewClosingProps) {
  const { data: session } = useSession()
  const permissions = useRolePermissions()
  const [finalizedNegotiations, setFinalizedNegotiations] = useState<Negotiation[]>([])
  const [selectedNegotiationId, setSelectedNegotiationId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingNegotiations, setLoadingNegotiations] = useState(true)

  // Form fields
  const [type, setType] = useState("SRT")
  const [capitalState, setCapitalState] = useState("AGREEMENT_IN_MANAGEMENT")
  const [feeStatus, setFeeStatus] = useState("EARRINGS")
  const [hpAgreed, setHpAgreed] = useState("20")
  const [hpTotal, setHpTotal] = useState("")
  const [hpDistribution, setHpDistribution] = useState(true)
  const [pclAgreed, setPclAgreed] = useState("20")
  const [pclTotal, setPclTotal] = useState("")
  const [pclDistribution, setPclDistribution] = useState(true)
  const [pclStatus, setPclStatus] = useState("EARRINGS")
  const [contributionsAmount, setContributionsAmount] = useState("0")
  const [applyContributions, setApplyContributions] = useState(true)
  const [detail, setDetail] = useState("")

  const selectedNegotiation = finalizedNegotiations.find((n) => n.id.toString() === selectedNegotiationId) || null
  const acceptedOffer = selectedNegotiation?.offers.find((o) => o.accepted) || null

  // Auto-calculate hpTotal and pclTotal when capital changes
  useEffect(() => {
    if (acceptedOffer) {
      const capital = Number(acceptedOffer.amount)
      const hp = Number(hpAgreed) || 0
      const pcl = Number(pclAgreed) || 0
      setHpTotal((capital * hp / 100).toFixed(2))
      setPclTotal((capital * pcl / 100).toFixed(2))
    }
  }, [acceptedOffer, hpAgreed, pclAgreed])

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

  // Fetch finalized negotiations
  useEffect(() => {
    const fetchNegotiations = async () => {
      if (!open || !session?.user?.accessToken) return
      setLoadingNegotiations(true)
      try {
        const url = buildFilteredUrl(NEGOTIATIONS_ENDPOINT, permissions, { status: "FINALIZADAS", limit: "1000" })
        const response = await fetch(url, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.user.accessToken}` },
        })
        if (!response.ok) throw new Error("Error al cargar negociaciones")
        const data = await response.json()
        setFinalizedNegotiations(data.data || [])
      } catch (err) {
        console.error("Error fetching negotiations:", err)
      } finally {
        setLoadingNegotiations(false)
      }
    }
    fetchNegotiations()
  }, [open, session, permissions])

  const resetForm = () => {
    setSelectedNegotiationId("")
    setType("SRT")
    setCapitalState("AGREEMENT_IN_MANAGEMENT")
    setFeeStatus("EARRINGS")
    setHpAgreed("20")
    setHpTotal("")
    setHpDistribution(true)
    setPclAgreed("20")
    setPclTotal("")
    setPclDistribution(true)
    setPclStatus("EARRINGS")
    setContributionsAmount("0")
    setApplyContributions(true)
    setDetail("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNegotiationId || !acceptedOffer) {
      alert("Selecciona una negociación con oferta aceptada")
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(CLOSINGS_FROM_NEGOTIATION_ENDPOINT(Number(selectedNegotiationId)), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
        body: JSON.stringify({
          type,
          capitalState,
          feeStatus,
          hpAgreed: parseFloat(hpAgreed) || 20,
          hpTotal: parseFloat(hpTotal) || 0,
          hpDistribution,
          pclAgreed: parseFloat(pclAgreed) || 20,
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
        throw new Error(err.message || "Error al crear el cierre")
      }
      onOpenChange(false)
      resetForm()
      if (onSuccess) onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear el cierre")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nuevo Cierre desde Negociación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleccionar Negociación */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Negociación Finalizada <span className="text-red-500">*</span></label>
            {loadingNegotiations ? (
              <p className="text-sm text-gray-500">Cargando negociaciones...</p>
            ) : (
              <Select value={selectedNegotiationId} onValueChange={setSelectedNegotiationId}>
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {selectedNegotiation
                      ? `${selectedNegotiation.case.title} - ${selectedNegotiation.case.number}`
                      : "Selecciona una negociación"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {finalizedNegotiations.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No hay negociaciones finalizadas</div>
                  ) : (
                    finalizedNegotiations.map((n) => (
                      <SelectItem key={n.id} value={n.id.toString()}>
                        {n.case.title} - {n.case.number}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Info negociación */}
          {selectedNegotiation && acceptedOffer && (
            <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-brand-500">Datos del Case ID</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-gray-500">Causa:</span> <span className="font-medium">{selectedNegotiation.case.title}</span></div>
                <div><span className="text-gray-500">Expediente:</span> <span className="font-medium">{selectedNegotiation.case.number || "-"}</span></div>
                <div>
                  <span className="text-gray-500">Capital (oferta aceptada):</span>{" "}
                  <span className="font-medium text-green-600">{formatARS(Number(acceptedOffer.amount))}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tipo oferta:</span>{" "}
                  <span className="font-medium">{acceptedOffer.type === "ASEGURADORA" ? "ART" : "Legalistas"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Campos del formulario */}
          <div className="grid grid-cols-2 gap-6">
            {/* Tipo de Cierre */}
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

            {/* Estado Capital */}
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

            {/* Estado Honorarios */}
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

            {/* Estado PCL */}
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
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-500/85 text-white" disabled={isLoading || !selectedNegotiationId}>
              {isLoading ? "Creando..." : "Crear Cierre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
