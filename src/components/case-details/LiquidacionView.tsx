"use client";

import { Calculator, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Cases } from "@/types/cases";

interface LiquidacionViewProps {
	caseData: Cases;
}

export const LiquidacionView = ({ caseData }: LiquidacionViewProps) => {
	const firstFileId = caseData.files?.[0]?.id;
	const calculatorUrl = `/admin/calculator/accidents-work?caseId=${caseData.id}${firstFileId ? `&fileId=${firstFileId}` : ""}`;

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			<div className="flex items-center justify-between px-5 py-4 border-b border-border">
				<div className="flex items-center gap-2">
					<Calculator className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-md font-semibold text-foreground">
						Liquidación
					</h3>
					<span className="text-xs text-muted-foreground">Calculadora LRT</span>
				</div>
			</div>

			<div className="p-6">
				<div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
					<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
						<Calculator className="h-7 w-7 text-primary" />
					</div>
					<div>
						<p className="text-sm font-medium text-foreground mb-1">
							Calculadora de Accidentes de Trabajo
						</p>
						<p className="text-xs text-muted-foreground max-w-sm">
							Los datos del caso (fecha de accidente, incapacidad, edad del cliente) se autocompletarán automáticamente.
						</p>
					</div>
					<Link href={calculatorUrl}>
						<Button className="gap-2">
							<ExternalLink className="h-4 w-4" />
							Abrir Calculadora LRT
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
};
