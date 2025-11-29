"use client"
import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Loader2, X } from "lucide-react"
import { LEADS_ENDPOINT } from "@/constant/api-endpoints"
import { toast } from "sonner"
import type { Lead } from "@/types/crm"
import { useRouter } from "next/navigation"
import { MEETING_TYPES } from "@/constant/crm"
import moment from "moment-timezone"

interface ScheduleMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead
  onLeadUpdate: (updatedLead: Lead) => void
}


export default function ScheduleMeetingModal({ isOpen, onClose, lead, onLeadUpdate }: ScheduleMeetingModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [meetingType, setMeetingType] = useState<string>("VIDEO_CALL")
  const [selectedLawyer, setSelectedLawyer] = useState<number | undefined>(
    lead.responsibleLawyerId || lead.internalLawyerId,
  )
  const [meetingDateTime, setMeetingDateTime] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  // Combine lawyers from the lead
  const availableLawyers = [
    ...(lead.responsibleLawyer ? [lead.responsibleLawyer] : []),
    ...(lead.internalLawyer && lead.internalLawyer.id !== lead.responsibleLawyerId ? [lead.internalLawyer] : []),
  ]

  // Handle click outside to close modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleScheduleMeeting = async () => {
    if (!meetingDateTime || !selectedLawyer || !meetingType) {
      toast.error("Por favor complete todos los campos requeridos")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${LEADS_ENDPOINT}/${lead.id}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
        body: JSON.stringify({
          leadId: lead.id,
          meetingType,
          lawyerId: selectedLawyer,
          scheduledAt: meetingDateTime,
          userId: Number(session?.user?.id),
          customerId: lead.userId,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      const updatedLead = {
        ...lead,
        crmMeetings: [...(lead.crmMeetings || []), data],
      }

      onLeadUpdate(updatedLead)
      router.push(`/admin/crm/leads/${lead.id}`)
      toast.success("Reunión programada correctamente")
      onClose()
    } catch (error) {
      console.error("Error scheduling meeting:", error)
      toast.error("Error al programar la reunión")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Programar reunión</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Programa una reunión con{" "}
            <span className="font-medium text-gray-900 dark:text-white">{lead.user?.name}</span>
          </p>

          <div className="space-y-4">
            {/* Meeting Type Selector */}
            <div className="space-y-2">
              <label htmlFor="meeting-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de actividad
              </label>
              <select
                id="meeting-type"
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {MEETING_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lawyer Selector */}
            <div className="space-y-2">
              <label htmlFor="lawyer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Abogado responsable
              </label>
              <select
                id="lawyer"
                value={selectedLawyer?.toString() || ""}
                onChange={(e) => setSelectedLawyer(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="" disabled>
                  Seleccionar abogado
                </option>
                {availableLawyers.map((lawyer) => (
                  <option key={lawyer.id} value={lawyer.id.toString()}>
                    {lawyer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Time Picker */}
            <div className="space-y-2">
              <label htmlFor="meeting-datetime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha y hora
              </label>
              <input
                type="datetime-local"
                id="meeting-datetime"
                value={meetingDateTime}
                onChange={(e) => setMeetingDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notas
              </label>
              <textarea
                id="notes"
                placeholder="Agregar notas sobre la reunión..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleScheduleMeeting}
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                Programando...
              </>
            ) : (
              "Programar reunión"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
