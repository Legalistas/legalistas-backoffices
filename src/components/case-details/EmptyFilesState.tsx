"use client";

import { AlertCircle, FileText, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyFilesStateProps {
	noFiles: boolean;
	fileTypeFilter: number;
	onAddNewFile: () => void;
	onClearFilter: () => void;
}

export const EmptyFilesState = ({
	noFiles,
	fileTypeFilter,
	onAddNewFile,
	onClearFilter,
}: EmptyFilesStateProps) => {
	if (noFiles) {
		return (
			<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
				<FileText className="h-10 w-10 text-muted-foreground" />
				<h3 className="mt-4 text-lg font-semibold">Sin expedientes</h3>
				<p className="mb-4 mt-2 text-sm text-muted-foreground">
					Este caso aún no tiene ningún expediente asociado
				</p>
				<Button
					onClick={onAddNewFile}
					variant="default"
					className="bg-primary text-white hover:bg-primary/85 dark:text-foreground py-2 px-2"
				>
					<PlusCircle className="h-4 w-4" />
					Nuevo expediente
				</Button>
			</div>
		);
	}

	return (
		<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
			<AlertCircle className="h-10 w-10 text-muted-foreground" />
			<h3 className="mt-4 text-lg font-semibold">
				No hay expedientes que coincidan con el filtro
			</h3>
			<p className="mb-4 mt-2 text-sm text-muted-foreground">
				No hay expediente del tipo{" "}
				{fileTypeFilter === 1 ? "Administrativo" : "Judicial"} que fueran
				encontrados.
			</p>
			<Button variant="outline" onClick={onClearFilter}>
				Mostrar todos los expedientes
			</Button>
		</div>
	);
};
