"use client";

import { Can } from "@/components/auth/Can";
import MembersContent from "@/components/members/MembersContent";
import { RRHH_REPORTE_ROLES } from "@/constant/rrhh";

export default function Page() {
	return (
		<Can
			role={RRHH_REPORTE_ROLES}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						El equipo es solo para dirección: CEO, administración, Sistemas y el director contable.
					</p>
				</div>
			}
		>
			<MembersContent />
		</Can>
	);
}
