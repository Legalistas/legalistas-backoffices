"use client";

import { Can } from "@/components/auth/Can";
import LiquidacionRepresentantes from "@/components/closing-manager/LiquidacionRepresentantes";
import { LIQUIDACION } from "@/constant/menu";

export default function LiquidacionesPage() {
	return (
		<Can
			role={LIQUIDACION}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						La liquidación es para los representantes, la dirección legal, Contable y dirección.
					</p>
				</div>
			}
		>
			<LiquidacionRepresentantes />
		</Can>
	);
}
