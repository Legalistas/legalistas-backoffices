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

	// Get current values from URL params
	const currentSearch = searchParams.get("search") || "";
	const currentStatus = searchParams.get("status") || "all";

	const [searchQuery, setSearchQuery] = useState(currentSearch);
	const debouncedSearchQuery = useDebounce(searchQuery, 500);

	// Update local state when URL params change
	useEffect(() => {
		setSearchQuery(currentSearch);
	}, [currentSearch]);

	const handleStatusChange = useCallback(
		(value: string) => {
			const currentParams = new URLSearchParams(searchParams.toString());

			// Reset to page 1 when filtering
			currentParams.set("page", "1");

			if (value === "all") {
				currentParams.delete("status");
			} else {
				currentParams.set("status", value);
			}

			router.push(`/admin/consultations?${currentParams.toString()}`);
		},
		[router, searchParams],
	);

	useEffect(() => {
		// Only update if the debounced query is different from current URL param
		if (debouncedSearchQuery !== currentSearch) {
			const currentParams = new URLSearchParams(searchParams.toString());

			// Reset to page 1 when searching
			currentParams.set("page", "1");

			if (debouncedSearchQuery) {
				currentParams.set("search", debouncedSearchQuery);
			} else {
				currentParams.delete("search");
			}

			router.push(`/admin/consultations?${currentParams.toString()}`);
		}
	}, [debouncedSearchQuery, currentSearch, router, searchParams]);

	const handleClearFilters = useCallback(() => {
		// Limpiar el estado local inmediatamente
		setSearchQuery("");

		// Navegar a la URL limpia (sin parámetros)
		router.push("/admin/consultations");

		// Force refresh para asegurar que se recarguen los datos
		window.location.href = "/admin/consultations";
	}, [router]);

	return (
		<div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
			<div className="relative w-full md:max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Buscar por título o caso..."
					className="pl-9 pr-4"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					aria-label="Buscar consultas"
				/>
			</div>
			<select
				value={currentStatus}
				onChange={(e) => handleStatusChange(e.target.value)}
				className="w-full md:w-[180px] bg-background border border-border rounded-md text-sm p-2.5 outline-none focus-visible:ring ring-primary transition"
			>
				<option value="all">Todos los estados</option>
				<option value="PENDING">Pendiente</option>
				<option value="OPEN">Abierta</option>
				<option value="CLOSED">Cerrada</option>
			</select>
			{(searchQuery || currentStatus !== "all") && (
				<Button
					variant="ghost"
					onClick={handleClearFilters}
					className="w-full md:w-auto"
				>
					<X className="h-4 w-4 mr-2" />
					Limpiar filtros
				</Button>
			)}
		</div>
	);
}
