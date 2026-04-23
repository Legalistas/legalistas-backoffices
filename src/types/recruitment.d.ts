import type { RecruitmentSource, RecruitmentStage } from "@/constant/recruitment";

export interface Candidate {
	id: number;
	name: string;
	email: string | null;
	phone: string | null;
	position: string;
	area: string | null;
	source: RecruitmentSource;
	stage: RecruitmentStage;
	cvUrl: string | null;
	notes: string | null;
	responsibleId: number | null;
	responsible?: {
		id: number;
		name: string;
		image: string | null;
	} | null;
	hiredUserId: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface CandidateFormData {
	name: string;
	email: string;
	phone: string;
	position: string;
	area: string;
	source: RecruitmentSource;
	stage: RecruitmentStage;
	notes: string;
	responsibleId: number | null;
	cvUrl: string | null;
}
