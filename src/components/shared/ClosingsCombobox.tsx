"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ClosingOption {
	id: number;
	number?: number | null;
	title?: string | null;
	date: string;
}

interface ClosingsComboboxProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: ClosingOption[];
	placeholder?: string;
}

function formatLabel(c: ClosingOption) {
	const fecha = new Date(c.date).toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
	return `#${c.number ?? c.id} – ${c.title ?? "Sin título"} (${fecha})`;
}

export function ClosingsCombobox({
	id,
	value,
	onChange,
	options,
	placeholder = "Buscar cierre...",
}: ClosingsComboboxProps) {
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);
	const [highlighted, setHighlighted] = useState(0);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const selected = useMemo(
		() => options.find((o) => String(o.id) === value),
		[options, value],
	);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return options;
		return options.filter((o) => formatLabel(o).toLowerCase().includes(q));
	}, [options, search]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(e.target as Node)
			) {
				setOpen(false);
				setSearch("");
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = (opt: ClosingOption) => {
		onChange(String(opt.id));
		setOpen(false);
		setSearch("");
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange("");
		setSearch("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlighted((h) => Math.max(h - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (filtered[highlighted]) handleSelect(filtered[highlighted]);
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	};

	return (
		<div ref={wrapperRef} className="relative">
			{!open && selected ? (
				<button
					type="button"
					id={id}
					onClick={() => {
						setOpen(true);
						setTimeout(() => inputRef.current?.focus(), 0);
					}}
					className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm"
				>
					<span className="truncate text-left">{formatLabel(selected)}</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={handleClear}
							className="text-muted-foreground hover:text-foreground"
							aria-label="Quitar cierre"
						>
							<X className="h-4 w-4" />
						</button>
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					</div>
				</button>
			) : (
				<Input
					ref={inputRef}
					id={id}
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setOpen(true);
						setHighlighted(0);
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={handleKeyDown}
					placeholder={selected ? formatLabel(selected) : placeholder}
				/>
			)}

			{open && (
				<div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-popover py-1 shadow-lg">
					<div
						className="cursor-pointer px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
						onClick={() => {
							onChange("");
							setOpen(false);
							setSearch("");
						}}
					>
						Sin cierre asociado
					</div>
					{filtered.length === 0 ? (
						<div className="px-3 py-2 text-sm text-muted-foreground">
							Sin resultados
						</div>
					) : (
						filtered.map((opt, idx) => {
							const isSelected = String(opt.id) === value;
							const isHighlighted = idx === highlighted;
							return (
								<div
									key={opt.id}
									className={cn(
										"flex cursor-pointer items-center justify-between px-3 py-2 text-sm",
										isHighlighted
											? "bg-accent text-accent-foreground"
											: "hover:bg-accent",
										isSelected && "font-medium",
									)}
									onMouseEnter={() => setHighlighted(idx)}
									onClick={() => handleSelect(opt)}
								>
									<span className="truncate">{formatLabel(opt)}</span>
									{isSelected && <Check className="h-4 w-4 text-primary" />}
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}
