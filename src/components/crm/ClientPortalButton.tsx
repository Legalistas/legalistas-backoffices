"use client"
import { useState } from "react"
import { ExternalLink, Send, FileText, CheckCircle, Shield, MessageCircle } from "lucide-react"
import Button from "@/components/ui/button/Button"
import ClientPortalModal from "./ClientPortalModal"
import type { Lead } from "@/types/crm"

interface ClientPortalButtonProps {
    lead: Lead
    onLeadUpdate: (updatedLead: Lead) => void
}

export default function ClientPortalButton({ lead, onLeadUpdate }: ClientPortalButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <Button 
                variant="outline" 
                className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 hover:border-indigo-400 hover:from-indigo-100 hover:to-purple-100" 
                size="sm" 
                onClick={() => setIsModalOpen(true)}
            >
                <Send className="h-4 w-4 mr-2 text-indigo-600" />
                <span className="text-indigo-700">Portal de Cliente</span>
            </Button>

            <ClientPortalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lead={lead}
                onLeadUpdate={onLeadUpdate}
            />
        </>
    )
}
