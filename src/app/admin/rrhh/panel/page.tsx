"use client";

import { Suspense } from "react";
import { Can } from "@/components/auth/Can";
import PanelRrhh from "@/components/rrhh/panel/PanelRrhh";
import { RRHH_REPORTE_ROLES } from "@/constant/rrhh";

export default function PanelRrhhPage() {
	return (
		<Can
			role={RRHH_REPORTE_ROLES}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						El panel de RR.HH. es solo para dirección: CEO, administración, Sistemas y el director contable.
					</p>
				</div>
			}
		>
			{/* PanelRrhh reads ?tab= with useSearchParams, which needs a Suspense boundary. */}
			<Suspense>
				<PanelRrhh />
			</Suspense>
		</Can>
	);
}
