import type {
	CreateTodoListData,
	TodoList,
	TodoListFilters,
	TodoListResponse,
	TodoListStats,
	UpdateTodoListData,
} from "@/types/todolist";

const API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL_API || "http://localhost:5000";

export const todolistService = {
	// Obtener todos los todolists
	async getAllTodoLists(
		token: string,
		filters?: TodoListFilters,
	): Promise<TodoListResponse> {
		const queryParams = new URLSearchParams();
		if (filters?.page) queryParams.append("page", filters.page.toString());
		if (filters?.limit) queryParams.append("limit", filters.limit.toString());
		if (filters?.status) queryParams.append("status", filters.status);
		if (filters?.priority) queryParams.append("priority", filters.priority);

		const response = await fetch(
			`${API_URL}/todolists?${queryParams.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			throw new Error("Error al obtener todolists");
		}

		return response.json();
	},

	// Obtener un todolist por ID
	async getTodoListById(token: string, id: number): Promise<TodoList> {
		const response = await fetch(`${API_URL}/todolists/${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			throw new Error("Error al obtener todolist");
		}

		return response.json();
	},

	// Crear un nuevo todolist
	async createTodoList(
		token: string,
		data: CreateTodoListData,
	): Promise<TodoList> {
		const response = await fetch(`${API_URL}/todolists`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Error al crear todolist");
		}

		return response.json();
	},

	// Actualizar un todolist
	async updateTodoList(
		token: string,
		id: number,
		data: UpdateTodoListData,
	): Promise<TodoList> {
		const response = await fetch(`${API_URL}/todolists/${id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Error al actualizar todolist");
		}

		return response.json();
	},

	// Eliminar un todolist
	async deleteTodoList(token: string, id: number): Promise<void> {
		const response = await fetch(`${API_URL}/todolists/${id}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			throw new Error("Error al eliminar todolist");
		}
	},

	// Obtener estadísticas
	async getStats(token: string): Promise<TodoListStats> {
		const response = await fetch(`${API_URL}/todolists/stats`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			throw new Error("Error al obtener estadísticas");
		}

		return response.json();
	},
};
