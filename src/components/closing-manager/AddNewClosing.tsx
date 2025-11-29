"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"
import Button from "@/components/ui/button/Button"
import { closingType, statusCapital, statusData } from "@/constant/closing-manager"
import { NEGOTIATIONS_ENDPOINT, CLOSINGS_FROM_NEGOTIATION_ENDPOINT } from "@/constant/api-endpoints"
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions"
import { X } from "lucide-react"

interface Negotiation {
  id: number
  title: string
  caseId: number
  lesion: string
  case: {
    id: number
    title: string
    number: string
  }
  offers: Array<{
    id: number
    type: string
    amount: number
    date: string
    accepted: boolean
  }>
}

interface AddNewClosingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function AddNewClosing({ open, onOpenChange, onSuccess }: AddNewClosingProps) {
  const { data: session } = useSession()
  const permissions = useRolePermissions()
  const [finalizedNegotiations, setFinalizedNegotiations] = useState<Negotiation[]>([])
  const [selectedNegotiationId, setSelectedNegotiationId] = useState<string>("")
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingNegotiations, setLoadingNegotiations] = useState(true)

  // Form fields
  const [type, setType] = useState<string>("SRT")
  const [capitalState, setCapitalState] = useState<string>("AGREEMENT_IN_MANAGEMENT")
  const [feeStatus, setFeeStatus] = useState<string>("EARRINGS")
  const [hpAgreedPercentage, setHpAgreedPercentage] = useState<string>("")
  const [pclAgreed, setPclAgreed] = useState<string>("")
  const [pclStatus, setPclStatus] = useState<string>("EARRINGS")
  const [litigation, setLitigation] = useState<string>("")
  const [contributions, setContributions] = useState<string>("0")

  // Fetch finalized negotiations
  useEffect(() => {
    const fetchFinalizedNegotiations = async () => {
      if (!open || !session?.user?.accessToken) return

      setLoadingNegotiations(true)
      try {
        // Use buildFilteredUrl to apply role-based filtering
        const url = buildFilteredUrl(NEGOTIATIONS_ENDPOINT, permissions, {
          status: "FINALIZADA",
          limit: "1000"
        })

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        })

        if (!response.ok) throw new Error("Error al cargar negociaciones finalizadas")

        const data = await response.json()
        setFinalizedNegotiations(data.data || [])
      } catch (err) {
        console.error("Error fetching finalized negotiations:", err)
        alert("Error al cargar las negociaciones finalizadas")
      } finally {
        setLoadingNegotiations(false)
      }
    }

    fetchFinalizedNegotiations()
  }, [open, session, permissions])

  // Update selected negotiation when selection changes
  useEffect(() => {
    if (selectedNegotiationId) {
      const negotiation = finalizedNegotiations.find(
        (n) => n.id.toString() === selectedNegotiationId
      )
      setSelectedNegotiation(negotiation || null)
    } else {
      setSelectedNegotiation(null)
    }
  }, [selectedNegotiationId, finalizedNegotiations])

  const getAcceptedOffer = () => {
    if (!selectedNegotiation) return null
    return selectedNegotiation.offers.find((offer) => offer.accepted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedNegotiationId) {
      alert("Por favor selecciona una negociación")
      return
    }

    const acceptedOffer = getAcceptedOffer()
    if (!acceptedOffer) {
      alert("No se encontró una oferta aceptada para esta negociación")
      return
    }

    setIsLoading(true)

    try {
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
            hpAgreed: hpAgreedPercentage ? parseFloat(hpAgreedPercentage) : null,
            pclAgreed: pclAgreed || null,
            pclStatus: pclStatus || null,
            litigation: litigation || null,
            contributions: contributions,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al crear el cierre")
      }

      alert("Cierre creado exitosamente")
      onOpenChange(false)
      if (onSuccess) onSuccess()

      // Reset form
      setSelectedNegotiationId("")
      setSelectedNegotiation(null)
      setType("SRT")
      setCapitalState("AGREEMENT_IN_MANAGEMENT")
      setFeeStatus("EARRINGS")
      setHpAgreedPercentage("")
      setPclAgreed("")
      setPclStatus("EARRINGS")
      setLitigation("")
      setContributions("0")
    } catch (err) {
      console.error("Error creating closing:", err)
      alert(err instanceof Error ? err.message : "Error al crear el cierre")
    } finally {
      setIsLoading(false)
    }
  }

  const acceptedOffer = getAcceptedOffer()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nuevo Cierre desde Negociación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleccionar Negociación */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Negociación Finalizada <span className="text-red-500">*</span>
            </label>
            {loadingNegotiations ? (
              <p className="text-sm text-muted-foreground">Cargando negociaciones...</p>
            ) : (
              <div className="relative">
                <Select value={selectedNegotiationId} onValueChange={setSelectedNegotiationId}>
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {selectedNegotiation
                        ? `${selectedNegotiation.title} - ${selectedNegotiation.case.number || selectedNegotiation.case.title}`
                        : "Selecciona una negociación finalizada"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {finalizedNegotiations.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No hay negociaciones finalizadas disponibles
                      </div>
                    ) : (
                      finalizedNegotiations.map((negotiation) => (
                        <SelectItem key={negotiation.id} value={negotiation.id.toString()}>
                          {negotiation.title} - {negotiation.case.number || negotiation.case.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Información de la negociación seleccionada */}
          {selectedNegotiation && (
            <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-brand-500">Información de la Negociación</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Caso:</span>{" "}
                  <span className="font-medium">{selectedNegotiation.case.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expediente:</span>{" "}
                  <span className="font-medium">{selectedNegotiation.case.number || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Lesión:</span>{" "}
                  <span className="font-medium">{selectedNegotiation.lesion}</span>
                </div>
                {acceptedOffer && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Oferta Aceptada:</span>{" "}
                      <span className="font-medium text-green-600">
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(parseFloat(acceptedOffer.amount.toString()))}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>{" "}
                      <span className="font-medium">
                        {acceptedOffer.type === "ASEGURADORA" ? "ART" : "LEGALISTAS"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha:</span>{" "}
                      <span className="font-medium">
                        {new Date(acceptedOffer.date).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {acceptedOffer && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Este monto será usado como Capital y HP Acordados automáticamente
                </p>
              )}
            </div>
          )}

          {/* Grid de 2 columnas para campos del formulario */}
          <div className="grid grid-cols-2 gap-6">
          {/* Tipo de Cierre */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tipo de Cierre <span className="text-red-500">*</span>
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <span className="truncate">
                  {type === "SRT" ? closingType.srt : type === "JUDICIAL" ? closingType.judicial : closingType.extrajudicial}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SRT">{closingType.srt}</SelectItem>
                <SelectItem value="JUDICIAL">{closingType.judicial}</SelectItem>
                <SelectItem value="EXTRAJUDICIAL">{closingType.extrajudicial}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado del Capital */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Estado del Capital <span className="text-red-500">*</span>
            </label>
            <Select value={capitalState} onValueChange={setCapitalState}>
              <SelectTrigger>
                <span className="truncate">
                  {capitalState === "AGREEMENT_IN_MANAGEMENT" ? statusCapital.agreement_in_management :
                    capitalState === "AGREEMENT_PRESENTED" ? statusCapital.agreement_presented :
                      capitalState === "AWAITING_DEADLINE" ? statusCapital.awaiting_deadline :
                        capitalState === "REQUESTED_OP" ? statusCapital.requested_op :
                          capitalState === "TRANSFER_REQUESTED" ? statusCapital.transfer_requested :
                            statusCapital.k_received_by_actor}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGREEMENT_IN_MANAGEMENT">
                  {statusCapital.agreement_in_management}
                </SelectItem>
                <SelectItem value="AGREEMENT_PRESENTED">
                  {statusCapital.agreement_presented}
                </SelectItem>
                <SelectItem value="AWAITING_DEADLINE">{statusCapital.awaiting_deadline}</SelectItem>
                <SelectItem value="REQUESTED_OP">{statusCapital.requested_op}</SelectItem>
                <SelectItem value="TRANSFER_REQUESTED">
                  {statusCapital.transfer_requested}
                </SelectItem>
                <SelectItem value="K_RECEIVED_BY_ACTOR">
                  {statusCapital.k_received_by_actor}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado de Honorarios */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Estado de Honorarios <span className="text-red-500">*</span>
            </label>
            <Select value={feeStatus} onValueChange={setFeeStatus}>
              <SelectTrigger>
                <span className="truncate">
                  {feeStatus === "EARRINGS" ? statusData.earrings :
                    feeStatus === "REQUESTED" ? statusData.requested :
                      statusData.charged}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EARRINGS">{statusData.earrings}</SelectItem>
                <SelectItem value="REQUESTED">{statusData.requested}</SelectItem>
                <SelectItem value="CHARGED">{statusData.charged}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* HP Acordados */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              HP Acordados (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={hpAgreedPercentage}
              onChange={(e) => setHpAgreedPercentage(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="Ej: 20 (para 20%)"
              required
            />
          </div>

          {/* PCL Acordados */}
          <div className="space-y-2">
            <label className="text-sm font-medium">PCL Acordados</label>
            <input
              type="text"
              value={pclAgreed}
              onChange={(e) => setPclAgreed(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="Ej: 10%, $50000, etc."
            />
          </div>

          {/* Estado PCL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado PCL</label>
            <Select value={pclStatus} onValueChange={setPclStatus}>
              <SelectTrigger>
                <span className="truncate">
                  {pclStatus === "EARRINGS" ? statusData.earrings :
                    pclStatus === "REQUESTED" ? statusData.requested :
                      statusData.charged}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EARRINGS">{statusData.earrings}</SelectItem>
                <SelectItem value="REQUESTED">{statusData.requested}</SelectItem>
                <SelectItem value="CHARGED">{statusData.charged}</SelectItem>
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

          {/* Litigio */}
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand-500 hover:bg-brand-500/85 text-white"
              disabled={isLoading || !selectedNegotiationId}
            >
              {isLoading ? "Creando..." : "Crear Cierre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
