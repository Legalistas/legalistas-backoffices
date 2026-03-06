"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { TodoList, TodoStatus, TodoPriority, TodoListStats, CreateTodoListData } from '@/types/todolist'
import { todolistService } from '@/lib/todolist.service'
import { TodoListCard } from '@/components/todolist/TodoListCard'
import { TodoListForm } from '@/components/todolist/TodoListForm'
import { TodoListStatsCard } from '@/components/todolist/TodoListStatsCard'
import Button from '@/components/ui/button/Button'
import { Plus, Filter } from 'lucide-react'
import { toast } from 'sonner'

export default function TodoListPage() {
    const { data: session } = useSession()
    const [todos, setTodos] = useState<TodoList[]>([])
    const [stats, setStats] = useState<TodoListStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingTodo, setEditingTodo] = useState<TodoList | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [filterStatus, setFilterStatus] = useState<TodoStatus | undefined>()
    const [filterPriority, setFilterPriority] = useState<TodoPriority | undefined>()

    useEffect(() => {
        if (session?.user?.accessToken) {
            loadTodos()
            loadStats()
        }
    }, [currentPage, filterStatus, filterPriority, session?.user?.accessToken])

    const loadTodos = async () => {
        if (!session?.user?.accessToken) return

        try {
            setIsLoading(true)
            const response = await todolistService.getAllTodoLists(
                session.user.accessToken,
                {
                    page: currentPage,
                    limit: 12,
                    status: filterStatus,
                    priority: filterPriority,
                }
            )
            setTodos(response.data)
            setTotalPages(response.pagination.totalPages)
        } catch (error) {
            console.error('Error al cargar todolists:', error)
            toast.error('Error al cargar las tareas')
        } finally {
            setIsLoading(false)
        }
    }

    const loadStats = async () => {
        if (!session?.user?.accessToken) return

        try {
            const statsData = await todolistService.getStats(session.user.accessToken)
            setStats(statsData)
        } catch (error) {
            console.error('Error al cargar estadísticas:', error)
        }
    }

    const handleCreate = async (data: CreateTodoListData) => {
        if (!session?.user?.accessToken) return

        try {
            await todolistService.createTodoList(session.user.accessToken, data)
            toast.success('Tarea creada exitosamente')
            loadTodos()
            loadStats()
        } catch (error) {
            console.error('Error al crear tarea:', error)
            toast.error('Error al crear la tarea')
            throw error
        }
    }

    const handleUpdate = async (data: CreateTodoListData) => {
        if (!editingTodo || !session?.user?.accessToken) return

        try {
            await todolistService.updateTodoList(session.user.accessToken, editingTodo.id, data)
            toast.success('Tarea actualizada exitosamente')
            loadTodos()
            loadStats()
            setEditingTodo(null)
        } catch (error) {
            console.error('Error al actualizar tarea:', error)
            toast.error('Error al actualizar la tarea')
            throw error
        }
    }

    const handleDelete = async (id: number) => {
        if (!session?.user?.accessToken) return
        if (!confirm('¿Estás seguro de eliminar esta tarea?')) return

        try {
            await todolistService.deleteTodoList(session.user.accessToken, id)
            toast.success('Tarea eliminada exitosamente')
            loadTodos()
            loadStats()
        } catch (error) {
            console.error('Error al eliminar tarea:', error)
            toast.error('Error al eliminar la tarea')
        }
    }

    const handleUpdateStatus = async (id: number, status: TodoStatus) => {
        if (!session?.user?.accessToken) return

        try {
            await todolistService.updateTodoList(session.user.accessToken, id, { status })
            toast.success('Estado actualizado')
            loadTodos()
            loadStats()
        } catch (error) {
            console.error('Error al actualizar estado:', error)
            toast.error('Error al actualizar el estado')
        }
    }

    const handleEdit = (todo: TodoList) => {
        setEditingTodo(todo)
        setIsFormOpen(true)
    }

    const handleCloseForm = () => {
        setIsFormOpen(false)
        setEditingTodo(null)
    }

    if (!session) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Mis Tareas</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona tus tareas y pendientes</p>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Tarea
                </Button>
            </div>

            {/* Stats */}
            <TodoListStatsCard stats={stats} isLoading={isLoading} />

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <select
                        value={filterStatus || ''}
                        onChange={(e) => {
                            setFilterStatus(e.target.value as TodoStatus || undefined)
                            setCurrentPage(1)
                        }}
                        className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                    >
                        <option value="">Todos los estados</option>
                        <option value={TodoStatus.PENDING}>Pendiente</option>
                        <option value={TodoStatus.IN_PROGRESS}>En Progreso</option>
                        <option value={TodoStatus.COMPLETED}>Completado</option>
                        <option value={TodoStatus.CANCELLED}>Cancelado</option>
                    </select>
                </div>

                <div>
                    <select
                        value={filterPriority || ''}
                        onChange={(e) => {
                            setFilterPriority(e.target.value as TodoPriority || undefined)
                            setCurrentPage(1)
                        }}
                        className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                    >
                        <option value="">Todas las prioridades</option>
                        <option value={TodoPriority.LOW}>Baja</option>
                        <option value={TodoPriority.MEDIUM}>Media</option>
                        <option value={TodoPriority.HIGH}>Alta</option>
                        <option value={TodoPriority.URGENT}>Urgente</option>
                    </select>
                </div>
            </div>

            {/* Todo List Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg"></div>
                    ))}
                </div>
            ) : todos.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No hay tareas para mostrar</p>
                    <Button onClick={() => setIsFormOpen(true)} className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear primera tarea
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {todos.map((todo) => (
                            <TodoListCard
                                key={todo.id}
                                todo={todo}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onUpdateStatus={handleUpdateStatus}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </Button>
                            <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                Página {currentPage} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Form Modal */}
            <TodoListForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSubmit={editingTodo ? handleUpdate : handleCreate}
                initialData={editingTodo}
            />
        </div>
    )
}
