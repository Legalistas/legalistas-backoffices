"use client"
import { useState } from "react"
import { Calendar } from "lucide-react"
import Button from "@/components/ui/button/Button"
import ScheduleMeetingModal from "./ScheduleMeetingModal"
import type { Lead } from "@/types/crm"

interface ScheduleMeetingButtonProps {
    lead: Lead
    onLeadUpdate: (updatedLead: Lead) => void
}

export default function ScheduleMeetingButton({ lead, onLeadUpdate }: ScheduleMeetingButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <Button variant="outline" className="w-full" size="sm" onClick={() => setIsModalOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Programar reunión
            </Button>

            <ScheduleMeetingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lead={lead}
                onLeadUpdate={onLeadUpdate}
            />
        </>
    )
}
