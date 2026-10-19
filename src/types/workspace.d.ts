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
	/** Key of PROJECT_ICONS (components/workspace/ProjectLook); null = board. */
	icon: string | null;
	privacy: "TEAM" | "PRIVATE";
	organizationId: number;
	team: { id: number; name: string; color: string | null } | null;
	openTasks: number;
}

export interface WorkMyTask {
	id: number;
	title: string;
	/** ISO; only the day matters (00:00 UTC). */
	dueDate: string | null;
	priority: WorkPriority;
	parentTaskId: number | null;
	project: { id: number; name: string; color: string | null };
	column: { name: string } | null;
	completedAt?: string | null;
}

export interface WorkHomeTeam {
	id: number;
	name: string;
	color: string | null;
	organizationId: number;
	canCreateProject: boolean;
}

export interface WorkHomePerson extends WorkPerson {
	overdue: number;
	done: number;
	upcoming: number;
}

export interface WorkHome {
	summary: { doneThisWeek: number; collaborators: number };
	myDone: WorkMyTask[];
	people: WorkHomePerson[];
	orgs: { id: number; name: string; role: WorkOrgRole }[];
	teams: WorkHomeTeam[];
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
	createdAt: string;
	updatedAt: string;
	createdBy: WorkPerson;
	version: number;
	assignees: WorkPerson[];
	/** Who liked it (user ids). */
	likes: number[];
	/** Subtasks listed when the card is expanded. */
	subtaskItems: { id: number; title: string; completedAt: string | null }[];
	subtasks: number;
	comments: number;
	cases: number;
	leads: number;
	attachments: number;
	/** Signed URL of the cover image (valid for some hours), or null. */
	cover: string | null;
}

export interface WorkBoard {
	project: {
		id: number;
		name: string;
		description: string | null;
		color: string | null;
		icon: string | null;
		privacy: "TEAM" | "PRIVATE";
		organizationId: number;
		team: { id: number; name: string } | null;
	};
	columns: WorkColumn[];
	tasks: WorkCard[];
	people: WorkPerson[];
	permissions: WorkPermissions;
}

export type WorkTeamRole = "ADMIN" | "MEMBER";

export interface WorkStructureTeam {
	id: number;
	name: string;
	description: string | null;
	color: string | null;
	members: { role: WorkTeamRole; user: WorkPerson }[];
	projects: { id: number; name: string; privacy: "TEAM" | "PRIVATE"; color: string | null; icon: string | null }[];
	permissions: { manageMembers: boolean; createProject: boolean };
}

export interface WorkStructure {
	/** Org owners/admins: they see and edit everything. */
	direction: { role: WorkOrgRole; user: WorkPerson }[];
	teams: WorkStructureTeam[];
	permissions: { createTeam: boolean; addPeople: boolean };
}

/** A firm account that can be added to a team. */
export interface WorkCandidate extends WorkPerson {
	email: string | null;
	orgRole: WorkOrgRole | null;
}

/** Live board notice (Socket.IO /workspace). */
export interface TaskChangedEvent {
	projectId: number;
	taskId: number;
	parentTaskId?: number | null;
	action: string;
	actorId: number;
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
	/** Case title (generated automatically). */
	title: string | null;
	number: string | null;
	customerId: number;
	customer: { id: number; name: string | null } | null;
	/** Case files, for "1 expediente · Nº ..." like the case manager. */
	files: { cuij: string | null }[];
}

/** A CRM lead linked to a task (or mentioned with $). */
export interface WorkLeadRef {
	id: number;
	name: string;
	phone: string | null;
	/** Funnel column, e.g. "Reunión Coordinada". */
	stage: string;
	seller: string | null;
}

/** A negotiation (%) or closing (-) to mention: the client and "Negociación #12 · En curso". */
export interface WorkMentionRef {
	id: number;
	name: string;
	subtitle: string;
}

export interface WorkAttachment {
	id: number;
	fileName: string;
	mimeType: string | null;
	size: number;
	isCover: boolean;
	createdAt: string;
	uploadedBy: WorkPerson | null;
	/** Signed URL to open it (valid for an hour). */
	url: string | null;
}

export interface WorkComment {
	id: number;
	/** Editor HTML, with mentions. */
	body: string;
	createdAt: string;
	editedAt: string | null;
	author: WorkPerson;
}

export interface WorkTaskDetail
	extends Omit<WorkCard, "subtasks" | "comments" | "cases" | "leads" | "attachments" | "cover"> {
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
	leads: WorkLeadRef[];
	attachments: WorkAttachment[];
	comments: WorkComment[];
	counts: { subtasks: number; comments: number; cases: number; leads: number; attachments: number };
	permissions: WorkPermissions;
}

export type WorkProjectRole = "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER";

/** Who sees a board (GET /projects/:id/access). */
export interface WorkProjectAccess {
	project: {
		id: number;
		name: string;
		description: string | null;
		color: string | null;
		icon: string | null;
		privacy: "TEAM" | "PRIVATE";
		archivedAt: string | null;
		team: { id: number; name: string } | null;
	};
	members: { role: WorkProjectRole; user: WorkPerson }[];
	team: { role: WorkTeamRole; user: WorkPerson }[];
	orgAdmins: WorkPerson[];
	permissions: { manageMembers: boolean; edit: boolean };
}
