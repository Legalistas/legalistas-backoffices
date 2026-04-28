"use client";

import { Loader2, LogOut, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	computeWorkedSecs,
	formatHMS,
	useAttendance,
} from "@/context/AttendanceContext";

export default function AttendanceHeaderIndicator() {
	const { state, record, submitting, doAction } = useAttendance();

	if (state !== "WORKING" || !record) return null;

	const workedSecs = computeWorkedSecs(record);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					title={`Trabajando ${formatHMS(workedSecs)}`}
					className="flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
				>
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
					</span>
					<span className="tabular-nums">{formatHMS(workedSecs)}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 p-3">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<span className="relative flex h-2.5 w-2.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
							<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
						</span>
						<div>
							<div className="text-xs text-muted-foreground leading-none">
								Trabajando
							</div>
							<div className="text-lg font-semibold tabular-nums">
								{formatHMS(workedSecs)}
							</div>
						</div>
					</div>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							className="flex-1"
							disabled={submitting}
							onClick={() => doAction("pause")}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Pause className="h-4 w-4 mr-2" />
							)}
							Pausar
						</Button>
						<Button
							size="sm"
							variant="outline"
							className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
							disabled={submitting}
							onClick={() => {
								if (confirm("¿Registrar salida y cerrar el día?")) {
									doAction("check-out");
								}
							}}
						>
							<LogOut className="h-4 w-4 mr-2" />
							Salir
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
