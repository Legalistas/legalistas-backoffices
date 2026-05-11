"use client";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Input combinado de fecha + hora con minutos restringidos a 00, 15, 30, 45.
 * Reemplaza `<input type="datetime-local">` cuando se programan reuniones.
 *
 * `value` y `onChange` usan el formato `YYYY-MM-DDTHH:mm`. Si llega un valor
 * con minutos fuera de los 15-min steps, se redondea al más cercano al mostrarlo.
 */

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];

const TIME_OPTIONS: string[] = HOURS.flatMap((h) =>
	MINUTES.map(
		(m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
	),
);

function roundToQuarter(time: string): string {
	if (!time) return "";
	const [hStr, mStr] = time.split(":");
	const h = Number(hStr);
	const m = Number(mStr);
	if (Number.isNaN(h) || Number.isNaN(m)) return "";
	const rounded = Math.round(m / 15) * 15;
	if (rounded === 60) {
		const nextH = (h + 1) % 24;
		return `${String(nextH).padStart(2, "0")}:00`;
	}
	return `${String(h).padStart(2, "0")}:${String(rounded).padStart(2, "0")}`;
}

interface DateTimeQuarterInputProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	required?: boolean;
	className?: string;
	timeClassName?: string;
	defaultTime?: string;
}

export function DateTimeQuarterInput({
	id,
	value,
	onChange,
	disabled,
	required,
	className,
	timeClassName,
	defaultTime = "09:00",
}: DateTimeQuarterInputProps) {
	const [datePart, rawTime] = value && value.includes("T")
		? value.split("T")
		: [value || "", ""];
	const timePart = roundToQuarter(rawTime.slice(0, 5));

	const update = (nextDate: string, nextTime: string) => {
		if (!nextDate) {
			onChange("");
			return;
		}
		const finalTime = nextTime || defaultTime;
		onChange(`${nextDate}T${finalTime}`);
	};

	return (
		<div className={cn("flex gap-2", className)}>
			<Input
				id={id}
				type="date"
				value={datePart}
				disabled={disabled}
				required={required}
				onChange={(e) => update(e.target.value, timePart)}
				className="flex-1"
			/>
			<Select
				value={timePart}
				onValueChange={(v) => update(datePart, v)}
				disabled={disabled}
			>
				<SelectTrigger className={cn("w-28", timeClassName)}>
					<SelectValue placeholder="Hora" />
				</SelectTrigger>
				<SelectContent className="max-h-72">
					{TIME_OPTIONS.map((t) => (
						<SelectItem key={t} value={t}>
							{t}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
