"use client";

import type React from "react";
import {
	Select as ShadcnSelect,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface SelectProps {
	options: Array<{
		value: string;
		label: string;
	}>;
	placeholder?: string;
	onValueChange: (value: string) => void;
	className?: string;
	defaultValue?: string;
	value?: string;
	id?: string;
	name?: string;
	disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
	options,
	placeholder = "Seleccionar...",
	onValueChange,
	className = "",
	defaultValue = "",
	value,
	disabled,
}) => {
	return (
		<ShadcnSelect
			value={value}
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			disabled={disabled}
		>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</ShadcnSelect>
	);
};

export default Select;
