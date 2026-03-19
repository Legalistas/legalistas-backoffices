"use client";

import { NotepadText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyNotesStateProps {
	onAddNewNote: () => void;
}

export const EmptyNotesState = ({ onAddNewNote }: EmptyNotesStateProps) => {
	return (
		<div className="flex min-h-75 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
			<NotepadText className="h-10 w-10 text-muted-foreground" />
			<h3 className="mb-2 text-lg font-medium">No hay notas</h3>
			<p className="mb-4 mt-2 text-sm text-muted-foreground">
				No hay notas asociadas a este caso. Crea una nueva nota para comenzar a
				documentar información importante.
			</p>
			<Button
				onClick={onAddNewNote}
				variant="default"
				className="bg-primary text-white hover:bg-primary/85 dark:text-foreground py-2 px-2"
			>
				<Plus className="h-4 w-4" />
				Nueva Nota
			</Button>
		</div>
	);
};
