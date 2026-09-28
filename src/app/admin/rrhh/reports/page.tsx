"use client";

import { Can } from "@/components/auth/Can";
import ReporteRrhh from "@/components/rrhh/reporte/ReporteRrhh";
import { RRHH_REPORTE_ROLES } from "@/constant/rrhh";

export default function RrhhReportsPage() {
	return (
		<Can
			role={RRHH_REPORTE_ROLES}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						El reporte de RR.HH. es para dirección, el área contable y la coordinación legal.
					</p>
				</div>
			}
		>
			<ReporteRrhh />
		</Can>
	);
}
