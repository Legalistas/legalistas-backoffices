"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal/Modal"
import Label from "@/components/ui/label/Label"
import Input from "@/components/ui/input/Input"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

// Define the simplified FileExpenses interface for this modal's context
export interface FileExpenses {
    id?: number
    amount: number
    description: string
    userId: number
}

interface CreateEditExpensesModalProps {
    open: boolean
    onClose: () => void
    expense?: FileExpenses | null // Use the simplified FileExpenses
    onSave: (expense: FileExpenses) => void
}

export default function CreateEditExpensesModal({ open, onClose, expense, onSave }: CreateEditExpensesModalProps) {
    const [formData, setFormData] = useState<FileExpenses>({
        amount: 0,
        description: "",
        userId: 0,
    })

    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset form when modal opens/closes or expense changes
    useEffect(() => {
        if (open) {
            if (expense) {
                // Editing existing expense
                setFormData({
                    amount: expense.amount || 0,
                    description: expense.description || "",
                    id: expense.id, // Keep the ID if editing
                    userId: expense.userId,
                })
            } else {
                // Creating new expense
                setFormData({
                    amount: 0,
                    description: "",
                    userId: 0,
                })
            }
        }
    }, [open, expense])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: name === "amount" ? Number(value) : value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isNaN(formData.amount) || formData.amount <= 0) {
            toast.error("Por favor, ingrese un monto válido y mayor que cero.")
            return
        }
        if (!formData.description.trim()) {
            toast.error("Por favor, ingrese una descripción para el gasto.")
            return
        }

        try {
            setIsSubmitting(true)
            onSave(formData) // Pass the formData to the onSave prop
            onClose()
            toast.success(expense ? "Gasto actualizado exitosamente" : "Gasto agregado exitosamente")
        } catch (error) {
            console.error("Error saving expense:", error)
            toast.error("Error al guardar el gasto")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            onClose()
        }
    }

    return (
        <Modal isOpen={open} onClose={handleClose} className="max-w-md mx-auto p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {expense ? "Editar Gasto" : "Agregar Gasto"}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {expense ? "Modifique la información del gasto." : "Complete la información para registrar un nuevo gasto."}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="expense-amount">Monto *</Label>
                        <Input
                            id="expense-amount"
                            name="amount"
                            type="number"
                            value={formData.amount === 0 ? "" : formData.amount} // Display empty string for 0 to allow easier input
                            onChange={handleInputChange}
                            placeholder="0.00"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expense-description">Descripción *</Label>
                        <textarea
                            id="expense-description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            disabled={isSubmitting}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            placeholder="Detalle del gasto (ej. compra de insumos, pago de servicios)"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || isNaN(formData.amount) || formData.amount <= 0 || !formData.description.trim()}
                        className="rounded-md bg-[#09A4B5] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#09A4B5]/80 focus:outline-none focus:ring-2 focus:ring-[09A4B5]/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                                Guardando...
                            </>
                        ) : expense ? (
                            "Actualizar Gasto"
                        ) : (
                            "Agregar Gasto"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
