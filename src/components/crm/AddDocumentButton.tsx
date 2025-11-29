"use client"
import { useState } from "react"
import { Tag } from "lucide-react"
import Button from "@/components/ui/button/Button"
import type { Lead } from "@/types/crm"
import AddDocumentModal from "./AddDocumentModal"

interface AddDocumentButtonProps {
    lead: Lead
    onLeadUpdate: (updatedLead: Lead) => void
}

export default function AddDocumentButton({ lead, onLeadUpdate }: AddDocumentButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <Button variant="outline" className="w-full" size="sm" onClick={() => setIsModalOpen(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Añadir documento
            </Button>

            <AddDocumentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lead={lead}
                onLeadUpdate={onLeadUpdate}
            />
        </>
    )
}
