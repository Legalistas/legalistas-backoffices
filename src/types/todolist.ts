export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TodoPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface TodoList {
  id: number
  title: string
  description?: string | null
  status: TodoStatus
  priority: TodoPriority
  userId: number
  dueDate?: string | null
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    name: string
    email?: string | null
    image?: string | null
  }
}

export interface TodoListStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
}

export interface CreateTodoListData {
  title: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  dueDate?: string | null
}

export interface UpdateTodoListData {
  title?: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  dueDate?: string | null
}

export interface TodoListFilters {
  page?: number
  limit?: number
  status?: TodoStatus
  priority?: TodoPriority
}

export interface TodoListResponse {
  data: TodoList[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
