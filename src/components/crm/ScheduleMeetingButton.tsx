"use client";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types/crm";
import ScheduleMeetingModal from "./ScheduleMeetingModal";

interface ScheduleMeetingButtonProps {
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function ScheduleMeetingButton({
	lead,
	onLeadUpdate,
}: ScheduleMeetingButtonProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				className="w-full"
				onClick={() => setIsOpen(true)}
			>
				<Calendar className="h-4 w-4 mr-2" />
				Programar reunión
			</Button>

			<ScheduleMeetingModal
				open={isOpen}
				onOpenChange={setIsOpen}
				lead={lead}
				onLeadUpdate={onLeadUpdate}
			/>
		</>
	);
}
