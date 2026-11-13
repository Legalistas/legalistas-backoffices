"use client";

import AportesTitulares from "@/components/accounting/AportesTitulares";
import { Can } from "@/components/auth/Can";
import { CAJA_ADMIN_ROLES } from "@/constant/caja";

// Same access as Gastos e Ingresos in the backend (requireCajaAdmin).
export default function AportesPage() {
	return (
		<Can
			role={CAJA_ADMIN_ROLES}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">Los aportes son para Contable y dirección.</p>
				</div>
			}
		>
			<AportesTitulares />
		</Can>
	);
}
