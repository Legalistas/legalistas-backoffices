"use client";

import AuditoriaContent from "@/components/auditoria/AuditoriaContent";
import { Can } from "@/components/auth/Can";
import { RRHH_REPORTE_ROLES } from "@/constant/rrhh";

export default function Page() {
	return (
		<Can
			role={RRHH_REPORTE_ROLES}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						La auditoría es solo para dirección: CEO, administración, Sistemas y el director contable.
					</p>
				</div>
			}
		>
			<AuditoriaContent />
		</Can>
	);
}
