export const MOVEMENTS = [
	{
		value: "income",
		label: "Ingreso",
		subMovements: [
			{ value: "fee", label: "Honorarios" },
			{ value: "pcl", label: "PCL" },
			// Alquiler que la empresa le paga a Agustín Andereggen (id 2) por
			// el inmueble — solo debe verse en su caja.
			{ value: "rent", label: "Alquiler", restrictedToUserId: 2 },
			{ value: "other", label: "Otros" },
		],
	},
	{
		value: "expense",
		label: "Egreso",
		subMovements: [
			{ value: "administration", label: "Administraciòn" },
			{ value: "legal", label: "Legal" },
			{ value: "marketing", label: "Marketing" },
			{ value: "remunerations", label: "Remuneraciones" },
			{ value: "services", label: "Servicios" },
			{ value: "references", label: "Referentes" },
			{ value: "fixer", label: "Repuestos Fixer" },
			{ value: "brixar", label: "Brixar" },
			{ value: "tarjetas", label: "Tarjetas" },
			{ value: "rent", label: "Alquiler", restrictedToUserId: 2 },
			{ value: "other", label: "Otros" },
		],
	},
	{ value: "transfer", label: "Transferencia", subMovements: [] }, // Transferencia no tiene subtipos
];

// Definir un tipo para las opciones de movimiento y submovimiento
export type MovementOption = (typeof MOVEMENTS)[number];
export type SubMovementOption = MovementOption["subMovements"][number];
