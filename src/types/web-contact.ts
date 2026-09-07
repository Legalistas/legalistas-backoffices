export interface WebContactSubmission {
	id: number;
	origen: string | null;
	firstName: string | null;
	lastName: string | null;
	phone: string | null;
	email: string | null;
	services: string | null;
	message: string | null;
	utmSource: string | null;
	utmMedium: string | null;
	utmCampaign: string | null;
	utmContent: string | null;
	utmTerm: string | null;
	gclid: string | null;
	landingPage: string | null;
	status: "PENDING" | "CONVERTED" | "REJECTED";
	convertedLeadId: number | null;
	reviewedById: number | null;
	reviewedAt: string | null;
	createdAt: string;
}
