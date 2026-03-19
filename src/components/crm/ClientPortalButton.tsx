"use client";
import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types/crm";
import ClientPortalModal from "./ClientPortalModal";

interface ClientPortalButtonProps {
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function ClientPortalButton({
	lead,
	onLeadUpdate,
}: ClientPortalButtonProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				className="w-full bg-linear-to-r from-indigo-50 to-purple-50 border-indigo-200 hover:border-indigo-400 hover:from-indigo-100 hover:to-purple-100"
				onClick={() => setIsOpen(true)}
			>
				<Send className="h-4 w-4 mr-2 text-indigo-600" />
				<span className="text-indigo-700">Portal de Cliente</span>
			</Button>

			<ClientPortalModal
				open={isOpen}
				onOpenChange={setIsOpen}
				lead={lead}
				onLeadUpdate={onLeadUpdate}
			/>
		</>
	);
}
