import {
	FileSearch,
	FileText,
	Handshake,
	Phone,
	UserCheck,
	Users,
} from "lucide-react";

export type RecruitmentStage =
	| "SOURCING"
	| "CV_REVIEW"
	| "PHONE_INTERVIEW"
	| "ONSITE_INTERVIEW"
	| "HIRED";

export interface RecruitmentColumn {
	id: RecruitmentStage;
	title: string;
}

export const RECRUITMENT_COLUMNS: RecruitmentColumn[] = [
	{ id: "SOURCING", title: "Reclutamiento de CVs" },
	{ id: "CV_REVIEW", title: "Revisión de CVs" },
	{ id: "PHONE_INTERVIEW", title: "Entrevista telefónica" },
	{ id: "ONSITE_INTERVIEW", title: "Entrevista presencial" },
	{ id: "HIRED", title: "Contratación" },
];

export const RECRUITMENT_COLUMN_CONFIG: Record<
	RecruitmentStage,
	{
		bg: string;
		color: string;
		borderColor: string;
		icon: typeof FileText;
	}
> = {
	SOURCING: {
		bg: "bg-sky-50",
		color: "text-sky-700",
		borderColor: "border-sky-200",
		icon: Users,
	},
	CV_REVIEW: {
		bg: "bg-amber-50",
		color: "text-amber-700",
		borderColor: "border-amber-200",
		icon: FileSearch,
	},
	PHONE_INTERVIEW: {
		bg: "bg-purple-50",
		color: "text-purple-700",
		borderColor: "border-purple-200",
		icon: Phone,
	},
	ONSITE_INTERVIEW: {
		bg: "bg-indigo-50",
		color: "text-indigo-700",
		borderColor: "border-indigo-200",
		icon: Handshake,
	},
	HIRED: {
		bg: "bg-green-50",
		color: "text-green-700",
		borderColor: "border-green-200",
		icon: UserCheck,
	},
};

export const RECRUITMENT_SOURCES = [
	{ value: "LINKEDIN", label: "LinkedIn" },
	{ value: "PORTAL", label: "Portal de empleo" },
	{ value: "REFERRAL", label: "Referido" },
	{ value: "WEB", label: "Sitio web" },
	{ value: "OTHER", label: "Otro" },
] as const;

export type RecruitmentSource = (typeof RECRUITMENT_SOURCES)[number]["value"];
