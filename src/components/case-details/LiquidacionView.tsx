"use client";

import { Calculator, Info } from "lucide-react";

interface LiquidacionViewProps {
	disabilityPercentage?: number | null;
}

const MOCK_LIQUIDACION = {
	baseLRT: 2850000,
	porcentajeIncapacidad: 22.5,
	edad: 42,
	salario: 450000,
	antiguedad: 8,
	items: [
		{ concepto: "Indemnización Art. 14 inc. 2a) LRT", monto: 2850000 },
		{ concepto: "Adicional Art. 3 Ley 26.773", monto: 570000 },
		{ concepto: "Intereses (tasa activa BNA)", monto: 1425000 },
	],
	total: 4845000,
	nota: "Cálculo estimativo sujeto a variación según jurisdicción y criterio del juzgado interviniente.",
};

export const LiquidacionView = ({ disabilityPercentage }: LiquidacionViewProps) => {
	const porcentaje = disabilityPercentage ?? MOCK_LIQUIDACION.porcentajeIncapacidad;
	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-border">
				<div className="flex items-center gap-2">
					<Calculator className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-md font-semibold text-foreground">
						Liquidación
					</h3>
					<span className="text-xs text-muted-foreground">Cálculo LRT</span>
				</div>
			</div>

			{/* Content */}
			<div className="p-4 space-y-4">
				{/* Datos base */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[
						{
							label: "% Incapacidad",
							value: `${porcentaje}%`,
						},
						{ label: "Edad", value: `${MOCK_LIQUIDACION.edad} años` },
						{
							label: "Salario",
							value: `$${MOCK_LIQUIDACION.salario.toLocaleString("es-AR")}`,
						},
						{
							label: "Antigüedad",
							value: `${MOCK_LIQUIDACION.antiguedad} años`,
						},
					].map((item) => (
						<div
							key={item.label}
							className="rounded-lg border border-border p-3 bg-card"
						>
							<span className="text-xs text-gray-500 dark:text-muted-foreground block mb-1">
								{item.label}
							</span>
							<span className="text-lg font-semibold text-foreground">
								{item.value}
							</span>
						</div>
					))}
				</div>

				{/* Desglose - como tarjetas individuales */}
				<div className="space-y-3">
					{MOCK_LIQUIDACION.items.map((item, i) => (
						<div
							key={i}
							className="rounded-lg border p-5 bg-card border-border"
						>
							<div className="flex items-center justify-between">
								<span className="text-sm text-foreground">
									{item.concepto}
								</span>
								<span className="text-sm font-semibold text-foreground">
									${item.monto.toLocaleString("es-AR")}
								</span>
							</div>
						</div>
					))}

					{/* Total */}
					<div className="rounded-lg border-2 p-5 bg-primary/5 dark:bg-primary/80/10 border-primary/20 dark:border-primary/20">
						<div className="flex items-center justify-between">
							<span className="text-sm font-semibold text-primary dark:text-primary">
								Total estimado
							</span>
							<span className="text-lg font-bold text-primary dark:text-primary">
								${MOCK_LIQUIDACION.total.toLocaleString("es-AR")}
							</span>
						</div>
					</div>
				</div>

				{/* Nota */}
				<div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
					<Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
					<p className="text-xs text-amber-800 dark:text-amber-300">
						{MOCK_LIQUIDACION.nota}
					</p>
				</div>
			</div>
		</div>
	);
};
