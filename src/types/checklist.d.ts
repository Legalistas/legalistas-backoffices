export type EmploymentChecklistType = "ONBOARDING" | "OFFBOARDING";

export type EmploymentChecklistStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED";

export type EmploymentChecklistItemCategory =
	| "EQUIPMENT"
	| "ACCESS"
	| "DOCUMENTS"
	| "TRAINING"
	| "OTHER";

export type EmploymentChecklistItemStatus = "PENDING" | "DONE" | "SKIPPED";

export interface ChecklistUserMini {
	id: number;
	name: string;
	image: string | null;
}

export interface EmploymentChecklistItem {
	id: number;
	checklistId: number;
	title: string;
	description: string | null;
	category: EmploymentChecklistItemCategory;
	status: EmploymentChecklistItemStatus;
	order: number;
	dueDate: string | null;
	assignedToId: number | null;
	completedAt: string | null;
	completedById: number | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	assignedTo?: ChecklistUserMini | null;
	completedBy?: ChecklistUserMini | null;
}

export interface EmploymentChecklist {
	id: number;
	userId: number;
	type: EmploymentChecklistType;
	status: EmploymentChecklistStatus;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
	items: EmploymentChecklistItem[];
}
