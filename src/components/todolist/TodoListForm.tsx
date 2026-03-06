"use client"

import { useState, useEffect } from 'react'
import { TodoList, TodoStatus, TodoPriority, CreateTodoListData } from '@/types/todolist'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Button from '@/components/ui/button/Button'
import Input from '@/components/ui/input/Input'
import Label from '@/components/ui/label/Label'
import TextArea from '@/components/ui/input/TextArea'

interface TodoListFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTodoListData) => Promise<void>
  initialData?: TodoList | null
}

const statusOptions = [
  { value: TodoStatus.PENDING, label: 'Pendiente' },
  { value: TodoStatus.IN_PROGRESS, label: 'En Progreso' },
  { value: TodoStatus.COMPLETED, label: 'Completado' },
  { value: TodoStatus.CANCELLED, label: 'Cancelado' },
]

const priorityOptions = [
  { value: TodoPriority.LOW, label: 'Baja' },
  { value: TodoPriority.MEDIUM, label: 'Media' },
  { value: TodoPriority.HIGH, label: 'Alta' },
  { value: TodoPriority.URGENT, label: 'Urgente' },
]

export function TodoListForm({ isOpen, onClose, onSubmit, initialData }: TodoListFormProps) {
  const [formData, setFormData] = useState<CreateTodoListData>({
    title: '',
    description: '',
    status: TodoStatus.PENDING,
    priority: TodoPriority.MEDIUM,
    dueDate: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || '',
        status: initialData.status,
        priority: initialData.priority,
        dueDate: initialData.dueDate || null,
      })
    } else {
      setFormData({
        title: '',
        description: '',
        status: TodoStatus.PENDING,
        priority: TodoPriority.MEDIUM,
        dueDate: null,
      })
    }
  }, [initialData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(formData)
      onClose()
      setFormData({
        title: '',
        description: '',
        status: TodoStatus.PENDING,
        priority: TodoPriority.MEDIUM,
        dueDate: null,
      })
    } catch (error) {
      console.error('Error al guardar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar TodoList' : 'Crear Nuevo TodoList'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Revisar documentos del caso X"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <TextArea
              id="description"
              value={formData.description || ''}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Describe la tarea..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TodoStatus })}
                className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TodoPriority })}
                className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Fecha de vencimiento</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value || null })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title}>
              {isLoading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
