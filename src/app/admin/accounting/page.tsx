import ScheduledTransactionsManager from "@/components/accounting/ScheduledTransactionsManager";

export default function AccountingPage() {
	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight">
					Gestor de Gastos e Ingresos
				</h1>
				<p className="text-sm text-muted-foreground">
					Notificaciones de cobros previstos (A Cobrar) y pagos próximos (A Pagar)
				</p>
			</div>
			<ScheduledTransactionsManager />
		</div>
	);
}
