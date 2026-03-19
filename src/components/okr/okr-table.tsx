"use client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	type OKRArea,
	type OKRItem,
	UNIDADES,
	type Unidad,
} from "@/types/okr-types";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { OKRTableRow } from "./okr-table-row";

interface OKRTableProps {
	items: OKRItem[];
	activeArea: OKRArea | null;
	onUpdateItem: (id: string, field: keyof OKRItem, value: unknown) => void;
	onAddItem: () => void;
	onDeleteItem: (id: string) => void;
}

export function OKRTable({
	items,
	activeArea,
	onUpdateItem,
	onAddItem,
	onDeleteItem,
}: OKRTableProps) {
	// Group items by unidad
	const groupedItems = UNIDADES.reduce(
		(acc, unidad) => {
			acc[unidad] = items.filter((item) => item.unidad === unidad);
			return acc;
		},
		{} as Record<Unidad, OKRItem[]>,
	);

	return (
		<div className="w-full">
			{activeArea && (
				<div className="mb-4 flex items-center gap-3 px-1">
					<div
						className="w-4 h-4 rounded-full"
						style={{ backgroundColor: activeArea.color }}
					/>
					<div>
						<h2 className="text-lg font-semibold text-foreground">
							{activeArea.nombre}
						</h2>
						{activeArea.descripcion && (
							<p className="text-sm text-muted-foreground">
								{activeArea.descripcion}
							</p>
						)}
					</div>
					<div className="ml-auto text-sm text-muted-foreground">
						{items.length} objetivo{items.length !== 1 ? "s" : ""}
					</div>
				</div>
			)}

			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
				<div className="w-full overflow-x-auto">
					<Table className="w-full min-w-[800px] table-fixed">
						<TableHeader className="bg-gray-50">
							<TableRow>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left"
								>
									Unidad
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left"
								>
									Prioridad
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left"
								>
									Categoría
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left min-w-[200px]"
								>
									Objetivos
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left min-w-[180px]"
								>
									Resultados Clave
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left min-w-[180px]"
								>
									Acciones Clave (Asana)
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left"
								>
									Responsable
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left"
								>
									Estado
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left w-[100px]"
								>
									Grado Avance
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left"
								>
									Fecha Objetivo
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-left w-[80px]"
								>
									Días Disp.
								</TableCell>
								<TableCell
									className="px-4 py-3 text-sm font-semibold text-gray-700 text-center w-[50px]"
								>
									Accion
								</TableCell>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.length === 0 ? (
								<TableRow key={"no-items"} className="hover:bg-gray-50">
									<TableCell
										colSpan={12}
										className="text-center py-12 text-muted-foreground"
									>
										<div className="flex flex-col items-center gap-2">
											<p>No hay objetivos en esta área</p>
											<Button
												onClick={onAddItem}
												variant="outline"
												className="gap-2 bg-transparent"
											>
												<Plus className="h-4 w-4" />
												Agregar primer objetivo
											</Button>
										</div>
									</TableCell>
								</TableRow>
							) : (
								UNIDADES.map((unidad) => {
									const unidadItems = groupedItems[unidad];
									if (unidadItems.length === 0) return null;

									return unidadItems.map((item, index) => (
										<OKRTableRow
											key={item.id}
											item={item}
											showUnidad={index === 0}
											rowSpan={unidadItems.length}
											onUpdate={onUpdateItem}
											onDelete={onDeleteItem}
										/>
									));
								})
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{items.length > 0 && (
				<div className="mt-4 flex justify-start">
					<Button
						onClick={onAddItem}
						variant="outline"
						className="gap-2 border-border bg-secondary hover:bg-muted"
					>
						<Plus className="h-4 w-4" />
						Agregar Objetivo
					</Button>
				</div>
			)}
		</div>
	);
}
