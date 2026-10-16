"use client";

import { Can } from "@/components/auth/Can";
import OrganigramaContent from "@/components/members/OrganigramaContent";
import { RRHH_REPORTE_ROLES } from "@/constant/rrhh";

export default function Page() {
	return (
		<Can
			role={RRHH_REPORTE_ROLES}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						El organigrama es solo para dirección: CEO, administración, Sistemas y el director contable.
					</p>
				</div>
			}
		>
			<OrganigramaContent />
		</Can>
	);
}
