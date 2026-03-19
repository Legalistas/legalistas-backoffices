"use client";

import { Eye, EyeOff, RotateCcw, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface ColumnConfig {
	id: string;
	label: string;
	visible: boolean;
	required?: boolean;
}

interface ColumnSelectorProps {
	columns: ColumnConfig[];
	onColumnsChange: (columns: ColumnConfig[]) => void;
	storageKey: string;
}

export function ColumnSelector({
	columns,
	onColumnsChange,
	storageKey,
}: ColumnSelectorProps) {
	const [showSelector, setShowSelector] = useState(false);
	const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
	const isInitialMount = useRef(true);

	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			try {
				const saved = localStorage.getItem(storageKey);
				if (saved) {
					const savedColumns: ColumnConfig[] = JSON.parse(saved);
					const mergedColumns = columns.map((col) => {
						const savedCol = savedColumns.find((s) => s.id === col.id);
						return savedCol ? { ...col, visible: savedCol.visible } : col;
					});
					setLocalColumns(mergedColumns);
					onColumnsChange(mergedColumns);
				}
			} catch (error) {
				console.error("Error loading column configuration:", error);
			}
		}
	}, []);

	const saveToStorage = (newColumns: ColumnConfig[]) => {
		try {
			localStorage.setItem(storageKey, JSON.stringify(newColumns));
		} catch (error) {
			console.error("Error saving column configuration:", error);
		}
	};

	const updateColumns = (updatedColumns: ColumnConfig[]) => {
		setLocalColumns(updatedColumns);
		onColumnsChange(updatedColumns);
		saveToStorage(updatedColumns);
	};

	const handleToggleColumn = (columnId: string) => {
		updateColumns(
			localColumns.map((col) =>
				col.id === columnId ? { ...col, visible: !col.visible } : col,
			),
		);
	};

	const handleShowAll = () => {
		updateColumns(localColumns.map((col) => ({ ...col, visible: true })));
	};

	const handleHideAll = () => {
		updateColumns(
			localColumns.map((col) => (col.required ? col : { ...col, visible: false })),
		);
	};

	const handleReset = () => {
		updateColumns(columns.map((col) => ({ ...col, visible: true })));
	};

	const visibleCount = localColumns.filter((col) => col.visible).length;
	const totalCount = localColumns.length;

	return (
		<div className="relative">
			<Button
				variant="outline"
				onClick={() => setShowSelector(!showSelector)}
				className={`flex items-center gap-2 ${visibleCount < totalCount ? "text-primary border-primary" : ""}`}
			>
				<Settings className="w-4 h-4" />
				Columnas ({visibleCount}/{totalCount})
				{visibleCount < totalCount && (
					<span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
						{totalCount - visibleCount}
					</span>
				)}
			</Button>

			{showSelector && (
				<div className="absolute right-0 top-full mt-2 w-80 bg-popover text-popover-foreground rounded-lg border shadow-lg z-50">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-border">
						<h3 className="font-semibold">Configurar Columnas</h3>
						<button
							onClick={() => setShowSelector(false)}
							className="text-muted-foreground hover:text-foreground"
						>
							×
						</button>
					</div>

					{/* Quick actions */}
					<div className="flex items-center gap-2 p-3 border-b border-border">
						<Button variant="ghost" onClick={handleShowAll} className="text-xs">
							<Eye className="w-3 h-3 mr-1" />
							Mostrar Todas
						</Button>
						<Button variant="ghost" onClick={handleHideAll} className="text-xs">
							<EyeOff className="w-3 h-3 mr-1" />
							Ocultar Todas
						</Button>
						<Button variant="ghost" onClick={handleReset} className="text-xs">
							<RotateCcw className="w-3 h-3 mr-1" />
							Resetear
						</Button>
					</div>

					{/* Column list */}
					<div className="max-h-64 overflow-y-auto">
						{localColumns.map((column) => (
							<div
								key={column.id}
								className="flex items-center justify-between p-3 hover:bg-muted/50"
							>
								<div className="flex items-center gap-3">
									<Checkbox
										id={`column-${column.id}`}
										checked={column.visible}
										onCheckedChange={() => handleToggleColumn(column.id)}
										disabled={column.required}
									/>
									<Label
										htmlFor={`column-${column.id}`}
										className={`text-sm cursor-pointer ${column.required ? "text-muted-foreground" : ""} ${column.visible ? "font-medium" : ""}`}
									>
										{column.label}
										{column.required && (
											<span className="ml-1 text-xs text-muted-foreground">
												(requerida)
											</span>
										)}
									</Label>
								</div>

								{column.visible ? (
									<Eye className="w-4 h-4 text-primary" />
								) : (
									<EyeOff className="w-4 h-4 text-muted-foreground" />
								)}
							</div>
						))}
					</div>

					{/* Footer */}
					<div className="p-3 border-t border-border text-xs text-muted-foreground">
						{visibleCount} de {totalCount} columnas visibles
					</div>
				</div>
			)}

			{/* Overlay to close on outside click */}
			{showSelector && (
				<div
					className="fixed inset-0 z-40"
					onClick={() => setShowSelector(false)}
				/>
			)}
		</div>
	);
}
