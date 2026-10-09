export type ScheduledType = "income" | "expense";
export type ScheduledStatus = "pending" | "paid" | "cancelled";
export type ScheduledCurrency = "ARS" | "USD";
export type ScheduledPaymentMethod = "cash" | "transfer" | "debit";

export interface ScheduledTransaction {
	id: number;
	type: ScheduledType;
	dueDate: string;
	concept: string;
	detail: string | null;
	amount: number | string;
	status: ScheduledStatus;
	paidAt: string | null;
	/** Presente cuando la fila viene de un cierre del Gestor de Cierres — no editable acá. */
	closingId: number | null;
	closingConcept: "fee" | "pcl" | null;
	/** Resumen de una tarjeta (Caja → Tarjetas): se paga el resumen, no se edita acá. */
	creditCardId?: number | null;
	periodoTarjeta?: string | null;
	/** Gasto cargado en una causa: se corrige o se borra desde la causa, acá solo se paga. */
	caseExpense?: { id: number; caseId: number } | null;
	/** Parte del abogado representante de un cierre: se ajusta sola con los cobros, acá solo se paga. */
	repClosingId?: number | null;
	category: string;
	subcategory: string | null;
	currency: ScheduledCurrency;
	/** Cotización blue (ARS por USD) al momento de cargar — solo si currency="USD". */
	exchangeRate: number | string | null;
	paymentMethod: ScheduledPaymentMethod;
	/** Monto del total que es "en negro". null = no aplica. */
	offBooksAmount: number | string | null;
	createdById: number;
	createdAt: string;
	updatedAt: string;
	createdBy?: {
		id: number;
		name: string;
		image: string | null;
	};
	/** Cobros/pagos vigentes en la Caja Contable (en qué caja entró o salió). */
	cajaMovimientos?: {
		id: number;
		monto: number | string;
		fecha: string;
		caja: { id: number; nombre: string };
	}[];
}

export interface ScheduledSummary {
	pending: {
		income: { count: number; amount: number };
		expense: { count: number; amount: number };
	};
	currentMonth: {
		income: { count: number; amount: number };
		expense: { count: number; amount: number };
	};
	overdueExpense: { count: number; amount: number };
}

export interface ScheduledFormPayload {
	type: ScheduledType;
	dueDate: string;
	concept: string;
	detail?: string | null;
	amount: number;
	category: string;
	subcategory?: string | null;
	currency: ScheduledCurrency;
	exchangeRate?: number | null;
	paymentMethod: ScheduledPaymentMethod;
	offBooksAmount?: number | null;
}
