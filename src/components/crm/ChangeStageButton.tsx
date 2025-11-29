"use client"
import { useState } from "react"
import { Tag } from "lucide-react"
import Button from "@/components/ui/button/Button"
import ChangeStageModal from "./ChangeStageModal"
import type { Lead } from "@/types/crm"

interface ChangeStageButtonProps {
    lead: Lead
    onLeadUpdate: (updatedLead: Lead) => void
}

export default function ChangeStageButton({ lead, onLeadUpdate }: ChangeStageButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <Button variant="outline" className="w-full" size="sm" onClick={() => setIsModalOpen(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Cambiar etapa
            </Button>

            <ChangeStageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lead={lead}
                onLeadUpdate={onLeadUpdate}
            />
        </>
    )
}
