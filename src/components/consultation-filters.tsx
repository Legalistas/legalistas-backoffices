"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

export function ConsultationFilters() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const currentSearch = searchParams.get("search") || "";
	const [searchQuery, setSearchQuery] = useState(currentSearch);
	const debouncedSearchQuery = useDebounce(searchQuery, 400);

	useEffect(() => {
		setSearchQuery(currentSearch);
	}, [currentSearch]);

	useEffect(() => {
		if (debouncedSearchQuery !== currentSearch) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("page", "1");
			if (debouncedSearchQuery) {
				params.set("search", debouncedSearchQuery);
			} else {
				params.delete("search");
			}
			router.push(`/admin/consultations?${params.toString()}`);
		}
	}, [debouncedSearchQuery, currentSearch, router, searchParams]);

	const handleClear = useCallback(() => {
		setSearchQuery("");
		const params = new URLSearchParams(searchParams.toString());
		params.delete("search");
		params.set("page", "1");
		router.push(`/admin/consultations?${params.toString()}`);
	}, [router, searchParams]);

	return (
		<div className="relative w-full md:max-w-md">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				placeholder="Buscar por título o caso..."
				className="pl-9 pr-9"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				aria-label="Buscar consultas"
			/>
			{searchQuery && (
				<Button
					variant="ghost"
					size="icon"
					onClick={handleClear}
					className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
					aria-label="Limpiar búsqueda"
				>
					<X className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}
