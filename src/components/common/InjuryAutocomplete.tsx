"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { INJURY_CATALOG } from "@/constant/injuries";
import { cn } from "@/lib/utils";

interface InjuryAutocompleteProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

// Rango Unicode "Combining Diacritical Marks" (0x0300–0x036F): lo que queda
// suelto tras descomponer un carácter acentuado con NFD (ej. "é" -> "e" + ´).
const COMBINING_MARK_MIN = 0x0300;
const COMBINING_MARK_MAX = 0x036f;

// Sin tildes/diacríticos y en minúsculas — "medico" debe encontrar "médico".
function normalize(text: string): string {
	let result = "";
	for (const ch of text.normalize("NFD")) {
		const code = ch.codePointAt(0) ?? 0;
		if (code < COMBINING_MARK_MIN || code > COMBINING_MARK_MAX) result += ch;
	}
	return result.toLowerCase();
}

export default function InjuryAutocomplete({
	id,
	value,
	onChange,
	placeholder,
}: InjuryAutocompleteProps) {
	const [open, setOpen] = useState(false);

	// Escribir el nombre de una categoría (ej. "Rodilla") muestra todas sus
	// lesiones; escribir el nombre de una lesión puntual filtra solo esa.
	const groups = useMemo(() => {
		const query = normalize(value.trim());
		if (!query) return INJURY_CATALOG;
		return INJURY_CATALOG.map((group) => {
			const categoryMatches = normalize(group.category).includes(query);
			const items = categoryMatches
				? group.items
				: group.items.filter((item) => normalize(item).includes(query));
			return { ...group, items };
		}).filter((group) => group.items.length > 0);
	}, [value]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<Input
					id={id}
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onFocus={() => setOpen(true)}
					onClick={() => setOpen(true)}
					autoComplete="off"
				/>
			</PopoverAnchor>
			{/* Portado fuera del modal (Radix Popover.Portal): así el listado no
			    se recorta contra el overflow del Dialog cuando el campo está
			    cerca del borde inferior. */}
			<PopoverContent
				className="w-(--radix-popover-trigger-width) p-0"
				align="start"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<div
					className="max-h-96 overflow-y-auto"
					onWheel={(e) => e.stopPropagation()}
				>
					{groups.length === 0 ? (
						<div className="p-3 text-sm text-muted-foreground">
							Sin coincidencias — se guardará el texto que escribas.
						</div>
					) : (
						groups.map((group) => (
							<div key={group.category}>
								<div className="sticky top-0 bg-muted/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
									{group.category}
								</div>
								{group.items.map((item) => (
									<div
										key={item}
										className={cn(
											"flex cursor-pointer items-center px-3 py-2.5 text-sm transition-colors hover:bg-muted",
											value === item && "bg-primary/5 font-medium",
										)}
										// onMouseDown (no onClick): se dispara antes del blur del
										// input, así el click se registra sin que el popover ya
										// se haya cerrado.
										onMouseDown={(e) => {
											e.preventDefault();
											onChange(item);
											setOpen(false);
										}}
									>
										{value === item && (
											<Check className="mr-1.5 size-3.5 shrink-0 text-primary" />
										)}
										{item}
									</div>
								))}
							</div>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
