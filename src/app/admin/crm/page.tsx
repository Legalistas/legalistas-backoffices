import type { Metadata } from "next";
import KanbanBoard from "@/components/crm/KanbanBoard";

export const metadata: Metadata = {
	title: "Dashboard | Lead Management System",
	description: "Lead Management System Dashboard",
};

export default function CrmPage() {
	return (
		<div>
			<KanbanBoard />
		</div>
	);
}
