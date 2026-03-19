"use client";

import { Check, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AREA_COLORS, type OKRArea } from "@/types/okr-types";

interface AreaTabsProps {
	areas: OKRArea[];
	activeAreaId: string | null;
	onSelectArea: (areaId: string | null) => void;
	onAddArea: (area: Omit<OKRArea, "id" | "orden">) => void;
	onUpdateArea: (id: string, data: Partial<OKRArea>) => void;
	onDeleteArea: (id: string) => void;
}

export function AreaTabs({
	areas,
	activeAreaId,
	onSelectArea,
	onAddArea,
	onUpdateArea,
	onDeleteArea,
}: AreaTabsProps) {
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [newAreaName, setNewAreaName] = useState("");
	const [newAreaColor, setNewAreaColor] = useState(AREA_COLORS[0]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");

	const handleAddArea = () => {
		if (newAreaName.trim()) {
			onAddArea({
				nombre: newAreaName.trim(),
				color: newAreaColor,
				activo: true,
			});
			setNewAreaName("");
			setNewAreaColor(AREA_COLORS[0]);
			setIsAddDialogOpen(false);
		}
	};

	const startEditing = (area: OKRArea) => {
		setEditingId(area.id);
		setEditingName(area.nombre);
	};

	const saveEditing = () => {
		if (editingId && editingName.trim()) {
			onUpdateArea(editingId, { nombre: editingName.trim() });
		}
		setEditingId(null);
		setEditingName("");
	};

	return (
		<div className="flex items-center gap-2 border-b border-border bg-transparent px-2">
			{/* Tab "Todas" */}
			<button
				onClick={() => onSelectArea(null)}
				className={cn(
					"flex items-center gap-2 px-4 py-2 text-base font-semibold rounded-lg transition-colors whitespace-nowrap border-none shadow-none bg-gray-100 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]",
					activeAreaId === null
						? "bg-primary text-white shadow-md"
						: "text-gray-700",
				)}
			>
				Todas las Áreas
			</button>

			{/* Tabs de áreas */}
			{areas.map((area) => (
				<div
					key={area.id}
					className={cn(
						"group flex items-center gap-1 px-3 py-2 text-base font-semibold rounded-lg transition-colors whitespace-nowrap border-none shadow-none",
						activeAreaId === area.id
							? "bg-primary text-white shadow-md"
							: "text-gray-700 bg-gray-100 hover:bg-primary/10",
					)}
				>
					<div
						className="w-2.5 h-2.5 rounded-full shrink-0 mr-1"
						style={{ backgroundColor: area.color }}
					/>

					{editingId === area.id ? (
						<div className="flex items-center gap-1">
							<Input
								value={editingName}
								onChange={(e) => setEditingName(e.target.value)}
								className="h-6 w-24 text-xs"
								onKeyDown={(e) => e.key === "Enter" && saveEditing()}
							/>
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5"
								onClick={saveEditing}
							>
								<Check className="h-3 w-3" />
							</Button>
						</div>
					) : (
						<>
							<button
								onClick={() => onSelectArea(area.id)}
								className="focus:outline-none"
							>
								{area.nombre}
							</button>

							<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
								<Button
									variant="ghost"
									size="icon"
									className="h-5 w-5 text-muted-foreground hover:text-foreground"
									onClick={() => {
										startEditing(area);
									}}
								>
									<Pencil className="h-3 w-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-5 w-5 text-muted-foreground hover:text-destructive"
									onClick={() => {
										onDeleteArea(area.id);
									}}
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						</>
					)}
				</div>
			))}

			{/* Botón agregar área */}
			<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
				<DialogTrigger asChild>
					<Button
						variant="ghost"
						className="gap-1.5 text-muted-foreground hover:text-foreground ml-1"
					>
						<Plus className="h-4 w-4" />
						Nueva Área
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Crear Nueva Área</DialogTitle>
						<DialogDescription className="sr-only">Formulario para crear una nueva área de OKR</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Nombre del Área</label>
							<Input
								value={newAreaName}
								onChange={(e) => setNewAreaName(e.target.value)}
								placeholder="Ej: Marketing, Ventas, Desarrollo..."
								onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Color</label>
							<div className="flex gap-2 flex-wrap">
								{AREA_COLORS.map((color) => (
									<button
										key={color}
										onClick={() => setNewAreaColor(color)}
										className={cn(
											"w-8 h-8 rounded-full transition-all",
											newAreaColor === color
												? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
												: "hover:scale-105",
										)}
										style={{ backgroundColor: color }}
									/>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleAddArea} disabled={!newAreaName.trim()}>
							Crear Área
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
