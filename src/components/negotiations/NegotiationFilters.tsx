"use client";

import { ChevronDown, Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface FilterState {
	searchTerm: string;
	abogadoInterno: string;
	abogadoContraparte: string;
	lesion: string;
	estado: string;
	rangoMonto: {
		min: string;
		max: string;
	};
}

interface NegotiationFiltersProps {
	onFiltersChange: (filters: FilterState) => void;
	onClearFilters: () => void;
	totalResults: number;
	filteredResults: number;
	uniqueValues: {
		abogadosInternos: string[];
		abogadosContraparte: string[];
		lesiones: string[];
	};
}

export function NegotiationFilters({
	onFiltersChange,
	onClearFilters,
	totalResults,
	filteredResults,
	uniqueValues,
}: NegotiationFiltersProps) {
	const [filters, setFilters] = useState<FilterState>({
		searchTerm: "",
		abogadoInterno: "",
		abogadoContraparte: "",
		lesion: "",
		estado: "",
		rangoMonto: { min: "", max: "" },
	});
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

	const handleFilterChange = (key: keyof FilterState, value: any) => {
		const newFilters = { ...filters, [key]: value === "all" ? "" : value };
		setFilters(newFilters);
		onFiltersChange(newFilters);
	};

	const handleRangeChange = (type: "min" | "max", value: string) => {
		const newRange = { ...filters.rangoMonto, [type]: value };
		const newFilters = { ...filters, rangoMonto: newRange };
		setFilters(newFilters);
		onFiltersChange(newFilters);
	};

	const handleClearFilters = () => {
		const defaultFilters: FilterState = {
			searchTerm: "",
			abogadoInterno: "",
			abogadoContraparte: "",
			lesion: "",
			estado: "",
			rangoMonto: { min: "", max: "" },
		};
		setFilters(defaultFilters);
		onFiltersChange(defaultFilters);
		onClearFilters();
	};

	const hasActiveFilters = Object.values(filters).some((value) => {
		if (typeof value === "object" && value !== null) {
			return Object.values(value).some((v) => v !== "");
		}
		return value !== "";
	});

	return (
		<div className="rounded-lg border p-4 mb-6">
			{/* Search */}
			<div className="flex flex-col lg:flex-row gap-4 mb-4">
				<div className="flex-1 relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-1" />
					<Input
						placeholder="Buscar por causa, expediente, abogado o lesión..."
						value={filters.searchTerm}
						onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
						className="pl-10"
					/>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
						className="whitespace-nowrap"
					>
						<Filter className="w-4 h-4 mr-2" />
						Filtros Avanzados
						<ChevronDown
							className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
						/>
					</Button>
					{hasActiveFilters && (
						<Button
							variant="ghost"
							onClick={handleClearFilters}
							className="whitespace-nowrap text-destructive hover:text-destructive"
						>
							<X className="w-4 h-4 mr-1" />
							Limpiar
						</Button>
					)}
				</div>
			</div>

			{/* Advanced filters */}
			{showAdvancedFilters && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
					<div className="space-y-2">
						<Label>Abogado Interno</Label>
						<Select
							value={filters.abogadoInterno || "all"}
							onValueChange={(value) =>
								handleFilterChange("abogadoInterno", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todos</SelectItem>
								{uniqueValues.abogadosInternos.map((abogado) => (
									<SelectItem key={abogado} value={abogado}>
										{abogado}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Abogado Contraparte</Label>
						<Select
							value={filters.abogadoContraparte || "all"}
							onValueChange={(value) =>
								handleFilterChange("abogadoContraparte", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todos</SelectItem>
								{uniqueValues.abogadosContraparte.map((abogado) => (
									<SelectItem key={abogado} value={abogado}>
										{abogado}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Tipo de Lesión</Label>
						<Select
							value={filters.lesion || "all"}
							onValueChange={(value) => handleFilterChange("lesion", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Todas" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todas</SelectItem>
								{uniqueValues.lesiones.map((lesion) => (
									<SelectItem key={lesion} value={lesion}>
										{lesion}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Rango de Monto</Label>
						<div className="flex gap-2">
							<Input
								type="number"
								placeholder="Min"
								value={filters.rangoMonto.min}
								onChange={(e) => handleRangeChange("min", e.target.value)}
							/>
							<Input
								type="number"
								placeholder="Max"
								value={filters.rangoMonto.max}
								onChange={(e) => handleRangeChange("max", e.target.value)}
							/>
						</div>
					</div>
				</div>
			)}

			{/* Result count */}
			<div className="flex justify-between items-center mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
				<span>
					Mostrando {filteredResults} de {totalResults} negociaciones
				</span>
				{hasActiveFilters && (
					<span className="text-primary font-medium">
						Filtros activos aplicados
					</span>
				)}
			</div>
		</div>
	);
}
