import type React from "react";
import { cn } from "@/lib/utils";
import { CircleIcon } from "lucide-react";

interface RadioProps {
	id: string; // Unique ID for the radio button
	name: string; // Radio group name
	value: string; // Value of the radio button
	checked: boolean; // Whether the radio button is checked
	label: string; // Label for the radio button
	onChange: (value: string) => void; // Handler for value change
	className?: string; // Optional additional classes
	disabled?: boolean; // Optional disabled state for the radio button
}

const Radio: React.FC<RadioProps> = ({
	id,
	name,
	value,
	checked,
	label,
	onChange,
	className = "",
	disabled = false,
}) => {
	return (
		<label
			htmlFor={id}
			className={cn(
				"relative flex cursor-pointer select-none items-center gap-3 text-sm font-medium",
				disabled
					? "cursor-not-allowed text-muted-foreground opacity-50"
					: "text-foreground",
				className,
			)}
		>
			<input
				id={id}
				name={name}
				type="radio"
				value={value}
				checked={checked}
				onChange={() => !disabled && onChange(value)}
				className="sr-only"
				disabled={disabled}
			/>
			<span
				className={cn(
					"flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border shadow-xs transition-[color,box-shadow]",
					checked
						? "border-primary bg-primary text-primary-foreground"
						: "border-input bg-transparent dark:bg-input/30",
					disabled && "cursor-not-allowed opacity-50",
				)}
			>
				{checked && (
					<CircleIcon className="size-2 fill-white text-white" />
				)}
			</span>
			{label}
		</label>
	);
};

export default Radio;
