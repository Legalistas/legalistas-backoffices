"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/blog/slugify";
import type { PostTerm } from "@/types/blog";

interface CategoryTagInputProps {
	label: string;
	value: PostTerm[];
	onChange: (terms: PostTerm[]) => void;
	suggestions?: PostTerm[];
	placeholder?: string;
}

export function CategoryTagInput({
	label,
	value,
	onChange,
	suggestions = [],
	placeholder = "Agregar...",
}: CategoryTagInputProps) {
	const [draft, setDraft] = useState("");
	const selectedSlugs = new Set(value.map((v) => v.slug));

	const filteredSuggestions = draft
		? suggestions.filter(
				(s) =>
					!selectedSlugs.has(s.slug) &&
					s.name.toLowerCase().includes(draft.toLowerCase()),
			)
		: [];

	const addTerm = (name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const slug = slugify(trimmed);
		if (selectedSlugs.has(slug)) {
			setDraft("");
			return;
		}
		// Si el nombre matchea una sugerencia, reusa su id.
		const existing = suggestions.find(
			(s) => s.slug === slug || s.name.toLowerCase() === trimmed.toLowerCase(),
		);
		const term: PostTerm = existing
			? existing
			: {
					id: -Date.now(), // id temporal negativo para distinguir de los del backend
					name: trimmed,
					slug,
				};
		onChange([...value, term]);
		setDraft("");
	};

	const removeTerm = (slug: string) => {
		onChange(value.filter((t) => t.slug !== slug));
	};

	return (
		<div className="space-y-1.5">
			<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
				{label}
			</label>

			<div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3">
				{value.map((term) => (
					<span
						key={term.slug}
						className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs"
					>
						{term.name}
						<button
							type="button"
							onClick={() => removeTerm(term.slug)}
							className="hover:text-red-500"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
				<div className="relative flex-1 min-w-[120px]">
					<Input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === ",") {
								e.preventDefault();
								addTerm(draft);
							}
							if (e.key === "Backspace" && !draft && value.length > 0) {
								removeTerm(value[value.length - 1].slug);
							}
						}}
						placeholder={placeholder}
						className="h-7 border-0 px-1 shadow-none focus-visible:ring-0"
					/>
					{filteredSuggestions.length > 0 && (
						<div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-20">
							{filteredSuggestions.slice(0, 8).map((s) => (
								<button
									key={s.slug}
									type="button"
									onClick={() => addTerm(s.name)}
									className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between"
								>
									<span>{s.name}</span>
									<Plus className="h-3.5 w-3.5 text-gray-400" />
								</button>
							))}
						</div>
					)}
				</div>
			</div>
			<p className="text-[11px] text-gray-400">
				Enter o coma para agregar. Backspace en vacío para quitar el último.
			</p>
		</div>
	);
}
