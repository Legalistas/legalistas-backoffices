"use client";
import { Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types/crm";
import ChangeStageModal from "./ChangeStageModal";

interface ChangeStageButtonProps {
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function ChangeStageButton({
	lead,
	onLeadUpdate,
}: ChangeStageButtonProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				className="w-full"
				onClick={() => setIsOpen(true)}
			>
				<Tag className="h-4 w-4 mr-2" />
				Cambiar etapa
			</Button>

			<ChangeStageModal
				open={isOpen}
				onOpenChange={setIsOpen}
				lead={lead}
				onLeadUpdate={onLeadUpdate}
			/>
		</>
	);
}
