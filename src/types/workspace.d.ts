export type WorkPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WorkOrgRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

export interface WorkPerson {
	id: number;
	name: string | null;
	image: string | null;
}

export interface WorkPermissions {
	edit: boolean;
	comment: boolean;
	manage: boolean;
}

export interface WorkHomeProject {
	id: number;
	name: string;
	color: string | null;
	privacy: "TEAM" | "PRIVATE";
	organizationId: number;
	team: { id: number; name: string; color: string | null } | null;
	openTasks: number;
}

export interface WorkMyTask {
	id: number;
	title: string;
	/** ISO; el día es lo que importa (00:00 UTC). */
	dueDate: string | null;
	priority: WorkPriority;
	parentTaskId: number | null;
	project: { id: number; name: string };
	column: { name: string } | null;
}

export interface WorkHome {
	orgs: { id: number; name: string; role: WorkOrgRole }[];
	projects: WorkHomeProject[];
	myTasks: WorkMyTask[];
}

export interface WorkColumn {
	id: number;
	name: string;
	color: string | null;
	isDone: boolean;
	position: number;
}

export interface WorkCard {
	id: number;
	title: string;
	columnId: number | null;
	position: number;
	priority: WorkPriority;
	dueDate: string | null;
	completedAt: string | null;
	version: number;
	assignees: WorkPerson[];
	subtasks: number;
	comments: number;
	cases: number;
}

export interface WorkBoard {
	project: {
		id: number;
		name: string;
		description: string | null;
		color: string | null;
		privacy: "TEAM" | "PRIVATE";
		organizationId: number;
		team: { id: number; name: string } | null;
	};
	columns: WorkColumn[];
	tasks: WorkCard[];
	people: WorkPerson[];
	permissions: WorkPermissions;
}

export interface WorkActivity {
	id: number;
	action: string;
	data: Record<string, unknown> | null;
	createdAt: string;
	actor: WorkPerson | null;
}

export interface WorkSubtask {
	id: number;
	title: string;
	completedAt: string | null;
	dueDate: string | null;
	assignees: WorkPerson[];
}

export interface WorkCaseRef {
	id: number;
	/** Carátula (automática). */
	title: string | null;
	number: string | null;
}

export interface WorkComment {
	id: number;
	/** HTML del editor, con menciones. */
	body: string;
	createdAt: string;
	editedAt: string | null;
	author: WorkPerson;
}

export interface WorkTaskDetail extends Omit<WorkCard, "subtasks" | "comments" | "cases"> {
	description: string | null;
	startDate: string | null;
	parentTaskId: number | null;
	createdAt: string;
	project: { id: number; name: string };
	column: { id: number; name: string; isDone: boolean } | null;
	parentTask: { id: number; title: string } | null;
	createdBy: WorkPerson;
	completedBy: WorkPerson | null;
	subtasks: WorkSubtask[];
	activity: WorkActivity[];
	cases: WorkCaseRef[];
	comments: WorkComment[];
	counts: { subtasks: number; comments: number; cases: number };
	permissions: WorkPermissions;
}
