"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FilterOption {
	value: string | number;
	label: string;
}

interface FilterComboboxProps {
	icon?: React.ComponentType<{ className?: string }>;
	placeholder: string;
	searchPlaceholder?: string;
	options: FilterOption[];
	value: string | number | undefined;
	onSelect: (value: string | number | undefined) => void;
	loading?: boolean;
	className?: string;
}

export default function FilterCombobox({
	icon: Icon,
	placeholder,
	searchPlaceholder,
	options,
	value,
	onSelect,
	loading = false,
	className,
}: FilterComboboxProps) {
	const [open, setOpen] = useState(false);

	const selectedLabel = options.find((o) => o.value === value)?.label;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("h-10 w-[180px] justify-between font-normal bg-white dark:bg-background", className)}
				>
					<span className="flex items-center gap-2 truncate">
						{Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
						<span className="truncate">
							{selectedLabel || placeholder}
						</span>
					</span>
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[220px] p-0" align="start">
				<Command>
					<CommandInput placeholder={searchPlaceholder || `Buscar...`} />
					<CommandList>
						<CommandEmpty>Sin resultados.</CommandEmpty>
						<CommandGroup>
							<CommandItem
								value="__all__"
								onSelect={() => {
									onSelect(undefined);
									setOpen(false);
								}}
							>
								<Check
									className={cn(
										"mr-2 size-4",
										value === undefined ? "opacity-100" : "opacity-0",
									)}
								/>
								Todos
							</CommandItem>
							{loading ? (
								<CommandItem disabled>Cargando...</CommandItem>
							) : (
								options.map((option) => (
									<CommandItem
										key={String(option.value)}
										value={option.label}
										onSelect={() => {
											onSelect(
												option.value === value ? undefined : option.value,
											);
											setOpen(false);
										}}
									>
										<Check
											className={cn(
												"mr-2 size-4",
												value === option.value
													? "opacity-100"
													: "opacity-0",
											)}
										/>
										{option.label}
									</CommandItem>
								))
							)}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
