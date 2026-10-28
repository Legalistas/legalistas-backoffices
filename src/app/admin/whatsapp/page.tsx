"use client";

import { Can } from "@/components/auth/Can";
import WhatsappInbox from "@/components/whatsapp/WhatsappInbox";
import { SUPERADMIN } from "@/constant/menu";

export default function WhatsappPage() {
	return (
		<Can
			role={SUPERADMIN}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						La bandeja de WhatsApp es, por ahora, solo para dirección.
					</p>
				</div>
			}
		>
			<WhatsappInbox />
		</Can>
	);
}
