import type { ScheduledCurrency, ScheduledPaymentMethod } from "@/types/scheduled-transaction";

// Espejo de las listas de validación en
// backend/src/controllers/scheduled-transaction.controller.ts — si se agrega
// o renombra una categoría acá, hacerlo también ahí.

export const INCOME_CATEGORIES = ["Honorarios", "HP y PCL", "Otros"] as const;

export const EXPENSE_CATEGORIES = [
	"Sueldos / Remuneraciones",
	"Aportes / Monotributo",
	"Gastos Administrativos",
	"Gastos Legales",
	"Servicios",
	"Impuestos",
	"Créditos / Tarjetas",
	"Marketing",
	"Referentes",
	"Brixar",
	"Otros",
] as const;

/** Categorías con subcategoría fija. "Créditos / Tarjetas" no está acá: sus
 * opciones se cargan en vivo desde /credit-cards (ver NewMovementDialog). */
export const FIXED_SUBCATEGORIES: Record<string, readonly string[]> = {
	Servicios: ["Luz", "Agua", "Gas", "Internet", "Otros"],
	Impuestos: ["Municipalidad", "Api"],
};

export const CREDIT_CARD_CATEGORY = "Créditos / Tarjetas";

export const PAYMENT_METHOD_OPTIONS: { value: ScheduledPaymentMethod; label: string }[] = [
	{ value: "cash", label: "Efectivo" },
	{ value: "transfer", label: "Transferencia" },
	{ value: "debit", label: "Débito automático" },
];

export const CURRENCY_SYMBOL: Record<ScheduledCurrency, string> = {
	ARS: "$",
	USD: "US$",
};
