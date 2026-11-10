"use client";

import { useState } from "react";
import { Can } from "@/components/auth/Can";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgendasPanel from "@/components/whatsapp/AgendasPanel";
import CampanasPanel from "@/components/whatsapp/CampanasPanel";
import { CAMPANAS } from "@/constant/menu";

export default function AgendasWhatsappPage() {
	const [tab, setTab] = useState("agendas");
	const [campanaAbierta, setCampanaAbierta] = useState<number | null>(null);

	return (
		<Can
			role={CAMPANAS}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						Las agendas y campañas de WhatsApp son para dirección, Ventas y Marketing.
					</p>
				</div>
			}
		>
			<div className="space-y-4 p-4 sm:p-6">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Agendas y campañas</h1>
					<p className="text-sm text-muted-foreground">
						Armá agendas de contactos y mandales una plantilla de WhatsApp aprobada.
					</p>
				</div>
				<Tabs value={tab} onValueChange={setTab}>
					<TabsList>
						<TabsTrigger value="agendas">Agendas</TabsTrigger>
						<TabsTrigger value="campanas">Campañas</TabsTrigger>
					</TabsList>
					<TabsContent value="agendas" className="mt-4">
						<AgendasPanel
							onCampanaLanzada={(id) => {
								setCampanaAbierta(id);
								setTab("campanas");
							}}
						/>
					</TabsContent>
					<TabsContent value="campanas" className="mt-4">
						<CampanasPanel abierta={campanaAbierta} onAbrir={setCampanaAbierta} />
					</TabsContent>
				</Tabs>
			</div>
		</Can>
	);
}
