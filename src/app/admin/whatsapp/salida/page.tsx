"use client";

import { Can } from "@/components/auth/Can";
import SalidaWhatsapp from "@/components/whatsapp/SalidaWhatsapp";
import { SISTEMAS } from "@/constant/menu";

export default function SalidaWhatsappPage() {
	return (
		<Can
			role={SISTEMAS}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">La salida de WhatsApp es solo para Sistemas.</p>
				</div>
			}
		>
			<SalidaWhatsapp />
		</Can>
	);
}
