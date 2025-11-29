"use client"

import { Modal } from "@/components/ui/modal/Modal"
import Button from "@/components/ui/button/Button"

interface DeleteConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }: DeleteConfirmationModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md mx-auto p-6">
            <div className="mb-6 mt-4">
                <h3 className="text-lg font-medium text-gray-900">Confirmar eliminación</h3>
                <p className="mt-2 text-sm text-gray-500">
                    ¿Seguro que desea eliminar este caso? Esta acción no se puede deshacer.
                </p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button variant="outline" onClick={onConfirm}>
                    Borrar
                </Button>
            </div>
        </Modal>
    )
}

