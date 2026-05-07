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
import { Switch } from "@/components/ui/switch";

export interface FilterState {
	searchTerm: string;
	abogadoRepresentante: string;
	abogadoInterno: string;
	abogadoContraparte: string;
	lesion: string;
	estado: string;
	showFinalizadas: boolean;
	rangoMonto: {
		min: string;
		max: string;
	};
}

export const EMPTY_FILTERS: FilterState = {
	searchTerm: "",
	abogadoRepresentante: "",
	abogadoInterno: "",
	abogadoContraparte: "",
	lesion: "",
	estado: "",
	showFinalizadas: false,
	rangoMonto: { min: "", max: "" },
};

interface NegotiationFiltersProps {
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
	onClearFilters: () => void;
	totalResults: number;
	filteredResults: number;
	uniqueValues: {
		abogadosRepresentantes: string[];
		abogadosInternos: string[];
		abogadosContraparte: string[];
		lesiones: string[];
	};
}

export function NegotiationFilters({
	filters,
	onFiltersChange,
	onClearFilters,
	totalResults,
	filteredResults,
	uniqueValues,
}: NegotiationFiltersProps) {
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

	const handleFilterChange = (key: keyof FilterState, value: any) => {
		onFiltersChange({ ...filters, [key]: value === "all" ? "" : value });
	};

	const handleRangeChange = (type: "min" | "max", value: string) => {
		onFiltersChange({
			...filters,
			rangoMonto: { ...filters.rangoMonto, [type]: value },
		});
	};

	const hasActiveFilters =
		filters.searchTerm !== "" ||
		filters.abogadoRepresentante !== "" ||
		filters.abogadoInterno !== "" ||
		filters.abogadoContraparte !== "" ||
		filters.lesion !== "" ||
		filters.estado !== "" ||
		filters.showFinalizadas !== false ||
		filters.rangoMonto.min !== "" ||
		filters.rangoMonto.max !== "";

	return (
		<div className="rounded-lg border p-4">
			{/* Search + Representante (acceso rápido) */}
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
				<div className="lg:w-56">
					<Select
						value={filters.estado || "all"}
						onValueChange={(value) => handleFilterChange("estado", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Estado" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos los estados</SelectItem>
							<SelectItem value="INICIAR">Iniciar</SelectItem>
							<SelectItem value="CURSO">En Curso</SelectItem>
							<SelectItem value="SUSPENSO">Suspenso</SelectItem>
							<SelectItem value="FINALIZADAS">Finalizadas</SelectItem>
							<SelectItem value="PERDIDAS">Perdidas</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="lg:w-72">
					<Select
						value={filters.abogadoRepresentante || "all"}
						onValueChange={(value) =>
							handleFilterChange("abogadoRepresentante", value)
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Abogado Representante" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos los representantes</SelectItem>
							{uniqueValues.abogadosRepresentantes.map((abogado) => (
								<SelectItem key={abogado} value={abogado}>
									{abogado}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-3">
					<label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap cursor-pointer select-none">
						<Switch
							checked={filters.showFinalizadas}
							onCheckedChange={(checked) =>
								handleFilterChange("showFinalizadas", checked === true)
							}
						/>
						Mostrar finalizadas
					</label>
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
							onClick={onClearFilters}
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
