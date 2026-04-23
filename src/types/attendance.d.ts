export type AttendanceState =
	| "NEEDS_CHECK_IN"
	| "WORKING"
	| "PAUSED"
	| "COMPLETED"
	| "NO_EMPLOYMENT";

export type AttendanceAction = "check-in" | "pause" | "resume" | "check-out";

export interface AttendanceRecord {
	id: number;
	userId: number;
	checkIn: string;
	checkOut: string | null;
	pausedAt: string | null;
	pauseSecs: number;
	durationSecs: number | null;
	overtimeSecs: number | null;
	source: string;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface MyAttendanceStatus {
	state: AttendanceState;
	currentRecord: AttendanceRecord | null;
}
