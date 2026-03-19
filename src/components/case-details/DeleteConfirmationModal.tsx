"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";

interface DeleteConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export const DeleteConfirmationModal = ({
	isOpen,
	onClose,
	onConfirm,
}: DeleteConfirmationModalProps) => {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-md mx-auto p-6">
				<DialogHeader>
					<DialogTitle className="text-lg font-medium text-foreground">
						Confirmar eliminación
					</DialogTitle>
					<DialogDescription className="text-sm text-muted-foreground">
						¿Seguro que desea eliminar este caso? Esta acción no se puede
						deshacer.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex justify-end gap-3">
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button variant="outline" onClick={onConfirm}>
						Borrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
