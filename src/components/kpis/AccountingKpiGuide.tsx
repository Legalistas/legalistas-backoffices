// "Guía de KPIs" sheet of "KPIs DTO. CONTABLE 2026" (Jona, 06/11/2026), under
// the accounting matrix: what each KPI measures, how it is figured, its goal.
// "fuente": where the backend takes it from since the Caja Contable
// (backend modules/kpis/accounting-caja.ts and accounting.service.ts).

const GUIA: { kpi: string; mide: string; calculo: string; fuente: string; meta: string }[] = [
	{
		kpi: "Ingresos del mes (cobrado)",
		mide: "Plata que efectivamente entró.",
		calculo: "Cobros (honorarios + cuota litis) + alquileres de las cajas, sin transferencias entre cajas ni ajustes.",
		fuente: "Caja Contable: cobros de cierres e ingresos de los rubros Honorarios, PCL y Alquiler.",
		meta: "Subir mes a mes; punto de equilibrio ≈ $25–27 M de honorarios.",
	},
	{
		kpi: "Egresos operativos",
		mide: "Lo que cuesta funcionar.",
		calculo: "Todos los egresos del mes, sin inversiones ni retiros personales. Sueldos imputados al mes trabajado.",
		fuente: "Caja Contable: los demás egresos. Los sueldos pagados desde RR.HH. van al mes del recibo.",
		meta: "Costos fijos a la baja (objetivo < $24 M).",
	},
	{
		kpi: "Margen operativo ($ y %)",
		mide: "Rentabilidad real del negocio.",
		calculo: "Ingresos − egresos operativos. % = margen / ingresos.",
		fuente: "Se calcula.",
		meta: "≥ 25–30 %.",
	},
	{
		kpi: "Inversiones",
		mide: "Plata destinada a Brixar, Fixer y compra de USD.",
		calculo: "Se restan una sola vez, después del margen operativo.",
		fuente: "Caja Contable: egresos de los rubros Brixar y Fixer, lo cargado desde Brixar y los pesos de cada compra de dólares.",
		meta: "Definida con Dirección.",
	},
	{
		kpi: "Retiros del dueño",
		mide: "Plata que retira el dueño de su caja o caja personal.",
		calculo: "Todo retiro de la caja de Agustín o de su caja personal que no sea transferencia a otra caja. Va debajo del margen.",
		fuente: "Caja Contable: egresos de las cajas de Agustín que no son transferencia ni inversión.",
		meta: "Definido por Dirección.",
	},
	{
		kpi: "Resultado del ejercicio",
		mide: "Lo que queda después de invertir y de los retiros.",
		calculo: "Margen operativo − inversiones − retiros del dueño.",
		fuente: "Se calcula.",
		meta: "Positivo.",
	},
	{
		kpi: "Cantidad de cobros",
		mide: "Actividad de cobranza.",
		calculo: "Cada pago de cuota litis u honorarios = 1 cobro.",
		fuente: "Caja Contable: cada ingreso de un cobro (el monto cobrado es su suma).",
		meta: "A definir con la serie histórica.",
	},
	{
		kpi: "Ticket promedio por cobro",
		mide: "Tamaño medio de cada cobro.",
		calculo: "Monto cobrado (honorarios + cuota litis) / cantidad de cobros.",
		fuente: "Se calcula.",
		meta: "A definir con la serie histórica.",
	},
	{
		kpi: "Caja disponible al cierre",
		mide: "Liquidez real.",
		calculo: "Saldo de cierre del BO menos sueldos del mes pendientes de pago, conciliado con el arqueo de las cajas.",
		fuente: "Saldo de cierre de la Caja General (último día, 23:59, en pesos) menos los sueldos del mes sin pagar en Gastos e Ingresos.",
		meta: "Cubrir al menos 2 meses de egresos operativos.",
	},
	{
		kpi: "Saldo proyectado a 3 meses",
		mide: "Cómo vamos a estar a futuro.",
		calculo: "Caja disponible + cobros esperados − egresos esperados al cierre del trimestre (escenario base del informe).",
		fuente: "Lo pendiente en Gastos e Ingresos al cierre del mes, con vencimiento hasta el último día del tercer mes.",
		meta: "Siempre positivo.",
	},
	{
		kpi: "Deuda de aportes pendiente",
		mide: "Obligaciones con Caja de Abogados y Caja Forense.",
		calculo: "Total pendiente según el Anexo I de aportes.",
		fuente: "Aportes de los cierres y cargados a mano sin pagar al cierre del mes (Finanzas → Aportes).",
		meta: "Bajar mes a mes hasta cancelar.",
	},
];

export default function AccountingKpiGuide() {
	return (
		<section className="space-y-3 rounded-lg border border-border bg-card p-4">
			<div>
				<h2 className="text-sm font-semibold">Guía de KPIs del área contable</h2>
				<p className="text-xs text-muted-foreground">
					Desde que existe la Caja Contable se calculan solos y se actualizan con cada movimiento: cada mes,
					tal como quedó al cierre (último día, 23:59). Los meses anteriores se cargan a mano (las celdas con
					lápiz). Mismos criterios que el informe contable mensual.
				</p>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full min-w-170 text-xs">
					<thead>
						<tr className="border-b border-border text-left text-muted-foreground">
							<th className="py-2 pr-3 font-medium">KPI</th>
							<th className="py-2 pr-3 font-medium">Qué mide</th>
							<th className="py-2 pr-3 font-medium">Cómo se calcula</th>
							<th className="py-2 pr-3 font-medium">De dónde sale</th>
							<th className="py-2 font-medium">Meta de referencia</th>
						</tr>
					</thead>
					<tbody>
						{GUIA.map((g) => (
							<tr key={g.kpi} className="border-b border-border/60 align-top last:border-0">
								<td className="py-2 pr-3 font-medium">{g.kpi}</td>
								<td className="py-2 pr-3">{g.mide}</td>
								<td className="py-2 pr-3 text-muted-foreground">{g.calculo}</td>
								<td className="py-2 pr-3 text-muted-foreground">{g.fuente}</td>
								<td className="py-2">{g.meta}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
