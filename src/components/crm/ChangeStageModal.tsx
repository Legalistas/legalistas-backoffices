"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { CheckCircle2, Circle, ChevronRight, Loader2 } from "lucide-react"
import { Modal } from "@/components/ui/modal/Modal"
import Button from "@/components/ui/button/Button"
import { LEADS_ENDPOINT } from "@/constant/api-endpoints"
import { CRM_COLUMNS } from "@/constant/crm"
import { toast } from "sonner"
import type { Lead } from "@/types/crm"
import { useRouter } from "next/navigation"

interface ChangeStageModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead
  onLeadUpdate: (updatedLead: Lead) => void
}

export default function ChangeStageModal({ isOpen, onClose, lead, onLeadUpdate }: ChangeStageModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedColumnId, setSelectedColumnId] = useState<number | undefined>(lead.columnId)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStageChange = async () => {
    if (!selectedColumnId || selectedColumnId === lead.columnId) {
      onClose()
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${LEADS_ENDPOINT}/${lead.id}/column`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.user?.accessToken}`,
        },
        body: JSON.stringify({
            columnId: selectedColumnId,
            status: 'IN_PROGRESS',
            userId: session?.user?.id
        }),
    })

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`)
      }

      const updatedLead = await response.json()
      window.location.reload()
      toast.success("Etapa actualizada correctamente")
      onClose()
    } catch (error) {
      console.error("Error updating lead stage:", error)
      toast.error("Error al actualizar la etapa")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Cambiar etapa</h2>
        <p className="text-muted-foreground mb-6">
          Selecciona la nueva etapa para <span className="font-medium text-foreground">{lead?.name}</span>
        </p>

        <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto pr-2">
          {CRM_COLUMNS.map((column) => (
            <button
              key={column.id}
              className={`w-full flex items-center justify-between rounded-lg p-3 text-left transition-colors ${
                selectedColumnId === Number(column.id)
                  ? "bg-primary/10 border border-primary"
                  : "hover:bg-muted border border-transparent"
              }`}
              onClick={() => setSelectedColumnId(Number(column.id))}
            >
              <div className="flex items-center">
                <div className="mr-3">
                  {selectedColumnId === Number(column.id) ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{column.title}</div>
                  <div className="text-sm text-muted-foreground">{getColumnDescription(column.id)}</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleStageChange} disabled={isSubmitting || selectedColumnId === lead.columnId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Helper function to provide descriptions for each column/stage
function getColumnDescription(columnId: string | number): string {
  switch (Number(columnId)) {
    case 1:
      return "Cliente ha realizado una consulta inicial"
    case 2:
      return "Pendiente de agendar una reunión"
    case 3:
      return "Reunión agendada con el cliente"
    case 4:
      return "Caso en proceso de evaluación"
    case 5:
      return "Esperando confirmación del cliente"
    case 6:
      return "Pendiente de coordinar reunión para firma de poder"
    case 7:
      return "Reunión de firma de poder agendada"
    case 8:
      return "Esperando recepción del poder firmado"
    case 9:
      return "Cliente ha entregado el poder firmado"
    case 10:
      return "Oportunidad perdida"
    case 11:
      return "Casos archivados o inactivos"
    default:
      return ""
  }
}
