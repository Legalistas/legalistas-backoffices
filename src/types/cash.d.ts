import { User } from "./users";

export interface Transaction {
	id: number;
	type: "income" | "expense" | "transfer";
	subtype: string;
	userId: number;
	userTransferId?: number | null;
	amount: number;
	date: string; // YYYY-MM-DD format
	description: string;
	user: User;
	transferUser?: { id: number; name: string } | null;
	/** Mes ya cerrado: no se puede editar. */
	closed?: boolean;
	/** Cobro de HP/PCL vinculado a un cierre. */
	closingId?: number | null;
	/** "cash" o "card". */
	paymentMethod?: string;
	/** Con "card": la tarjeta de la compra. Con "cash": este movimiento es el pago del resumen de esa tarjeta. */
	creditCardId?: number | null;
	/** Compra con tarjeta ya incluida en un pago de resumen. */
	settledByTransactionId?: number | null;
}

export interface ClosedMonthReport {
	id: number; // Añadido id para coincidir con el modelo Prisma
	month: string; // MM
	year: string; // YYYY
	initialBalance: number;
	monthlyIncome: number;
	monthlyExpenses: number;
	monthlyBalance: number;
	closingDate: string; // YYYY-MM-DD
}

export interface FakeUserBalance {
	id: number;
	name: string;
	avatar: string; // URL to placeholder image
	totalBalance: number;
	income: number;
	expenses: number;
}

export interface UsersApiResponse {
	data: User[];
	meta: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export interface CalculatedUserBalance {
	id: number | string; // Puede ser el ID de la API o un ID temporal si no hay match
	name: string;
	avatar: string; // URL completa de la imagen
	totalBalance: number;
	income: number;
	expenses: number;
}
