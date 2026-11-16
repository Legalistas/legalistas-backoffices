"use client";

import { Can } from "@/components/auth/Can";
import { PruebasBot } from "@/components/potenciales/PruebasBot";
import { PRUEBAS_BOT } from "@/constant/menu";

// Pruebas del bot de WhatsApp: interruptor y chat de prueba (sin WhatsApp ni CRM).
export default function PruebasBotPage() {
	return (
		<Can
			role={PRUEBAS_BOT}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">Las pruebas del bot son para el equipo del estudio; los abogados representantes no tienen acceso.</p>
				</div>
			}
		>
			<div className="space-y-4 p-4 sm:p-6">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Pruebas del bot</h1>
					<p className="text-sm text-muted-foreground">
						Prendé o apagá el bot de WhatsApp y probá cómo responde antes de usarlo con clientes.
					</p>
				</div>
				<PruebasBot />
			</div>
		</Can>
	);
}
