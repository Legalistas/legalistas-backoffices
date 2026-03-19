"use client";
import { Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types/crm";
import AddDocumentModal from "./AddDocumentModal";

interface AddDocumentButtonProps {
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function AddDocumentButton({
	lead,
	onLeadUpdate,
}: AddDocumentButtonProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				className="w-full"
				onClick={() => setIsOpen(true)}
			>
				<Tag className="h-4 w-4 mr-2" />
				Añadir documento
			</Button>

			<AddDocumentModal
				open={isOpen}
				onOpenChange={setIsOpen}
				lead={lead}
				onLeadUpdate={onLeadUpdate}
			/>
		</>
	);
}
