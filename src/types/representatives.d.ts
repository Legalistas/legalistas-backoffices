export type RepresentativeLevel = "BRONZE" | "SILVER" | "GOLD";

export interface RepresentativeKpi {
	userId: number;
	fullName: string;
	email: string;
	level: RepresentativeLevel | null;

	capitalClosed: number;
	closingsCount: number;
	/** HP + PCL of the period's closings. */
	feesClosed: number;
	// Rankings: 50 × closings vs the best + 50 × fees vs the best (0-100), 1 = first.
	/** Annual ranking: the whole selected year. */
	closingsYear: number;
	feesYear: number;
	scoreYear: number;
	rankYear: number;
	/** Monthly ranking: the month picked; null on the whole year. */
	scoreMonth: number | null;
	rankMonth: number | null;
	leadsCreated: number;
	powersSigned: number;
	conversionRate: number | null;
	casesStarted: number;
	casesStalledCount: number;
	loginsCount: number;
	lastLoginAt: string | null;
}

export interface RepresentativesGlobalStats {
	representativesCount: number;
	totalCapitalClosed: number;
	totalClosingsCount: number;
	avgCapitalClosed: number;
	avgClosingsCount: number;
	totalLeadsCreated: number;
	totalPowersSigned: number;
	avgConversionRate: number;
	totalCasesStarted: number;
}

export interface RepresentativesKpisResponse {
	data: {
		period: { month: number; year: number };
		global: RepresentativesGlobalStats;
		representatives: RepresentativeKpi[];
	};
}

export interface RepresentativeLevelHistoryEntry {
	userId: number;
	year: number;
	month: number;
	level: RepresentativeLevel | null;
	createdAt: string;
	updatedAt: string;
}

export interface RepresentativeLevelsHistoryResponse {
	data: RepresentativeLevelHistoryEntry[];
}
