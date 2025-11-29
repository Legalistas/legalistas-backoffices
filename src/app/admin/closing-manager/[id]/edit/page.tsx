"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ChevronLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import Button from "@/components/ui/button/Button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select/SelectComposed"
import { CLOSING_BY_ID_ENDPOINT } from "@/constant/api-endpoints"
import { closingType, statusCapital, statusData } from "@/constant/closing-manager"
import type { ClosingManagerEntry } from "@/types/closing-manager"

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
  const [capitalState, setCapitalState] = useState("AGREEMENT_IN_MANAGEMENT")
  const [feeStatus, setFeeStatus] = useState("EARRINGS")
  const [hpAgreedPercentage, setHpAgreedPercentage] = useState("")
  const [pclAgreed, setPclAgreed] = useState("")
  const [pclStatus, setPclStatus] = useState("EARRINGS")
  const [litigation, setLitigation] = useState("")
  const [contributions, setContributions] = useState("0")

  useEffect(() => {
    const fetchClosing = async () => {
      if (!session?.user?.accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(CLOSING_BY_ID_ENDPOINT(Number(params.id)), {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        })

        if (!response.ok) throw new Error("Error al cargar el cierre")

        const result = await response.json()
        const data = result.data || result // Soportar ambos formatos
        console.log("Datos del cierre:", data)
        setClosing(data)
        
        // Initialize form - usando los nombres exactos de la API
        setType(data.type || "SRT")
        setCapitalState(data.capitalState || "AGREEMENT_IN_MANAGEMENT")
        setFeeStatus(data.feeStatus || "EARRINGS")
        setHpAgreedPercentage(data.hpAgreed?.toString() || "")
        setPclAgreed(data.pclAgreed?.toString() || "")
        setPclStatus(data.pclStatus || "EARRINGS")
        setLitigation(data.litigation || "")
        setContributions(data.contributions || "0")
      } catch (err) {
        console.error("Error al cargar cierre:", err)
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
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al actualizar el cierre")
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
          <Button variant="outline" className="mt-4">
            Volver
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/closing-manager">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Editar Cierre</h1>
        </div>
      </div>

      {/* Closing Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-brand-500 font-semibold mb-2">Información del Cierre</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Causa:</span> {closing.case?.title || "-"}
          </div>
          <div>
            <span className="font-medium">Expediente:</span> {closing.case?.number || "-"}
          </div>
          <div>
            <span className="font-medium">Abogado:</span> {closing.case?.responsibleLawyer?.name || "-"}
          </div>
          <div>
            <span className="font-medium">Fecha:</span> {new Date(closing.date).toLocaleDateString("es-AR")}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tipo <span className="text-red-500">*</span>
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <span className="block truncate">
                  {closingType[type as keyof typeof closingType] || "Seleccione tipo"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SRT">{closingType.SRT}</SelectItem>
                <SelectItem value="JUDICIAL">{closingType.JUDICIAL}</SelectItem>
                <SelectItem value="EXTRAJUDICIAL">{closingType.EXTRAJUDICIAL}</SelectItem>
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
                <span className="block truncate">
                  {statusCapital[capitalState as keyof typeof statusCapital] || "Seleccione estado"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGREEMENT_IN_MANAGEMENT">{statusCapital.AGREEMENT_IN_MANAGEMENT}</SelectItem>
                <SelectItem value="AGREEMENT_PRESENTED">{statusCapital.AGREEMENT_PRESENTED}</SelectItem>
                <SelectItem value="AWAITING_DEADLINE">{statusCapital.AWAITING_DEADLINE}</SelectItem>
                <SelectItem value="REQUESTED_OP">{statusCapital.REQUESTED_OP}</SelectItem>
                <SelectItem value="TRANSFER_REQUESTED">{statusCapital.TRANSFER_REQUESTED}</SelectItem>
                <SelectItem value="K_RECEIVED_BY_ACTOR">{statusCapital.K_RECEIVED_BY_ACTOR}</SelectItem>
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
                <span className="block truncate">
                  {statusData[feeStatus as keyof typeof statusData] || "Seleccione estado"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EARRINGS">{statusData.EARRINGS}</SelectItem>
                <SelectItem value="REQUESTED">{statusData.REQUESTED}</SelectItem>
                <SelectItem value="CHARGED">{statusData.CHARGED}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* HP Agreed */}
          <div className="space-y-2">
            <label className="text-sm font-medium">HP Acordado (%)</label>
            <input
              type="number"
              value={hpAgreedPercentage}
              onChange={(e) => setHpAgreedPercentage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-500"
              placeholder="Ej: 10, $50000, etc."
              step="0.01"
            />
          </div>

          {/* PCL Agreed */}
          <div className="space-y-2">
            <label className="text-sm font-medium">PCL Acordado</label>
            <input
              type="text"
              value={pclAgreed}
              onChange={(e) => setPclAgreed(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-500"
              placeholder="20"
            />
          </div>

          {/* PCL Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Estado PCL <span className="text-red-500">*</span>
            </label>
            <Select value={pclStatus} onValueChange={setPclStatus}>
              <SelectTrigger>
                <span className="block truncate">
                  {statusData[pclStatus as keyof typeof statusData] || "Seleccione estado"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EARRINGS">{statusData.EARRINGS}</SelectItem>
                <SelectItem value="REQUESTED">{statusData.REQUESTED}</SelectItem>
                <SelectItem value="CHARGED">{statusData.CHARGED}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contributions */}
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
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Litigio</label>
            <textarea
              value={litigation}
              onChange={(e) => setLitigation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-500 min-h-[100px]"
              placeholder="Información sobre el litigio"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Link href="/admin/closing-manager">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-500 text-white hover:bg-brand-600"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
