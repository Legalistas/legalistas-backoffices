import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type {
	CostByAreaItem,
	EmployeeWithEmployment,
	LeaveSummary,
	MonthlyAbsenteeismItem,
	MonthlyTurnoverItem,
	RrhhStatsCard,
	TenureBucketItem,
} from "./types";

const LEAVE_TYPES = [
	"VACATION",
	"SICK",
	"STUDY",
	"MATERNITY",
	"PATERNITY",
	"UNPAID",
	"OTHER",
] as const;

function inRange(date: string, start: string, end: string): boolean {
	return date >= start && date <= end;
}

function buildMonthlyBuckets(start: string, end: string): string[] {
	const result: string[] = [];
	const from = parseISO(start);
	const to = parseISO(end);
	const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
	const last = new Date(to.getFullYear(), to.getMonth(), 1);
	while (cursor <= last) {
		result.push(format(cursor, "yyyy-MM"));
		cursor.setMonth(cursor.getMonth() + 1);
	}
	return result;
}

function formatMonthLabel(ym: string): string {
	const [y, m] = ym.split("-").map(Number);
	return format(new Date(y, m - 1, 1), "MMM yy", { locale: es });
}

function yearsBetween(from: string, to: Date): number {
	const fromDate = parseISO(from);
	const diffMs = to.getTime() - fromDate.getTime();
	return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

export function computeStats(
	employees: EmployeeWithEmployment[],
	startDate: string,
	endDate: string,
): RrhhStatsCard {
	const now = new Date();

	const activos = employees.filter(
		(e) => e.employment?.status === "ACTIVE",
	).length;

	const altas = employees.filter(
		(e) =>
			e.employment?.hireDate &&
			inRange(e.employment.hireDate, startDate, endDate),
	).length;

	const bajas = employees.filter(
		(e) =>
			e.employment?.terminationDate &&
			inRange(e.employment.terminationDate, startDate, endDate),
	).length;

	const tenures = employees
		.filter((e) => e.employment?.hireDate && !e.employment.terminationDate)
		.map((e) => yearsBetween(e.employment!.hireDate!, now));
	const antiguedadPromedio =
		tenures.length > 0
			? tenures.reduce((a, b) => a + b, 0) / tenures.length
			: 0;

	const costoMensualTotal = employees
		.filter(
			(e) =>
				e.employment?.status === "ACTIVE" && e.employment?.baseSalary !== null,
		)
		.reduce((sum, e) => sum + Number(e.employment!.baseSalary ?? 0), 0);

	return {
		activos,
		altas,
		bajas,
		antiguedadPromedio,
		costoMensualTotal,
	};
}

export function computeTurnover(
	employees: EmployeeWithEmployment[],
	startDate: string,
	endDate: string,
): MonthlyTurnoverItem[] {
	const months = buildMonthlyBuckets(startDate, endDate);
	const map: Record<string, MonthlyTurnoverItem> = {};
	for (const m of months) {
		map[m] = { month: formatMonthLabel(m), altas: 0, bajas: 0 };
	}

	for (const e of employees) {
		const hire = e.employment?.hireDate;
		const term = e.employment?.terminationDate;
		if (hire && inRange(hire, startDate, endDate)) {
			const key = hire.slice(0, 7);
			if (map[key]) map[key].altas += 1;
		}
		if (term && inRange(term, startDate, endDate)) {
			const key = term.slice(0, 7);
			if (map[key]) map[key].bajas += 1;
		}
	}

	return months.map((m) => map[m]);
}

export function computeAbsenteeism(
	leaves: LeaveSummary[],
	startDate: string,
	endDate: string,
): MonthlyAbsenteeismItem[] {
	const months = buildMonthlyBuckets(startDate, endDate);
	const map: Record<string, MonthlyAbsenteeismItem> = {};
	for (const m of months) {
		map[m] = {
			month: formatMonthLabel(m),
			VACATION: 0,
			SICK: 0,
			STUDY: 0,
			MATERNITY: 0,
			PATERNITY: 0,
			UNPAID: 0,
			OTHER: 0,
		};
	}

	for (const l of leaves) {
		if (l.status !== "APPROVED") continue;
		if (!inRange(l.startDate, startDate, endDate)) continue;
		const key = l.startDate.slice(0, 7);
		if (map[key] && LEAVE_TYPES.includes(l.type)) {
			map[key][l.type] += Number(l.daysRequested) || 0;
		}
	}

	return months.map((m) => map[m]);
}

export function computeCostByArea(
	employees: EmployeeWithEmployment[],
): CostByAreaItem[] {
	const map: Record<string, CostByAreaItem> = {};
	for (const e of employees) {
		if (e.employment?.status !== "ACTIVE") continue;
		const area = e.employment?.area?.trim() || "Sin área";
		const salary = Number(e.employment?.baseSalary ?? 0);
		if (!map[area]) map[area] = { area, total: 0, count: 0 };
		map[area].total += salary;
		map[area].count += 1;
	}
	return Object.values(map).sort((a, b) => b.total - a.total);
}

export function computeTenure(
	employees: EmployeeWithEmployment[],
): TenureBucketItem[] {
	const buckets: TenureBucketItem[] = [
		{ range: "< 1 año", count: 0 },
		{ range: "1-3 años", count: 0 },
		{ range: "3-5 años", count: 0 },
		{ range: "5-10 años", count: 0 },
		{ range: "+10 años", count: 0 },
	];
	const now = new Date();

	for (const e of employees) {
		const hire = e.employment?.hireDate;
		if (!hire || e.employment?.terminationDate) continue;
		const years = yearsBetween(hire, now);
		if (years < 1) buckets[0].count += 1;
		else if (years < 3) buckets[1].count += 1;
		else if (years < 5) buckets[2].count += 1;
		else if (years < 10) buckets[3].count += 1;
		else buckets[4].count += 1;
	}

	return buckets;
}
