"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { PostFiltersState, PostTerm } from "@/types/blog";

interface BlogFiltersProps {
	filters: PostFiltersState;
	onFiltersChange: (filters: PostFiltersState) => void;
	categories: PostTerm[];
}

export function BlogFilters({
	filters,
	onFiltersChange,
	categories,
}: BlogFiltersProps) {
	const [localSearch, setLocalSearch] = useState(filters.search);

	// Debounce search 400ms.
	useEffect(() => {
		const t = setTimeout(() => {
			if (localSearch !== filters.search) {
				onFiltersChange({ ...filters, search: localSearch });
			}
		}, 400);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localSearch]);

	const hasActive =
		filters.search ||
		filters.status !== "any" ||
		filters.category ||
		filters.tag;

	const clear = () => {
		setLocalSearch("");
		onFiltersChange({
			search: "",
			status: "any",
			category: "",
			tag: "",
			orderby: "date",
			order: "desc",
		});
	};

	return (
		<div className="flex flex-wrap items-center gap-3 bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-gray-800 p-3 shadow-sm">
			<div className="relative flex-1 min-w-[220px]">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<Input
					type="search"
					placeholder="Buscar por título, extracto o contenido..."
					value={localSearch}
					onChange={(e) => setLocalSearch(e.target.value)}
					className="h-10 pl-9"
				/>
			</div>

			<Select
				value={filters.status}
				onValueChange={(v) =>
					onFiltersChange({
						...filters,
						status: v as PostFiltersState["status"],
					})
				}
			>
				<SelectTrigger className="h-10 w-40">
					<SelectValue placeholder="Estado" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="any">Todos los estados</SelectItem>
					<SelectItem value="publish">Publicados</SelectItem>
					<SelectItem value="draft">Borradores</SelectItem>
					<SelectItem value="future">Programados</SelectItem>
				</SelectContent>
			</Select>

			<Select
				value={filters.category || "all"}
				onValueChange={(v) =>
					onFiltersChange({ ...filters, category: v === "all" ? "" : v })
				}
			>
				<SelectTrigger className="h-10 w-52">
					<SelectValue placeholder="Categoría" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todas las categorías</SelectItem>
					{categories.map((c) => (
						<SelectItem key={c.id} value={c.slug}>
							{c.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={`${filters.orderby}:${filters.order}`}
				onValueChange={(v) => {
					const [orderby, order] = v.split(":") as [
						PostFiltersState["orderby"],
						PostFiltersState["order"],
					];
					onFiltersChange({ ...filters, orderby, order });
				}}
			>
				<SelectTrigger className="h-10 w-44">
					<SelectValue placeholder="Orden" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="date:desc">Más nuevos primero</SelectItem>
					<SelectItem value="date:asc">Más viejos primero</SelectItem>
					<SelectItem value="modified:desc">Última modificación</SelectItem>
				</SelectContent>
			</Select>

			{hasActive && (
				<button
					onClick={clear}
					className="flex items-center gap-1 h-10 px-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
				>
					<X className="h-3.5 w-3.5" />
					Limpiar
				</button>
			)}
		</div>
	);
}
